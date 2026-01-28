import { EmailParser, ExtractedLead } from './types';

export class KleinanzeigenParser implements EmailParser {
  canParse(from: string, subject: string): boolean {
    return from.includes('kleinanzeigen.de') || from.includes('ebay-kleinanzeigen.de');
  }

  parse(text: string, subject: string, html?: string): ExtractedLead {
    // Kleinanzeigen is often less structured
    
    // 1. Extract Name
    // "Nutzer: Max Mustermann" or just "Von: Max"
    const nameMatch = text.match(/(?:Nutzer|Von):\s*([^\n\r]+)/i);
    const fullName = nameMatch ? nameMatch[1].trim() : 'Kleinanzeigen Nutzer';
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    // 2. Extract Email
    // Often masked, but we try to find standard emails in the body
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
    const email = emailMatch ? emailMatch[1].trim() : '';

    // 3. Extract Message
    // Usually follows the header block
    const messageMatch = text.match(/(?:Nachricht|Anfrage):\s*([\s\S]*?)(?=\n\n|Diese Anfrage|$)/i);
    const message = messageMatch ? messageMatch[1].trim() : undefined;

    // 4. Extract Property ID
    // "Anzeigennummer: 123456"
    const propertyIdMatch = text.match(/(?:Anzeigennummer|ID):\s*(\d+)/i);
    const propertyId = propertyIdMatch ? propertyIdMatch[1].trim() : undefined;

    return {
      firstName,
      lastName,
      email,
      message,
      propertyId,
      source: 'Other' // Mapping to 'Other' as we don't have a specific enum yet, or update types
    };
  }
}
