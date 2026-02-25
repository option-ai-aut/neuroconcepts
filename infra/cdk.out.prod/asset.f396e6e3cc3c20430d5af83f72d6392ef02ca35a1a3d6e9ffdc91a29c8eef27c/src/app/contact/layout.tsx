import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kontakt — Schreib uns',
  description: 'Kontaktiere das Immivo AI Team. E-Mail: office@immivo.ai, Telefon: +43 670 355 1221. Sterngasse 3, 1010 Wien.',
  openGraph: {
    title: 'Kontakt — Immivo AI',
    description: 'Kontaktiere das Immivo AI Team. Wir beantworten deine Fragen zu unserer KI-Plattform für Immobilienmakler.',
    url: 'https://immivo.ai/contact',
  },
  alternates: {
    canonical: 'https://immivo.ai/contact',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://immivo.ai/#localbusiness',
  name: 'Immivo GmbH',
  description: 'KI-gesteuertes Betriebssystem für Immobilienmakler',
  url: 'https://immivo.ai',
  telephone: '+436703551221',
  email: 'office@immivo.ai',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Sterngasse 3',
    addressLocality: 'Wien',
    postalCode: '1010',
    addressCountry: 'AT',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 48.2112,
    longitude: 16.3699,
  },
  priceRange: '€€',
  image: 'https://immivo.ai/logo-black.png',
  sameAs: [],
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '09:00',
    closes: '18:00',
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'office@immivo.ai',
      telephone: '+436703551221',
      availableLanguage: ['German', 'English'],
    },
    {
      '@type': 'ContactPoint',
      contactType: 'technical support',
      email: 'support@immivo.ai',
      availableLanguage: ['German', 'English'],
    },
  ],
};

export default function KontaktLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
