'use client';

import { useState, useEffect } from 'react';
import { Mail, Calendar, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { getRuntimeConfig } from '@/components/EnvProvider';

export default function IntegrationsSettingsPage() {
  const searchParams = useSearchParams();
  const config = getRuntimeConfig();
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
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [outlookEmail, setOutlookEmail] = useState<string | null>(null);
  const [shareCalendar, setShareCalendar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load calendar status
  useEffect(() => {
    loadCalendarStatus();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const provider = searchParams.get('provider');
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const email = searchParams.get('email');

    if (success === 'true' && provider) {
      setMessage({
        type: 'success',
        text: `${provider === 'google' ? 'Google' : 'Outlook'} Calendar erfolgreich verbunden!`
      });
      
      if (provider === 'google') {
        setGoogleConnected(true);
        if (email) setGoogleEmail(decodeURIComponent(email));
      } else {
        setOutlookConnected(true);
        if (email) setOutlookEmail(decodeURIComponent(email));
      }

      // Clear URL params
      window.history.replaceState({}, '', '/dashboard/settings/integrations');
      
      // Reload status
      setTimeout(() => loadCalendarStatus(), 1000);
    } else if (error === 'true' && provider) {
      setMessage({
        type: 'error',
        text: `Fehler beim Verbinden mit ${provider === 'google' ? 'Google' : 'Outlook'} Calendar`
      });
    }
  }, [searchParams]);

  const loadCalendarStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/calendar/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGoogleConnected(data.google.connected);
        setGoogleEmail(data.google.email);
        setOutlookConnected(data.outlook.connected);
        setOutlookEmail(data.outlook.email);
        setShareCalendar(data.shareTeam);
      } else if (response.status === 401) {
        console.warn('Not authenticated - calendar status not loaded');
        // Set default values for unauthenticated state
        setGoogleConnected(false);
        setOutlookConnected(false);
      }
    } catch (error) {
      console.error('Error loading calendar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSmtpConfig({ ...smtpConfig, [e.target.name]: e.target.value });
  };

  const handleConnect = async (provider: 'google' | 'outlook') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/calendar/${provider}/auth-url`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to OAuth provider
        window.location.href = data.authUrl;
      } else {
        setMessage({
          type: 'error',
          text: 'Fehler beim Starten der Authentifizierung'
        });
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      setMessage({
        type: 'error',
        text: 'Fehler beim Verbinden des Kalenders'
      });
    }
  };

  const handleDisconnect = async (provider: 'google' | 'outlook') => {
    if (!confirm(`Möchten Sie ${provider === 'google' ? 'Google' : 'Outlook'} Calendar wirklich trennen?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/calendar/${provider}/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        if (provider === 'google') {
          setGoogleConnected(false);
          setGoogleEmail(null);
        } else {
          setOutlookConnected(false);
          setOutlookEmail(null);
        }
        setMessage({
          type: 'success',
          text: 'Kalender erfolgreich getrennt'
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Fehler beim Trennen des Kalenders'
        });
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      setMessage({
        type: 'error',
        text: 'Fehler beim Trennen des Kalenders'
      });
    }
  };

  const handleShareToggle = async () => {
    const newValue = !shareCalendar;
    setShareCalendar(newValue);

    try {
      const token = localStorage.getItem('token');
      await fetch(`${config.apiUrl}/calendar/share-team`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shareTeam: newValue })
      });
    } catch (error) {
      console.error('Error updating share setting:', error);
      setShareCalendar(!newValue); // Revert on error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Success/Error Message */}
      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* E-Mail Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <Mail className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">E-Mail</h3>
        </div>

        {/* Inbound */}
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-900 mb-1">Empfangsadresse</div>
            <p className="text-xs text-gray-500">
              Leiten Sie Portal-Anfragen an diese Adresse weiter.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-gray-800 font-mono text-sm select-all truncate">
              {inboundEmail}
            </code>
            <button 
              onClick={() => navigator.clipboard.writeText(inboundEmail)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              Kopieren
            </button>
          </div>
        </div>

        {/* SMTP */}
        <div className="space-y-4 pt-4">
          <div>
            <div className="text-sm font-medium text-gray-900 mb-1">SMTP Versand</div>
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
                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Port</label>
              <input 
                name="port"
                type="number" 
                value={smtpConfig.port}
                onChange={handleSmtpChange}
                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 pr-10 bg-gray-50 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            Testen & Speichern
          </button>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Kalender</h3>
        </div>

        {/* Google Calendar */}
        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" 
              alt="Google" 
              className="w-8 h-8"
            />
            <div>
              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                Google Calendar
                {googleConnected && <Check className="w-4 h-4 text-green-500" />}
              </div>
              <div className="text-xs text-gray-500">
                {googleConnected ? `Verbunden als ${googleEmail}` : 'Nicht verbunden'}
              </div>
            </div>
          </div>
          {googleConnected ? (
            <button
              onClick={() => handleDisconnect('google')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Trennen
            </button>
          ) : (
            <button
              onClick={() => handleConnect('google')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Verbinden
            </button>
          )}
        </div>

        {/* Outlook Calendar */}
        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-8 h-8">
              <path fill="#0078D4" d="M21.5 2h-19A.5.5 0 002 2.5v19a.5.5 0 00.5.5h19a.5.5 0 00.5-.5v-19a.5.5 0 00-.5-.5z"/>
              <path fill="#fff" d="M12 6a6 6 0 100 12 6 6 0 000-12zm0 10.5a4.5 4.5 0 110-9 4.5 4.5 0 010 9z"/>
              <path fill="#fff" d="M12 8v4l3 1.5"/>
            </svg>
            <div>
              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                Outlook Calendar
                {outlookConnected && <Check className="w-4 h-4 text-green-500" />}
              </div>
              <div className="text-xs text-gray-500">
                {outlookConnected ? `Verbunden als ${outlookEmail}` : 'Nicht verbunden'}
              </div>
            </div>
          </div>
          {outlookConnected ? (
            <button
              onClick={() => handleDisconnect('outlook')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Trennen
            </button>
          ) : (
            <button
              onClick={() => handleConnect('outlook')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Verbinden
            </button>
          )}
        </div>

        {/* Team Settings */}
        <div className="flex items-center justify-between py-4">
          <div>
            <div className="text-sm font-medium text-gray-900">Team-Freigabe</div>
            <div className="text-xs text-gray-500">Verfügbarkeit für Kollegen sichtbar</div>
          </div>
          <button
            onClick={handleShareToggle}
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
  );
}
