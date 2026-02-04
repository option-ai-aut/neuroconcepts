'use client';

import Link from 'next/link';
import { Globe, ArrowRight } from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

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
      <PublicNavigation currentPage="integrationen" />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 sm:mb-6">
            Nahtlose Integrationen
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Immivo verbindet sich mit allen Tools, die du bereits nutzt. 
            Automatischer Datenaustausch, keine manuelle Arbeit.
          </p>
        </div>
      </section>

      {/* Integrations Grid */}
      <section className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {integrations.map((category, i) => (
            <div key={i} className="mb-12 sm:mb-16">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">{category.category}</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {category.items.map((item, j) => (
                  <div key={j} className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                      <Globe className="w-5 sm:w-6 h-5 sm:h-6 text-indigo-600" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">{item.name}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-indigo-600 to-violet-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6">
            Deine Integration fehlt?
          </h2>
          <p className="text-lg sm:text-xl text-indigo-100 mb-6 sm:mb-8 px-4">
            Kontaktiere uns und wir prüfen, ob wir dein Tool integrieren können.
          </p>
          <Link 
            href="/kontakt"
            className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-white text-indigo-600 rounded-full font-semibold hover:bg-gray-100 transition-all"
          >
            Kontakt aufnehmen
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
