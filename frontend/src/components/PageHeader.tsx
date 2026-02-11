'use client';

import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, Inbox, Calendar, FileText, 
  MessageSquare, Wand2, Activity, Settings
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { useGlobalState } from '@/context/GlobalStateContext';
import useSWR from 'swr';
import { getMe } from '@/lib/api';

const PAGE_TITLES: Record<string, { title: string; icon: any }> = {
  '/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
  '/dashboard/activities': { title: 'Aktivitäten', icon: Activity },
  '/dashboard/inbox': { title: 'Posteingang', icon: Inbox },
  '/dashboard/crm/leads': { title: 'CRM', icon: Users },
  '/dashboard/crm/properties': { title: 'CRM', icon: Users },
  '/dashboard/calendar': { title: 'Kalender', icon: Calendar },
  '/dashboard/exposes': { title: 'Exposés & Vorlagen', icon: FileText },
  '/dashboard/image-studio': { title: 'KI-Bildstudio', icon: Wand2 },
  '/dashboard/assistant': { title: 'Team Chat', icon: MessageSquare },
  '/dashboard/settings': { title: 'Einstellungen', icon: Settings },
};

function getPageInfo(pathname: string) {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  
  // Prefix match (for sub-pages like /dashboard/settings/profile)
  const sorted = Object.keys(PAGE_TITLES).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (pathname.startsWith(key)) return PAGE_TITLES[key];
  }
  
  return { title: 'Dashboard', icon: LayoutDashboard };
}

export default function PageHeader() {
  const pathname = usePathname();
  const { data: user } = useSWR('/me', getMe);
  const { headerActions } = useGlobalState();
  const { title, icon: Icon } = getPageInfo(pathname);

  return (
    <div className="h-12 px-6 flex items-center justify-between bg-white border-b border-gray-100 shrink-0 z-10">
      {/* Left: Page Title */}
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-gray-400" />
        <h1 className="text-sm font-semibold text-gray-800">{title}</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Page-specific actions injected by child pages */}
        {headerActions}

        {/* Notifications */}
        <NotificationBell />

        {/* User Avatar */}
        {user && (
          <div 
            className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xs font-semibold cursor-default"
            title={`${user.firstName} ${user.lastName}`}
          >
            {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );
}
