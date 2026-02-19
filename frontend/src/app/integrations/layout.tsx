import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Integrationen — ImmoScout, Willhaben, Google & mehr',
  description: 'Immivo AI integriert sich nahtlos mit ImmoScout24, Willhaben, Immowelt, Google Workspace, Microsoft 365 und allen gängigen Immobilienportalen.',
  openGraph: {
    title: 'Immivo AI Integrationen — Alle Portale & Tools',
    description: 'Nahtlose Integration mit ImmoScout24, Willhaben, Immowelt, Google Workspace, Microsoft 365 und mehr.',
    url: 'https://immivo.ai/integrations',
  },
  alternates: {
    canonical: 'https://immivo.ai/integrations',
  },
};

export default function IntegrationenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
