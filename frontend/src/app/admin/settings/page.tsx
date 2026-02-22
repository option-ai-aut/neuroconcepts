'use client';

import { useState, useEffect } from 'react';
import { 
  Bot, Shield, Mail, Database, Key, Bell, Palette,
  Save, AlertCircle, CheckCircle2, Eye, EyeOff,
  Server, Lock, Loader2, Settings
} from 'lucide-react';
import { getAdminSettings, PlatformSettings } from '@/lib/adminApi';

const SECTIONS = [
  { id: 'ai', label: 'KI / Mivo', icon: Bot },
  { id: 'auth', label: 'Authentifizierung', icon: Shield },
  { id: 'email', label: 'E-Mail (Resend)', icon: Mail },
  { id: 'storage', label: 'Storage (S3)', icon: Database },
  { id: 'environment', label: 'Environment', icon: Server },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('ai');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getAdminSettings()
      .then(setSettings)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-48px)]">
      {/* Settings Nav */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Einstellungen</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {settings?.environment === 'production' ? 'Production' : 'Development'}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                activeSection === section.id ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <section.icon className={`w-4 h-4 ${activeSection === section.id ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="text-xs font-medium">{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* AI Settings */}
          {activeSection === 'ai' && settings && (
            <>
              <div>
                <h3 className="text-base font-semibold text-gray-900">KI / Mivo Konfiguration</h3>
                <p className="text-xs text-gray-500 mt-0.5">API-Keys und KI-Einstellungen (aus Umgebungsvariablen)</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-400" />API Keys
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {[
                    { name: 'OpenAI API Key', key: 'openai', value: settings.ai.openaiKey },
                    { name: 'Gemini API Key', key: 'gemini', value: settings.ai.geminiKey },
                  ].map((apiKey) => (
                    <div key={apiKey.key} className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-xs font-medium text-gray-700">{apiKey.name}</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                          {apiKey.value || <span className="text-red-500">Nicht konfiguriert</span>}
                        </p>
                      </div>
                      <div className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                        apiKey.value ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {apiKey.value ? 'Aktiv' : 'Fehlt'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-gray-50 rounded-b-xl border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Keys werden über Umgebungsvariablen / AWS Secrets Manager konfiguriert.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Auth Settings */}
          {activeSection === 'auth' && settings && (
            <>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Authentifizierung</h3>
                <p className="text-xs text-gray-500 mt-0.5">AWS Cognito Konfiguration</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {[
                  { label: 'Tenant User Pool ID', value: settings.auth.userPoolId },
                  { label: 'Tenant Client ID', value: settings.auth.clientId },
                  { label: 'Admin User Pool ID', value: settings.auth.adminUserPoolId },
                  { label: 'Admin Client ID', value: settings.auth.adminClientId },
                  { label: 'Region', value: settings.region },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4">
                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">
                        {showKeys[item.label] ? (item.value || '—') : (item.value ? '••••' + item.value.slice(-6) : '—')}
                      </span>
                      {item.value && (
                        <button onClick={() => toggleKeyVisibility(item.label)} className="p-1 text-gray-400 hover:text-gray-600">
                          {showKeys[item.label] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Email Settings */}
          {activeSection === 'email' && settings && (
            <>
              <div>
                <h3 className="text-base font-semibold text-gray-900">E-Mail (Resend)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Konfiguration für ausgehende E-Mails</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {[
                  { label: 'Provider', value: (settings.email as any).provider || 'Resend' },
                  { label: 'API Key', value: (settings.email as any).resendKey || 'Nicht konfiguriert' },
                  { label: 'Absender', value: (settings.email as any).fromEmail || 'Nicht konfiguriert' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4">
                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                    <span className="text-xs font-mono text-gray-500">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Storage Settings */}
          {activeSection === 'storage' && settings && (
            <>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Storage (AWS S3)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Medien- und Dateispeicher</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                <div className="flex items-center justify-between p-4">
                  <span className="text-xs font-medium text-gray-700">Media Bucket</span>
                  <span className="text-xs font-mono text-gray-500">{settings.storage.mediaBucket || 'Nicht konfiguriert (lokal)'}</span>
                </div>
              </div>
            </>
          )}

          {/* Environment */}
          {activeSection === 'environment' && settings && (
            <>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Environment</h3>
                <p className="text-xs text-gray-500 mt-0.5">Runtime-Informationen</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {[
                  { label: 'Environment', value: settings.environment },
                  { label: 'AWS Region', value: settings.region },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4">
                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      item.value === 'production' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
