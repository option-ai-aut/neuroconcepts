'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, X, Loader2, Mail, User, Bug, Newspaper,
  Briefcase, MessageSquare, Building2, LayoutDashboard,
  Inbox, Megaphone, Users, Calendar, HeadphonesIcon,
  DollarSign, Activity, TrendingUp, ClipboardList, Settings,
  Hash, ArrowRight,
} from 'lucide-react';
import { canAccessHref } from '@/lib/adminPermissions';

// ── Static pages to search client-side ──────────────────────────────
const ALL_PAGES = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, keywords: 'übersicht' },
  { name: 'Posteingang', href: '/admin/inbox', icon: Inbox, keywords: 'email mail postfach' },
  { name: 'Kontaktanfragen', href: '/admin/contacts', icon: Mail, keywords: 'kontakt anfrage formular' },
  { name: 'Blog', href: '/admin/blog', icon: Newspaper, keywords: 'artikel post blog' },
  { name: 'Newsletter', href: '/admin/newsletter', icon: Megaphone, keywords: 'email kampagne' },
  { name: 'Karriere', href: '/admin/careers', icon: Briefcase, keywords: 'jobs bewerbung stelle' },
  { name: 'Mitarbeiter', href: '/admin/users', icon: Users, keywords: 'team staff personal' },
  { name: 'Team Chat', href: '/admin/chat', icon: MessageSquare, keywords: 'chat nachrichten channel' },
  { name: 'Kalender', href: '/admin/calendar', icon: Calendar, keywords: 'termin event' },
  { name: 'Bug Reports', href: '/admin/support', icon: HeadphonesIcon, keywords: 'fehler support ticket' },
  { name: 'Tenants', href: '/admin/sales', icon: TrendingUp, keywords: 'kunde unternehmen vertrieb' },
  { name: 'Finance', href: '/admin/finance', icon: DollarSign, keywords: 'finanzen zahlung stripe' },
  { name: 'Operations', href: '/admin/operations', icon: Activity, keywords: 'system betrieb' },
  { name: 'Audit Log', href: '/admin/audit', icon: ClipboardList, keywords: 'log verlauf aktivität' },
  { name: 'Einstellungen', href: '/admin/settings', icon: Settings, keywords: 'config konfiguration' },
];

// ── Types ────────────────────────────────────────────────────────────
interface SearchResult {
  id: string;
  type: 'page' | 'contact' | 'career' | 'bug' | 'blog' | 'staff' | 'channel' | 'tenant';
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  badgeColor?: string;
}

interface ApiResults {
  contacts: any[];
  careers: any[];
  bugReports: any[];
  blogs: any[];
  staff: any[];
  channels: any[];
  tenants: any[];
}

const CATEGORY_LABELS: Record<string, string> = {
  page: 'Seiten',
  contact: 'Kontaktanfragen',
  career: 'Bewerbungen',
  bug: 'Bug Reports',
  blog: 'Blog',
  staff: 'Mitarbeiter',
  channel: 'Chat Channels',
  tenant: 'Tenants',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  page: LayoutDashboard,
  contact: Mail,
  career: Briefcase,
  bug: Bug,
  blog: Newspaper,
  staff: User,
  channel: Hash,
  tenant: Building2,
};

function mapApiToResults(data: ApiResults): SearchResult[] {
  const results: SearchResult[] = [];

  (data.contacts || []).forEach((c: any) => {
    results.push({
      id: `contact-${c.id}`,
      type: 'contact',
      title: `${c.firstName} ${c.lastName}`,
      subtitle: c.subject || c.email,
      href: '/admin/contacts',
      badge: c.status === 'NEW' ? 'Neu' : undefined,
      badgeColor: 'bg-blue-100 text-blue-700',
    });
  });

  (data.careers || []).forEach((c: any) => {
    results.push({
      id: `career-${c.id}`,
      type: 'career',
      title: `${c.firstName} ${c.lastName}`,
      subtitle: c.email,
      href: '/admin/careers',
      badge: c.status === 'NEW' ? 'Neu' : undefined,
      badgeColor: 'bg-green-100 text-green-700',
    });
  });

  (data.bugReports || []).forEach((b: any) => {
    const priorityColor: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-700',
      HIGH: 'bg-orange-100 text-orange-700',
      MEDIUM: 'bg-blue-100 text-blue-700',
      LOW: 'bg-gray-100 text-gray-600',
    };
    results.push({
      id: `bug-${b.id}`,
      type: 'bug',
      title: b.title,
      subtitle: b.userName || b.userEmail,
      href: '/admin/support',
      badge: b.priority,
      badgeColor: priorityColor[b.priority] || 'bg-gray-100 text-gray-600',
    });
  });

  (data.blogs || []).forEach((p: any) => {
    results.push({
      id: `blog-${p.id}`,
      type: 'blog',
      title: p.title,
      subtitle: p.author || p.category || '',
      href: '/admin/blog',
      badge: p.published ? 'Veröffentlicht' : 'Entwurf',
      badgeColor: p.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
    });
  });

  (data.staff || []).forEach((s: any) => {
    results.push({
      id: `staff-${s.id}`,
      type: 'staff',
      title: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email,
      subtitle: s.email,
      href: '/admin/users',
      badge: s.role,
      badgeColor: 'bg-gray-100 text-gray-600',
    });
  });

  (data.channels || []).forEach((ch: any) => {
    results.push({
      id: `channel-${ch.id}`,
      type: 'channel',
      title: `#${ch.name}`,
      subtitle: 'Team Chat Channel',
      href: '/admin/chat',
    });
  });

  (data.tenants || []).forEach((t: any) => {
    results.push({
      id: `tenant-${t.id}`,
      type: 'tenant',
      title: t.name,
      subtitle: t.email || '',
      href: '/admin/sales',
    });
  });

  return results;
}

// ── Component ────────────────────────────────────────────────────────
export default function GlobalSearch({
  apiUrl,
  token,
  role,
  extraPages,
}: {
  apiUrl: string;
  token: string;
  role: string;
  extraPages: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  const searchPages = useCallback((q: string): SearchResult[] => {
    const lower = q.toLowerCase();
    return ALL_PAGES
      .filter(p => canAccessHref(p.href, role as any, extraPages))
      .filter(p =>
        p.name.toLowerCase().includes(lower) ||
        p.keywords.toLowerCase().includes(lower)
      )
      .slice(0, 4)
      .map(p => ({
        id: `page-${p.href}`,
        type: 'page' as const,
        title: p.name,
        subtitle: p.href,
        href: p.href,
      }));
  }, [role, extraPages]);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); setLoading(false); return; }

    const pages = searchPages(trimmed);

    if (trimmed.length < 2) {
      setResults(pages);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/admin/search?q=${encodeURIComponent(trimmed)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data: ApiResults = res.ok ? await res.json() : { contacts: [], careers: [], bugReports: [], blogs: [], staff: [], channels: [], tenants: [] };
      const apiResults = mapApiToResults(data);

      // Filter API results based on page access
      const filtered = apiResults.filter(r => canAccessHref(r.href, role as any, extraPages));
      setResults([...pages, ...filtered]);
    } catch {
      setResults(pages);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token, role, extraPages, searchPages]);

  const handleInput = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(value), 280);
  };

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIndex]) { handleSelect(results[activeIndex]); }
    if (e.key === 'Escape') setOpen(false);
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {});

  const typeOrder = ['page', 'contact', 'career', 'bug', 'blog', 'staff', 'channel', 'tenant'];
  const orderedGroups = typeOrder.filter(t => grouped[t]?.length);

  // Flat list of all results (for keyboard navigation index)
  const allResults: SearchResult[] = orderedGroups.flatMap(t => grouped[t]);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Suchen...</span>
        <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-100 border border-gray-200 rounded font-mono">
          <span className="text-[11px]">⌘</span>K
        </kbd>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4" onClick={() => setOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
              {loading
                ? <Loader2 className="w-4 h-4 text-gray-400 shrink-0 animate-spin" />
                : <Search className="w-4 h-4 text-gray-400 shrink-0" />
              }
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => handleInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Suchen nach Seiten, Emails, Kontakten, Blogs..."
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }} className="p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex shrink-0 text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 font-mono">Esc</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {!query.trim() ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  Tippe um zu suchen...
                </div>
              ) : allResults.length === 0 && !loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  Keine Ergebnisse für „{query}"
                </div>
              ) : (
                <div className="py-2">
                  {orderedGroups.map(type => {
                    const Icon = CATEGORY_ICONS[type] || Search;
                    return (
                      <div key={type}>
                        <div className="px-4 pt-3 pb-1">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            {CATEGORY_LABELS[type]}
                          </span>
                        </div>
                        {grouped[type].map(result => {
                          const globalIndex = allResults.indexOf(result);
                          const isActive = globalIndex === activeIndex;
                          const ResultIcon = type === 'page'
                            ? (ALL_PAGES.find(p => p.href === result.href)?.icon || Icon)
                            : Icon;
                          return (
                            <button
                              key={result.id}
                              onClick={() => handleSelect(result)}
                              onMouseEnter={() => setActiveIndex(globalIndex)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                                isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                <ResultIcon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                                  {result.title}
                                </p>
                                {result.subtitle && (
                                  <p className="text-[11px] text-gray-400 truncate">{result.subtitle}</p>
                                )}
                              </div>
                              {result.badge && (
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${result.badgeColor || 'bg-gray-100 text-gray-600'}`}>
                                  {result.badge}
                                </span>
                              )}
                              <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-300'}`} />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {allResults.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-[10px] text-gray-400">
                <span><kbd className="font-mono bg-gray-100 px-1 rounded">↑↓</kbd> Navigieren</span>
                <span><kbd className="font-mono bg-gray-100 px-1 rounded">↵</kbd> Öffnen</span>
                <span><kbd className="font-mono bg-gray-100 px-1 rounded">Esc</kbd> Schließen</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
