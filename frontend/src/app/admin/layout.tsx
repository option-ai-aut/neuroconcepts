'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Loader2, LayoutDashboard, Users, MessageSquare, Calendar, 
  HeadphonesIcon, DollarSign, Activity, TrendingUp, 
  ClipboardList, Settings, LogOut,
  Bell, Search, Command, Mail, Inbox,
  Newspaper, Briefcase, Megaphone, Menu, X
} from 'lucide-react';
import { safeRedirect } from '@/lib/safeRedirect';
import { useRuntimeConfig } from '@/components/RuntimeConfigProvider';
import { getRuntimeConfig } from '@/components/EnvProvider';
import {
  canAccessHref, getEffectivePages, ROLE_META,
  AdminRole,
} from '@/lib/adminPermissions';

// Nav definition — all items, filtering happens at render time
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
      { name: 'Karriere', href: '/admin/careers', icon: Briefcase },
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

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/inbox': 'Posteingang',
  '/admin/contacts': 'Kontaktanfragen',
  '/admin/blog': 'Blog',
  '/admin/newsletter': 'Newsletter',
  '/admin/careers': 'Karriere',
  '/admin/users': 'Mitarbeiter',
  '/admin/chat': 'Team Chat',
  '/admin/calendar': 'Kalender',
  '/admin/support': 'Bug Reports',
  '/admin/sales': 'Tenants',
  '/admin/finance': 'Finance',
  '/admin/finance/stripe': 'Stripe',
  '/admin/operations': 'Operations',
  '/admin/audit': 'Audit Log',
  '/admin/settings': 'Einstellungen',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const sorted = Object.keys(PAGE_TITLES).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (pathname.startsWith(key)) return PAGE_TITLES[key];
  }
  return 'Admin';
}

interface AdminProfile {
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: AdminRole;
  extraPages: string[];
}

function AdminSidebar({
  mobileOpen,
  onClose,
  profile,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  profile: AdminProfile | null;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const role = profile?.role ?? 'STANDARD';
  const extraPages = profile?.extraPages ?? [];
  const roleMeta = ROLE_META[role] ?? ROLE_META.STANDARD;

  // Filter sections: only show items the user can access; hide empty sections
  const visibleSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => canAccessHref(item.href, role, extraPages)),
  })).filter(section => section.items.length > 0);

  const sidebarContent = (
    <div className="flex flex-col bg-gray-950 h-full w-52">
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-3 shrink-0 border-b border-gray-800/50">
        <div className="flex items-center">
          <div className="w-7 h-7 shrink-0">
            <Image src="/logo-icon-only.png" alt="Immivo" width={28} height={28} />
          </div>
          <span className="ml-2.5 text-white font-bold text-sm tracking-tight">Immivo</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 text-gray-500 hover:text-white rounded-md transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-1.5 space-y-4 scrollbar-thin">
        {visibleSections.map((section) => (
          <div key={section.label}>
            <p className="px-2.5 mb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
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

      {/* Role badge + Logout */}
      <div className="p-1.5 border-t border-gray-800/50 space-y-1">
        {profile && (
          <div className="px-2.5 py-2 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${roleMeta.badgeColor}`} />
            <div className="min-w-0">
              <p className="text-[11px] text-gray-300 font-medium truncate">
                {profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : profile.email.split('@')[0]}
              </p>
              <p className="text-[10px] text-gray-500 truncate">{roleMeta.label}</p>
            </div>
          </div>
        )}
        <button
          onClick={async () => {
            await signOut();
            safeRedirect('/admin/login');
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] text-gray-500 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Abmelden</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — fixed */}
      <div className="hidden lg:flex flex-col h-screen fixed z-30 border-r border-gray-800/50">
        {sidebarContent}
      </div>

      {/* Mobile sidebar — overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="relative z-10 animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

function AdminTopBar({
  onMenuToggle,
  profile,
}: {
  onMenuToggle: () => void;
  profile: AdminProfile | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const roleMeta = profile ? (ROLE_META[profile.role] ?? ROLE_META.STANDARD) : null;
  const displayName = profile
    ? (profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : profile.email.split('@')[0])
    : '…';

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Menü öffnen"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="lg:hidden text-sm font-semibold text-gray-800 truncate">{pageTitle}</h1>
        <button className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span>Suchen...</span>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-100 border border-gray-200 rounded font-mono">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3">
        <button
          onClick={() => router.push('/admin/contacts')}
          className="relative p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Kontaktanfragen"
        >
          <Bell className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${roleMeta?.badgeColor || 'bg-gray-800'}`}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-gray-900 leading-none">{displayName}</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">{roleMeta?.label || '…'}</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut();
            safeRedirect('/admin/login');
          }}
          className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Abmelden"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const config = useRuntimeConfig();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [amplifyReady, setAmplifyReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Configure Amplify with Admin User Pool
  useEffect(() => {
    if (config.adminUserPoolId && config.adminUserPoolClientId) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('CognitoIdentityServiceProvider.') ||
            key.startsWith('amplify-') ||
            key.includes('cognito')
          ) && !key.includes(config.adminUserPoolClientId)) {
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
    if (isLoginPage) { setIsAuthenticated(true); return; }

    const checkAuth = async () => {
      try {
        const session = await fetchAuthSession();
        if (session.tokens) {
          setIsAuthenticated(true);
          // Load profile in background
          const token = session.tokens.idToken?.toString();
          const apiUrl = (getRuntimeConfig().apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
          fetch(`${apiUrl}/admin/team/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data) setProfile({ ...data, extraPages: data.extraPages || [] });
            })
            .catch(() => {});
        } else {
          router.replace('/admin/login');
        }
      } catch {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('CognitoIdentityServiceProvider.') || key.startsWith('amplify-') || key.includes('cognito'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch {}
        router.replace('/admin/login');
      }
    };

    checkAuth();
  }, [router, amplifyReady, isLoginPage]);

  if (isLoginPage) return <>{children}</>;

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
      <AdminSidebar mobileOpen={sidebarOpen} onClose={closeSidebar} profile={profile} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-52">
        <AdminTopBar onMenuToggle={toggleSidebar} profile={profile} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
