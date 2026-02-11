import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Datenschutzerklärung von Immivo AI. Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://immivo.ai/datenschutz',
  },
};

export default function DatenschutzLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
