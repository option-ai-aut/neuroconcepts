import { EmailParser, ExtractedLead } from './types';

export class ImmoweltParser implements EmailParser {
  canParse(from: string, subject: string): boolean {
    return from.includes('immowelt.de') || from.includes('immowelt.at') || subject.includes('Immowelt');
  }

  parse(text: string, subject: string, html?: string): ExtractedLead {
    // 1. Extract Name
    const nameMatch = text.match(/(?:Name|Von):\s*([^\n\r]+)/i);
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
    // Immowelt often puts the message in a block
    const messageMatch = text.match(/Nachricht:\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|$)/i);
    const message = messageMatch ? messageMatch[1].trim() : undefined;

    // 5. Extract Property ID
    // "Objekt-ID: 12345" or "Online-ID: 12345"
    const propertyIdMatch = text.match(/(?:Objekt-ID|Online-ID):\s*([a-zA-Z0-9-]+)/i);
    const propertyId = propertyIdMatch ? propertyIdMatch[1].trim() : undefined;

    return {
      firstName,
      lastName,
      email,
      phone,
      message,
      propertyId,
      source: 'Immowelt'
    };
  }
}
