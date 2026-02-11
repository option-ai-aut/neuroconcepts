'use client';

import { useState, useEffect } from 'react';
import { Mail, Calendar, Check, Eye, EyeOff, Loader2, Copy, CheckCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { getRuntimeConfig } from '@/components/EnvProvider';
import { fetchAuthSession } from 'aws-amplify/auth';

// Helper to get API URL without trailing slash
const getApiUrl = () => {
  const config = getRuntimeConfig();
  const url = config.apiUrl || '';
  return url.replace(/\/+$/, '');
};

// Get auth headers
const getAuthHeaders = async (): Promise<HeadersInit> => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch (error) {
    console.error('Error fetching auth session:', error);
    return {};
  }
};

export default function IntegrationsSettingsPage() {
  const searchParams = useSearchParams();
  
  // Inbound Lead Email
  const [inboundLeadEmail, setInboundLeadEmail] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: 587,
    user: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  // Calendar state
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [outlookCalendarConnected, setOutlookCalendarConnected] = useState(false);
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState<string | null>(null);
  const [outlookCalendarEmail, setOutlookCalendarEmail] = useState<string | null>(null);
  const [shareCalendar, setShareCalendar] = useState(true);
  
  // Email state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [outlookMailConnected, setOutlookMailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [outlookMailEmail, setOutlookMailEmail] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load status
  useEffect(() => {
    loadStatus();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const provider = searchParams.get('provider');
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const email = searchParams.get('email');
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const expiryDate = searchParams.get('expiryDate');

    if (success === 'true' && provider) {
      // Handle email OAuth callbacks
      if ((provider === 'gmail' || provider === 'outlook-mail') && accessToken && refreshToken) {
        saveEmailConfig(provider, {
          accessToken,
          refreshToken,
          expiryDate: expiryDate ? parseInt(expiryDate) : Date.now() + 3600000,
          email: email ? decodeURIComponent(email) : ''
        });
      }
      
      // Handle calendar OAuth callbacks - save tokens to backend
      if ((provider === 'google-calendar' || provider === 'outlook-calendar') && accessToken && refreshToken) {
        saveCalendarConfig(provider, {
          accessToken,
          refreshToken,
          expiryDate: expiryDate ? parseInt(expiryDate) : Date.now() + 3600000,
          email: email ? decodeURIComponent(email) : ''
        });
      }
      
      // Update UI state
      if (provider === 'google-calendar') {
        setGoogleCalendarConnected(true);
        if (email) setGoogleCalendarEmail(decodeURIComponent(email));
        setMessage({ type: 'success', text: 'Google Calendar erfolgreich verbunden!' });
      } else if (provider === 'outlook-calendar') {
        setOutlookCalendarConnected(true);
        if (email) setOutlookCalendarEmail(decodeURIComponent(email));
        setMessage({ type: 'success', text: 'Outlook Calendar erfolgreich verbunden!' });
      } else if (provider === 'gmail') {
        setGmailConnected(true);
        if (email) setGmailEmail(decodeURIComponent(email));
        setMessage({ type: 'success', text: 'Gmail erfolgreich verbunden! E-Mails werden synchronisiert...' });
        // Trigger initial email sync after connecting
        triggerEmailSync();
      } else if (provider === 'outlook-mail') {
        setOutlookMailConnected(true);
        if (email) setOutlookMailEmail(decodeURIComponent(email));
        setMessage({ type: 'success', text: 'Outlook Mail erfolgreich verbunden! E-Mails werden synchronisiert...' });
        // Trigger initial email sync after connecting
        triggerEmailSync();
      }

      // Clear URL params
      window.history.replaceState({}, '', '/dashboard/settings/integrations');
      
      // Reload status
      setTimeout(() => loadStatus(), 1000);
    } else if (error === 'true' && provider) {
      const providerName = provider === 'google' ? 'Google Calendar' : 
                          provider === 'outlook' ? 'Outlook Calendar' :
                          provider === 'gmail' ? 'Gmail' : 'Outlook Mail';
      setMessage({ type: 'error', text: `Fehler beim Verbinden mit ${providerName}` });
    }
  }, [searchParams]);

  const saveEmailConfig = async (provider: string, config: any) => {
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      const endpoint = provider === 'gmail' ? '/email/gmail/connect' : '/email/outlook/connect';
      
      await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch (error) {
      console.error('Error saving email config:', error);
    }
  };

  const saveCalendarConfig = async (provider: string, config: any) => {
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      const endpoint = provider === 'google-calendar' ? '/calendar/google/save' : '/calendar/outlook/save';
      
      await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch (error) {
      console.error('Error saving calendar config:', error);
    }
  };

  const loadStatus = async () => {
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      
      // Load calendar status
      const calendarResponse = await fetch(`${apiUrl}/calendar/status`, { headers });
      if (calendarResponse.ok) {
        const data = await calendarResponse.json();
        setGoogleCalendarConnected(data.google.connected);
        setGoogleCalendarEmail(data.google.email);
        setOutlookCalendarConnected(data.outlook.connected);
        setOutlookCalendarEmail(data.outlook.email);
        setShareCalendar(data.shareTeam);
      }
      
      // Load email status
      const emailResponse = await fetch(`${apiUrl}/email/status`, { headers });
      if (emailResponse.ok) {
        const data = await emailResponse.json();
        setGmailConnected(data.gmail.connected);
        setGmailEmail(data.gmail.email);
        setOutlookMailConnected(data.outlook.connected);
        setOutlookMailEmail(data.outlook.email);
      }
      
      // Load tenant settings for inbound email
      const settingsResponse = await fetch(`${apiUrl}/settings/tenant`, { headers });
      if (settingsResponse.ok) {
        const data = await settingsResponse.json();
        if (data.inboundLeadEmail) {
          setInboundLeadEmail(`${data.inboundLeadEmail}@leads.immivo.ai`);
        }
      }
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopyEmail = () => {
    if (inboundLeadEmail) {
      navigator.clipboard.writeText(inboundLeadEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  // Trigger email sync after connecting a provider
  const triggerEmailSync = async () => {
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      await fetch(`${apiUrl}/emails/sync`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
      console.log('📧 Email sync triggered after provider connect');
    } catch (error) {
      console.error('Error triggering email sync:', error);
    }
  };

  const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSmtpConfig({ ...smtpConfig, [e.target.name]: e.target.value });
  };

  const handleConnectCalendar = async (provider: 'google' | 'outlook') => {
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/calendar/${provider}/auth-url`, { headers });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        setMessage({ type: 'error', text: 'Fehler beim Starten der Authentifizierung' });
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      setMessage({ type: 'error', text: 'Fehler beim Verbinden des Kalenders' });
    }
  };

  const handleDisconnectCalendar = async (provider: 'google' | 'outlook') => {
    if (!confirm(`Möchten Sie ${provider === 'google' ? 'Google' : 'Outlook'} Calendar wirklich trennen?`)) {
      return;
    }

    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/calendar/${provider}/disconnect`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        if (provider === 'google') {
          setGoogleCalendarConnected(false);
          setGoogleCalendarEmail(null);
        } else {
          setOutlookCalendarConnected(false);
          setOutlookCalendarEmail(null);
        }
        setMessage({ type: 'success', text: 'Kalender erfolgreich getrennt' });
      } else {
        setMessage({ type: 'error', text: 'Fehler beim Trennen des Kalenders' });
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      setMessage({ type: 'error', text: 'Fehler beim Trennen des Kalenders' });
    }
  };

  const handleConnectEmail = async (provider: 'gmail' | 'outlook') => {
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/email/${provider}/auth-url`, { headers });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else if (response.status === 409) {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Es ist bereits ein anderer E-Mail-Anbieter verbunden.' });
      } else {
        setMessage({ type: 'error', text: 'Fehler beim Starten der Authentifizierung' });
      }
    } catch (error) {
      console.error('Error connecting email:', error);
      setMessage({ type: 'error', text: 'Fehler beim Verbinden der E-Mail' });
    }
  };

  const handleDisconnectEmail = async (provider: 'gmail' | 'outlook') => {
    const providerName = provider === 'gmail' ? 'Gmail' : 'Outlook Mail';
    if (!confirm(`Möchten Sie ${providerName} wirklich trennen?`)) {
      return;
    }

    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/email/${provider}/disconnect`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        if (provider === 'gmail') {
          setGmailConnected(false);
          setGmailEmail(null);
        } else {
          setOutlookMailConnected(false);
          setOutlookMailEmail(null);
        }
        setMessage({ type: 'success', text: `${providerName} erfolgreich getrennt` });
      } else {
        setMessage({ type: 'error', text: `Fehler beim Trennen von ${providerName}` });
      }
    } catch (error) {
      console.error('Error disconnecting email:', error);
      setMessage({ type: 'error', text: `Fehler beim Trennen von ${providerName}` });
    }
  };

  const handleShareToggle = async () => {
    const newValue = !shareCalendar;
    setShareCalendar(newValue);

    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      await fetch(`${apiUrl}/calendar/share-team`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
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

      {/* Lead Ingestion Email */}
      {inboundLeadEmail && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <Mail className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Portal-Weiterleitungsadresse</h3>
          </div>
          
          <div className="bg-indigo-50 rounded-xl p-6">
            <p className="text-sm text-gray-700 mb-4">
              Leite Anfragen von Immobilienportalen an diese E-Mail-Adresse weiter. 
              Jarvis wird die Anfragen automatisch verarbeiten und Leads erstellen.
            </p>
            
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white rounded-lg px-4 py-3 border border-indigo-200">
                <code className="text-sm font-mono text-indigo-700">{inboundLeadEmail}</code>
              </div>
              <button
                onClick={handleCopyEmail}
                className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                {copiedEmail ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Kopiert!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-sm font-medium">Kopieren</span>
                  </>
                )}
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              Trage diese Adresse in den Portal-Einstellungen als Weiterleitungsadresse ein.
            </p>
          </div>
        </div>
      )}

      {/* E-Mail Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <Mail className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">E-Mail</h3>
        </div>

        {/* Info: Only one email provider at a time */}
        {!gmailConnected && !outlookMailConnected && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <p className="text-xs text-amber-700">
              Du kannst nur einen E-Mail-Anbieter gleichzeitig verbinden. Wähle entweder Gmail oder Outlook.
            </p>
          </div>
        )}

        {/* Gmail */}
        <div className={`flex items-center justify-between py-4 border-b border-gray-100 ${outlookMailConnected ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-8 h-8">
              <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
            </svg>
            <div>
              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                Gmail
                {gmailConnected && <Check className="w-4 h-4 text-green-500" />}
              </div>
              <div className="text-xs text-gray-500">
                {gmailConnected 
                  ? `Verbunden als ${gmailEmail}` 
                  : outlookMailConnected 
                    ? 'Trenne zuerst Outlook, um Gmail zu nutzen'
                    : 'E-Mails über Gmail senden und empfangen'}
              </div>
            </div>
          </div>
          {gmailConnected ? (
            <button
              onClick={() => handleDisconnectEmail('gmail')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Trennen
            </button>
          ) : (
            <button
              onClick={() => handleConnectEmail('gmail')}
              disabled={outlookMailConnected}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verbinden
            </button>
          )}
        </div>

        {/* Outlook Mail */}
        <div className={`flex items-center justify-between py-4 border-b border-gray-100 ${gmailConnected ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-8 h-8">
              <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.152-.354.228-.586.228h-8.547v-6.959l1.2.914c.088.064.19.096.308.096.117 0 .22-.032.308-.096l7.317-5.478c.088-.064.158-.14.21-.228.053-.088.028-.176-.028-.264-.064-.088-.14-.14-.228-.14H14.63v-1.47c0-.23.076-.424.228-.576.152-.152.346-.228.576-.228h7.99c.23 0 .424.076.576.228.152.152.228.346.228.576v2.343zM14.63 19.478H.576c-.23 0-.424-.076-.576-.228C0 19.098 0 18.904 0 18.674V5.326c0-.23.076-.424.228-.576C.38 4.598.576 4.522.806 4.522h13.824v14.956zm-7.315-2.87c1.624 0 2.94-.476 3.948-1.428 1.008-.952 1.512-2.196 1.512-3.732 0-1.536-.504-2.78-1.512-3.732-1.008-.952-2.324-1.428-3.948-1.428-1.624 0-2.94.476-3.948 1.428C2.359 8.668 1.855 9.912 1.855 11.448c0 1.536.504 2.78 1.512 3.732 1.008.952 2.324 1.428 3.948 1.428zm0-1.764c-.952 0-1.708-.308-2.268-.924-.56-.616-.84-1.428-.84-2.436 0-1.008.28-1.82.84-2.436.56-.616 1.316-.924 2.268-.924.952 0 1.708.308 2.268.924.56.616.84 1.428.84 2.436 0 1.008-.28 1.82-.84 2.436-.56.616-1.316.924-2.268.924z"/>
            </svg>
            <div>
              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                Outlook Mail
                {outlookMailConnected && <Check className="w-4 h-4 text-green-500" />}
              </div>
              <div className="text-xs text-gray-500">
                {outlookMailConnected 
                  ? `Verbunden als ${outlookMailEmail}` 
                  : gmailConnected 
                    ? 'Trenne zuerst Gmail, um Outlook zu nutzen'
                    : 'E-Mails über Outlook senden und empfangen'}
              </div>
            </div>
          </div>
          {outlookMailConnected ? (
            <button
              onClick={() => handleDisconnectEmail('outlook')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Trennen
            </button>
          ) : (
            <button
              onClick={() => handleConnectEmail('outlook')}
              disabled={gmailConnected}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verbinden
            </button>
          )}
        </div>

        {/* Inbound */}
        <div className="space-y-3 pt-4">
          <div>
            <div className="text-sm font-medium text-gray-900 mb-1">Empfangsadresse (Weiterleitung)</div>
            <p className="text-xs text-gray-500">
              Alternativ: Leiten Sie Portal-Anfragen an diese Adresse weiter.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-gray-800 font-mono text-sm select-all truncate">
              {inboundLeadEmail || 'Wird geladen...'}
            </code>
            <button 
              onClick={() => inboundLeadEmail && navigator.clipboard.writeText(inboundLeadEmail)}
              disabled={!inboundLeadEmail}
              className="px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              Kopieren
            </button>
          </div>
        </div>

        {/* SMTP (collapsed by default) */}
        <details className="pt-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
            Erweitert: Eigener SMTP-Server
          </summary>
          <div className="space-y-4 pt-4">
            <p className="text-xs text-gray-500">
              Optional: Eigene E-Mail-Adresse für Versand nutzen.
            </p>
            
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
        </details>
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
                {googleCalendarConnected && <Check className="w-4 h-4 text-green-500" />}
              </div>
              <div className="text-xs text-gray-500">
                {googleCalendarConnected ? `Verbunden als ${googleCalendarEmail}` : 'Nicht verbunden'}
              </div>
            </div>
          </div>
          {googleCalendarConnected ? (
            <button
              onClick={() => handleDisconnectCalendar('google')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Trennen
            </button>
          ) : (
            <button
              onClick={() => handleConnectCalendar('google')}
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
                {outlookCalendarConnected && <Check className="w-4 h-4 text-green-500" />}
              </div>
              <div className="text-xs text-gray-500">
                {outlookCalendarConnected ? `Verbunden als ${outlookCalendarEmail}` : 'Nicht verbunden'}
              </div>
            </div>
          </div>
          {outlookCalendarConnected ? (
            <button
              onClick={() => handleDisconnectCalendar('outlook')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Trennen
            </button>
          ) : (
            <button
              onClick={() => handleConnectCalendar('outlook')}
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
