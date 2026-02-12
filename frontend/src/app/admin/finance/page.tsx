'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Building2, Users, Home, Loader2, TrendingUp } from 'lucide-react';
import { getAdminStats, getAdminTenants, PlatformStats, AdminTenant } from '@/lib/adminApi';

export default function FinancePage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminStats(), getAdminTenants()])
      .then(([s, t]) => { setStats(s); setTenants(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const kpis = [
    { label: 'MRR', value: '€0', desc: 'Stripe nicht verbunden', icon: DollarSign },
    { label: 'ARR', value: '€0', desc: 'Stripe nicht verbunden', icon: TrendingUp },
    { label: 'Zahlende Kunden', value: '0', desc: 'Billing nicht aktiv', icon: Building2 },
    { label: 'Offene Rechnungen', value: '0', desc: 'Keine', icon: DollarSign },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Finance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Umsatz & Abrechnung</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <kpi.icon className="w-4 h-4 text-gray-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
            <p className="text-[10px] text-gray-400 mt-1">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* Tenant Usage Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Tenant-Nutzung</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">{tenants.length} Tenants · Nutzungsdaten in Echtzeit</p>
        </div>
        {tenants.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Keine Tenants vorhanden</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Leads</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Objekte</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Vorlagen</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{t.name}</p>
                    {t.inboundEmail && <p className="text-[10px] text-gray-400 font-mono">{t.inboundEmail}</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-600">{t.userCount}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-600">{t.leadCount}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-600">{t.propertyCount}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-600">{t.templateCount}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">—</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stripe Integration Hint */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <DollarSign className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-gray-700">Stripe-Integration noch nicht verbunden</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Sobald Stripe konfiguriert ist, werden hier MRR, ARR, Rechnungen und Zahlungshistorie angezeigt.</p>
        </div>
      </div>
    </div>
  );
}
