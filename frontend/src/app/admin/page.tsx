'use client';

import { useState } from 'react';
import { 
  Users, Building2, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight,
  Activity, Clock, CheckCircle2, AlertTriangle, Zap, Globe,
  MessageSquare, Calendar, HeadphonesIcon, FileText, Bot
} from 'lucide-react';

// Mock data
const STATS = [
  { label: 'Aktive Tenants', value: '47', change: '+12%', up: true, icon: Building2, color: 'bg-gray-900' },
  { label: 'Gesamt-User', value: '312', change: '+8%', up: true, icon: Users, color: 'bg-gray-800' },
  { label: 'MRR', value: '€18.4k', change: '+15%', up: true, icon: DollarSign, color: 'bg-gray-700' },
  { label: 'Churn Rate', value: '2.1%', change: '-0.3%', up: false, icon: TrendingUp, color: 'bg-gray-600' },
];

const SYSTEM_HEALTH = [
  { name: 'API (Orchestrator)', status: 'healthy', latency: '45ms', uptime: '99.98%' },
  { name: 'Frontend (CloudFront)', status: 'healthy', latency: '12ms', uptime: '99.99%' },
  { name: 'Datenbank (RDS)', status: 'healthy', latency: '8ms', uptime: '99.97%' },
  { name: 'E-Mail Parser (Lambda)', status: 'healthy', latency: '120ms', uptime: '99.95%' },
  { name: 'Cognito Auth', status: 'healthy', latency: '35ms', uptime: '99.99%' },
  { name: 'OpenAI API', status: 'degraded', latency: '850ms', uptime: '99.80%' },
];

const RECENT_ACTIVITY = [
  { user: 'Dennis Kral', action: 'Tenant "Kellner Immobilien" erstellt', time: 'vor 2 Min', type: 'create' },
  { user: 'System', action: 'Backup abgeschlossen (RDS Snapshot)', time: 'vor 15 Min', type: 'system' },
  { user: 'Dennis Kral', action: 'User "sarah@kellner.at" eingeladen', time: 'vor 30 Min', type: 'create' },
  { user: 'System', action: 'OpenAI Rate Limit Warning (GPT-5)', time: 'vor 1 Std', type: 'warning' },
  { user: 'Dennis Kral', action: 'Jarvis-Modell auf gpt-5-mini aktualisiert', time: 'vor 2 Std', type: 'config' },
  { user: 'System', action: 'Deploy v1.2.4 erfolgreich (Production)', time: 'vor 3 Std', type: 'deploy' },
];

const OPEN_TICKETS = [
  { id: 'T-0042', subject: 'Kalender-Sync fehlerhaft', tenant: 'Müller Immo', priority: 'high', age: '2h' },
  { id: 'T-0041', subject: 'Exposé-PDF wird nicht generiert', tenant: 'Immo Wien', priority: 'medium', age: '4h' },
  { id: 'T-0039', subject: 'Lead-Import aus Willhaben hängt', tenant: 'Kellner Immo', priority: 'low', age: '1d' },
];

const QUICK_ACTIONS = [
  { label: 'Neuer Mitarbeiter', icon: Users, href: '/admin/users' },
  { label: 'Support Ticket', icon: HeadphonesIcon, href: '/admin/support' },
  { label: 'Team Chat', icon: MessageSquare, href: '/admin/chat' },
  { label: 'Kalender', icon: Calendar, href: '/admin/calendar' },
  { label: 'Audit Log', icon: FileText, href: '/admin/audit' },
  { label: 'AI Config', icon: Bot, href: '/admin/settings' },
];

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Willkommen zurück, Dennis. Hier ist dein Überblick.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-4.5 h-4.5 text-white" />
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Schnellzugriff</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
            >
              <action.icon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              <span className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 text-center leading-tight">{action.label}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">System Status</h2>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-2.5">
            {SYSTEM_HEALTH.map((service) => (
              <div key={service.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${service.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  <span className="text-xs text-gray-700">{service.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 font-mono">{service.latency}</span>
                  <span className="text-[10px] text-gray-400">{service.uptime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Letzte Aktivitäten</h2>
            <a href="/admin/audit" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Alle ansehen</a>
          </div>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((activity, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  activity.type === 'create' ? 'bg-emerald-100' :
                  activity.type === 'warning' ? 'bg-amber-100' :
                  activity.type === 'deploy' ? 'bg-blue-100' :
                  activity.type === 'config' ? 'bg-gray-100' :
                  'bg-gray-100'
                }`}>
                  {activity.type === 'create' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  {activity.type === 'warning' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                  {activity.type === 'deploy' && <Zap className="w-3 h-3 text-blue-600" />}
                  {activity.type === 'config' && <Activity className="w-3 h-3 text-gray-600" />}
                  {activity.type === 'system' && <Globe className="w-3 h-3 text-gray-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-700 leading-snug truncate">{activity.action}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{activity.user} · {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Open Tickets */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Offene Tickets</h2>
            <a href="/admin/support" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Alle ansehen</a>
          </div>
          <div className="space-y-2.5">
            {OPEN_TICKETS.map((ticket) => (
              <div key={ticket.id} className="p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-gray-400">{ticket.id}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    ticket.priority === 'high' ? 'bg-red-50 text-red-600' :
                    ticket.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>{ticket.priority}</span>
                </div>
                <p className="text-xs font-medium text-gray-800 truncate">{ticket.subject}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-gray-400">{ticket.tenant}</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />{ticket.age}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Umsatz-Entwicklung</h2>
            <p className="text-xs text-gray-400 mt-0.5">Monatlicher wiederkehrender Umsatz (MRR)</p>
          </div>
          <div className="flex gap-1">
            {['7T', '30T', '90T', '1J'].map((period) => (
              <button key={period} className={`px-2.5 py-1 text-[10px] font-medium rounded-md ${period === '30T' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                {period}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 flex items-center justify-center text-gray-300 text-sm border border-dashed border-gray-200 rounded-lg">
          <div className="text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-xs text-gray-400">Chart-Integration folgt</p>
            <p className="text-[10px] text-gray-300">(Recharts / Tremor)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
