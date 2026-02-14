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
  ClipboardList, Settings, LogOut,
  Shield, Bell, Search, Command, Mail, Inbox,
  Newspaper, Briefcase, Megaphone
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
    label: 'Kommunikation',
    items: [
      { name: 'Posteingang', href: '/admin/inbox', icon: Inbox },
      { name: 'Kontaktanfragen', href: '/admin/contacts', icon: Mail },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { name: 'Blog', href: '/admin/blog', icon: Newspaper },
      { name: 'Newsletter', href: '/admin/newsletter', icon: Megaphone },
      { name: 'Karriere', href: '/admin/karriere', icon: Briefcase },
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
      { name: 'Bug Reports', href: '/admin/support', icon: HeadphonesIcon },
      { name: 'Tenants', href: '/admin/sales', icon: TrendingUp },
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

function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col bg-gray-950 h-screen fixed z-30 border-r border-gray-800/50 w-52">
      {/* Logo */}
      <div className="flex items-center h-14 px-3 shrink-0 border-b border-gray-800/50">
        <div className="w-7 h-7 shrink-0">
          <Image src="/logo-icon-only.png" alt="Immivo" width={28} height={28} />
        </div>
        <span className="ml-2.5 text-white font-bold text-sm tracking-tight">Immivo</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-1.5 space-y-4 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-2.5 mb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] font-medium rounded-lg transition-all ${
                    isActive(item.href)
                      ? 'bg-white text-gray-950'
                      : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-200'
                  }`}
                >
                  <item.icon className={`w-4 h-4 shrink-0 ${isActive(item.href) ? 'text-gray-950' : 'text-gray-500'}`} />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="p-1.5 border-t border-gray-800/50">
        <button
          onClick={async () => {
            await signOut();
            window.location.href = '/admin/login';
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] text-gray-500 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Abmelden</span>
        </button>
      </div>
    </div>
  );
}

function AdminTopBar() {
  const router = useRouter();

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Suchen...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-100 border border-gray-200 rounded font-mono">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <button 
          onClick={() => router.push('/admin/contacts')}
          className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Kontaktanfragen & Benachrichtigungen"
        >
          <Bell className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gray-800 rounded-full flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-gray-900 leading-none">Dennis Kral</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">Super Admin</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut();
            window.location.href = '/admin/login';
          }}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Abmelden"
        >
          <LogOut className="w-4 h-4" />
        </button>
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
  const [amplifyReady, setAmplifyReady] = useState(false);

  // Configure Amplify with Admin User Pool — must clear user-pool tokens first
  useEffect(() => {
    if (config.adminUserPoolId && config.adminUserPoolClientId) {
      // Clear any cached tokens from the regular user pool to avoid 400 errors
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('CognitoIdentityServiceProvider.') && !key.includes(config.adminUserPoolClientId)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}

      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: config.adminUserPoolId,
            userPoolClientId: config.adminUserPoolClientId,
          }
        }
      });
      setAmplifyReady(true);
    }
  }, [config]);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!amplifyReady) return;
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

    checkAuth();
  }, [router, amplifyReady, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Admin wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden ml-52">
        <AdminTopBar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
