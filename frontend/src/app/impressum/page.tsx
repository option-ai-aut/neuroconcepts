'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function ImpressumPage() {
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
          </div>
        </div>
      </nav>

      {/* Content */}
      <section className="pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Impressum</h1>
          
          <div className="prose prose-lg max-w-none text-gray-600">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Angaben gemäß § 5 ECG</h2>
            
            <p>
              <strong>NeuroConcepts AI GmbH</strong><br />
              Musterstraße 123<br />
              1010 Wien<br />
              Österreich
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Kontakt</h2>
            <p>
              Telefon: +43 1 234 56 78<br />
              E-Mail: hello@neuroconcepts.ai
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Handelsregister</h2>
            <p>
              Firmenbuchnummer: FN 123456a<br />
              Firmenbuchgericht: Handelsgericht Wien
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Umsatzsteuer-ID</h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG:<br />
              ATU12345678
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Geschäftsführung</h2>
            <p>
              [Name des Geschäftsführers]
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Aufsichtsbehörde</h2>
            <p>
              Magistrat der Stadt Wien
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Berufsbezeichnung und berufsrechtliche Regelungen</h2>
            <p>
              Berufsbezeichnung: IT-Dienstleistungen<br />
              Verliehen in: Österreich
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Streitschlichtung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Haftung für Inhalte</h2>
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 ECG für eigene Inhalte auf diesen 
              Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 ECG sind 
              wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte 
              fremde Informationen zu überwachen.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Haftung für Links</h2>
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir 
              keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine 
              Gewähr übernehmen.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Urheberrecht</h2>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten 
              unterliegen dem österreichischen Urheberrecht. Die Vervielfältigung, Bearbeitung, 
              Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes 
              bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </div>
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
