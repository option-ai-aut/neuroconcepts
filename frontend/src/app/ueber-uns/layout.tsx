import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Über uns — Das Team hinter Immivo AI',
  description: 'Immivo AI wurde 2026 in Wien gegründet von Josef Leutgeb und Dennis Kral. Erfahre mehr über unsere Mission, Immobilienmakler mit KI zu unterstützen.',
  openGraph: {
    title: 'Über uns — Das Team hinter Immivo AI',
    description: 'Immivo AI wurde 2026 in Wien gegründet, um Immobilienmakler mit künstlicher Intelligenz zu unterstützen.',
    url: 'https://immivo.ai/ueber-uns',
  },
  alternates: {
    canonical: 'https://immivo.ai/ueber-uns',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'AboutPage',
      name: 'Über Immivo AI',
      description: 'Immivo AI wurde 2026 in Wien gegründet. Zwei Gründer, eine Mission: Makler von Büroarbeit befreien.',
      url: 'https://immivo.ai/ueber-uns',
      mainEntity: { '@id': 'https://immivo.ai/#organization' },
    },
    {
      '@type': 'Person',
      name: 'Josef Leutgeb',
      jobTitle: 'Co-Founder & CEO',
      email: 'josef.leutgeb@immivo.ai',
      worksFor: { '@id': 'https://immivo.ai/#organization' },
      description: 'Seriengründer mit Erfahrung im Aufbau mehrerer erfolgreicher Unternehmen. Verantwortlich für Strategie, Vertrieb und Partnerschaften.',
    },
    {
      '@type': 'Person',
      name: 'Dennis Kral',
      jobTitle: 'Technical Co-Founder & CTO',
      email: 'dennis.kral@immivo.ai',
      worksFor: { '@id': 'https://immivo.ai/#organization' },
      description: 'Einer der führenden KI-Spezialisten Österreichs. Verantwortlich für Technologie, Projektmanagement und Team.',
    },
  ],
};

export default function UeberUnsLayout({ children }: { children: React.ReactNode }) {
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
