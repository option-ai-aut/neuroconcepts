import { handler } from './index';

const event = {
  isLocal: true,
  from: 'anfrage@immobilienscout24.de',
  subject: 'Anfrage zu Objekt 12345',
  body: `
    Neue Anfrage über ImmobilienScout24
    
    Objekt: Schöne Wohnung in Berlin
    Scout-ID: 12345
    
    Anfragedaten:
    Name: Max Mustermann
    E-Mail: max.mustermann@example.com
    Telefon: 0123 456789
    
    Nachricht:
    Hallo, ich interessiere mich für die Wohnung. Wann ist eine Besichtigung möglich?
    
    Viele Grüße
    Max
  `
};

// Mock Context
const context: any = {};

handler(event, context).then(() => {
  console.log('Test finished');
}).catch(err => {
  console.error('Test failed', err);
});
