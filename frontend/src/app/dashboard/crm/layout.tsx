'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Leads', href: '/dashboard/crm/leads' },
    { name: 'Objekte', href: '/dashboard/crm/properties' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 bg-white px-6 pt-6 pb-0 shadow-sm z-10 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">CRM</h1>
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-auto bg-gray-50/30">
        {children}
      </div>
    </div>
  );
}
