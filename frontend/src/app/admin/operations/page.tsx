'use client';

import { 
  Activity, Server, Database, Globe, Cpu, HardDrive, Wifi, AlertTriangle,
  CheckCircle2, Clock, ArrowUpRight, RefreshCw, Terminal, Cloud,
  Shield, Zap, BarChart3, FileText
} from 'lucide-react';

const SERVICES = [
  { name: 'API Orchestrator', region: 'eu-central-1', status: 'healthy', cpu: 23, memory: 45, requests: '12.4k/h', latency: '45ms', errors: '0.02%', icon: Server },
  { name: 'Frontend (CloudFront)', region: 'Global CDN', status: 'healthy', cpu: 0, memory: 0, requests: '45.2k/h', latency: '12ms', errors: '0.00%', icon: Globe },
  { name: 'PostgreSQL (RDS)', region: 'eu-central-1', status: 'healthy', cpu: 18, memory: 62, requests: '8.1k/h', latency: '8ms', errors: '0.00%', icon: Database },
  { name: 'Email Parser (Lambda)', region: 'eu-central-1', status: 'healthy', cpu: 0, memory: 0, requests: '340/h', latency: '120ms', errors: '0.15%', icon: Zap },
  { name: 'Cognito (Auth)', region: 'eu-central-1', status: 'healthy', cpu: 0, memory: 0, requests: '890/h', latency: '35ms', errors: '0.00%', icon: Shield },
  { name: 'S3 (Storage)', region: 'eu-central-1', status: 'healthy', cpu: 0, memory: 0, requests: '2.1k/h', latency: '15ms', errors: '0.00%', icon: HardDrive },
  { name: 'OpenAI API', region: 'External', status: 'degraded', cpu: 0, memory: 0, requests: '1.2k/h', latency: '850ms', errors: '1.20%', icon: Cpu },
  { name: 'SES (E-Mail)', region: 'eu-central-1', status: 'healthy', cpu: 0, memory: 0, requests: '560/h', latency: '200ms', errors: '0.05%', icon: Cloud },
];

const DEPLOYMENTS = [
  { version: 'v1.2.4', env: 'Production', status: 'success', time: '2026-01-29 06:30', duration: '4m 12s', author: 'Max Huber' },
  { version: 'v1.2.4-rc1', env: 'Staging', status: 'success', time: '2026-01-28 18:45', duration: '3m 48s', author: 'Max Huber' },
  { version: 'v1.2.3', env: 'Production', status: 'success', time: '2026-01-27 07:00', duration: '4m 05s', author: 'Tom Fischer' },
  { version: 'v1.2.3-rc2', env: 'Staging', status: 'failed', time: '2026-01-26 20:15', duration: '2m 33s', author: 'Tom Fischer' },
  { version: 'v1.2.3-rc1', env: 'Staging', status: 'success', time: '2026-01-26 16:30', duration: '3m 55s', author: 'Max Huber' },
];

const ALERTS = [
  { severity: 'warning', message: 'OpenAI API Latenz erhöht (>500ms avg)', time: 'vor 30 Min', acked: false },
  { severity: 'info', message: 'RDS Backup erfolgreich (daily snapshot)', time: 'vor 2 Std', acked: true },
  { severity: 'warning', message: 'Lambda Cold Start Spike (Email Parser)', time: 'vor 4 Std', acked: true },
];

export default function OperationsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Operations</h1>
          <p className="text-sm text-gray-500 mt-0.5">System Health, Deployments und Infrastruktur</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Alle Systeme Operational
          </span>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {ALERTS.filter(a => !a.acked).length > 0 && (
        <div className="space-y-2">
          {ALERTS.filter(a => !a.acked).map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
              alert.severity === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 ${alert.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'}`} />
              <span className="text-xs text-gray-700 flex-1">{alert.message}</span>
              <span className="text-[10px] text-gray-400">{alert.time}</span>
              <button className="text-[10px] font-medium text-gray-500 hover:text-gray-700 px-2 py-0.5 bg-white rounded border border-gray-200">
                Bestätigen
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Services Grid */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Services & Infrastruktur</h2>
          <span className="text-[10px] text-gray-400">Letzte Aktualisierung: vor 30s</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Service</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Requests</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Latenz</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Fehlerrate</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Region</th>
              </tr>
            </thead>
            <tbody>
              {SERVICES.map((svc) => (
                <tr key={svc.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <svc.icon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-900">{svc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${svc.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                      <span className={`text-[11px] font-medium ${svc.status === 'healthy' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {svc.status === 'healthy' ? 'Healthy' : 'Degraded'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-600">{svc.requests}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-mono ${parseInt(svc.latency) > 500 ? 'text-amber-600' : 'text-gray-600'}`}>{svc.latency}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-mono ${parseFloat(svc.errors) > 1 ? 'text-red-600' : 'text-gray-400'}`}>{svc.errors}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[10px] text-gray-400">{svc.region}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deployments */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Deployments</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {DEPLOYMENTS.map((dep, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/50">
              <div className={`w-2 h-2 rounded-full ${dep.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-gray-900">{dep.version}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${dep.env === 'Production' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{dep.env}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{dep.author} · {dep.time} · {dep.duration}</p>
              </div>
              <span className={`text-[10px] font-medium ${dep.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {dep.status === 'success' ? 'Erfolgreich' : 'Fehlgeschlagen'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
