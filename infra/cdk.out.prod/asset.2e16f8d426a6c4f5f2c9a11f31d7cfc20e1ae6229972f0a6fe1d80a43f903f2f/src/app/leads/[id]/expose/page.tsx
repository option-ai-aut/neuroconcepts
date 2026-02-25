'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function ExposeEditor() {
  const params = useParams();
  const [template, setTemplate] = useState('Standard Exposé');
  const [content, setContent] = useState(`
Hallo Max Mustermann,

anbei das Exposé für "Traumwohnung Berlin".
  `.trim());

  const handleSend = () => {
    alert('Exposé gesendet! (Mock)');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Exposé Editor</h1>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Template wählen</label>
          <select 
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          >
            <option>Standard Exposé</option>
            <option>Kurzfassung</option>
            <option>Englisch</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Vorschau & Bearbeiten</label>
          <textarea
            rows={10}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            Abbrechen
          </button>
          <button 
            onClick={handleSend}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}
