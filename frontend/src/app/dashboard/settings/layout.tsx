'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Integrationen', href: '/dashboard/settings/integrations' },
    { name: 'Portale (Firma)', href: '/dashboard/settings/portals' },
    { name: 'Meine Portale', href: '/dashboard/settings/my-portals' },
    { name: 'Jarvis (KI)', href: '/dashboard/settings/jarvis' },
    { name: 'Vorlagen', href: '/dashboard/settings/templates' },
    { name: 'Profil', href: '/dashboard/settings/profile' },
    { name: 'Abrechnung', href: '/dashboard/settings/billing' },
  ];

  return (
    <div className="h-full flex flex-col relative bg-white">
      <div className="pt-8 px-8 pb-0">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-6">Einstellungen</h1>
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={`${
                pathname === tab.href
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-auto bg-white p-8 pt-8">
        <div className="max-w-5xl">
          {children}
        </div>
      </div>
    </div>
  );
}
