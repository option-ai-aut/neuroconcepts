'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useRuntimeConfig } from '@/components/RuntimeConfigProvider';
import { Plus, Loader2, Search, Building2, Mail, Clock, ChevronRight, RefreshCw, Filter } from 'lucide-react';

interface SalesProspect {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  stage: string;
  dealValue?: number;
  expectedCloseDate?: string;
  assignedToEmail?: string;
  lastActivityAt?: string;
  createdAt: string;
  _count?: { activities: number; tasks: number };
  tasks?: { id: string; dueDate?: string }[];
}

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  NEW_LEAD: { label: 'Neuer Lead', color: 'bg-gray-100 text-gray-700' },
  DEMO_SCHEDULED: { label: 'Demo geplant', color: 'bg-blue-100 text-blue-700' },
  DEMO_DONE: { label: 'Demo gehalten', color: 'bg-purple-100 text-purple-700' },
  PROPOSAL_SENT: { label: 'Angebot gesendet', color: 'bg-amber-100 text-amber-700' },
  NEGOTIATION: { label: 'Verhandlung', color: 'bg-orange-100 text-orange-700' },
  WON: { label: 'Gewonnen', color: 'bg-green-100 text-green-700' },
  LOST: { label: 'Verloren', color: 'bg-red-100 text-red-700' },
};

const ROTTING_DAYS: Record<string, number> = {
  NEW_LEAD: 7, DEMO_SCHEDULED: 14, DEMO_DONE: 7, PROPOSAL_SENT: 14, NEGOTIATION: 21,
};

function isRotting(p: SalesProspect): boolean {
  if (['WON', 'LOST'].includes(p.stage)) return false;
  const days = ROTTING_DAYS[p.stage] || 14;
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return !p.lastActivityAt || new Date(p.lastActivityAt) < threshold;
}

export default function ProspectsListPage() {
  const config = useRuntimeConfig();
  const router = useRouter();
  const [prospects, setProspects] = useState<SalesProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');

  const apiUrl = (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

  const loadProspects = useCallback(async () => {
    setLoading(true);
    try {
      const session = await fetchAuthSession();
      const tok = session.tokens?.idToken?.toString() || '';
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stageFilter !== 'ALL') params.set('stage', stageFilter);
      const res = await fetch(`${apiUrl}/admin/sales/prospects?${params}`, { headers: { Authorization: `Bearer ${tok}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProspects(data.prospects || []);
    } catch (err: any) {
      console.error('Failed to load prospects:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, search, stageFilter]);

  useEffect(() => { loadProspects(); }, [loadProspects]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Prospects</h1>
          <p className="text-sm text-gray-500 mt-1">{prospects.length} Einträge</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." onKeyDown={e => e.key === 'Enter' && loadProspects()}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 w-52" />
          </div>
          <button onClick={loadProspects} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => router.push('/admin/vertrieb')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
            <Plus className="w-4 h-4" />Neu
          </button>
        </div>
      </div>

      {/* Stage filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setStageFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${stageFilter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Alle ({prospects.length})
        </button>
        {Object.entries(STAGE_LABELS).map(([key, val]) => {
          const count = prospects.filter(p => p.stage === key).length;
          if (count === 0 && stageFilter !== key) return null;
          return (
            <button key={key} onClick={() => setStageFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${stageFilter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {val.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : prospects.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500 text-sm">Keine Prospects gefunden</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 hidden md:table-cell">Unternehmen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 hidden lg:table-cell">Deal-Wert</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 hidden lg:table-cell">Letzte Aktivität</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                <th className="px-1 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((prospect) => {
                const stageCfg = STAGE_LABELS[prospect.stage] || STAGE_LABELS.NEW_LEAD;
                const rotting = isRotting(prospect);
                return (
                  <tr key={prospect.id} onClick={() => router.push(`/admin/vertrieb/${prospect.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{prospect.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{prospect.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {prospect.company ? <p className="text-sm text-gray-700">{prospect.company}</p> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${stageCfg.color}`}>{stageCfg.label}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {Number(prospect.dealValue) > 0 ? <span className="text-sm font-semibold text-emerald-700">€{Number(prospect.dealValue).toLocaleString('de-AT')}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {rotting ? (
                        <span className="text-xs text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" />Inaktiv</span>
                      ) : prospect.lastActivityAt ? (
                        <span className="text-xs text-gray-500">{new Date(prospect.lastActivityAt).toLocaleDateString('de-DE')}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {rotting && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">Rotting</span>}
                    </td>
                    <td className="px-2 py-3"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
