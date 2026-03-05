'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useRuntimeConfig } from '@/components/RuntimeConfigProvider';
import {
  Plus, Loader2, AlertCircle, Clock, TrendingUp, DollarSign,
  ChevronRight, Building2, Mail, User, RefreshCw, Search,
  Filter, ExternalLink
} from 'lucide-react';

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

const STAGES = [
  { key: 'NEW_LEAD', label: 'Neuer Lead', color: 'bg-gray-100 border-gray-300', headerColor: 'bg-gray-200', dotColor: 'bg-gray-500' },
  { key: 'DEMO_SCHEDULED', label: 'Demo geplant', color: 'bg-blue-50 border-blue-200', headerColor: 'bg-blue-100', dotColor: 'bg-blue-500' },
  { key: 'DEMO_DONE', label: 'Demo gehalten', color: 'bg-purple-50 border-purple-200', headerColor: 'bg-purple-100', dotColor: 'bg-purple-500' },
  { key: 'PROPOSAL_SENT', label: 'Angebot gesendet', color: 'bg-amber-50 border-amber-200', headerColor: 'bg-amber-100', dotColor: 'bg-amber-500' },
  { key: 'NEGOTIATION', label: 'Verhandlung', color: 'bg-orange-50 border-orange-200', headerColor: 'bg-orange-100', dotColor: 'bg-orange-500' },
  { key: 'WON', label: 'Gewonnen', color: 'bg-green-50 border-green-200', headerColor: 'bg-green-100', dotColor: 'bg-green-500' },
  { key: 'LOST', label: 'Verloren', color: 'bg-red-50 border-red-200', headerColor: 'bg-red-100', dotColor: 'bg-red-500' },
];

const ROTTING_DAYS: Record<string, number> = {
  NEW_LEAD: 7, DEMO_SCHEDULED: 14, DEMO_DONE: 7,
  PROPOSAL_SENT: 14, NEGOTIATION: 21,
};

function isRotting(prospect: SalesProspect): boolean {
  if (['WON', 'LOST'].includes(prospect.stage)) return false;
  const days = ROTTING_DAYS[prospect.stage] || 14;
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return !prospect.lastActivityAt || new Date(prospect.lastActivityAt) < threshold;
}

function daysSince(dateStr?: string): number {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

interface CreateProspectModalProps {
  apiUrl: string;
  token: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreateProspectModal({ apiUrl, token, onClose, onCreated }: CreateProspectModalProps) {
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', stage: 'NEW_LEAD', dealValue: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/admin/sales/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, dealValue: form.dealValue ? parseFloat(form.dealValue) : undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Neuer Prospect</h2>
        {error && <p className="mb-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Max Mustermann" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">E-Mail *</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required type="email"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="max@firma.de" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Unternehmen</label>
              <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Firma GmbH" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Deal-Wert (€)</label>
              <input value={form.dealValue} onChange={e => setForm(f => ({ ...f, dealValue: e.target.value }))} type="number"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Stage</label>
            <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Abbrechen</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Erstelle...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VertriebPipelineInner() {
  const config = useRuntimeConfig();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prospects, setProspects] = useState<SalesProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [movingId, setMovingId] = useState<string | null>(null);

  const apiUrl = (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

  const loadProspects = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      const tok = session.tokens?.idToken?.toString() || '';
      setToken(tok);
      const url = search ? `${apiUrl}/admin/sales/prospects?search=${encodeURIComponent(search)}` : `${apiUrl}/admin/sales/prospects`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProspects(data.prospects || []);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, search]);

  useEffect(() => { loadProspects(); }, [loadProspects]);

  // Check if we came from a demo booking link
  const sourceBookingId = searchParams.get('sourceBookingId');
  useEffect(() => {
    if (sourceBookingId && prospects.length > 0) {
      const prospect = prospects.find(p => p.id === sourceBookingId || (p as any).sourceBookingId === sourceBookingId);
      if (prospect) router.push(`/admin/vertrieb/${prospect.id}`);
    }
  }, [sourceBookingId, prospects, router]);

  const moveToStage = async (prospectId: string, newStage: string) => {
    setMovingId(prospectId);
    try {
      const session = await fetchAuthSession();
      const tok = session.tokens?.idToken?.toString() || '';
      await fetch(`${apiUrl}/admin/sales/prospects/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ stage: newStage }),
      });
      setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, stage: newStage, lastActivityAt: new Date().toISOString() } : p));
    } catch (err) {
      console.error('Failed to move prospect:', err);
    } finally {
      setMovingId(null);
    }
  };

  const groupedProspects = STAGES.reduce((acc, stage) => {
    acc[stage.key] = prospects.filter(p => p.stage === stage.key);
    return acc;
  }, {} as Record<string, SalesProspect[]>);

  const totalDealValue = prospects.filter(p => !['LOST'].includes(p.stage)).reduce((sum, p) => sum + (Number(p.dealValue) || 0), 0);
  const wonValue = prospects.filter(p => p.stage === 'WON').reduce((sum, p) => sum + (Number(p.dealValue) || 0), 0);
  const rottingCount = prospects.filter(isRotting).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Sales Pipeline</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-gray-500">{prospects.length} Prospects</span>
              {totalDealValue > 0 && <span className="text-xs text-gray-500">Pipeline: <strong className="text-gray-900">€{totalDealValue.toLocaleString('de-AT')}</strong></span>}
              {wonValue > 0 && <span className="text-xs text-green-600">Gewonnen: <strong>€{wonValue.toLocaleString('de-AT')}</strong></span>}
              {rottingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />{rottingCount} rotting
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." onKeyDown={e => e.key === 'Enter' && loadProspects()}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 w-44" />
            </div>
            <button onClick={loadProspects} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
              <Plus className="w-3.5 h-3.5" />Neuer Prospect
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 min-w-max h-full">
          {STAGES.map((stage) => {
            const stageProspects = groupedProspects[stage.key] || [];
            const stageValue = stageProspects.reduce((sum, p) => sum + (Number(p.dealValue) || 0), 0);
            return (
              <div key={stage.key} className="flex flex-col w-64 shrink-0">
                {/* Column Header */}
                <div className={`px-3 py-2 rounded-t-xl ${stage.headerColor} border border-b-0 ${stage.color.split(' ')[1]}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
                      <span className="text-xs font-semibold text-gray-800">{stage.label}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{stageProspects.length}</span>
                  </div>
                  {stageValue > 0 && <p className="text-[10px] text-gray-500 mt-0.5 pl-4">€{stageValue.toLocaleString('de-AT')}</p>}
                </div>

                {/* Cards Container */}
                <div className={`flex-1 min-h-32 overflow-y-auto rounded-b-xl border ${stage.color} p-2 space-y-2`} style={{ maxHeight: 'calc(100vh - 220px)' }}>
                  {stageProspects.map((prospect) => {
                    const rotting = isRotting(prospect);
                    const daysSinceActivity = daysSince(prospect.lastActivityAt);
                    const openTasks = prospect.tasks?.length || 0;
                    const hasOverdueTask = prospect.tasks?.some(t => t.dueDate && new Date(t.dueDate) < new Date()) || false;
                    return (
                      <div key={prospect.id}
                        onClick={() => router.push(`/admin/vertrieb/${prospect.id}`)}
                        className={`bg-white rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all group ${rotting ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'}`}>
                        {/* Rotting badge */}
                        {rotting && (
                          <div className="flex items-center gap-1 mb-2 text-[10px] text-amber-600 font-medium">
                            <Clock className="w-3 h-3" />
                            {daysSinceActivity === Infinity ? 'Keine Aktivität' : `${daysSinceActivity}d inaktiv`}
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{prospect.name}</p>
                            {prospect.company && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 shrink-0" />{prospect.company}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors shrink-0 mt-0.5" />
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {Number(prospect.dealValue) > 0 && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                €{Number(prospect.dealValue).toLocaleString('de-AT')}
                              </span>
                            )}
                            {openTasks > 0 && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${hasOverdueTask ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                {openTasks} Task{openTasks > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {prospect._count?.activities && prospect._count.activities > 0 && (
                            <span className="text-[10px] text-gray-400">{prospect._count.activities} Aktivitäten</span>
                          )}
                        </div>

                        {/* Quick stage move */}
                        <div className="mt-2 pt-2 border-t border-gray-50 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          {STAGES.filter(s => s.key !== prospect.stage && !['WON','LOST'].includes(s.key)).slice(0, 2).map(s => (
                            <button key={s.key} onClick={() => moveToStage(prospect.id, s.key)} disabled={movingId === prospect.id}
                              className="text-[10px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors truncate max-w-[80px]">
                              → {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {stageProspects.length === 0 && (
                    <div className="text-center py-6 text-xs text-gray-400">Keine Prospects</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showCreateModal && token && (
        <CreateProspectModal apiUrl={apiUrl} token={token} onClose={() => setShowCreateModal(false)} onCreated={loadProspects} />
      )}
    </div>
  );
}

export default function VertriebPipelinePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}>
      <VertriebPipelineInner />
    </Suspense>
  );
}
