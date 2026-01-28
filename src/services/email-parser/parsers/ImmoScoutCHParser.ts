import { EmailParser, ExtractedLead } from './types';

export class ImmoScoutCHParser implements EmailParser {
  canParse(from: string, subject: string): boolean {
    return from.includes('immoscout24.ch');
  }

  parse(text: string, subject: string, html?: string): ExtractedLead {
    // 1. Extract Name
    // "Von: Max Muster"
    const nameMatch = text.match(/(?:Von|Name):\s*([^\n\r]+)/i);
    const fullName = nameMatch ? nameMatch[1].trim() : 'Unbekannt';
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    // 2. Extract Email
    const emailMatch = text.match(/(?:E-Mail|Email):\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
    const email = emailMatch ? emailMatch[1].trim() : '';

    // 3. Extract Phone
    const phoneMatch = text.match(/(?:Telefon|Tel\.?):\s*([+\d\s\-/()]+)/i);
    const phone = phoneMatch ? phoneMatch[1].trim() : undefined;

    // 4. Extract Message
    const messageMatch = text.match(/(?:Nachricht|Bemerkung):\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|$)/i);
    const message = messageMatch ? messageMatch[1].trim() : undefined;

    // 5. Extract Property ID
    // Usually in subject or body
    const propertyIdMatch = text.match(/(?:Objekt-ID|Code):\s*([a-zA-Z0-9-]+)/i) || subject.match(/Code\s*([a-zA-Z0-9-]+)/i);
    const propertyId = propertyIdMatch ? propertyIdMatch[1].trim() : undefined;

    return {
      firstName,
      lastName,
      email,
      phone,
      message,
      propertyId,
      source: 'Other' // Should be 'ImmoScout24.ch'
    };
  }
}
