'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw, Info } from 'lucide-react';
import { getAdminHealth, HealthCheck } from '@/lib/adminApi';

const SERVICE_LABELS: Record<string, string> = {
  database: 'Datenbank (PostgreSQL)',
  cognito: 'Cognito Auth (Tenant)',
  admin_cognito: 'Cognito Auth (Admin)',
  s3_media: 'S3 Media Bucket',
  openai: 'OpenAI API',
  gemini: 'Gemini API',
  email: 'E-Mail (Resend)',
  lambda: 'Runtime Environment',
};

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  healthy: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Healthy' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500', label: 'Warning' },
  error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-500', label: 'Error' },
  degraded: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500', label: 'Degraded' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-500', label: 'Info' },
};

export default function OperationsPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const loadHealth = () => {
    setLoading(true);
    setError(null);
    getAdminHealth()
      .then(data => { setHealth(data); setLastChecked(new Date()); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadHealth(); }, []);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Operations</h1>
          <p className="text-sm text-gray-500 mt-0.5">System-Gesundheit & Services</p>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-[10px] text-gray-400">
              Zuletzt: {lastChecked.toLocaleTimeString('de-DE')}
            </span>
          )}
          <button
            onClick={loadHealth}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Overall Status */}
      {health && (
        <div className={`rounded-xl border p-4 mb-6 ${
          health.overall === 'healthy' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            {health.overall === 'healthy' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            )}
            <div>
              <p className={`text-sm font-semibold ${health.overall === 'healthy' ? 'text-emerald-800' : 'text-amber-800'}`}>
                {health.overall === 'healthy' ? 'Alle Systeme operational' : 'Einige Services beeinträchtigt'}
              </p>
              <p className={`text-xs mt-0.5 ${health.overall === 'healthy' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {Object.values(health.services).filter(s => s.status === 'healthy').length} von {Object.keys(health.services).length} Services healthy
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service Grid */}
      {loading && !health ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : health ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(health.services).map(([key, service]) => {
            const config = STATUS_CONFIG[service.status] || STATUS_CONFIG.info;
            const Icon = config.icon;
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${config.bg}`} />
                    <span className="text-sm font-medium text-gray-900">{SERVICE_LABELS[key] || key}</span>
                  </div>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium capitalize ${config.color}`}>{config.label}</span>
                  {service.latency !== undefined && (
                    <span className="text-[10px] text-gray-400 font-mono">{service.latency}ms</span>
                  )}
                </div>
                {service.detail && (
                  <p className="text-[10px] text-gray-400 mt-1.5 truncate">{service.detail}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
