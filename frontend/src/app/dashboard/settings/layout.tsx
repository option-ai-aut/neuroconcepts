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
    { name: 'Profil', href: '/dashboard/settings/profile' },
    { name: 'Abrechnung', href: '/dashboard/settings/billing' },
    { name: 'Vorlagen', href: '/dashboard/settings/templates' },
  ];

  return (
    <div>
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={`${
                pathname === tab.href
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
