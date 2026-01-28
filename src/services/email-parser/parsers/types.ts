export interface ExtractedLead {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  message?: string;
  propertyId?: string;
  source: 'ImmoScout24' | 'Willhaben' | 'Immowelt' | 'Other';
}

export interface EmailParser {
  canParse(from: string, subject: string): boolean;
  parse(text: string, subject: string, html?: string): ExtractedLead;
}
