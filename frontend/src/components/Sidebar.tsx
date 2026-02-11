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
  MessageSquare,
  Wand2,
  Activity
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useGlobalState } from '@/context/GlobalStateContext';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setSidebarExpanded } = useGlobalState();
  const [isHovered, setIsHovered] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Aktivitäten', href: '/dashboard/activities', icon: Activity },
    { name: 'Posteingang', href: '/dashboard/inbox', icon: Inbox },
    { name: 'CRM', href: '/dashboard/crm/leads', icon: Users },
    { name: 'Kalender', href: '/dashboard/calendar', icon: Calendar },
    { name: 'Exposés', href: '/dashboard/exposes', icon: FileText },
    { name: 'Bildstudio', href: '/dashboard/image-studio', icon: Wand2 },
    { name: 'Team Chat', href: '/dashboard/assistant', icon: MessageSquare },
  ];

  // Helper to check if a link is active (exact match or specific sub-paths)
  const isActive = (itemHref: string) => {
    if (itemHref === '/dashboard') {
      return pathname === '/dashboard';
    }
    // Special handling for CRM - active for all /dashboard/crm/* routes
    if (itemHref === '/dashboard/crm/leads') {
      return pathname.startsWith('/dashboard/crm');
    }
    return pathname.startsWith(itemHref);
  };

  return (
    <div 
      className={`hidden md:flex flex-col bg-slate-900 h-screen relative z-20 transition-all duration-300 ease-in-out ${
        isHovered ? 'w-64' : 'w-20'
      }`}
      onMouseEnter={() => {
        setIsHovered(true);
        setSidebarExpanded(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setSidebarExpanded(false);
      }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-6 shrink-0 overflow-hidden">
        <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center shrink-0 shadow-md shadow-indigo-900/50">
          <span className="text-white font-bold text-lg">N</span>
        </div>
        <span className={`text-white font-bold text-lg tracking-tight ml-3 whitespace-nowrap transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          Immivo
        </span>
      </div>
      
      {/* Main Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto py-6 px-3 space-y-1">
        {mainNavigation.map((item) => (
          <div key={item.name}>
            <Link
              href={item.href}
              className={`flex items-center pl-[17px] pr-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${isActive(item.href) ? 'text-white' : 'text-gray-400'}`} />
              <span className={`ml-3 whitespace-nowrap transition-opacity duration-300 ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}>
                {item.name}
              </span>
            </Link>
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="px-3 pb-4 space-y-1">
        <Link
          href="/dashboard/settings"
          className={`flex items-center pl-[17px] pr-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
            pathname.includes('/settings')
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5 shrink-0 text-gray-400" />
          <span className={`ml-3 whitespace-nowrap transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            Einstellungen
          </span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center pl-[17px] pr-3 py-2.5 text-sm font-medium text-red-400 rounded-md hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={`ml-3 whitespace-nowrap transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            Abmelden
          </span>
        </button>
      </div>
    </div>
  );
}
