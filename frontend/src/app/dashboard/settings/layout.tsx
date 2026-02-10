'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { getMe } from '@/lib/api';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: user } = useSWR('/me', getMe);
  const isAdmin = user?.role === 'ADMIN';

  const tabs = [
    { name: 'Integrationen', href: '/dashboard/settings/integrations' },
    { name: 'Portale', href: '/dashboard/settings/portals' },
    { name: 'E-Mail', href: '/dashboard/settings/email' },
    { name: 'Jarvis (KI)', href: '/dashboard/settings/jarvis' },
    { name: 'Profil', href: '/dashboard/settings/profile' },
    { name: 'Abrechnung', href: '/dashboard/settings/billing', adminOnly: true },
  ];

  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-8 pt-2 pb-0 relative z-10 bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {visibleTabs.map((tab) => (
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
