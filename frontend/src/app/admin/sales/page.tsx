'use client';

import { useState } from 'react';
import { 
  TrendingUp, DollarSign, Users, Building2, ArrowUpRight, ArrowDownRight,
  Phone, Mail, Calendar, CheckCircle2, Clock, Target, Zap,
  ChevronRight, Star, Filter, Plus, MoreVertical
} from 'lucide-react';

const PIPELINE_STAGES = [
  { name: 'Kontaktiert', count: 12, value: '€14.4k', color: 'bg-gray-200' },
  { name: 'Demo gebucht', count: 8, value: '€9.6k', color: 'bg-blue-200' },
  { name: 'Demo durchgeführt', count: 5, value: '€6.0k', color: 'bg-indigo-200' },
  { name: 'Angebot gesendet', count: 3, value: '€3.6k', color: 'bg-violet-200' },
  { name: 'Verhandlung', count: 2, value: '€2.4k', color: 'bg-purple-300' },
  { name: 'Gewonnen', count: 4, value: '€4.8k', color: 'bg-emerald-300' },
];

const DEALS = [
  { name: 'Remax Wien', contact: 'Thomas Berger', value: '€2.400/mo', stage: 'Demo gebucht', probability: 60, lastContact: 'Heute', agents: 15 },
  { name: 'EHL Immobilien', contact: 'Anna Schneider', value: '€4.900/mo', stage: 'Angebot gesendet', probability: 75, lastContact: 'Gestern', agents: 35 },
  { name: 'ImmoFair GmbH', contact: 'Peter Neumann', value: '€890/mo', stage: 'Demo durchgeführt', probability: 40, lastContact: 'vor 2 Tagen', agents: 6 },
  { name: 'Realconsult', contact: 'Markus Lang', value: '€1.200/mo', stage: 'Verhandlung', probability: 85, lastContact: 'Heute', agents: 8 },
  { name: 'Immo123 Wien', contact: 'Julia Klein', value: '€590/mo', stage: 'Kontaktiert', probability: 20, lastContact: 'vor 3 Tagen', agents: 3 },
];

const SALES_KPIS = [
  { label: 'Pipeline Value', value: '€40.8k', change: '+22%', up: true, icon: DollarSign },
  { label: 'Neue Leads/Monat', value: '34', change: '+18%', up: true, icon: Users },
  { label: 'Win Rate', value: '28%', change: '+3%', up: true, icon: Target },
  { label: 'Avg. Deal Size', value: '€1.2k', change: '-5%', up: false, icon: TrendingUp },
];

const ACTIVITIES = [
  { type: 'call', text: 'Demo-Call mit Remax Wien', time: '10:00', person: 'Lisa Müller' },
  { type: 'email', text: 'Follow-up an EHL Immobilien', time: '11:30', person: 'Lisa Müller' },
  { type: 'meeting', text: 'Verhandlung Realconsult', time: '14:00', person: 'Dennis Kral' },
  { type: 'task', text: 'Angebot für ImmoFair erstellen', time: '15:00', person: 'Lisa Müller' },
];

export default function SalesPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sales & Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vertrieb, Leads und Kundenakquise</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          Neuer Deal
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {SALES_KPIS.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className="w-5 h-5 text-gray-400" />
              <span className={`flex items-center gap-0.5 text-xs font-medium ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{kpi.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Pipeline Übersicht</h2>
        <div className="flex gap-2">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.name} className="flex-1">
              <div className={`h-2 rounded-full ${stage.color} mb-2`} />
              <p className="text-[11px] font-medium text-gray-900">{stage.name}</p>
              <p className="text-xs text-gray-400">{stage.count} Deals · {stage.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Deals Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Aktive Deals</h2>
            <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Alle anzeigen</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Unternehmen</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Wert</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Phase</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Wahrsch.</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Letzter Kontakt</th>
                </tr>
              </thead>
              <tbody>
                {DEALS.map((deal, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer">
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-medium text-gray-900">{deal.name}</p>
                      <p className="text-[10px] text-gray-400">{deal.contact} · {deal.agents} Makler</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-900">{deal.value}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{deal.stage}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${deal.probability >= 70 ? 'bg-emerald-500' : deal.probability >= 40 ? 'bg-amber-500' : 'bg-gray-300'}`} style={{ width: `${deal.probability}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500">{deal.probability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-gray-400">{deal.lastContact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's Activities */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Heutige Aktivitäten</h2>
          <div className="space-y-3">
            {ACTIVITIES.map((act, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  act.type === 'call' ? 'bg-green-100' : act.type === 'email' ? 'bg-blue-100' : act.type === 'meeting' ? 'bg-violet-100' : 'bg-amber-100'
                }`}>
                  {act.type === 'call' && <Phone className="w-3 h-3 text-green-600" />}
                  {act.type === 'email' && <Mail className="w-3 h-3 text-blue-600" />}
                  {act.type === 'meeting' && <Calendar className="w-3 h-3 text-violet-600" />}
                  {act.type === 'task' && <CheckCircle2 className="w-3 h-3 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{act.text}</p>
                  <p className="text-[10px] text-gray-400">{act.time} · {act.person}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
