import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — KI, Immobilien & Makler-Tipps',
  description: 'Der Immivo AI Blog: Aktuelle Artikel über KI in der Immobilienbranche, Marketing-Tipps für Makler, Virtual Staging, Exposé-Best-Practices und mehr.',
  openGraph: {
    title: 'Immivo AI Blog — KI & Immobilien',
    description: 'Aktuelle Artikel über KI in der Immobilienbranche, Marketing-Tipps für Makler und mehr.',
    url: 'https://immivo.ai/blog',
  },
  alternates: {
    canonical: 'https://immivo.ai/blog',
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
