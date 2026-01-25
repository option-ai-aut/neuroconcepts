import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'NeuroConcepts Demo Real Estate',
      settings: {
        create: {
          aiPersonality: { tone: 'professional', language: 'de' }
        }
      }
    }
  });
  console.log('Created Tenant:', tenant.id);

  // 2. Create Property
  const property = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      title: 'Moderne 3-Zimmer Wohnung in Berlin-Mitte',
      address: 'Torstraße 123, 10119 Berlin',
      price: 1500,
      rooms: 3,
      area: 85.5,
      description: 'Helle Altbauwohnung mit Balkon und Einbauküche.',
      aiFacts: 'Haustiere nach Absprache. Frühestens ab 01.05. verfügbar.'
    }
  });
  console.log('Created Property:', property.id);

  // 3. Create Lead
  const lead = await prisma.lead.create({
    data: {
      tenantId: tenant.id,
      email: 'max.mustermann@example.com',
      firstName: 'Max',
      lastName: 'Mustermann',
      phone: '+49 170 1234567',
      status: 'NEW',
      propertyId: property.id,
      messages: {
        create: [
          {
            role: 'USER',
            content: 'Guten Tag, ich interessiere mich für die Wohnung in der Torstraße. Ist eine Besichtigung möglich?'
          }
        ]
      }
    }
  });
  console.log('Created Lead:', lead.id);

  // 4. Create Template
  await prisma.emailTemplate.create({
    data: {
      tenantId: tenant.id,
      name: 'Standard Exposé',
      subject: 'Exposé: {{property.title}}',
      body: 'Hallo {{lead.firstName}},\n\nanbei das Exposé für {{property.title}}.\nPreis: {{property.price}} €\n\nViele Grüße,\nIhr Team',
      isDefault: true
    }
  });
  console.log('Created Template');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
