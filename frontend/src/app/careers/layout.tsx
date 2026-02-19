import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Karriere — Arbeite an der Zukunft der Immobilienbranche',
  description: 'Jobs bei Immivo AI: Werde Teil unseres Teams und arbeite an der KI-Revolution in der Immobilienbranche. Remote-freundlich, Startup-Kultur, modernste Technologien.',
  openGraph: {
    title: 'Karriere bei Immivo AI',
    description: 'Werde Teil unseres Teams und arbeite an der KI-Revolution in der Immobilienbranche.',
    url: 'https://immivo.ai/careers',
  },
  alternates: {
    canonical: 'https://immivo.ai/careers',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EmployerAggregateRating',
  itemReviewed: {
    '@type': 'Organization',
    name: 'Immivo GmbH',
    sameAs: 'https://immivo.ai',
    logo: 'https://immivo.ai/logo-black.png',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Sterngasse 3',
      addressLocality: 'Wien',
      postalCode: '1010',
      addressCountry: 'AT',
    },
  },
};

export default function KarriereLayout({ children }: { children: React.ReactNode }) {
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
