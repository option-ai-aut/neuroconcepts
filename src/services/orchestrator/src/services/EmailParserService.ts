/**
 * EmailParserService - Uses Jarvis (AI) to parse portal emails
 * 
 * Instead of maintaining complex regex patterns for each portal,
 * we let Jarvis analyze the email and extract lead data.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

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

const PARSE_PROMPT = `Du bist ein Email-Parser für Immobilien-Portale. Analysiere die folgende Email und extrahiere die Lead-Daten.

WICHTIG:
1. Erkenne zuerst, ob die Email einen "Klick hier"-Link enthält, der geklickt werden muss, um die Daten zu sehen.
   - Typische Phrasen: "Klicken Sie hier", "Anfrage ansehen", "Details anzeigen", "Zur Anfrage"
   - Wenn ja, setze hasClickLink auf true und extrahiere die URL wenn möglich.

2. Wenn Daten direkt in der Email stehen, extrahiere:
   - firstName, lastName (aus dem Namen des Interessenten)
   - email (Email-Adresse des Interessenten)
   - phone (Telefonnummer, falls vorhanden)
   - message (die Nachricht/Anfrage des Interessenten)

3. Erkenne das Portal anhand von Absender oder Inhalt:
   - ImmoScout24 (immobilienscout24.de)
   - Immowelt (immowelt.de, immowelt.at)
   - Willhaben (willhaben.at)
   - Kleinanzeigen (kleinanzeigen.de, ebay-kleinanzeigen.de)
   - Homegate (homegate.ch)
   - ImmoScout24 CH (immoscout24.ch)
   - Andere

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

    const response = await openai.chat.completions.create({
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
 * Quick check if email is from a known portal
 */
export function isPortalEmail(from: string, subject: string): boolean {
  const portalPatterns = [
    'immobilienscout24',
    'immoscout24',
    'immowelt',
    'willhaben',
    'kleinanzeigen',
    'ebay-kleinanzeigen',
    'homegate',
    'comparis',
    'newhome',
    'immonet',
  ];

  const lowerFrom = from.toLowerCase();
  const lowerSubject = subject.toLowerCase();

  return portalPatterns.some(
    pattern => lowerFrom.includes(pattern) || lowerSubject.includes(pattern)
  );
}
