import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Allgemeine Geschäftsbedingungen',
  description: 'AGB von Immivo AI. Allgemeine Geschäftsbedingungen für die Nutzung unserer KI-Plattform für Immobilienmakler.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://immivo.ai/agb',
  },
};

export default function AgbLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
