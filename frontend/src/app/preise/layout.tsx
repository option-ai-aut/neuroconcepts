import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preise — Flexible Tarife für Makler & Teams',
  description: 'Immivo AI Preise: Ab 99€/Monat. Solo, Team und Enterprise Pläne für Einzelmakler und Teams. 7 Tage kostenlos testen, keine Kreditkarte nötig.',
  openGraph: {
    title: 'Immivo AI Preise — Ab 99€/Monat',
    description: 'Flexible Tarife für Einzelmakler und Teams. KI-Assistent, CRM, Exposé-Editor, 24 Portale und mehr. 7 Tage kostenlos testen.',
    url: 'https://immivo.ai/preise',
  },
  alternates: {
    canonical: 'https://immivo.ai/preise',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Immivo AI',
  description: 'KI-gesteuertes Betriebssystem für Immobilienmakler mit Jarvis KI-Assistent, CRM, Exposé-Editor und 24 Portal-Integrationen.',
  brand: { '@type': 'Brand', name: 'Immivo AI' },
  url: 'https://immivo.ai/preise',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free Trial',
      description: '7 Tage kostenlos testen — Jarvis auf 20 Eingaben, Bildstudio auf 3 Generierungen',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: 'https://immivo.ai/login',
    },
    {
      '@type': 'Offer',
      name: 'Solo',
      description: 'Für Einzelmakler — 1 Seat, Zugriff auf alle Features',
      price: '99',
      priceCurrency: 'EUR',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '99',
        priceCurrency: 'EUR',
        billingDuration: 'P1M',
      },
      availability: 'https://schema.org/InStock',
      url: 'https://immivo.ai/login',
    },
    {
      '@type': 'Offer',
      name: 'Team',
      description: 'Für kleine Maklerteams — 3 Seats inklusive, Team-Verwaltung',
      price: '249',
      priceCurrency: 'EUR',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '249',
        priceCurrency: 'EUR',
        billingDuration: 'P1M',
      },
      availability: 'https://schema.org/InStock',
      url: 'https://immivo.ai/login',
    },
    {
      '@type': 'Offer',
      name: 'Enterprise',
      description: 'Für große Teams — bis zu 10 Seats, eigene Domain, dedizierter Account Manager, API-Zugang',
      price: '699',
      priceCurrency: 'EUR',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '699',
        priceCurrency: 'EUR',
        billingDuration: 'P1M',
      },
      availability: 'https://schema.org/InStock',
      url: 'https://immivo.ai/kontakt',
    },
  ],
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Kann ich Immivo jederzeit kündigen?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ja, du kannst dein Abo jederzeit zum Ende des Abrechnungszeitraums kündigen. Keine Mindestlaufzeit, keine versteckten Kosten.',
      },
    },
    {
      '@type': 'Question',
      name: 'Gibt es eine kostenlose Testphase?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '1 Woche kostenlos testen — ohne Kreditkarte. Alle Grundfunktionen stehen dir zur Verfügung. Nach der Testphase kannst du auf einen kostenpflichtigen Plan wechseln oder pausieren.',
      },
    },
    {
      '@type': 'Question',
      name: 'Wie funktioniert die Jahresabrechnung?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Bei jährlicher Zahlung sparst du 10% gegenüber der monatlichen Abrechnung. Du kannst jederzeit zwischen monatlich und jährlich wechseln.',
      },
    },
    {
      '@type': 'Question',
      name: 'Wie viele Seats sind in den Plänen enthalten?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Solo beinhaltet 1 Seat, Team 3 Seats. Beim Enterprise-Plan sind bis zu 10 Seats inklusive — jeder weitere Seat kostet 50€/Monat zusätzlich.',
      },
    },
    {
      '@type': 'Question',
      name: 'Welche Zahlungsmethoden werden akzeptiert?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Wir akzeptieren Kreditkarte, SEPA-Lastschrift und Rechnung. Die Abrechnung erfolgt automatisch am Monats- oder Jahresende.',
      },
    },
    {
      '@type': 'Question',
      name: 'Ist Immivo DSGVO-konform?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ja. Wir hosten alle Daten DSGVO-konform auf AWS EU (Frankfurt). Alle Daten sind verschlüsselt. Keine Weitergabe an Dritte.',
      },
    },
    {
      '@type': 'Question',
      name: 'Was kostet Immivo AI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Immivo AI bietet 4 Pläne: Free Trial (7 Tage kostenlos), Solo (99€/Monat für Einzelmakler), Team (249€/Monat für 3 Seats) und Enterprise (699€/Monat für bis zu 10 Seats). Bei jährlicher Zahlung gibt es 10% Rabatt.',
      },
    },
  ],
};

export default function PreiseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
