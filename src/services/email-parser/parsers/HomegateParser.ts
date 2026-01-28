import { EmailParser, ExtractedLead } from './types';

export class HomegateParser implements EmailParser {
  canParse(from: string, subject: string): boolean {
    return from.includes('homegate.ch') || subject.includes('homegate');
  }

  parse(text: string, subject: string, html?: string): ExtractedLead {
    // 1. Extract Name
    // "Vorname: Max" ... "Nachname: Muster"
    const firstNameMatch = text.match(/Vorname:\s*([^\n\r]+)/i);
    const lastNameMatch = text.match(/Nachname:\s*([^\n\r]+)/i);
    
    const firstName = firstNameMatch ? firstNameMatch[1].trim() : 'Unbekannt';
    const lastName = lastNameMatch ? lastNameMatch[1].trim() : '';

    // 2. Extract Email
    const emailMatch = text.match(/(?:E-Mail|Email):\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
    const email = emailMatch ? emailMatch[1].trim() : '';

    // 3. Extract Phone
    const phoneMatch = text.match(/(?:Telefon|Tel\.?):\s*([+\d\s\-/()]+)/i);
    const phone = phoneMatch ? phoneMatch[1].trim() : undefined;

    // 4. Extract Message
    // "Bemerkung: ..."
    const messageMatch = text.match(/Bemerkung:\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|$)/i);
    const message = messageMatch ? messageMatch[1].trim() : undefined;

    // 5. Extract Property ID
    // "Objekt-ID: 12345"
    const propertyIdMatch = text.match(/(?:Objekt-ID|Ref\.?):\s*([a-zA-Z0-9-]+)/i);
    const propertyId = propertyIdMatch ? propertyIdMatch[1].trim() : undefined;

    return {
      firstName,
      lastName,
      email,
      phone,
      message,
      propertyId,
      source: 'Other' // Should be 'Homegate' if enum extended
    };
  }
}
