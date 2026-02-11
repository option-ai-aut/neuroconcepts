'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Loader2, LayoutDashboard, Users, MessageSquare, Calendar, 
  HeadphonesIcon, DollarSign, Activity, TrendingUp, 
  ClipboardList, Settings, LogOut, ChevronLeft, ChevronRight,
  Shield, Bell, Search, Command
} from 'lucide-react';
import { useRuntimeConfig } from '@/components/RuntimeConfigProvider';

const NAV_SECTIONS = [
  {
    label: 'Übersicht',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Team',
    items: [
      { name: 'Mitarbeiter', href: '/admin/users', icon: Users },
      { name: 'Team Chat', href: '/admin/chat', icon: MessageSquare },
      { name: 'Kalender', href: '/admin/calendar', icon: Calendar },
    ],
  },
  {
    label: 'Betrieb',
    items: [
      { name: 'Support & Tickets', href: '/admin/support', icon: HeadphonesIcon },
      { name: 'Sales & Pipeline', href: '/admin/sales', icon: TrendingUp },
      { name: 'Finance', href: '/admin/finance', icon: DollarSign },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Operations', href: '/admin/operations', icon: Activity },
      { name: 'Audit Log', href: '/admin/audit', icon: ClipboardList },
      { name: 'Einstellungen', href: '/admin/settings', icon: Settings },
    ],
  },
];

function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className={`flex flex-col bg-gray-950 h-screen fixed z-30 border-r border-gray-800/50 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center h-14 px-4 shrink-0 border-b border-gray-800/50">
        <div className="w-8 h-8 shrink-0">
          <Image src="/logo-icon-only.png" alt="Immivo" width={32} height={32} />
        </div>
        {!collapsed && (
          <div className="ml-3 flex items-center gap-2">
            <span className="text-white font-bold text-sm tracking-tight">Admin</span>
            <span className="text-[9px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5">SUPER</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{section.label}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg transition-all ${
                    isActive(item.href)
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 border border-transparent'
                  }`}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className={`w-4 h-4 shrink-0 ${isActive(item.href) ? 'text-indigo-400' : 'text-gray-500'}`} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="p-2 space-y-1 border-t border-gray-800/50">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[13px] text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Einklappen</span></>}
        </button>
        <button
          onClick={async () => {
            await signOut();
            window.location.href = '/admin/login';
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Abmelden</span>}
        </button>
      </div>
    </div>
  );
}

function AdminTopBar() {
  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span>Suchen...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-100 border border-gray-200 rounded font-mono">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-gray-900 leading-none">Dennis Kral</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">Super Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const config = useRuntimeConfig();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Configure Amplify with Admin User Pool
  useEffect(() => {
    if (config.adminUserPoolId && config.adminUserPoolClientId) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: config.adminUserPoolId,
            userPoolClientId: config.adminUserPoolClientId,
          }
        }
      });
    }
  }, [config]);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const session = await fetchAuthSession();
        if (session.tokens) {
          setIsAuthenticated(true);
        } else {
          router.replace('/admin/login');
        }
      } catch {
        router.replace('/admin/login');
      }
    };

    if (config.adminUserPoolId) {
      checkAuth();
    }
  }, [router, config, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Admin wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'ml-[68px]' : 'ml-64'}`}>
        <AdminTopBar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
