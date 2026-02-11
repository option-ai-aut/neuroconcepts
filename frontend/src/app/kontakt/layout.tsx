import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kontakt — Schreib uns',
  description: 'Kontaktiere das Immivo AI Team. Wir beantworten deine Fragen zu unserer KI-Plattform für Immobilienmakler. E-Mail: hello@immivo.ai',
  openGraph: {
    title: 'Kontakt — Immivo AI',
    description: 'Kontaktiere das Immivo AI Team. Wir beantworten deine Fragen zu unserer KI-Plattform für Immobilienmakler.',
    url: 'https://immivo.ai/kontakt',
  },
  alternates: {
    canonical: 'https://immivo.ai/kontakt',
  },
};

export default function KontaktLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
