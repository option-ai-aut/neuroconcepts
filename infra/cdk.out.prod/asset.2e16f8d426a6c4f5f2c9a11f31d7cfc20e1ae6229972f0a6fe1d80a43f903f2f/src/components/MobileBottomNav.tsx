'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Inbox, Users, Calendar, MessageSquare, Activity } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const NAV_ITEMS = [
    { name: t('home'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('activities'), href: '/dashboard/activities', icon: Activity },
    { name: t('mailbox'), href: '/dashboard/inbox', icon: Inbox },
    { name: t('crm'), href: '/dashboard/crm/leads', icon: Users },
    { name: t('calendar'), href: '/dashboard/calendar', icon: Calendar },
    { name: t('team'), href: '/dashboard/assistant', icon: MessageSquare },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/dashboard/crm/leads') return pathname.startsWith('/dashboard/crm');
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#111111] border-t border-gray-200 dark:border-gray-800 z-40 safe-bottom transition-colors" style={{ touchAction: 'none' }}>
      <div className="flex items-center justify-around h-14 px-1 mobile-bottom-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            prefetch={false}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
              isActive(item.href) ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600 active:text-gray-600'
            }`}
          >
            <item.icon className={`w-5 h-5 ${isActive(item.href) ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] font-medium leading-none">{item.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
