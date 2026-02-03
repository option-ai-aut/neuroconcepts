import { PrismaClient } from '@prisma/client';

// Prisma client will be injected from index.ts
let prisma: PrismaClient;

export function setPrismaClient(client: PrismaClient) {
  prisma = client;
}

export class TemplateService {
  
  /**
   * Replaces placeholders like {{lead.firstName}} with actual data.
   */
  static render(templateBody: string, context: any): string {
    return templateBody.replace(/\{\{([\w\.]+)\}\}/g, (match, path) => {
      const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], context);
      return value !== undefined ? value : match;
    });
  }

  static async createDefaultTemplates(tenantId: string) {
    await prisma.emailTemplate.create({
      data: {
        tenantId,
        name: 'Standard Exposé',
        subject: 'Ihr Exposé für {{property.title}}',
        body: `
Hallo {{lead.firstName}} {{lead.lastName}},

vielen Dank für Ihr Interesse an "{{property.title}}".

Hier sind die wichtigsten Daten:
- Adresse: {{property.address}}
- Preis: {{property.price}} €
- Zimmer: {{property.rooms}}

Anbei finden Sie das ausführliche Exposé.

Mit freundlichen Grüßen,
{{user.name}}
        `.trim(),
        isDefault: true,
        variables: ['lead.firstName', 'lead.lastName', 'property.title', 'property.address', 'property.price', 'property.rooms', 'user.name']
      }
    });
  }

  static async getTemplateForProperty(tenantId: string, propertyId: string) {
    // Logic to find specific template for property or fallback to default
    const template = await prisma.emailTemplate.findFirst({
      where: { tenantId, isDefault: true }
    });
    return template;
  }
}
