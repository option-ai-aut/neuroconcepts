'use client';

import { useState } from 'react';

export default function EmailSettingsPage() {
  // TODO: Fetch real tenant ID from Auth/API
  const tenantId = 'default-tenant'; 
  const inboundEmail = `${tenantId}@inbound.neuroconcepts.ai`;

  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: 587,
    user: '',
    password: ''
  });

  const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSmtpConfig({ ...smtpConfig, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">E-Mail Empfang (Inbound)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Leiten Sie alle Anfragen von Immobilienportalen (ImmoScout, Willhaben) an diese Adresse weiter.
        </p>
        <div className="flex items-center space-x-4">
          <code className="bg-white px-4 py-2 rounded border border-gray-200 text-gray-800 font-mono text-sm select-all">
            {inboundEmail}
          </code>
          <button 
            onClick={() => navigator.clipboard.writeText(inboundEmail)}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Kopieren
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-1">E-Mail Versand (SMTP)</h2>
        <p className="text-sm text-gray-500 mb-6">
          Hinterlegen Sie Ihre SMTP-Zugangsdaten, damit sowohl Sie als auch Jarvis E-Mails direkt über Ihre eigene Adresse versenden können.
        </p>
        <div className="grid grid-cols-1 gap-6 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
            <input 
              name="host"
              type="text" 
              placeholder="z.B. smtp.ionos.de"
              className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              onChange={handleSmtpChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <input 
              name="port"
              type="number" 
              defaultValue={587}
              className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              onChange={handleSmtpChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Benutzername</label>
            <input 
              name="user"
              type="text" 
              className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              onChange={handleSmtpChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
            <input 
              name="password"
              type="password" 
              className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              onChange={handleSmtpChange}
            />
          </div>
        </div>
        <div className="mt-8">
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors">
            Verbindung testen & Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
