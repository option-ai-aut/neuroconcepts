'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users, Building2, Plus, Calendar, Mail, Phone,
  AlertCircle, ArrowRight, Loader2, MessageSquare,
  TrendingUp, Clock, CheckCircle2, Zap, ChevronRight,
  UserPlus, Bell, X
} from 'lucide-react';
import { getAuthHeaders, getApiUrl } from '@/lib/api';
import { useGlobalState } from '@/context/GlobalStateContext';
import { useTranslations } from 'next-intl';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface DashboardStats {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    tenantName: string;
  };
  leads: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    byStatus: {
      NEW: number;
      CONTACTED: number;
      CONVERSATION: number;
      BOOKED: number;
      LOST: number;
    };
    needingAttention: Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
      propertyTitle: string | null;
      createdAt: string;
      daysSinceCreated: number;
    }>;
    recent: Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
      status: string;
      propertyTitle: string | null;
      createdAt: string;
    }>;
  };
  properties: {
    total: number;
    active: number;
    reserved: number;
    sold: number;
  };
  activities: Array<{
    id: string;
    type: string;
    description: string;
    leadName: string;
    leadId?: string;
    createdAt: string;
  }>;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  attendees?: Array<{ email: string; name?: string }>;
}

// ─── Feed item type ────────────────────────────────────────────────────────────

type FeedItemKind = 'new_lead' | 'mivo_reply' | 'lead_reply' | 'overdue' | 'status_change' | 'activity';

interface FeedItem {
  id: string;
  kind: FeedItemKind;
  priority: number;
  time: Date;
  leadId?: string;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  propertyTitle?: string | null;
  description?: string;
  daysSince?: number;
  newStatus?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays === 1) return 'gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isTomorrow(iso: string): boolean {
  const d = new Date(iso);
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  return d.toDateString() === tom.toDateString();
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Neu',
  CONTACTED: 'Kontaktiert',
  CONVERSATION: 'Im Gespräch',
  BOOKED: 'Gebucht',
  LOST: 'Verloren',
};

const STATUS_DOT: Record<string, string> = {
  NEW: 'bg-gray-800',
  CONTACTED: 'bg-yellow-500',
  CONVERSATION: 'bg-blue-500',
  BOOKED: 'bg-green-500',
  LOST: 'bg-gray-300',
};

// ─── Build feed from stats ─────────────────────────────────────────────────────

function buildFeed(stats: DashboardStats): FeedItem[] {
  const items: FeedItem[] = [];

  // 1. New leads (today + this week)
  for (const lead of stats.leads.recent) {
    const time = new Date(lead.createdAt);
    const diffDays = Math.floor((Date.now() - time.getTime()) / 86400000);
    if (diffDays > 7) continue;
    items.push({
      id: `lead-${lead.id}`,
      kind: 'new_lead',
      priority: 1,
      time,
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: lead.email,
      leadPhone: (lead as any).phone,
      propertyTitle: lead.propertyTitle,
    });
  }

  // 2. Mivo / lead replies from activities
  for (const act of stats.activities) {
    const time = new Date(act.createdAt);
    const diffDays = Math.floor((Date.now() - time.getTime()) / 86400000);
    if (diffDays > 7) continue;

    if (act.type === 'EMAIL_RECEIVED' || act.type === 'MIVO_REPLY' || act.type === 'MESSAGE_RECEIVED') {
      items.push({
        id: `act-reply-${act.id}`,
        kind: act.type === 'EMAIL_RECEIVED' ? 'lead_reply' : 'mivo_reply',
        priority: 2,
        time,
        leadId: act.leadId,
        leadName: act.leadName,
        description: act.description,
      });
    } else if (act.type === 'STATUS_CHANGE') {
      items.push({
        id: `act-status-${act.id}`,
        kind: 'status_change',
        priority: 4,
        time,
        leadId: act.leadId,
        leadName: act.leadName,
        description: act.description,
      });
    }
  }

  // 3. Overdue leads (no contact > 2 days)
  for (const lead of stats.leads.needingAttention) {
    if (lead.daysSinceCreated <= 2) continue;
    // Skip if already in recent (would be duplicate)
    const alreadyInFeed = items.some(i => i.leadId === lead.id);
    if (alreadyInFeed) continue;
    items.push({
      id: `overdue-${lead.id}`,
      kind: 'overdue',
      priority: 3,
      time: new Date(lead.createdAt),
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: lead.email,
      leadPhone: (lead as any).phone,
      propertyTitle: lead.propertyTitle,
      daysSince: lead.daysSinceCreated,
    });
  }

  // Sort: priority ASC, then time DESC within same priority
  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.time.getTime() - a.time.getTime();
  });

  return items;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FeedCard({ item, onDismiss }: { item: FeedItem; onDismiss: (id: string) => void }) {
  const isOverdue = item.kind === 'overdue';
  const isNew = item.kind === 'new_lead';
  const isReply = item.kind === 'lead_reply' || item.kind === 'mivo_reply';

  const icon = isNew ? (
    <UserPlus className="w-3.5 h-3.5 text-gray-900" />
  ) : item.kind === 'mivo_reply' ? (
    <Zap className="w-3.5 h-3.5 text-gray-600" />
  ) : item.kind === 'lead_reply' ? (
    <Mail className="w-3.5 h-3.5 text-gray-600" />
  ) : isOverdue ? (
    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
  ) : (
    <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
  );

  const badge = isNew ? (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-900 text-white">NEU</span>
  ) : item.kind === 'mivo_reply' ? (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Mivo</span>
  ) : item.kind === 'lead_reply' ? (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Antwort</span>
  ) : isOverdue ? (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{item.daysSince}d ohne Kontakt</span>
  ) : null;

  const content = isNew || isOverdue ? (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="font-semibold text-gray-900 text-sm">{item.leadName}</span>
        {badge}
      </div>
      {item.propertyTitle && (
        <p className="text-xs text-gray-500 truncate">{item.propertyTitle}</p>
      )}
    </div>
  ) : (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="font-semibold text-gray-900 text-sm">{item.leadName}</span>
        {badge}
      </div>
      {item.description && (
        <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
      )}
    </div>
  );

  const actions = (isNew || isOverdue) ? (
    <div className="flex items-center gap-1.5 mt-3">
      {item.leadPhone && (
        <a
          href={`tel:${item.leadPhone}`}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          <Phone className="w-3 h-3" />
          Anrufen
        </a>
      )}
      {item.leadEmail && (
        <a
          href={`mailto:${item.leadEmail}`}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          <Mail className="w-3 h-3" />
          Mail
        </a>
      )}
      {item.leadId && (
        <Link
          href={`/dashboard/crm/leads/${item.leadId}`}
          className="ml-auto text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-0.5"
        >
          Öffnen <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  ) : item.leadId ? (
    <div className="mt-2.5">
      <Link
        href={`/dashboard/crm/leads/${item.leadId}`}
        className="text-xs text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-0.5 font-medium"
      >
        Zum Lead <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  ) : null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 active:bg-gray-50 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className="mt-0.5 p-1.5 bg-gray-50 rounded-lg flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            {content}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          <span className="text-[10px] text-gray-400">{formatTimeAgo(item.time)}</span>
          {/* Always visible on mobile, hover-only on desktop */}
          <button
            onClick={() => onDismiss(item.id)}
            className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 active:bg-gray-200"
            title="Ausblenden"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      {actions}
    </div>
  );
}

function CalendarSection({ events }: { events: CalendarEvent[] }) {
  const todayEvents = events.filter(e => isToday(e.start)).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const tomorrowEvents = events.filter(e => isTomorrow(e.start));

  if (todayEvents.length === 0 && tomorrowEvents.length === 0) {
    return (
      <div className="text-center py-6">
        <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Keine Termine heute</p>
        <Link href="/dashboard/calendar" className="text-xs text-gray-500 hover:text-gray-700 mt-1 inline-block">Kalender öffnen →</Link>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {todayEvents.length > 0 && (
        <>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Heute</p>
          {todayEvents.map(ev => (
            <div key={ev.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs font-mono text-gray-500 flex-shrink-0 pt-0.5 w-10">{formatEventTime(ev.start)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                {ev.description && (
                  <p className="text-xs text-gray-400 truncate">{ev.description}</p>
                )}
              </div>
            </div>
          ))}
        </>
      )}
      {tomorrowEvents.length > 0 && (
        <div className="pt-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Morgen</p>
          {tomorrowEvents.slice(0, 3).map(ev => (
            <div key={ev.id} className="flex items-start gap-3 py-1.5">
              <span className="text-xs font-mono text-gray-400 flex-shrink-0 pt-0.5 w-10">{formatEventTime(ev.start)}</span>
              <p className="text-xs text-gray-600 truncate flex-1">{ev.title}</p>
            </div>
          ))}
          {tomorrowEvents.length > 3 && (
            <p className="text-xs text-gray-400 mt-1">+{tomorrowEvents.length - 3} weitere</p>
          )}
        </div>
      )}
    </div>
  );
}

function PipelineBar({ byStatus, total }: { byStatus: DashboardStats['leads']['byStatus']; total: number }) {
  const segments = [
    { key: 'NEW', label: 'Neu', color: 'bg-gray-800' },
    { key: 'CONTACTED', label: 'Kontaktiert', color: 'bg-yellow-400' },
    { key: 'CONVERSATION', label: 'Im Gespräch', color: 'bg-gray-500' },
    { key: 'BOOKED', label: 'Gebucht', color: 'bg-green-500' },
  ] as const;

  const activeTotal = Object.entries(byStatus)
    .filter(([k]) => k !== 'LOST')
    .reduce((s, [, v]) => s + v, 0);

  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden gap-px bg-gray-100">
        {segments.map(({ key, color }) => {
          const count = byStatus[key] ?? 0;
          const pct = activeTotal > 0 ? (count / activeTotal) * 100 : 0;
          if (pct === 0) return null;
          return (
            <Link
              key={key}
              href={`/dashboard/crm/leads?status=${key}`}
              className={`${color} hover:opacity-80 transition-opacity`}
              style={{ width: `${pct}%` }}
              title={`${STATUS_LABELS[key]}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {segments.map(({ key, color }) => {
          const count = byStatus[key] ?? 0;
          return (
            <Link
              key={key}
              href={`/dashboard/crm/leads?status=${key}`}
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-800 transition-colors"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${color} flex-shrink-0`} />
              {count} {STATUS_LABELS[key]}
            </Link>
          );
        })}
        {byStatus.LOST > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
            {byStatus.LOST} Verloren
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [mobileTab, setMobileTab] = useState<'feed' | 'today'>('feed');
  const { openDrawer } = useGlobalState();
  const t = useTranslations('dashboard');

  const dismissItem = useCallback((id: string) => setDismissedIds(prev => new Set([...prev, id])), []);

  useEffect(() => {
    const load = async () => {
      try {
        const headers = await getAuthHeaders();
        const base = getApiUrl();

        const [statsRes, calRes] = await Promise.all([
          fetch(`${base}/dashboard/stats`, { headers }),
          (() => {
            const now = new Date();
            const end = new Date(now); end.setDate(end.getDate() + 14);
            return fetch(`${base}/calendar/events?start=${now.toISOString()}&end=${end.toISOString()}`, { headers }).catch(() => null);
          })(),
        ]);

        if (!statsRes.ok) throw new Error('stats failed');
        const statsData: DashboardStats = await statsRes.json();
        setStats(statsData);

        if (calRes && calRes.ok) {
          const calData = await calRes.json();
          setCalendarEvents(Array.isArray(calData) ? calData : (calData.events ?? []));
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Daten konnten nicht geladen werden.</p>
        </div>
      </div>
    );
  }

  const allFeed = buildFeed(stats);
  const feed = allFeed.filter(i => !dismissedIds.has(i.id));
  const dismissAll = () => setDismissedIds(prev => new Set([...prev, ...allFeed.map(i => i.id)]));
  const todayEventCount = calendarEvents.filter(e => isToday(e.start)).length;
  const newLeadsToday = stats.leads.newToday;
  const uncontacted = stats.leads.byStatus.NEW;
  const mivoActivity = stats.activities.filter(a =>
    a.type === 'MIVO_REPLY' || a.type === 'EMAIL_RECEIVED' || a.type === 'MESSAGE_RECEIVED'
  ).length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  // Summary chips
  const chips = [
    newLeadsToday > 0 && { label: `${newLeadsToday} neuer Lead${newLeadsToday !== 1 ? 's' : ''}`, icon: UserPlus, urgent: false },
    mivoActivity > 0 && { label: `${mivoActivity} Mivo-Aktivität${mivoActivity !== 1 ? 'en' : ''}`, icon: Zap, urgent: false },
    todayEventCount > 0 && { label: `${todayEventCount} Termin${todayEventCount !== 1 ? 'e' : ''} heute`, icon: Calendar, urgent: false },
    uncontacted > 0 && { label: `${uncontacted} warten auf Kontakt`, icon: AlertCircle, urgent: true },
  ].filter(Boolean) as Array<{ label: string; icon: any; urgent: boolean }>;

  // ── Shared blocks ──────────────────────────────────────────────────────────

  const statsRow = (
    <div className="grid grid-cols-3 gap-2">
      <Link href="/dashboard/crm/leads" className="bg-gray-50 rounded-xl p-3 active:bg-gray-100 transition-colors text-center">
        <div className="text-xl font-bold text-gray-900">{stats.leads.total - stats.leads.byStatus.LOST - stats.leads.byStatus.BOOKED}</div>
        <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">Aktive<br/>Leads</div>
      </Link>
      <Link href="/dashboard/crm/properties" className="bg-gray-50 rounded-xl p-3 active:bg-gray-100 transition-colors text-center">
        <div className="text-xl font-bold text-gray-900">{stats.properties.active}</div>
        <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">Aktive<br/>Objekte</div>
      </Link>
      <Link href="/dashboard/crm/leads?status=NEW" className={`rounded-xl p-3 transition-colors text-center ${uncontacted > 0 ? 'bg-amber-50 active:bg-amber-100' : 'bg-gray-50 active:bg-gray-100'}`}>
        <div className={`text-xl font-bold ${uncontacted > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{uncontacted}</div>
        <div className={`text-[10px] mt-0.5 leading-tight ${uncontacted > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Warten auf<br/>Kontakt</div>
      </Link>
    </div>
  );

  const feedBlock = (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Neuigkeiten</h2>
        <div className="flex items-center gap-3">
          {feed.length > 0 && (
            <button onClick={dismissAll} className="text-xs text-gray-400 active:text-gray-700 transition-colors">
              Alles gelesen
            </button>
          )}
          <Link href="/dashboard/crm/leads" className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-0.5">
            Alle Leads <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
      {feed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="w-9 h-9 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Alles auf dem neuesten Stand</p>
          <p className="text-xs text-gray-400 mt-1">Keine offenen Aktionen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {feed.map(item => (
            <FeedCard key={item.id} item={item} onDismiss={dismissItem} />
          ))}
        </div>
      )}
    </>
  );

  const todayBlock = (
    <>
      {/* Calendar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Heute & Morgen</h2>
          <Link href="/dashboard/calendar" className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-0.5">
            Kalender <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <CalendarSection events={calendarEvents} />
      </div>
      {/* Pipeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pipeline</h2>
          <Link href="/dashboard/crm/leads" className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-0.5">
            CRM <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <PipelineBar byStatus={stats.leads.byStatus} total={stats.leads.total} />
      </div>
    </>
  );

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 lg:px-6 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900">
              {greeting}, {stats.user.firstName}
            </h1>
            {chips.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {chips.map((chip, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      chip.urgent
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <chip.icon className="w-2.5 h-2.5" />
                    {chip.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Alles auf dem neuesten Stand.</p>
            )}
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => openDrawer('LEAD')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:bg-gray-700 transition-colors text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Lead
            </button>
            <button
              onClick={() => openDrawer('PROPERTY')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Objekt
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile: Stats + Tabs ── */}
      <div className="lg:hidden flex-shrink-0">
        {/* Stats strip */}
        <div className="px-4 pt-3 pb-2">
          {statsRow}
        </div>
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setMobileTab('feed')}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative ${
              mobileTab === 'feed' ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            Neuigkeiten
            {feed.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-900 text-white text-[9px] font-bold">
                {feed.length}
              </span>
            )}
            {mobileTab === 'feed' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setMobileTab('today')}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative ${
              mobileTab === 'today' ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            Heute & Pipeline
            {todayEventCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-gray-600 text-[9px] font-bold">
                {todayEventCount}
              </span>
            )}
            {mobileTab === 'today' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile: Tab content ── */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 py-4">
        {mobileTab === 'feed' ? feedBlock : todayBlock}
      </div>

      {/* ── Desktop: Side-by-side layout ── */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Left: Feed */}
        <div className="flex-1 min-w-0 px-6 py-4 border-r border-gray-100 overflow-y-auto">
          {feedBlock}
        </div>
        {/* Right: Stats + Today + Pipeline */}
        <div className="w-80 flex-shrink-0 px-5 py-4 space-y-5 overflow-y-auto">
          {statsRow}
          <div className="border-t border-gray-50" />
          {todayBlock}
        </div>
      </div>

    </div>
  );
}
