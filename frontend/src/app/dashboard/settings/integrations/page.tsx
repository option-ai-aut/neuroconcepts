'use client';

import { useState } from 'react';
import { Mail, Calendar, Check, Eye, EyeOff } from 'lucide-react';

export default function IntegrationsSettingsPage() {
  const tenantId = 'default-tenant'; 
  const inboundEmail = `${tenantId}@inbound.neuroconcepts.ai`;

  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: 587,
    user: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [shareCalendar, setShareCalendar] = useState(true);

  const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSmtpConfig({ ...smtpConfig, [e.target.name]: e.target.value });
  };

  const handleConnect = (provider: 'google' | 'outlook') => {
    if (provider === 'google') setGoogleConnected(true);
    if (provider === 'outlook') setOutlookConnected(true);
  };

  const handleDisconnect = (provider: 'google' | 'outlook') => {
    if (provider === 'google') setGoogleConnected(false);
    if (provider === 'outlook') setOutlookConnected(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Integrationen</h2>
        <p className="text-gray-500 mt-1">E-Mail und Kalender-Verbindungen verwalten</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-8">
        {/* E-Mail Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">E-Mail</h3>
          </div>

          {/* Inbound */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Empfangsadresse</div>
            <p className="text-xs text-gray-500 mb-3">
              Leiten Sie Portal-Anfragen an diese Adresse weiter.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-800 font-mono text-sm select-all truncate">
                {inboundEmail}
              </code>
              <button 
                onClick={() => navigator.clipboard.writeText(inboundEmail)}
                className="px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Kopieren
              </button>
            </div>
          </div>

          {/* SMTP */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">SMTP Versand</div>
              <p className="text-xs text-gray-500">
                Eigene E-Mail-Adresse für Versand nutzen.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Host</label>
                <input 
                  name="host"
                  type="text" 
                  value={smtpConfig.host}
                  onChange={handleSmtpChange}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Port</label>
                <input 
                  name="port"
                  type="number" 
                  value={smtpConfig.port}
                  onChange={handleSmtpChange}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Benutzername</label>
              <input 
                name="user"
                type="text" 
                value={smtpConfig.user}
                onChange={handleSmtpChange}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Passwort</label>
              <div className="relative">
                <input 
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={smtpConfig.password}
                  onChange={handleSmtpChange}
                  className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              Testen & Speichern
            </button>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Kalender</h3>
          </div>

          {/* Google Calendar */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center p-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google" className="w-full h-full" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  Google Calendar
                  {googleConnected && <Check className="w-4 h-4 text-green-500" />}
                </div>
                <div className="text-xs text-gray-500">
                  {googleConnected ? 'Verbunden' : 'Nicht verbunden'}
                </div>
              </div>
            </div>
            {googleConnected ? (
              <button
                onClick={() => handleDisconnect('google')}
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                Trennen
              </button>
            ) : (
              <button
                onClick={() => handleConnect('google')}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Verbinden
              </button>
            )}
          </div>

          {/* Outlook Calendar */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center p-2">
                <svg viewBox="0 0 24 24" className="w-6 h-6">
                  <path fill="#0078D4" d="M21.5 2h-19A.5.5 0 002 2.5v19a.5.5 0 00.5.5h19a.5.5 0 00.5-.5v-19a.5.5 0 00-.5-.5z"/>
                  <path fill="#fff" d="M12 6a6 6 0 100 12 6 6 0 000-12zm0 10.5a4.5 4.5 0 110-9 4.5 4.5 0 010 9z"/>
                  <path fill="#fff" d="M12 8v4l3 1.5"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  Outlook Calendar
                  {outlookConnected && <Check className="w-4 h-4 text-green-500" />}
                </div>
                <div className="text-xs text-gray-500">
                  {outlookConnected ? 'Verbunden' : 'Nicht verbunden'}
                </div>
              </div>
            </div>
            {outlookConnected ? (
              <button
                onClick={() => handleDisconnect('outlook')}
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                Trennen
              </button>
            ) : (
              <button
                onClick={() => handleConnect('outlook')}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Verbinden
              </button>
            )}
          </div>

          {/* Team Settings */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">Team-Freigabe</div>
                <div className="text-xs text-gray-500">Verfügbarkeit für Kollegen sichtbar</div>
              </div>
              <button
                onClick={() => setShareCalendar(!shareCalendar)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  shareCalendar ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    shareCalendar ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
