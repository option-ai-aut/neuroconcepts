'use client';

import { useState } from 'react';

export default function AdminPage() {
  // TODO: Fetch from API (protected by SUPER_ADMIN role)
  const [model, setModel] = useState('gpt-5-mini');
  const [apiKey, setApiKey] = useState('');

  const handleSave = () => {
    alert('Model Config Saved (Mock)');
    // TODO: POST to /admin/config
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Konsole</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Jarvis Modell Konfiguration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Hier kannst du das Jarvis-Modell global für alle Mandanten ändern.
        </p>
        
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Modell Name</label>
            <select 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="gpt-5-mini">GPT-5 Mini (Standard)</option>
              <option value="gpt-5">GPT-5</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">API Key Override (Optional)</label>
            <input 
              type="password" 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Wenn leer, wird der System-Key verwendet"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6">
          <button 
            onClick={handleSave}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Konfiguration Speichern
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">System Status</h2>
        <div className="text-sm text-gray-600">
          <p>Tenants: 1</p>
          <p>Active Users: 1</p>
          <p>Total Leads: 1</p>
        </div>
      </div>
    </div>
  );
}
