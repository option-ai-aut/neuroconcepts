'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useRuntimeConfig } from '@/components/RuntimeConfigProvider';
import {
  TrendingUp, Users, DollarSign, Clock, CheckCircle2, AlertTriangle,
  Loader2, RefreshCw, Calendar, Activity, ChevronRight, Target
} from 'lucide-react';

interface DashboardData {
  totalProspects: number;
  byStage: Record<string, number>;
  dealValue: number;
  rottingProspects: number;
  closingSoon: number;
  overdueTasks: number;
  openTasksList: { id: string; title: string; dueDate?: string; prospectId: string; prospect: { name: string; company?: string } }[];
  recentActivities: { id: string; type: string; content: string; createdAt: string; prospect: { name: string; company?: string } }[];
}

const STAGE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  NEW_LEAD: { label: 'Neuer Lead', color: 'text-gray-600', bg: 'bg-gray-100' },
  DEMO_SCHEDULED: { label: 'Demo geplant', color: 'text-blue-600', bg: 'bg-blue-100' },
  DEMO_DONE: { label: 'Demo gehalten', color: 'text-purple-600', bg: 'bg-purple-100' },
  PROPOSAL_SENT: { label: 'Angebot gesendet', color: 'text-amber-600', bg: 'bg-amber-100' },
  NEGOTIATION: { label: 'Verhandlung', color: 'text-orange-600', bg: 'bg-orange-100' },
  WON: { label: 'Gewonnen', color: 'text-green-600', bg: 'bg-green-100' },
  LOST: { label: 'Verloren', color: 'text-red-600', bg: 'bg-red-100' },
};

const ACTIVITY_ICONS: Record<string, string> = {
  NOTE: '📝', EMAIL_SENT: '📧', CALL: '📞', DEMO: '🎥', PROPOSAL: '📄',
  STAGE_CHANGE: '🔄', MEETING: '🤝', FILE_UPLOAD: '📎', TASK_DONE: '✅',
};

export default function VertriebDashboardPage() {
  const config = useRuntimeConfig();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await fetchAuthSession();
      const tok = session.tokens?.idToken?.toString() || '';
      const res = await fetch(`${apiUrl}/admin/sales/dashboard`, { headers: { Authorization: `Bearer ${tok}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <button onClick={loadData} className="text-sm text-blue-600 hover:underline">Erneut versuchen</button>
      </div>
    </div>
  );

  const d = data!;
  const wonCount = d.byStage['WON'] || 0;
  const lostCount = d.byStage['LOST'] || 0;
  const activeCount = d.totalProspects - wonCount - lostCount;
  const conversionRate = d.totalProspects > 0 ? Math.round((wonCount / d.totalProspects) * 100) : 0;

  const kpis = [
    { label: 'Aktive Prospects', value: activeCount, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Pipeline-Wert', value: `€${d.dealValue.toLocaleString('de-AT')}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Gewonnen', value: wonCount, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  ];

  const alerts = [
    d.rottingProspects > 0 && { type: 'warning', icon: Clock, text: `${d.rottingProspects} Prospect${d.rottingProspects > 1 ? 's' : ''} ohne Aktivität (rotting)`, action: () => router.push('/admin/vertrieb') },
    d.overdueTasks > 0 && { type: 'error', icon: AlertTriangle, text: `${d.overdueTasks} überfällige Aufgabe${d.overdueTasks > 1 ? 'n' : ''}`, action: () => router.push('/admin/vertrieb/prospects') },
    d.closingSoon > 0 && { type: 'info', icon: Calendar, text: `${d.closingSoon} Deal${d.closingSoon > 1 ? 's' : ''} schließt in 30 Tagen`, action: () => router.push('/admin/vertrieb') },
  ].filter(Boolean) as { type: string; icon: any; text: string; action: () => void }[];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vertrieb Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Übersicht der Vertriebsaktivitäten</p>
        </div>
        <button onClick={loadData} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} onClick={alert.action}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${
                alert.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                alert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
              <alert.icon className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">{alert.text}</span>
              <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi, i) => (
          <div key={i} className={`${kpi.bg} ${kpi.border} border rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">{kpi.label}</span>
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline by Stage */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-gray-500" />Pipeline nach Stage</h2>
          <div className="space-y-2">
            {Object.entries(STAGE_LABELS).map(([key, cfg]) => {
              const count = d.byStage[key] || 0;
              const pct = d.totalProspects > 0 ? Math.round((count / d.totalProspects) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-32 truncate">{cfg.label}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${cfg.bg} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Open Tasks */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gray-500" />Offene Aufgaben</h2>
          {d.openTasksList.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Keine offenen Aufgaben</p>
          ) : (
            <div className="space-y-2">
              {d.openTasksList.slice(0, 6).map((task) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                return (
                  <div key={task.id} onClick={() => router.push(`/admin/vertrieb/${task.prospectId}`)}
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group">
                    <div className={`w-4 h-4 rounded border-2 shrink-0 mt-0.5 ${isOverdue ? 'border-red-400' : 'border-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${isOverdue ? 'text-red-700' : 'text-gray-800'}`}>{task.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{task.prospect.name}{task.prospect.company ? ` · ${task.prospect.company}` : ''}</p>
                      {task.dueDate && <p className={`text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>{new Date(task.dueDate).toLocaleDateString('de-DE')}</p>}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 shrink-0 mt-0.5 transition-colors" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-gray-500" />Letzte Aktivitäten</h2>
          {d.recentActivities.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Keine Aktivitäten</p>
          ) : (
            <div className="space-y-2">
              {d.recentActivities.slice(0, 8).map((activity) => (
                <div key={activity.id} onClick={() => router.push(`/admin/vertrieb/${(activity as any).prospectId}`)}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <span className="text-sm shrink-0">{ACTIVITY_ICONS[activity.type] || '•'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{activity.content}</p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{activity.prospect.name} · {new Date(activity.createdAt).toLocaleDateString('de-DE')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
