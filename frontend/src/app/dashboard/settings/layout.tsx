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
    { name: 'E-Mail', href: '/dashboard/settings/email' },
    { name: 'Kalender', href: '/dashboard/settings/calendar' },
    { name: 'Jarvis (KI)', href: '/dashboard/settings/jarvis' },
    { name: 'Profil', href: '/dashboard/settings/profile' },
    { name: 'Abrechnung', href: '/dashboard/settings/billing' },
    { name: 'Vorlagen', href: '/dashboard/settings/templates' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 bg-white px-6 pt-6 pb-0 shadow-sm z-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Einstellungen</h1>
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
      <div className="flex-1 overflow-auto bg-gray-50/30 p-8">
        <div className="max-w-3xl">
          {children}
        </div>
      </div>
    </div>
  );
}
