'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Settings, 
  LogOut, 
  ChevronDown,
  Inbox,
  Calendar,
  FileText,
  MessageSquare
} from 'lucide-react';

import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [crmOpen, setCrmOpen] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Posteingang', href: '/dashboard/inbox', icon: Inbox },
    { name: 'CRM', href: '/dashboard/crm/leads', icon: Users },
    { name: 'Kalender', href: '/dashboard/calendar', icon: Calendar },
    { name: 'Exposés', href: '/dashboard/exposes', icon: FileText },
    { name: 'Team Chat', href: '/dashboard/assistant', icon: MessageSquare },
  ];

  // Helper to check if a link is active (exact match or specific sub-paths)
  const isActive = (itemHref: string) => {
    if (itemHref === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(itemHref);
  };

  return (
    <div className="flex flex-col w-64 bg-slate-900 h-screen border-r border-gray-800 shadow-sm">
      <div className="flex items-center h-16 px-6 shrink-0">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-md shadow-indigo-900/50">
          <span className="text-white font-bold text-lg">N</span>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">NeuroConcepts</span>
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto py-6 px-3 space-y-1">
        {mainNavigation.map((item) => (
          <div key={item.name}>
            <Link
              href={item.href}
              className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
              {item.name}
            </Link>
          </div>
        ))}
      </div>

      <div className="p-4 space-y-1">
        <Link
          href="/dashboard/settings"
          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
            pathname.includes('/settings')
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5 mr-3 text-gray-400" />
          Einstellungen
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-400 rounded-xl hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Abmelden
        </button>
      </div>
    </div>
  );
}
