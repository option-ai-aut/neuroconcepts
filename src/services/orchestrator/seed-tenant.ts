import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'default-tenant';
  
  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: 'Immivo HQ'
    }
  });
  
  console.log('Tenant upserted:', tenant);

  // Create a dummy property for the test
  const propertyId = '12345';
  const property = await prisma.property.upsert({
    where: { id: propertyId },
    update: {},
    create: {
      id: propertyId,
      tenantId: tenantId,
      title: 'Schöne Wohnung in Berlin',
      address: 'Berlin Mitte',
      price: 1500,
      rooms: 3,
      area: 85,
      description: 'Tolle Wohnung',
      aiFacts: 'Haustiere erlaubt'
    }
  });
  console.log('Property upserted:', property);

  // Create a dummy template
  const template = await prisma.emailTemplate.create({
    data: {
      tenantId: tenantId,
      name: 'Exposé Default',
      subject: 'Ihr Exposé für {{property.title}}',
      body: 'Hallo {{lead.firstName}}, hier ist das Exposé für {{property.title}}. Preis: {{property.price}}.',
      isDefault: true
    }
  });
  console.log('Template created:', template);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
