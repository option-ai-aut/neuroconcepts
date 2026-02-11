'use client';

import { 
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Users, 
  CreditCard, Receipt, Download, Filter, Calendar, Building2,
  AlertCircle, CheckCircle2, Clock, FileText
} from 'lucide-react';

const FINANCE_KPIS = [
  { label: 'MRR', value: '€18.400', change: '+15%', up: true, icon: DollarSign, color: 'bg-gray-700' },
  { label: 'ARR', value: '€220.8k', change: '+15%', up: true, icon: TrendingUp, color: 'bg-gray-800' },
  { label: 'Zahlende Kunden', value: '47', change: '+5', up: true, icon: Users, color: 'bg-gray-800' },
  { label: 'Offene Rechnungen', value: '3', change: '€2.1k', up: false, icon: Receipt, color: 'bg-gray-600' },
];

const INVOICES = [
  { id: 'INV-2026-0089', tenant: 'Kellner Immobilien', amount: '€149.00', plan: 'Pro', status: 'paid', date: '2026-01-28', method: 'SEPA' },
  { id: 'INV-2026-0088', tenant: 'Remax Salzburg', amount: '€890.00', plan: 'Enterprise', status: 'paid', date: '2026-01-27', method: 'Kreditkarte' },
  { id: 'INV-2026-0087', tenant: 'Immo Wien', amount: '€79.00', plan: 'Starter', status: 'overdue', date: '2026-01-15', method: 'SEPA' },
  { id: 'INV-2026-0086', tenant: 'Schmidt & Partner', amount: '€149.00', plan: 'Pro', status: 'paid', date: '2026-01-25', method: 'SEPA' },
  { id: 'INV-2026-0085', tenant: 'ProImmo GmbH', amount: '€149.00', plan: 'Pro', status: 'pending', date: '2026-01-29', method: 'Kreditkarte' },
  { id: 'INV-2026-0084', tenant: 'Immobilien Huber', amount: '€79.00', plan: 'Starter', status: 'paid', date: '2026-01-22', method: 'SEPA' },
  { id: 'INV-2026-0083', tenant: 'EHL Immobilien', amount: '€890.00', plan: 'Enterprise', status: 'overdue', date: '2026-01-10', method: 'Rechnung' },
];

const PLANS_DISTRIBUTION = [
  { name: 'Starter (€79/mo)', count: 15, percentage: 32, color: 'bg-gray-500' },
  { name: 'Pro (€149/mo)', count: 24, percentage: 51, color: 'bg-gray-600' },
  { name: 'Enterprise (€890/mo)', count: 8, percentage: 17, color: 'bg-gray-700' },
];

export default function FinancePage() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Umsatz, Rechnungen und Abonnements</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800">
            <FileText className="w-3.5 h-3.5" />
            Neue Rechnung
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {FINANCE_KPIS.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 ${kpi.color} rounded-lg flex items-center justify-center`}>
                <kpi.icon className="w-4 h-4 text-white" />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{kpi.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Plan Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Plan-Verteilung</h2>
          <div className="space-y-4">
            {PLANS_DISTRIBUTION.map((plan) => (
              <div key={plan.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-700">{plan.name}</span>
                  <span className="text-xs text-gray-400">{plan.count} Kunden</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${plan.color}`} style={{ width: `${plan.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">ARPU</span>
              <span className="text-sm font-bold text-gray-900">€391/mo</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-medium text-gray-700">LTV (est.)</span>
              <span className="text-sm font-bold text-gray-900">€9.384</span>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Rechnungen</h2>
            <div className="flex gap-2">
              <button className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100">
                <Filter className="w-3 h-3" />Filter
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100">
                <Calendar className="w-3 h-3" />Januar 2026
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Rechnung</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Tenant</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Plan</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Betrag</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Methode</th>
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer">
                    <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{inv.id}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-gray-900 flex items-center gap-1"><Building2 className="w-3 h-3 text-gray-400" />{inv.tenant}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-600">{inv.plan}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-900">{inv.amount}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded ${
                        inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                        inv.status === 'overdue' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {inv.status === 'paid' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {inv.status === 'overdue' && <AlertCircle className="w-2.5 h-2.5" />}
                        {inv.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                        {inv.status === 'paid' ? 'Bezahlt' : inv.status === 'overdue' ? 'Überfällig' : 'Ausstehend'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-gray-400 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />{inv.method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
