'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';
import { useState } from 'react';
import { 
  LayoutDashboard, Users, Settings, LogOut, Inbox,
  Calendar, FileText, MessageSquare, Wand2, Activity
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

  const isActive = (itemHref: string) => {
    if (itemHref === '/dashboard') return pathname === '/dashboard';
    if (itemHref === '/dashboard/crm/leads') return pathname.startsWith('/dashboard/crm');
    
    return pathname.startsWith(itemHref);
  };

  return (
    <div 
      className="hidden lg:flex flex-col bg-gray-950 dark:bg-[#0a0a0a] h-screen relative z-20 will-change-[width] transition-[width] duration-200 ease-out"
      style={{ width: isHovered ? '256px' : '80px' }}
      onMouseEnter={() => { setIsHovered(true); setSidebarExpanded(true); }}
      onMouseLeave={() => { setIsHovered(false); setSidebarExpanded(false); }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-5 shrink-0 overflow-hidden">
        <Image src="/logo-icon-only.png" alt="Immivo" width={32} height={32} className="shrink-0 ml-1" />
        <span 
          className="ml-3 text-white font-semibold text-lg tracking-wide whitespace-nowrap transition-opacity duration-200"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          immivo
        </span>
      </div>
      
      {/* Main Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto py-6 px-3 space-y-1">
        {mainNavigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center pl-[17px] pr-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
              isActive(item.href)
                ? 'bg-white text-gray-950'
                : 'text-gray-500 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <item.icon className={`w-5 h-5 shrink-0 ${isActive(item.href) ? 'text-gray-950' : 'text-gray-500'}`} />
            <span className={`ml-3 whitespace-nowrap transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              {item.name}
            </span>
          </Link>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="px-3 pb-4 space-y-1">
        <Link
          href="/dashboard/settings"
          className={`flex items-center pl-[17px] pr-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
            pathname.includes('/settings') ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5 shrink-0 text-gray-500" />
          <span className={`ml-3 whitespace-nowrap transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            Einstellungen
          </span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center pl-[17px] pr-3 py-2.5 text-sm font-medium text-gray-500 rounded-md hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={`ml-3 whitespace-nowrap transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            Abmelden
          </span>
        </button>
      </div>
    </div>
  );
}
