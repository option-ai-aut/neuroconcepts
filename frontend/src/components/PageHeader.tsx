'use client';

import { useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, Inbox, Calendar, FileText, 
  MessageSquare, Wand2, Activity, Settings, RefreshCw,
  Sun, Moon, Bug, LogOut
} from 'lucide-react';
import { signOut } from 'aws-amplify/auth';
import NotificationBell from '@/components/NotificationBell';
import { useGlobalState } from '@/context/GlobalStateContext';
import { useDarkMode } from '@/context/DarkModeContext';
import { useSWRConfig } from 'swr';
import useSWR from 'swr';
import { getMe } from '@/lib/api';
import { useTranslations } from 'next-intl';

const PAGE_ICONS: Record<string, any> = {
  '/dashboard': LayoutDashboard,
  '/dashboard/activities': Activity,
  '/dashboard/inbox': Inbox,
  '/dashboard/crm/leads': Users,
  '/dashboard/crm/properties': Users,
  '/dashboard/calendar': Calendar,
  '/dashboard/exposes': FileText,
  '/dashboard/image-studio': Wand2,
  '/dashboard/assistant': MessageSquare,
  '/dashboard/settings': Settings,
};

const PAGE_TITLE_KEYS: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/dashboard/activities': 'activities',
  '/dashboard/inbox': 'inbox',
  '/dashboard/crm/leads': 'crm',
  '/dashboard/crm/properties': 'crm',
  '/dashboard/calendar': 'calendar',
  '/dashboard/exposes': 'exposesAndTemplates',
  '/dashboard/image-studio': 'aiImageStudio',
  '/dashboard/assistant': 'teamChat',
  '/dashboard/settings': 'settings',
};

function getPageInfo(pathname: string): { titleKey: string; icon: any } {
  if (PAGE_TITLE_KEYS[pathname]) return { titleKey: PAGE_TITLE_KEYS[pathname], icon: PAGE_ICONS[pathname] };
  
  const sorted = Object.keys(PAGE_TITLE_KEYS).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (pathname.startsWith(key)) return { titleKey: PAGE_TITLE_KEYS[key], icon: PAGE_ICONS[key] };
  }
  
  return { titleKey: 'dashboard', icon: LayoutDashboard };
}

export default function PageHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: user } = useSWR('/me', getMe);
  const { headerActions, openDrawer } = useGlobalState();
  const { isDark, toggleDarkMode } = useDarkMode();
  const t = useTranslations('nav');
  const { titleKey, icon: Icon } = getPageInfo(pathname);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await mutate(() => true, undefined, { revalidate: true });
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="h-12 px-4 lg:px-6 flex items-center justify-between bg-white shrink-0 z-10 border-b border-gray-100 dark:border-gray-800" style={{ touchAction: 'none' }}>
      {/* Left: Brand (mobile) + Page Title */}
      <div className="flex items-center gap-2.5">
        {/* Mobile brand logo */}
        <Image src="/logo-icon-only.png" alt="Immivo" width={28} height={28} className="lg:hidden shrink-0" />
        <Icon className="w-4 h-4 text-gray-400 hidden lg:block" />
        <h1 className="text-sm font-semibold text-gray-800">{t(titleKey)}</h1>
      </div>

      {/* Right: Actions */}
        <div className="flex items-center gap-1.5 lg:gap-2">
        {/* Page-specific actions (desktop only) */}
        <div className="hidden lg:flex items-center gap-2">
          {headerActions}
        </div>

        {/* Bug Report */}
        <button
          onClick={() => openDrawer('BUG_REPORT')}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title={t('reportBug')}
        >
          <Bug className="w-4 h-4" />
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          title={isDark ? t('lightMode') : t('darkMode')}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all ${refreshing ? 'animate-spin' : ''}`}
          title={t('refresh') as string}
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Logout (mobile only) */}
        <button
          onClick={async () => { await signOut(); router.push('/login'); }}
          className="lg:hidden p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title={t('signOut')}
        >
          <LogOut className="w-4 h-4" />
        </button>

        {/* User Avatar (desktop only) — click to go to profile */}
        {user && (
          <button 
            onClick={() => router.push('/dashboard/settings/profile')}
            className="hidden lg:flex w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-full items-center justify-center text-gray-600 text-xs font-semibold cursor-pointer transition-colors"
            title={`${user.firstName} ${user.lastName}`}
          >
            {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
          </button>
        )}
      </div>
    </div>
  );
}
