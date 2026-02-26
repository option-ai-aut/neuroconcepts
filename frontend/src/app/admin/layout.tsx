'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Loader2, LayoutDashboard, Users, MessageSquare, Calendar, 
  HeadphonesIcon, DollarSign, Activity, TrendingUp, 
  ClipboardList, Settings, LogOut,
  Bell, Command, Mail, Inbox, RefreshCw,
  Newspaper, Briefcase, Megaphone, Menu, X,
  User, Bug, AlertCircle
} from 'lucide-react';
import GlobalSearch from '@/components/admin/GlobalSearch';
import { safeRedirect } from '@/lib/safeRedirect';
import { useRuntimeConfig } from '@/components/RuntimeConfigProvider';
import { getRuntimeConfig } from '@/components/EnvProvider';
import {
  canAccessHref, getEffectivePages, ROLE_META,
  AdminRole,
} from '@/lib/adminPermissions';

const NAV_SECTIONS = [
  {
    label: 'Übersicht',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, notifKey: null },
    ],
  },
  {
    label: 'Kommunikation',
    items: [
      { name: 'Posteingang', href: '/admin/inbox', icon: Inbox, notifKey: 'inbox' },
      { name: 'Kontaktanfragen', href: '/admin/contacts', icon: Mail, notifKey: 'contacts' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { name: 'Blog', href: '/admin/blog', icon: Newspaper, notifKey: null },
      { name: 'Newsletter', href: '/admin/newsletter', icon: Megaphone, notifKey: null },
      { name: 'Karriere', href: '/admin/careers', icon: Briefcase, notifKey: 'careers' },
    ],
  },
  {
    label: 'Team',
    items: [
      { name: 'Mitarbeiter', href: '/admin/users', icon: Users, notifKey: null },
      { name: 'Team Chat', href: '/admin/chat', icon: MessageSquare, notifKey: 'chat' },
      { name: 'Kalender', href: '/admin/calendar', icon: Calendar, notifKey: null },
    ],
  },
  {
    label: 'Betrieb',
    items: [
      { name: 'Bug Reports', href: '/admin/support', icon: HeadphonesIcon, notifKey: 'bugReports' },
      { name: 'Tenants', href: '/admin/sales', icon: TrendingUp, notifKey: null },
      { name: 'Finance', href: '/admin/finance', icon: DollarSign, notifKey: null },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Operations', href: '/admin/operations', icon: Activity, notifKey: null },
      { name: 'Audit Log', href: '/admin/audit', icon: ClipboardList, notifKey: null },
      { name: 'Einstellungen', href: '/admin/settings', icon: Settings, notifKey: null },
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

export interface NotifCounts {
  inbox: number;
  contacts: number;
  careers: number;
  bugReports: number;
  chat: number; // total unread chat channels (computed client-side)
  channelMsgCounts: Record<string, number>; // channelId → total messages (for client-side unread calc)
}

// Read localStorage-based chat read state
function getChatReadCounts(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem('admin_chat_read_v1') || '{}');
  } catch {
    return {};
  }
}

function computeChatUnread(channelMsgCounts: Record<string, number>): number {
  const readCounts = getChatReadCounts();
  let total = 0;
  for (const [id, count] of Object.entries(channelMsgCounts)) {
    const read = readCounts[id] ?? 0;
    if (count > read) total++;
  }
  return total;
}

function AdminSidebar({
  mobileOpen,
  onClose,
  profile,
  notifCounts,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  profile: AdminProfile | null;
  notifCounts: NotifCounts;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const role = profile?.role ?? 'SUPER_ADMIN';
  const extraPages = profile?.extraPages ?? [];
  const roleMeta = ROLE_META[role] ?? ROLE_META.ADMIN;

  const visibleSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => canAccessHref(item.href, role, extraPages)),
  })).filter(section => section.items.length > 0);

  const getCount = (key: string | null, active: boolean): number => {
    if (!key || active) return 0; // Hide badge when on that page
    return (notifCounts as any)[key] ?? 0;
  };

  const sidebarContent = (
    <div className="flex flex-col bg-gray-950 h-full w-52">
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-4 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <Image src="/logo-white-no-text.png" alt="Immivo" width={28} height={28} className="shrink-0" />
          <span className="text-white font-semibold text-sm tracking-tight">Immivo Admin</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 text-gray-600 hover:text-white rounded-md transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin">
        {visibleSections.map((section) => (
          <div key={section.label}>
            <p className="px-2 mb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const count = getCount(item.notifKey, active);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] font-medium rounded-lg transition-all ${
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : count > 0 ? 'text-blue-400' : 'text-gray-600'}`} />
                    <span className={`flex-1 ${count > 0 && !active ? 'text-gray-200' : ''}`}>{item.name}</span>
                    {count > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-blue-500 text-white rounded-full leading-none">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Profile + Logout */}
      <div className="p-2 border-t border-white/5 space-y-1">
        {profile && (
          <div className="px-2.5 py-2 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${roleMeta.badgeColor}`} />
            <div className="min-w-0">
              <p className="text-[11px] text-gray-300 font-medium truncate">
                {profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : profile.email.split('@')[0]}
              </p>
              <p className="text-[10px] text-gray-600 truncate">{roleMeta.label}</p>
            </div>
          </div>
        )}
        <button
          onClick={async () => {
            await signOut();
            safeRedirect('/admin/login');
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] text-gray-600 hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Abmelden</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col h-screen fixed z-30 border-r border-white/5">
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
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

// ── Notifications Popup ────────────────────────────────────────────────
interface RecentItem {
  id: string;
  label: string;
  sub: string;
  href: string;
  time: string;
  icon: React.ElementType;
  color: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return `vor ${Math.floor(hours / 24)} Tagen`;
}

function NotificationsPopup({ onClose, apiUrl, token }: { onClose: () => void; apiUrl: string; token: string }) {
  const router = useRouter();
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch(`${apiUrl}/admin/notifications/recent`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const result: RecentItem[] = [];

        (data.contacts || []).forEach((c: any) => {
          result.push({
            id: `c-${c.id}`,
            label: `${c.firstName} ${c.lastName}`,
            sub: c.subject,
            href: '/admin/contacts',
            time: timeAgo(c.createdAt),
            icon: User,
            color: 'text-blue-400',
          });
        });
        (data.careers || []).forEach((c: any) => {
          result.push({
            id: `j-${c.id}`,
            label: `${c.firstName} ${c.lastName}`,
            sub: 'Neue Bewerbung',
            href: '/admin/careers',
            time: timeAgo(c.createdAt),
            icon: Briefcase,
            color: 'text-green-400',
          });
        });
        (data.bugs || []).forEach((b: any) => {
          result.push({
            id: `b-${b.id}`,
            label: b.title,
            sub: `Priorität: ${b.priority}`,
            href: '/admin/support',
            time: timeAgo(b.createdAt),
            icon: Bug,
            color: 'text-red-400',
          });
        });
        result.sort((a, b) => a.time.localeCompare(b.time));
        setItems(result);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, [apiUrl, token]);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">Benachrichtigungen</span>
        <button onClick={onClose} className="p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Keine neuen Benachrichtigungen</p>
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => { router.push(item.href); onClose(); }}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
            >
              <div className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5`}>
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{item.label}</p>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">{item.sub}</p>
              </div>
              <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{item.time}</span>
            </button>
          ))
        )}
      </div>
      {items.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => { router.push('/admin/contacts'); onClose(); }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Alle anzeigen
          </button>
        </div>
      )}
    </div>
  );
}

// ── Top Bar ────────────────────────────────────────────────────────────
function AdminTopBar({
  onMenuToggle,
  profile,
  notifTotal,
  apiUrl,
  token,
}: {
  onMenuToggle: () => void;
  profile: AdminProfile | null;
  notifTotal: number;
  apiUrl: string;
  token: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const roleMeta = profile ? (ROLE_META[profile.role] ?? ROLE_META.STANDARD) : null;
  const displayName = profile
    ? (profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : profile.email.split('@')[0])
    : '…';
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    if (!showNotifPopup) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifPopup(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifPopup]);

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
        {token && (
          <GlobalSearch
            apiUrl={apiUrl}
            token={token}
            role={profile?.role ?? 'SUPER_ADMIN'}
            extraPages={profile?.extraPages ?? []}
          />
        )}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3">
        <button
          onClick={() => router.refresh()}
          className="relative p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Aktualisieren"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setShowNotifPopup(v => !v)}
            className="relative p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Benachrichtigungen"
          >
            <Bell className="w-4 h-4" />
            {notifTotal > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center text-[9px] font-bold bg-blue-500 text-white rounded-full leading-none">
                {notifTotal > 9 ? '9+' : notifTotal}
              </span>
            )}
          </button>
          {showNotifPopup && (
            <NotificationsPopup
              onClose={() => setShowNotifPopup(false)}
              apiUrl={apiUrl}
              token={token}
            />
          )}
        </div>
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

// ── Root Layout ────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const config = useRuntimeConfig();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [amplifyReady, setAmplifyReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [token, setToken] = useState('');
  const [notifCounts, setNotifCounts] = useState<NotifCounts>({
    inbox: 0,
    contacts: 0,
    careers: 0,
    bugReports: 0,
    chat: 0,
    channelMsgCounts: {},
  });

  const apiUrl = (getRuntimeConfig().apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

  useEffect(() => { setSidebarOpen(false); }, [pathname]);
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

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
          const tok = session.tokens.idToken?.toString() || '';
          setToken(tok);
          setIsAuthenticated(true);
          fetch(`${apiUrl}/admin/team/me`, {
            headers: { Authorization: `Bearer ${tok}` },
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
  }, [router, amplifyReady, isLoginPage, apiUrl]);

  // Poll notifications every 30s
  const fetchNotifCounts = useCallback(async (tok: string) => {
    if (!tok) return;
    try {
      const [countsRes, emailRes] = await Promise.all([
        fetch(`${apiUrl}/admin/notifications/counts`, { headers: { Authorization: `Bearer ${tok}` } }),
        fetch(`${apiUrl}/admin/emails/unread-counts`, { headers: { Authorization: `Bearer ${tok}` } }).catch(() => null),
      ]);
      const counts = countsRes.ok ? await countsRes.json() : {};
      const emailData = emailRes?.ok ? await emailRes.json() : { counts: {} };

      const inboxTotal = Object.values(emailData.counts || {}).reduce((s: number, n) => s + (n as number), 0);

      const channelMsgCounts: Record<string, number> = {};
      (counts.channels || []).forEach((ch: { id: string; _count: { messages: number } }) => {
        channelMsgCounts[ch.id] = ch._count.messages;
      });

      setNotifCounts(prev => ({
        inbox: inboxTotal,
        contacts: counts.contacts ?? 0,
        careers: counts.careers ?? 0,
        bugReports: counts.bugReports ?? 0,
        channelMsgCounts,
        chat: computeChatUnread(channelMsgCounts),
      }));
    } catch {}
  }, [apiUrl]);

  useEffect(() => {
    if (!token || isLoginPage) return;
    fetchNotifCounts(token);
    // 15s interval: refresh notification counts AND signal all pages to silently refresh
    const interval = setInterval(() => {
      fetchNotifCounts(token);
      if (!document.hidden) window.dispatchEvent(new CustomEvent('admin-bg-refresh'));
    }, 15_000);
    return () => clearInterval(interval);
  }, [token, isLoginPage, fetchNotifCounts]);

  // Recompute chat unread when pathname changes (user may have read channels)
  useEffect(() => {
    setNotifCounts(prev => ({
      ...prev,
      chat: computeChatUnread(prev.channelMsgCounts),
    }));
  }, [pathname]);

  // Re-poll immediately when inbox page signals an email was read
  useEffect(() => {
    const handler = () => { if (token) fetchNotifCounts(token); };
    window.addEventListener('admin-email-read', handler);
    return () => window.removeEventListener('admin-email-read', handler);
  }, [token, fetchNotifCounts]);

  const notifTotal = notifCounts.contacts + notifCounts.careers + notifCounts.bugReports + notifCounts.chat;

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
      <AdminSidebar mobileOpen={sidebarOpen} onClose={closeSidebar} profile={profile} notifCounts={notifCounts} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-52">
        <AdminTopBar
          onMenuToggle={toggleSidebar}
          profile={profile}
          notifTotal={notifTotal}
          apiUrl={apiUrl}
          token={token}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
