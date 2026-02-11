'use client';

import { use, useState } from 'react';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExposeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  // Mock Data - In production fetch from API
  const [template, setTemplate] = useState({
    id,
    name: id === 'new' ? '' : 'Standard Exposé (Miete)',
    subject: id === 'new' ? '' : 'Ihr Exposé: {{property.title}}',
    body: id === 'new' ? '' : `Sehr geehrte Damen und Herren,

vielen Dank für Ihr Interesse an {{property.title}}.

Anbei erhalten Sie das gewünschte Exposé.

Mit freundlichen Grüßen,
Ihr Makler Team`,
    active: true
  });

  const handleSave = () => {
    // TODO: API Call
    alert('Gespeichert!');
    router.push('/dashboard/exposes');
  };

  const handleDelete = () => {
    if (confirm('Wirklich löschen?')) {
      // TODO: API Call
      router.push('/dashboard/exposes');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="pt-8 px-8 pb-4 flex justify-between items-end shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/exposes" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            {id === 'new' ? 'Neue Vorlage' : 'Vorlage bearbeiten'}
          </h1>
        </div>
        <div className="flex gap-3 mb-1">
          {id !== 'new' && (
            <button 
              onClick={handleDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={handleSave}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 shadow-sm flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            Speichern
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8 pt-0">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name der Vorlage</label>
              <input
                type="text"
                value={template.name}
                onChange={(e) => setTemplate({...template, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="z.B. Standard Exposé"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail Betreff</label>
              <input
                type="text"
                value={template.subject}
                onChange={(e) => setTemplate({...template, subject: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Betreff der E-Mail..."
              />
              <p className="text-xs text-gray-500 mt-1">Verfügbare Variablen: {'{{property.title}}'}, {'{{lead.firstName}}'}, ...</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail Inhalt</label>
              <textarea
                rows={15}
                value={template.body}
                onChange={(e) => setTemplate({...template, body: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm leading-relaxed"
                placeholder="Schreiben Sie hier Ihre Vorlage..."
              />
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <input
                id="active"
                type="checkbox"
                checked={template.active}
                onChange={(e) => setTemplate({...template, active: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">
                Als aktive Standard-Vorlage verwenden
              </label>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
