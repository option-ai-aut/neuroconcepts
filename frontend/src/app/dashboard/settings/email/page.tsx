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
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">E-Mail Empfang (Inbound)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Leiten Sie alle Anfragen von Immobilienportalen (ImmoScout, Willhaben) an diese Adresse weiter.
        </p>
        <div className="flex items-center space-x-4">
          <code className="bg-gray-100 px-4 py-2 rounded border border-gray-300 text-gray-800 font-mono select-all">
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

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">E-Mail Versand (SMTP)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Damit wir in Ihrem Namen antworten können, hinterlegen Sie bitte Ihre SMTP-Zugangsdaten.
        </p>
        <div className="grid grid-cols-1 gap-6 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
            <input 
              name="host"
              type="text" 
              placeholder="z.B. smtp.ionos.de"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              onChange={handleSmtpChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Port</label>
            <input 
              name="port"
              type="number" 
              defaultValue={587}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              onChange={handleSmtpChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Benutzername</label>
            <input 
              name="user"
              type="text" 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              onChange={handleSmtpChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Passwort</label>
            <input 
              name="password"
              type="password" 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              onChange={handleSmtpChange}
            />
          </div>
        </div>
        <div className="mt-6">
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Verbindung testen & Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
