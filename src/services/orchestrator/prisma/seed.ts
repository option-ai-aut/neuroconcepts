import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Immivo Demo Real Estate',
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

  // 5. Seed Portals (DACH Region)
  // Connection types researched per portal:
  // - DE/AT: OpenImmo XML via FTP (Branchenstandard DACH)
  // - CH: IDX 3.01 (Schweizer Standard)
  // - REST API: ImmoScout24 DE, Flatfox CH
  const portals = [
    // Deutschland (13) - OpenImmo FTP except ImmoScout24 (REST API)
    { name: 'ImmobilienScout24', slug: 'immoscout24-de', country: 'DE', websiteUrl: 'https://www.immobilienscout24.de', connectionType: 'REST_API', isPremium: true },
    { name: 'Immowelt', slug: 'immowelt', country: 'DE', websiteUrl: 'https://www.immowelt.de', defaultFtpHost: 'ftp2.immowelt.net', connectionType: 'OPENIMMO_FTP' },
    { name: 'Immonet', slug: 'immonet', country: 'DE', websiteUrl: 'https://www.immonet.de', defaultFtpHost: 'ftp.immonet.de', connectionType: 'OPENIMMO_FTP' },
    { name: 'Kleinanzeigen', slug: 'kleinanzeigen', country: 'DE', websiteUrl: 'https://www.kleinanzeigen.de', connectionType: 'OPENIMMO_FTP' },
    { name: 'Kalaydo', slug: 'kalaydo', country: 'DE', websiteUrl: 'https://www.kalaydo.de', connectionType: 'OPENIMMO_FTP' },
    { name: 'Immozentral', slug: 'immozentral', country: 'DE', websiteUrl: 'https://www.immozentral.com', connectionType: 'OPENIMMO_FTP' },
    { name: 'Immopool', slug: 'immopool', country: 'DE', websiteUrl: 'https://www.immopool.de', connectionType: 'OPENIMMO_FTP' },
    { name: '1A Immobilien', slug: '1a-immobilien', country: 'DE', websiteUrl: 'https://www.1a-immobilienmarkt.de', connectionType: 'OPENIMMO_FTP' },
    { name: 'IVD24', slug: 'ivd24', country: 'DE', websiteUrl: 'https://www.ivd24immobilien.de', connectionType: 'OPENIMMO_FTP' },
    { name: 'Neubau Kompass', slug: 'neubau-kompass', country: 'DE', websiteUrl: 'https://www.neubaukompass.de', connectionType: 'OPENIMMO_FTP' },
    { name: 'Süddeutsche Zeitung', slug: 'sz-immo', country: 'DE', websiteUrl: 'https://immobilienmarkt.sueddeutsche.de', connectionType: 'OPENIMMO_FTP' },
    { name: 'FAZ Immobilien', slug: 'faz-immo', country: 'DE', websiteUrl: 'https://fazimmo.faz.net', connectionType: 'OPENIMMO_FTP' },
    { name: 'Welt Immobilien', slug: 'welt-immo', country: 'DE', websiteUrl: 'https://www.welt.de/immobilien', connectionType: 'OPENIMMO_FTP' },
    
    // Österreich (5) - Alle OpenImmo FTP
    { name: 'Willhaben', slug: 'willhaben', country: 'AT', websiteUrl: 'https://www.willhaben.at', connectionType: 'OPENIMMO_FTP' },
    { name: 'ImmobilienScout24 AT', slug: 'immoscout24-at', country: 'AT', websiteUrl: 'https://www.immobilienscout24.at', connectionType: 'OPENIMMO_FTP' },
    { name: 'Immmo.at', slug: 'immmo-at', country: 'AT', websiteUrl: 'https://www.immmo.at', connectionType: 'OPENIMMO_FTP' },
    { name: 'FindMyHome', slug: 'findmyhome', country: 'AT', websiteUrl: 'https://www.findmyhome.at', connectionType: 'OPENIMMO_FTP' },
    { name: 'Der Standard Immobilien', slug: 'derstandard-immo', country: 'AT', websiteUrl: 'https://immobilien.derstandard.at', connectionType: 'OPENIMMO_FTP' },
    
    // Schweiz (6) - IDX 3.01 (Schweizer Standard) except Flatfox (REST API)
    { name: 'Homegate', slug: 'homegate', country: 'CH', websiteUrl: 'https://www.homegate.ch', connectionType: 'IDX' },
    { name: 'ImmoScout24 CH', slug: 'immoscout24-ch', country: 'CH', websiteUrl: 'https://www.immoscout24.ch', connectionType: 'IDX' },
    { name: 'Comparis', slug: 'comparis', country: 'CH', websiteUrl: 'https://www.comparis.ch/immobilien', connectionType: 'IDX' },
    { name: 'Newhome', slug: 'newhome', country: 'CH', websiteUrl: 'https://www.newhome.ch', connectionType: 'IDX' },
    { name: 'ImmoStreet', slug: 'immostreet', country: 'CH', websiteUrl: 'https://www.immostreet.ch', connectionType: 'IDX' },
    { name: 'Flatfox', slug: 'flatfox', country: 'CH', websiteUrl: 'https://flatfox.ch', connectionType: 'REST_API' },
  ];

  for (const portal of portals) {
    await prisma.portal.upsert({
      where: { slug: portal.slug },
      update: {},
      create: {
        name: portal.name,
        slug: portal.slug,
        country: portal.country,
        websiteUrl: portal.websiteUrl,
        defaultFtpHost: portal.defaultFtpHost || null,
        connectionType: portal.connectionType as any,
        isPremium: portal.isPremium || false,
      }
    });
  }
  console.log(`Seeded ${portals.length} portals`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
