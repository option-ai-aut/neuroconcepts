import { EmailParser, ExtractedLead } from './types';

export class WillhabenParser implements EmailParser {
  canParse(from: string, subject: string): boolean {
    return from.includes('willhaben.at') || subject.includes('willhaben');
  }

  parse(text: string, subject: string, html?: string): ExtractedLead {
    // 1. Extract Name
    // Willhaben often uses "Anfrage von: Name"
    const nameMatch = text.match(/Anfrage von:\s*([^\n\r]+)/i);
    const fullName = nameMatch ? nameMatch[1].trim() : 'Unbekannt';
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    // 2. Extract Email
    const emailMatch = text.match(/(?:E-Mail|Email):\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
    const email = emailMatch ? emailMatch[1].trim() : '';

    // 3. Extract Phone
    const phoneMatch = text.match(/(?:Tel\.?|Telefon):\s*([+\d\s\-/()]+)/i);
    const phone = phoneMatch ? phoneMatch[1].trim() : undefined;

    // 4. Extract Message
    const messageMatch = text.match(/Nachricht:\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|$)/i);
    const message = messageMatch ? messageMatch[1].trim() : undefined;

    // 5. Extract Property ID
    // Willhaben Code: "Code: 123456" or in Subject "Anfrage zu Anzeige: ... (123456)"
    const propertyIdMatch = text.match(/Code:\s*(\d+)/i) || subject.match(/\((\d+)\)$/);
    const propertyId = propertyIdMatch ? propertyIdMatch[1].trim() : undefined;

    return {
      firstName,
      lastName,
      email,
      phone,
      message,
      propertyId,
      source: 'Willhaben'
    };
  }
}
