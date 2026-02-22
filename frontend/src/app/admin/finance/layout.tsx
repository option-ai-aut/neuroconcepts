'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CreditCard } from 'lucide-react';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: '/admin/finance', label: 'Technische Kosten', icon: BarChart3 },
    { href: '/admin/finance/stripe', label: 'Stripe', icon: CreditCard },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(tab => {
          const isActive = tab.href === '/admin/finance' 
            ? pathname === '/admin/finance' 
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
