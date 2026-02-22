'use client';

import { useState, useEffect } from 'react';
import { Bot, Clock, MessageSquare, Zap, Calendar, Bell, Save, Loader2, Shield } from 'lucide-react';
import useSWR from 'swr';
import { useEnv } from '@/components/EnvProvider';
import { fetchWithAuth } from '@/lib/api';

interface UserSettings {
  id?: string;
  emailNotifications: boolean;
  viewingPreferences: {
    enabled: boolean;
    weekdays: number[];
    startTime: string;
    endTime: string;
    slotDuration: number;
    bufferTime: number;
  };
}

interface TenantSettings {
  autoReplyEnabled: boolean;
  autoReplyDelay: number;
  aiDisclosureEnabled: boolean;
  calendarShareTeam: boolean;
  inboundLeadEmail: string;
}

const WEEKDAYS = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 0, label: 'So' },
];

export default function MivoSettingsPage() {
  const { apiUrl } = useEnv();
  const [autoReply, setAutoReply] = useState(false);
  const [delay, setDelay] = useState(5);
  const [aiDisclosure, setAiDisclosure] = useState(true);
  const [autoMatch, setAutoMatch] = useState(true);
  const [notifyOnMatch, setNotifyOnMatch] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // User-specific settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [viewingEnabled, setViewingEnabled] = useState(true);
  const [viewingWeekdays, setViewingWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [viewingStartTime, setViewingStartTime] = useState('09:00');
  const [viewingEndTime, setViewingEndTime] = useState('18:00');
  const [slotDuration, setSlotDuration] = useState(30);
  const [bufferTime, setBufferTime] = useState(15);

  // Fetch user settings
  const { data: settingsData, mutate } = useSWR<{ settings: UserSettings }>(
    `${apiUrl}/me/settings`,
    (url: string) => fetchWithAuth(url),
    { revalidateOnFocus: false }
  );

  // Fetch tenant settings (auto-reply, AI disclosure, etc.)
  const { data: tenantData, mutate: mutateTenant } = useSWR<TenantSettings>(
    `${apiUrl}/settings/tenant`,
    (url: string) => fetchWithAuth(url),
    { revalidateOnFocus: false }
  );

  // Load user settings when data arrives
  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      setEmailNotifications(s.emailNotifications ?? true);
      if (s.viewingPreferences) {
        setViewingEnabled(s.viewingPreferences.enabled ?? true);
        setViewingWeekdays(s.viewingPreferences.weekdays ?? [1, 2, 3, 4, 5]);
        setViewingStartTime(s.viewingPreferences.startTime ?? '09:00');
        setViewingEndTime(s.viewingPreferences.endTime ?? '18:00');
        setSlotDuration(s.viewingPreferences.slotDuration ?? 30);
        setBufferTime(s.viewingPreferences.bufferTime ?? 15);
      }
    }
  }, [settingsData]);

  // Load tenant settings when data arrives
  useEffect(() => {
    if (tenantData) {
      setAutoReply(tenantData.autoReplyEnabled ?? false);
      setDelay(tenantData.autoReplyDelay ?? 5);
      setAiDisclosure(tenantData.aiDisclosureEnabled ?? true);
    }
  }, [tenantData]);

  const toggleWeekday = (day: number) => {
    if (viewingWeekdays.includes(day)) {
      setViewingWeekdays(viewingWeekdays.filter(d => d !== day));
    } else {
      setViewingWeekdays([...viewingWeekdays, day].sort((a, b) => a - b));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Save user settings
      await fetchWithAuth(`${apiUrl}/me/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailNotifications,
          viewingPreferences: {
            enabled: viewingEnabled,
            weekdays: viewingWeekdays,
            startTime: viewingStartTime,
            endTime: viewingEndTime,
            slotDuration,
            bufferTime
          }
        })
      });

      // Save tenant settings (auto-reply, AI disclosure)
      await fetchWithAuth(`${apiUrl}/settings/tenant`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoReplyEnabled: autoReply,
          autoReplyDelay: delay,
          aiDisclosureEnabled: aiDisclosure,
        })
      });

      mutate();
      mutateTenant();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Automation Settings */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Mivo Automatisierung</h2>
        <p className="text-sm text-gray-500 mb-6">
          Konfigurieren Sie, wie Mivo auf neue Leads reagieren soll.
        </p>

        <div className="space-y-6">
          {/* Auto Reply */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">Automatische Antwort</span>
                <p className="text-xs text-gray-500">Mivo sendet automatisch Exposés an neue Leads</p>
              </div>
            </div>
            <button
              onClick={() => setAutoReply(!autoReply)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoReply ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoReply ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto Match */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">Auto-Matching</span>
                <p className="text-xs text-gray-500">Leads automatisch mit passenden Objekten verbinden</p>
              </div>
            </div>
            <button
              onClick={() => setAutoMatch(!autoMatch)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoMatch ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoMatch ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Notify on Match */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">Match-Benachrichtigung</span>
                <p className="text-xs text-gray-500">Bei neuen Matches benachrichtigen</p>
              </div>
            </div>
            <button
              onClick={() => setNotifyOnMatch(!notifyOnMatch)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                notifyOnMatch ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  notifyOnMatch ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Delay Setting */}
          {autoReply && (
            <div className="py-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">Verzögerung</span>
                  <p className="text-xs text-gray-500">Wartezeit vor dem Senden, damit es natürlicher wirkt</p>
                </div>
              </div>
              <div className="ml-13 pl-13">
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={delay}
                  onChange={(e) => setDelay(parseInt(e.target.value))}
                  className="w-full max-w-xs h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="mt-2 text-sm text-gray-900 font-medium">{delay} Minuten</div>
              </div>
            </div>
          )}

          {/* AI Disclosure */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">KI-Hinweis in E-Mails</span>
                <p className="text-xs text-gray-500">Dezenter Hinweis unter der Signatur, dass die E-Mail KI-unterstützt erstellt wurde</p>
              </div>
            </div>
            <button
              onClick={() => setAiDisclosure(!aiDisclosure)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                aiDisclosure ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  aiDisclosure ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Personal Settings */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Persönliche Einstellungen</h2>
        <p className="text-sm text-gray-500 mb-6">
          Diese Einstellungen gelten nur für dich, nicht für das gesamte Team.
        </p>

        <div className="space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">E-Mail-Benachrichtigungen</span>
                <p className="text-xs text-gray-500">Mivo-Fragen und Erinnerungen per E-Mail erhalten</p>
              </div>
            </div>
            <button
              onClick={() => setEmailNotifications(!emailNotifications)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                emailNotifications ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  emailNotifications ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Viewing Preferences */}
          <div className="py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">Besichtigungs-Präferenzen</span>
                  <p className="text-xs text-gray-500">Wann Mivo Besichtigungen vorschlagen darf</p>
                </div>
              </div>
              <button
                onClick={() => setViewingEnabled(!viewingEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  viewingEnabled ? 'bg-gray-900' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    viewingEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {viewingEnabled && (
              <div className="ml-13 pl-13 space-y-4 mt-4">
                {/* Weekdays */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Verfügbare Tage</label>
                  <div className="flex gap-2">
                    {WEEKDAYS.map(day => (
                      <button
                        key={day.value}
                        onClick={() => toggleWeekday(day.value)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          viewingWeekdays.includes(day.value)
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Von</label>
                    <input
                      type="time"
                      value={viewingStartTime}
                      onChange={(e) => setViewingStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bis</label>
                    <input
                      type="time"
                      value={viewingEndTime}
                      onChange={(e) => setViewingEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-gray-400"
                    />
                  </div>
                </div>

                {/* Slot Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dauer pro Besichtigung: {slotDuration} Minuten
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="90"
                    step="15"
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(parseInt(e.target.value))}
                    className="w-full max-w-xs h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Buffer Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pufferzeit zwischen Terminen: {bufferTime} Minuten
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={bufferTime}
                    onChange={(e) => setBufferTime(parseInt(e.target.value))}
                    className="w-full max-w-xs h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Speichern
          </button>
          {saveSuccess && (
            <span className="text-sm text-green-600">Einstellungen gespeichert!</span>
          )}
        </div>
      </div>
    </div>
  );
}
