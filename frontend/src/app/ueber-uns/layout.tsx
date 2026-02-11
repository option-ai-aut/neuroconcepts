import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Über uns — Das Team hinter Immivo AI',
  description: 'Immivo AI wurde gegründet, um Immobilienmakler mit künstlicher Intelligenz zu unterstützen. Erfahre mehr über unsere Mission, unser Team und unsere Vision.',
  openGraph: {
    title: 'Über uns — Das Team hinter Immivo AI',
    description: 'Immivo AI wurde gegründet, um Immobilienmakler mit künstlicher Intelligenz zu unterstützen.',
    url: 'https://immivo.ai/ueber-uns',
  },
  alternates: {
    canonical: 'https://immivo.ai/ueber-uns',
  },
};

export default function UeberUnsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
