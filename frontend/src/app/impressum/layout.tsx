import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum von Immivo AI. Angaben gemäß § 5 TMG / ECG.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://immivo.ai/impressum',
  },
};

export default function ImpressumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
