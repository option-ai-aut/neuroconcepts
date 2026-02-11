import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preise — Flexible Tarife für Makler & Teams',
  description: 'Immivo AI Preise: Ab 49€/Monat. Starter, Professional und Enterprise Pläne für Einzelmakler und Teams. 14 Tage kostenlos testen, keine Kreditkarte nötig.',
  openGraph: {
    title: 'Immivo AI Preise — Ab 49€/Monat',
    description: 'Flexible Tarife für Einzelmakler und Teams. KI-Assistent, CRM, Exposé-Editor und mehr. 14 Tage kostenlos testen.',
    url: 'https://immivo.ai/preise',
  },
  alternates: {
    canonical: 'https://immivo.ai/preise',
  },
};

export default function PreiseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
