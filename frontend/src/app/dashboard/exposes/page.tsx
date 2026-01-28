'use client';

import { FileText, Plus, MoreVertical } from 'lucide-react';

export default function ExposesPage() {
  const templates = [
    { id: 1, name: 'Standard Exposé (Miete)', subject: 'Ihr Exposé: {{property.title}}', active: true },
    { id: 2, name: 'Standard Exposé (Kauf)', subject: 'Verkaufsunterlagen: {{property.title}}', active: false },
    { id: 3, name: 'Kurz-Info', subject: 'Eckdaten zu {{property.address}}', active: false },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-6 shadow-sm z-10 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Exposés & Vorlagen</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Neue Vorlage
        </button>
      </div>
      
      <div className="flex-1 overflow-auto bg-gray-50/30 p-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group relative">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${template.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {template.active ? 'Aktiv' : 'Entwurf'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Betreff</p>
                <p className="text-sm text-gray-700 truncate">{template.subject}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                <span>Zuletzt bearbeitet: vor 2 Tagen</span>
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
