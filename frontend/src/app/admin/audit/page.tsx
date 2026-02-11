'use client';

import { useState } from 'react';
import { 
  Search, Filter, Download, Calendar, Clock, User, Shield,
  Settings, Users, Database, Mail, Globe, Zap, FileText,
  ChevronDown, AlertTriangle, CheckCircle2, Activity, Eye
} from 'lucide-react';

type LogLevel = 'info' | 'warning' | 'error' | 'critical';
type Category = 'auth' | 'user' | 'config' | 'data' | 'system' | 'billing' | 'api';

interface AuditEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: Category;
  actor: string;
  actorRole: string;
  action: string;
  details: string;
  ip: string;
  resource?: string;
}

const CATEGORY_ICONS: Record<Category, any> = {
  auth: Shield,
  user: Users,
  config: Settings,
  data: Database,
  system: Globe,
  billing: FileText,
  api: Zap,
};

const LEVEL_STYLES: Record<LogLevel, string> = {
  info: 'bg-gray-100 text-gray-700',
  warning: 'bg-amber-50 text-amber-600',
  error: 'bg-red-50 text-red-600',
  critical: 'bg-red-100 text-red-700',
};

const MOCK_LOGS: AuditEntry[] = [
  { id: '1', timestamp: '2026-01-29 09:45:23', level: 'info', category: 'auth', actor: 'Dennis Kral', actorRole: 'Super Admin', action: 'LOGIN', details: 'Admin-Login erfolgreich', ip: '84.112.xxx.xxx' },
  { id: '2', timestamp: '2026-01-29 09:30:11', level: 'info', category: 'user', actor: 'Dennis Kral', actorRole: 'Super Admin', action: 'USER_INVITE', details: 'User "lisa.mueller@immivo.ai" eingeladen (Rolle: STAFF, Abt: Sales)', ip: '84.112.xxx.xxx', resource: 'user:lisa.mueller' },
  { id: '3', timestamp: '2026-01-29 09:15:44', level: 'info', category: 'config', actor: 'Dennis Kral', actorRole: 'Super Admin', action: 'CONFIG_UPDATE', details: 'Jarvis AI-Modell auf gpt-5-mini aktualisiert', ip: '84.112.xxx.xxx', resource: 'config:ai_model' },
  { id: '4', timestamp: '2026-01-29 08:45:02', level: 'warning', category: 'api', actor: 'System', actorRole: 'System', action: 'RATE_LIMIT', details: 'OpenAI Rate Limit erreicht (429 Too Many Requests). Tenant: Kellner Immobilien', ip: '—', resource: 'api:openai' },
  { id: '5', timestamp: '2026-01-29 06:30:18', level: 'info', category: 'system', actor: 'GitHub Actions', actorRole: 'CI/CD', action: 'DEPLOY', details: 'Deploy v1.2.4 nach Production erfolgreich. Duration: 4m 12s', ip: '—', resource: 'deploy:v1.2.4' },
  { id: '6', timestamp: '2026-01-29 04:00:00', level: 'info', category: 'system', actor: 'AWS', actorRole: 'System', action: 'BACKUP', details: 'RDS Automated Backup abgeschlossen (Snapshot: immivo-db-2026-01-29)', ip: '—', resource: 'backup:rds' },
  { id: '7', timestamp: '2026-01-28 22:15:33', level: 'error', category: 'api', actor: 'System', actorRole: 'System', action: 'API_ERROR', details: 'Email Parser: Timeout bei Willhaben-Parsing (Tenant: Remax Salzburg). Retry in 60s.', ip: '—', resource: 'lambda:email-parser' },
  { id: '8', timestamp: '2026-01-28 18:00:00', level: 'info', category: 'billing', actor: 'Stripe Webhook', actorRole: 'System', action: 'PAYMENT_SUCCESS', details: 'Zahlung €149.00 von Kellner Immobilien (INV-2026-0089)', ip: '—', resource: 'invoice:INV-2026-0089' },
  { id: '9', timestamp: '2026-01-28 16:45:12', level: 'info', category: 'data', actor: 'Max Huber', actorRole: 'Admin', action: 'TENANT_CREATE', details: 'Neuer Tenant "ProImmo GmbH" erstellt. Plan: Pro', ip: '10.0.xxx.xxx', resource: 'tenant:proimmo' },
  { id: '10', timestamp: '2026-01-28 15:30:00', level: 'critical', category: 'auth', actor: 'System', actorRole: 'System', action: 'AUTH_FAILED', details: '5 fehlgeschlagene Login-Versuche für "admin@test.com" — IP temporär gesperrt', ip: '203.0.xxx.xxx' },
];

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');

  const filtered = MOCK_LOGS.filter(log => {
    const matchSearch = `${log.action} ${log.details} ${log.actor}`.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchSearch && matchLevel;
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Alle Aktionen und Systemereignisse protokolliert</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <Download className="w-3.5 h-3.5" />Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Aktion, Details oder Actor suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {['all', 'info', 'warning', 'error', 'critical'].map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level as LogLevel | 'all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                levelFilter === level ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {level === 'all' ? 'Alle' : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Log Entries */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {filtered.map((log) => {
            const CatIcon = CATEGORY_ICONS[log.category];
            return (
              <div key={log.id} className="flex items-start gap-4 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                {/* Level indicator */}
                <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${LEVEL_STYLES[log.level]}`}>
                  {log.level === 'info' && <Activity className="w-3 h-3" />}
                  {log.level === 'warning' && <AlertTriangle className="w-3 h-3" />}
                  {log.level === 'error' && <AlertTriangle className="w-3 h-3" />}
                  {log.level === 'critical' && <Shield className="w-3 h-3" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-semibold text-gray-900">{log.action}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <CatIcon className="w-2.5 h-2.5" />{log.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{log.details}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-gray-400 flex items-center gap-1"><User className="w-2.5 h-2.5" />{log.actor}</span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] text-gray-400">{log.actorRole}</span>
                    {log.ip !== '—' && (
                      <>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400 font-mono">{log.ip}</span>
                      </>
                    )}
                    {log.resource && (
                      <>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-blue-600 font-mono">{log.resource}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-gray-400">{log.timestamp}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
