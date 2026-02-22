'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Building2, TrendingUp, Home, ArrowUpRight,
  Activity, Clock, CheckCircle2, AlertTriangle, Zap, Globe,
  MessageSquare, Calendar, HeadphonesIcon, FileText, Bot,
  Loader2, FileImage, Mail, DollarSign
} from 'lucide-react';
import { getAdminStats, PlatformStats } from '@/lib/adminApi';
import Link from 'next/link';

const QUICK_ACTIONS = [
  { label: 'Tenants', icon: Building2, href: '/admin/sales' },
  { label: 'Finance', icon: DollarSign, href: '/admin/finance' },
  { label: 'Support', icon: HeadphonesIcon, href: '/admin/support' },
  { label: 'Team Chat', icon: MessageSquare, href: '/admin/chat' },
  { label: 'Kalender', icon: Calendar, href: '/admin/calendar' },
  { label: 'Audit Log', icon: FileText, href: '/admin/audit' },
  { label: 'AI Config', icon: Bot, href: '/admin/settings' },
];

const ACTIVITY_ICONS: Record<string, { icon: any; bg: string; color: string }> = {
  LEAD_CREATED: { icon: CheckCircle2, bg: 'bg-emerald-100', color: 'text-emerald-600' },
  EMAIL_SENT: { icon: Mail, bg: 'bg-blue-100', color: 'text-blue-600' },
  EMAIL_RECEIVED: { icon: Mail, bg: 'bg-gray-100', color: 'text-gray-600' },
  STATUS_CHANGED: { icon: Activity, bg: 'bg-gray-100', color: 'text-gray-600' },
  EXPOSE_SENT: { icon: FileImage, bg: 'bg-amber-100', color: 'text-amber-600' },
  VIEWING_SCHEDULED: { icon: Calendar, bg: 'bg-blue-100', color: 'text-blue-600' },
  JARVIS_QUERY: { icon: Bot, bg: 'bg-gray-100', color: 'text-gray-600' },
};

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Gerade eben';
  if (mins < 60) return `vor ${mins} Min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-800">Fehler beim Laden der Daten</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const kpis: { label: string; value: number; displayValue?: string; icon: any; color: string }[] = [
    { label: 'Aktive Tenants', value: stats?.tenants ?? 0, icon: Building2, color: 'bg-gray-900' },
    { label: 'Gesamt-User', value: stats?.users ?? 0, icon: Users, color: 'bg-gray-800' },
    { label: 'Leads (gesamt)', value: stats?.leads ?? 0, icon: TrendingUp, color: 'bg-gray-700' },
    { label: 'Objekte', value: stats?.properties ?? 0, icon: Home, color: 'bg-gray-600' },
    ...(typeof stats?.payingTenants === 'number' ? [{ label: 'Zahlende Tenants', value: stats.payingTenants, icon: DollarSign, color: 'bg-emerald-600' }] : []),
    ...(typeof stats?.mrrCents === 'number' && stats.mrrCents > 0 ? [{ label: 'MRR', value: stats.mrrCents, displayValue: `$${(stats.mrrCents / 100).toFixed(0)}`, icon: DollarSign, color: 'bg-emerald-600' }] : []),
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Plattform-Übersicht in Echtzeit</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-4.5 h-4.5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.displayValue ?? stat.value.toLocaleString('de-DE')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Exposés', value: stats?.exposes ?? 0, icon: FileImage },
          { label: 'E-Mails', value: stats?.emails ?? 0, icon: Mail },
          { label: 'Neue Tenants (30T)', value: stats?.newTenantsThisMonth ?? 0, icon: ArrowUpRight },
          { label: 'Neue Leads (30T)', value: stats?.newLeadsThisMonth ?? 0, icon: ArrowUpRight },
          ...(typeof stats?.stripeCustomers === 'number' && stats.stripeCustomers > 0 ? [{ label: 'Stripe Kunden', value: stats.stripeCustomers, icon: DollarSign }] : []),
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
              <s.icon className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{s.value.toLocaleString('de-DE')}</p>
              <p className="text-[10px] text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Schnellzugriff</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
            >
              <action.icon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              <span className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 text-center leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lead Status Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Lead-Status Verteilung</h2>
          {stats && Object.keys(stats.leadsByStatus).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(stats.leadsByStatus).map(([status, count]) => {
                const total = stats.leads || 1;
                const pct = Math.round((count / total) * 100);
                const labels: Record<string, string> = { NEW: 'Neu', CONTACTED: 'Kontaktiert', CONVERSATION: 'Im Gespräch', BOOKED: 'Termin', LOST: 'Verloren' };
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{labels[status] || status}</span>
                      <span className="font-medium text-gray-900">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-700 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">Noch keine Leads vorhanden</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Letzte Aktivitäten</h2>
            <Link href="/admin/audit" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Alle ansehen</Link>
          </div>
          {stats && stats.recentActivities.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivities.slice(0, 8).map((activity) => {
                const iconConfig = ACTIVITY_ICONS[activity.type] || { icon: Activity, bg: 'bg-gray-100', color: 'text-gray-600' };
                const Icon = iconConfig.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconConfig.bg}`}>
                      <Icon className={`w-3 h-3 ${iconConfig.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-700 leading-snug truncate">{activity.description}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{activity.tenantName} · {formatTimeAgo(activity.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">Noch keine Aktivitäten</p>
          )}
        </div>
      </div>
    </div>
  );
}
