/**
 * EmailParserService - Uses Jarvis (AI) to parse portal emails
 * 
 * Instead of maintaining complex regex patterns for each portal,
 * we let Jarvis analyze the email and extract lead data.
 */

import OpenAI from 'openai';

// Lazy-init to avoid crash before secrets are loaded
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }
  return _openai;
}

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
  hasClickLink: boolean;  // Email requires clicking a link to see data
  clickLinkUrl?: string;  // The URL to click if hasClickLink is true
  portal: string;         // Detected portal name
  leadData: ParsedLeadData;
  propertyRef: PropertyReference | null;
  rawMessage?: string;    // Original message from the lead
  error?: string;
}

const PARSE_PROMPT = `Du bist ein Email-Parser für Immobilien-Portale im DACH-Raum (Deutschland, Österreich, Schweiz). Analysiere die folgende Email und extrahiere die Lead-Daten.

WICHTIG:
1. Erkenne zuerst, ob die Email einen "Klick hier"-Link enthält, der geklickt werden muss, um die Daten zu sehen.
   - Typische Phrasen: "Klicken Sie hier", "Anfrage ansehen", "Details anzeigen", "Zur Anfrage"
   - Wenn ja, setze hasClickLink auf true und extrahiere die URL wenn möglich.

2. Wenn Daten direkt in der Email stehen, extrahiere:
   - firstName, lastName (aus dem Namen des Interessenten)
   - email (Email-Adresse des Interessenten)
   - phone (Telefonnummer, falls vorhanden)
   - message (die Nachricht/Anfrage des Interessenten)

3. Erkenne das Portal anhand von Absender-Domain oder Inhalt. Unterstützte Portale:
   DEUTSCHLAND:
   - ImmobilienScout24 (immobilienscout24.de) - Absender: *@immobilienscout24.de
   - Immowelt (immowelt.de) - Absender: *@immowelt.de
   - Immonet (immonet.de) - Absender: *@immonet.de (gehört zu Immowelt)
   - Kleinanzeigen (kleinanzeigen.de) - Absender: noreply-immobilien@mail.kleinanzeigen.de
   - Kalaydo (kalaydo.de) - Absender: *@kalaydo.de
   - Immozentral (immozentral.com) - Absender: *@immozentral.com
   - Immopool (immopool.de) - Absender: *@immopool.de
   - 1A Immobilien (1a-immobilienmarkt.de) - Absender: *@1a-immobilienmarkt.de
   - IVD24 (ivd24immobilien.de) - Absender: *@ivd24immobilien.de, *@ivd24.de
   - Neubau Kompass (neubaukompass.de) - Absender: *@neubaukompass.de
   - SZ Immobilien (sueddeutsche.de) - Absender: *@sueddeutsche.de (Immobilien-Anfrage)
   - FAZ Immobilien (faz.net) - Absender: *@faz.net (Immobilien-Anfrage)
   - Welt Immobilien (welt.de) - Absender: *@welt.de (Immobilien-Anfrage)
   
   ÖSTERREICH:
   - Willhaben (willhaben.at) - Absender: *@willhaben.at
   - ImmobilienScout24 AT (immobilienscout24.at) - Absender: *@immobilienscout24.at
   - Immmo.at (immmo.at) - Absender: *@immmo.at
   - FindMyHome (findmyhome.at) - Absender: *@findmyhome.at
   - Der Standard Immobilien (derstandard.at) - Absender: *@derstandard.at (Immobilien-Anfrage)
   
   SCHWEIZ:
   - Homegate (homegate.ch) - Absender: *@homegate.ch
   - ImmoScout24 CH (immoscout24.ch) - Absender: *@immoscout24.ch
   - Comparis (comparis.ch) - Absender: *@comparis.ch
   - Newhome (newhome.ch) - Absender: *@newhome.ch
   - ImmoStreet (immostreet.ch) - Absender: *@immostreet.ch
   - Flatfox (flatfox.ch) - Absender: *@flatfox.ch

4. Extrahiere die Objekt-Referenz:
   - Portal-ID (z.B. "Scout-ID: 123456789", "Objekt-Nr: abc123")
   - Adresse (z.B. "Musterstraße 1, 12345 Berlin")
   - Titel (z.B. "3-Zimmer-Wohnung in Mitte")

Antworte NUR mit validem JSON im folgenden Format:
{
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
}`;

export async function parsePortalEmail(params: {
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

    const emailContent = `
Von: ${from}
Betreff: ${subject}

Inhalt:
${content}
`.trim();

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PARSE_PROMPT },
        { role: 'user', content: emailContent }
      ],
      temperature: 0,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      success: true,
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
    console.error('Error parsing email with Jarvis:', error);
    return {
      success: false,
      hasClickLink: false,
      portal: 'Unknown',
      leadData: {},
      propertyRef: null,
      error: error.message || 'Failed to parse email',
    };
  }
}

/**
 * Quick check if email is from a known portal (all 24 DACH portals)
 */
export function isPortalEmail(from: string, subject: string): boolean {
  // Domain patterns for all 24 supported portals
  const portalDomainPatterns = [
    // Deutschland (13)
    'immobilienscout24.de',
    'immowelt.de',
    'immonet.de',
    'kleinanzeigen.de',
    'ebay-kleinanzeigen.de',
    'kalaydo.de',
    'immozentral.com',
    'immopool.de',
    '1a-immobilienmarkt.de',
    'ivd24immobilien.de',
    'ivd24.de',
    'neubaukompass.de',
    // Österreich (5)
    'willhaben.at',
    'immobilienscout24.at',
    'immmo.at',
    'findmyhome.at',
    // Schweiz (6)
    'homegate.ch',
    'immoscout24.ch',
    'comparis.ch',
    'newhome.ch',
    'immostreet.ch',
    'flatfox.ch',
  ];

  // Subject/content patterns (for newspaper portals where domain may differ)
  const subjectPatterns = [
    'immobilienscout',
    'immoscout24',
    'immowelt',
    'willhaben',
    'kleinanzeigen',
    'homegate',
    'comparis',
    'newhome',
    'immonet',
    'kalaydo',
    'immozentral',
    'immopool',
    'ivd24',
    'neubaukompass',
    'immostreet',
    'flatfox',
    'findmyhome',
    // Newspaper portals - match by subject content (e.g. "Immobilien-Anfrage" from these)
    'sueddeutsche.de',
    'faz.net',
    'welt.de',
    'derstandard.at',
    'immmo.at',
  ];

  const lowerFrom = from.toLowerCase();
  const lowerSubject = subject.toLowerCase();

  // Check if sender domain matches any portal
  if (portalDomainPatterns.some(domain => lowerFrom.includes(domain))) {
    return true;
  }

  // Check subject/content for portal indicators
  if (subjectPatterns.some(pattern => lowerSubject.includes(pattern))) {
    return true;
  }

  // Check for generic real estate inquiry patterns from newspaper portals
  if (
    (lowerFrom.includes('sueddeutsche.de') || lowerFrom.includes('faz.net') || 
     lowerFrom.includes('welt.de') || lowerFrom.includes('derstandard.at')) &&
    (lowerSubject.includes('immobili') || lowerSubject.includes('anfrage') || 
     lowerSubject.includes('objekt') || lowerSubject.includes('inserat'))
  ) {
    return true;
  }

  return false;
}
