import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Karriere — Arbeite an der Zukunft der Immobilienbranche',
  description: 'Jobs bei Immivo AI: Werde Teil unseres Teams und arbeite an der KI-Revolution in der Immobilienbranche. Remote-freundlich, Startup-Kultur, modernste Technologien.',
  openGraph: {
    title: 'Karriere bei Immivo AI',
    description: 'Werde Teil unseres Teams und arbeite an der KI-Revolution in der Immobilienbranche.',
    url: 'https://immivo.ai/karriere',
  },
  alternates: {
    canonical: 'https://immivo.ai/karriere',
  },
};

export default function KarriereLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
