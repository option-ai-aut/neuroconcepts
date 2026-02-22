/**
 * EmailParserService - Uses Mivo (AI) to classify & parse ALL incoming emails
 * 
 * Mivo reads every email and decides:
 * - LEAD_INQUIRY: Real lead/inquiry from a portal or direct → create lead
 * - NEWSLETTER: Marketing/newsletter email → skip
 * - INVOICE: Invoice/billing email → skip
 * - NOTIFICATION: System notification (portal account, stats) → skip
 * - SPAM: Spam/irrelevant → skip
 * - OTHER: Unclassifiable → skip but log
 */

import OpenAI from 'openai';
import { AiCostService } from './AiCostService';

// Lazy-init to avoid crash before secrets are loaded
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }
  return _openai;
}

export type EmailClassification = 'LEAD_INQUIRY' | 'NEWSLETTER' | 'INVOICE' | 'NOTIFICATION' | 'SPAM' | 'OTHER';

export interface ParsedLeadData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  message?: string;
}

export interface PropertyReference {
  type: 'PORTAL_ID' | 'ADDRESS' | 'TITLE';
  value: string;
  portal?: string; // e.g. "immoscout", "immowelt"
}

export interface EmailParseResult {
  success: boolean;
  classification: EmailClassification;
  classificationReason: string;   // Why Mivo classified it this way
  hasClickLink: boolean;           // Email requires clicking a link to see data
  clickLinkUrl?: string;           // The URL to click if hasClickLink is true
  portal: string;                  // Detected portal name (or "Direct" / "Unknown")
  leadData: ParsedLeadData;
  propertyRef: PropertyReference | null;
  rawMessage?: string;             // Original message from the lead
  error?: string;
}

const CLASSIFY_AND_PARSE_PROMPT = `Du bist ein Email-Klassifizierer und -Parser für eine Immobilienverwaltungs-Software. Du analysierst JEDE eingehende Email und entscheidest, ob es sich um eine echte Interessenten-Anfrage (Lead) handelt oder um etwas anderes.

## SCHRITT 1: KLASSIFIZIERUNG

Klassifiziere die Email in eine der folgenden Kategorien:

- **LEAD_INQUIRY**: Eine echte Anfrage eines Interessenten zu einem Immobilienobjekt. Der Absender möchte ein Objekt besichtigen, Informationen erhalten, oder meldet Interesse an.
  Beispiele: Kontaktanfragen über Immobilienportale, direkte Anfragen per Email, Besichtigungsanfragen
  
- **NEWSLETTER**: Ein Newsletter, Marketing-Email, oder Werbe-Email.
  Beispiele: Portal-Newsletter, Immobilienmarkt-Updates, Werbung von Portalen
  
- **INVOICE**: Eine Rechnung, Zahlungsaufforderung, Kontoauszug.
  Beispiele: Portal-Rechnungen, Gebühren, Zahlungsbestätigungen
  
- **NOTIFICATION**: Eine System-Benachrichtigung die KEIN Lead ist.
  Beispiele: Portal-Statistiken, Performance-Reports, Inserats-Ablauf-Warnungen, Account-Benachrichtigungen, Inserat-Bestätigungen
  
- **SPAM**: Offensichtlicher Spam, Phishing, oder irrelevante Werbung.

- **OTHER**: Alles andere was in keine der obigen Kategorien passt.

## SCHRITT 2: NUR BEI LEAD_INQUIRY - Lead-Daten extrahieren

Wenn die Email eine LEAD_INQUIRY ist:

1. Prüfe ob die Email einen "Klick hier"-Link enthält, der geklickt werden muss, um die Daten zu sehen.
   - Typische Phrasen: "Klicken Sie hier", "Anfrage ansehen", "Details anzeigen", "Zur Anfrage"
   - Wenn ja, setze hasClickLink auf true und extrahiere die URL wenn möglich.

2. Wenn Daten direkt in der Email stehen, extrahiere:
   - firstName, lastName (aus dem Namen des Interessenten)
   - email (Email-Adresse des Interessenten - NICHT die des Portals/Absenders!)
   - phone (Telefonnummer, falls vorhanden)
   - message (die Nachricht/Anfrage des Interessenten)

3. Erkenne das Portal / die Quelle:
   DEUTSCHLAND:
   - ImmobilienScout24 (immobilienscout24.de)
   - Immowelt (immowelt.de)
   - Immonet (immonet.de)
   - Kleinanzeigen (kleinanzeigen.de)
   - Kalaydo (kalaydo.de)
   - Immozentral (immozentral.com)
   - Immopool (immopool.de)
   - 1A Immobilien (1a-immobilienmarkt.de)
   - IVD24 (ivd24immobilien.de)
   - Neubau Kompass (neubaukompass.de)
   - SZ Immobilien, FAZ Immobilien, Welt Immobilien
   
   ÖSTERREICH:
   - Willhaben (willhaben.at)
   - ImmobilienScout24 AT (immobilienscout24.at)
   - Immmo.at (immmo.at)
   - FindMyHome (findmyhome.at)
   - Der Standard Immobilien
   
   SCHWEIZ:
   - Homegate (homegate.ch)
   - ImmoScout24 CH (immoscout24.ch)
   - Comparis (comparis.ch)
   - Newhome (newhome.ch)
   - ImmoStreet (immostreet.ch)
   - Flatfox (flatfox.ch)
   
   Wenn es kein Portal ist sondern eine direkte Anfrage, setze portal auf "Direkt".

4. Extrahiere die Objekt-Referenz:
   - Portal-ID (z.B. "Scout-ID: 123456789", "Objekt-Nr: abc123")
   - Adresse (z.B. "Musterstraße 1, 12345 Berlin")
   - Titel (z.B. "3-Zimmer-Wohnung in Mitte")

Antworte NUR mit validem JSON im folgenden Format:
{
  "classification": "LEAD_INQUIRY" | "NEWSLETTER" | "INVOICE" | "NOTIFICATION" | "SPAM" | "OTHER",
  "classificationReason": "Kurze Begründung der Klassifizierung",
  "hasClickLink": boolean,
  "clickLinkUrl": string | null,
  "portal": string,
  "leadData": {
    "firstName": string | null,
    "lastName": string | null,
    "email": string | null,
    "phone": string | null,
    "message": string | null
  },
  "propertyRef": {
    "type": "PORTAL_ID" | "ADDRESS" | "TITLE",
    "value": string,
    "portal": string
  } | null
}

Für NICHT-LEAD Emails setze leadData auf leere Werte und propertyRef auf null.`;

/**
 * Classify and parse ANY incoming email with Mivo
 * Mivo decides if it's a real lead or something else
 */
export async function classifyAndParseEmail(params: {
  from: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<EmailParseResult> {
  const { from, subject, text, html } = params;

  try {
    // Prefer text content, fall back to stripping HTML
    let content = text;
    if (!content && html) {
      // Basic HTML stripping
      content = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Truncate very long emails to save tokens (keep first 4000 chars)
    if (content && content.length > 4000) {
      content = content.substring(0, 4000) + '\n...[Email gekürzt]';
    }

    const emailContent = `
Von: ${from}
Betreff: ${subject}

Inhalt:
${content || '(Kein Text-Inhalt)'}
`.trim();

    const emailParseStart = Date.now();
    const emailModel = 'gpt-5-mini'; // Mini only for email reading/parsing
    const response = await getOpenAI().chat.completions.create({
      model: emailModel,
      messages: [
        { role: 'system', content: CLASSIFY_AND_PARSE_PROMPT },
        { role: 'user', content: emailContent }
      ],
      response_format: { type: 'json_object' }
    });

    // Log AI usage for email parsing
    if (response.usage) {
      AiCostService.logUsage({
        provider: 'openai', model: emailModel, endpoint: 'email-parse',
        inputTokens: response.usage.prompt_tokens || 0,
        outputTokens: response.usage.completion_tokens || 0,
        durationMs: Date.now() - emailParseStart,
      }).catch(() => {});
    }

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      success: true,
      classification: result.classification || 'OTHER',
      classificationReason: result.classificationReason || '',
      hasClickLink: result.hasClickLink || false,
      clickLinkUrl: result.clickLinkUrl || undefined,
      portal: result.portal || 'Unknown',
      leadData: {
        firstName: result.leadData?.firstName || undefined,
        lastName: result.leadData?.lastName || undefined,
        email: result.leadData?.email || undefined,
        phone: result.leadData?.phone || undefined,
        message: result.leadData?.message || undefined,
      },
      propertyRef: result.propertyRef || null,
      rawMessage: result.leadData?.message || undefined,
    };
  } catch (error: any) {
    console.error('Error classifying email with Mivo:', error);
    return {
      success: false,
      classification: 'OTHER',
      classificationReason: `Klassifizierung fehlgeschlagen: ${error.message}`,
      hasClickLink: false,
      portal: 'Unknown',
      leadData: {},
      propertyRef: null,
      error: error.message || 'Failed to classify email',
    };
  }
}

// Keep backward compatibility alias
export const parsePortalEmail = classifyAndParseEmail;

/**
 * @deprecated Use classifyAndParseEmail instead - Mivo now classifies ALL emails
 */
export function isPortalEmail(_from: string, _subject: string): boolean {
  // Always return true - Mivo now handles classification
  return true;
}
