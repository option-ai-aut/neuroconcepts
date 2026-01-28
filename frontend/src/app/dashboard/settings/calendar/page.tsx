'use client';

import { useState } from 'react';
import { Check, X, Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarSettingsPage() {
  // Mock state - in production this comes from the DB
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [shareCalendar, setShareCalendar] = useState(true);

  const handleConnect = (provider: 'google' | 'outlook') => {
    // TODO: Trigger OAuth flow
    if (provider === 'google') setGoogleConnected(true);
    if (provider === 'outlook') setOutlookConnected(true);
  };

  const handleDisconnect = (provider: 'google' | 'outlook') => {
    if (provider === 'google') setGoogleConnected(false);
    if (provider === 'outlook') setOutlookConnected(false);
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Kalender-Verbindungen</h2>
        <p className="text-sm text-gray-500 mb-6">
          Verbinden Sie Ihren Kalender, damit Jarvis Verfügbarkeiten prüfen und Termine buchen kann.
        </p>

        <div className="space-y-4">
          {/* Google Calendar */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center p-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google" className="w-full h-full" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Google Calendar</h3>
                <p className="text-xs text-gray-500">
                  {googleConnected ? 'Verbunden als max@neuroconcepts.ai' : 'Nicht verbunden'}
                </p>
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
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Verbinden
              </button>
            )}
          </div>

          {/* Outlook Calendar */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center p-2">
                {/* Placeholder Icon for Outlook */}
                <CalendarIcon className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Outlook Calendar</h3>
                <p className="text-xs text-gray-500">
                  {outlookConnected ? 'Verbunden' : 'Nicht verbunden'}
                </p>
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
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Verbinden
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Team-Einstellungen</h2>
        <p className="text-sm text-gray-500 mb-6">
          Verwalten Sie, wie Ihr Kalender innerhalb des Unternehmens sichtbar ist.
        </p>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">Kalender für Team freigeben</span>
            <span className="text-sm text-gray-500">Erlaubt anderen Mitarbeitern, Ihre Verfügbarkeit zu sehen (keine Details).</span>
          </div>
          <button
            onClick={() => setShareCalendar(!shareCalendar)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
              shareCalendar ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              aria-hidden="true"
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
