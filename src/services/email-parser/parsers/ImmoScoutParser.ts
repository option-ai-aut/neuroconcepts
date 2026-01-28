import { EmailParser, ExtractedLead } from './types';

export class ImmoScoutParser implements EmailParser {
  canParse(from: string, subject: string): boolean {
    return from.includes('immobilienscout24.de') || subject.includes('ImmoScout24');
  }

  parse(text: string, subject: string, html?: string): ExtractedLead {
    // 1. Extract Name
    // Patterns: "Name: Max Mustermann", "Von: Max Mustermann"
    const nameMatch = text.match(/(?:Name|Von):\s*([^\n\r]+)/i);
    const fullName = nameMatch ? nameMatch[1].trim() : 'Unbekannt';
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    // 2. Extract Email
    // Patterns: "E-Mail: max@test.de", "Email: max@test.de"
    const emailMatch = text.match(/(?:E-Mail|Email):\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
    const email = emailMatch ? emailMatch[1].trim() : '';

    // 3. Extract Phone
    // Patterns: "Telefon: 012345", "Tel: 012345"
    const phoneMatch = text.match(/(?:Telefon|Tel\.?|Mobil):\s*([+\d\s\-/()]+)/i);
    const phone = phoneMatch ? phoneMatch[1].trim() : undefined;

    // 4. Extract Message
    // Often follows "Nachricht:" or is in a specific block
    const messageMatch = text.match(/Nachricht:\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|Impressum|$)/i);
    const message = messageMatch ? messageMatch[1].trim() : undefined;

    // 5. Extract Property ID
    // Patterns: "Objekt-Nr.: 12345", "Scout-ID: 12345"
    const propertyIdMatch = text.match(/(?:Objekt-Nr\.|Scout-ID|ID):\s*(\d+)/i) || subject.match(/ID\s*(\d+)/i);
    const propertyId = propertyIdMatch ? propertyIdMatch[1].trim() : undefined;

    return {
      firstName,
      lastName,
      email,
      phone,
      message,
      propertyId,
      source: 'ImmoScout24'
    };
  }
}
