'use client';

import Link from 'next/link';
import { Sparkles, Globe, Mail, Calendar, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function IntegrationenPage() {
  const integrations = [
    {
      category: 'Immobilienportale',
      items: [
        { name: 'ImmoScout24', description: 'Deutschlands größtes Immobilienportal' },
        { name: 'Willhaben', description: 'Österreichs führender Marktplatz' },
        { name: 'Immowelt', description: 'Millionen Nutzer monatlich' },
        { name: 'Homegate', description: 'Schweizer Immobilienplattform' },
        { name: 'Kleinanzeigen', description: 'Ehemals eBay Kleinanzeigen' },
        { name: 'Weitere Portale', description: 'Auf Anfrage integrierbar' }
      ]
    },
    {
      category: 'E-Mail & Kalender',
      items: [
        { name: 'Google Workspace', description: 'Gmail, Google Calendar' },
        { name: 'Microsoft 365', description: 'Outlook, Exchange' },
        { name: 'SMTP/IMAP', description: 'Jeder E-Mail-Provider' }
      ]
    },
    {
      category: 'Cloud & Speicher',
      items: [
        { name: 'AWS S3', description: 'Sichere Dateispeicherung' },
        { name: 'Google Drive', description: 'Dokumenten-Sync' },
        { name: 'Dropbox', description: 'Datei-Integration' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">NeuroConcepts</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Anmelden
              </Link>
              <Link 
                href="/login" 
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/30 transition-all hover:-translate-y-0.5"
              >
                Kostenlos starten
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
            Nahtlose Integrationen
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            NeuroConcepts verbindet sich mit allen Tools, die du bereits nutzt. 
            Automatischer Datenaustausch, keine manuelle Arbeit.
          </p>
        </div>
      </section>

      {/* Integrations Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {integrations.map((category, i) => (
            <div key={i} className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">{category.category}</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {category.items.map((item, j) => (
                  <div key={j} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                      <Globe className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.name}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-indigo-600 to-violet-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Deine Integration fehlt?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Kontaktiere uns und wir prüfen, ob wir dein Tool integrieren können.
          </p>
          <Link 
            href="/kontakt"
            className="inline-flex items-center px-8 py-4 bg-white text-indigo-600 rounded-full font-semibold hover:bg-gray-100 transition-all"
          >
            Kontakt aufnehmen
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2026 NeuroConcepts AI GmbH. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
}
