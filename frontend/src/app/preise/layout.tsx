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

export default function PreiseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
