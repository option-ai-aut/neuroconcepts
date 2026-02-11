'use client';

import { useState } from 'react';
import { 
  Bot, Shield, Globe, Mail, Database, Key, Bell, Palette,
  Save, RefreshCw, AlertCircle, CheckCircle2, Eye, EyeOff,
  Server, Zap, Lock, FileText, Copy, ExternalLink
} from 'lucide-react';

interface SettingSection {
  id: string;
  label: string;
  icon: any;
}

const SECTIONS: SettingSection[] = [
  { id: 'ai', label: 'KI / Jarvis', icon: Bot },
  { id: 'auth', label: 'Authentifizierung', icon: Shield },
  { id: 'email', label: 'E-Mail (SES)', icon: Mail },
  { id: 'integrations', label: 'Integrationen', icon: Globe },
  { id: 'security', label: 'Sicherheit', icon: Lock },
  { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'advanced', label: 'Erweitert', icon: Server },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('ai');
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // AI Settings
  const [aiModel, setAiModel] = useState('gpt-5-mini');
  const [aiTemperature, setAiTemperature] = useState('0.7');
  const [aiMaxTokens, setAiMaxTokens] = useState('4096');
  const [systemPromptAppend, setSystemPromptAppend] = useState('');

  // Email Settings  
  const [emailDomain, setEmailDomain] = useState('leads.immivo.ai');
  const [emailFromName, setEmailFromName] = useState('Immivo AI');
  const [dailyLimit, setDailyLimit] = useState('500');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const maskValue = (value: string) => value.substring(0, 8) + '••••••••••••';

  return (
    <div className="flex h-[calc(100vh-48px)]">
      {/* Settings Nav */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Einstellungen</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Systemkonfiguration</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                activeSection === section.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <section.icon className={`w-4 h-4 ${activeSection === section.id ? 'text-indigo-500' : 'text-gray-400'}`} />
              <span className="text-xs font-medium">{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* AI Settings */}
          {activeSection === 'ai' && (
            <>
              <div>
                <h3 className="text-base font-semibold text-gray-900">KI / Jarvis Konfiguration</h3>
                <p className="text-xs text-gray-500 mt-0.5">Globale AI-Einstellungen für alle Tenants</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                <div className="p-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">KI-Modell</label>
                  <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="gpt-5-mini">GPT-5 Mini (Standard, schnell)</option>
                    <option value="gpt-5">GPT-5 (Premium, langsamer)</option>
                    <option value="gpt-4o">GPT-4o (Legacy)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (Legacy)</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Wird für Jarvis-Chat, E-Mail-Antworten und Exposé-Generierung verwendet.</p>
                </div>

                <div className="p-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Temperature</label>
                  <input type="number" step="0.1" min="0" max="2" value={aiTemperature} onChange={(e) => setAiTemperature(e.target.value)} className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  <p className="text-[10px] text-gray-400 mt-1">0 = deterministisch, 1 = kreativ. Standard: 0.7</p>
                </div>

                <div className="p-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Output Tokens</label>
                  <input type="number" value={aiMaxTokens} onChange={(e) => setAiMaxTokens(e.target.value)} className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>

                <div className="p-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">System Prompt Erweiterung (Global)</label>
                  <textarea
                    value={systemPromptAppend}
                    onChange={(e) => setSystemPromptAppend(e.target.value)}
                    placeholder="Optionaler Text der an den System-Prompt aller Tenants angehängt wird..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              {/* API Keys */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-400" />API Keys
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {[
                    { name: 'OpenAI API Key', key: 'OPENAI_API_KEY', value: 'sk-proj-abc123...' },
                    { name: 'Gemini API Key', key: 'GEMINI_API_KEY', value: 'AIzaSyB...' },
                    { name: 'Encryption Key', key: 'ENCRYPTION_KEY', value: 'neuroconcepts-...' },
                  ].map((apiKey) => (
                    <div key={apiKey.key} className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-xs font-medium text-gray-700">{apiKey.name}</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                          {showKeys[apiKey.key] ? apiKey.value : maskValue(apiKey.value)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleKeyVisibility(apiKey.key)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
                          {showKeys[apiKey.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-gray-50 rounded-b-xl border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Keys werden in AWS Secrets Manager gespeichert. Änderungen hier überschreiben den Secret Store.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Auth Settings */}
          {activeSection === 'auth' && (
            <>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Authentifizierung</h3>
                <p className="text-xs text-gray-500 mt-0.5">AWS Cognito Konfiguration</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {[
                  { label: 'Admin User Pool ID', value: 'eu-central-1_AbCdEf123' },
                  { label: 'Admin Client ID', value: '1a2b3c4d5e6f7g8h9i0j' },
                  { label: 'Tenant User Pool ID', value: 'eu-central-1_XyZwVu789' },
                  { label: 'Tenant Client ID', value: '9z8y7x6w5v4u3t2s1r0q' },
                  { label: 'MFA', value: 'Optional (TOTP)' },
                  { label: 'Password Policy', value: 'Min 8 Zeichen, 1 Großbuchstabe, 1 Zahl, 1 Sonderzeichen' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4">
                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                    <span className="text-xs font-mono text-gray-500">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Email Settings */}
          {activeSection === 'email' && (
            <>
              <div>
                <h3 className="text-base font-semibold text-gray-900">E-Mail (AWS SES)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Konfiguration für ausgehende E-Mails</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                <div className="p-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail Domain</label>
                  <input type="text" value={emailDomain} onChange={(e) => setEmailDomain(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div className="p-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Absender-Name</label>
                  <input type="text" value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div className="p-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tägliches Sendelimit</label>
                  <input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
            </>
          )}

          {/* Other sections — placeholders */}
          {['integrations', 'security', 'notifications', 'branding', 'advanced'].includes(activeSection) && (
            <>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{SECTIONS.find(s => s.id === activeSection)?.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Einstellungen werden geladen...</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  {(() => { const Icon = SECTIONS.find(s => s.id === activeSection)?.icon || Settings; return <Icon className="w-6 h-6 text-gray-300" />; })()}
                </div>
                <p className="text-sm text-gray-500">Wird in Kürze implementiert</p>
                <p className="text-xs text-gray-400 mt-1">Diese Einstellungen sind in Entwicklung.</p>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              Zurücksetzen
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Gespeichert!' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
