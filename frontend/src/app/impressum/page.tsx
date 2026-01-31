'use client';

import Link from 'next/link';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="impressum" />

      {/* Content */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 sm:mb-8">Impressum</h1>
          
          <div className="prose prose-sm sm:prose-lg max-w-none text-gray-600">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Angaben gemäß § 5 ECG</h2>
            
            <p className="text-sm sm:text-base">
              <strong>NeuroConcepts AI GmbH</strong><br />
              Musterstraße 123<br />
              1010 Wien<br />
              Österreich
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Kontakt</h2>
            <p className="text-sm sm:text-base">
              Telefon: +43 1 234 56 78<br />
              E-Mail: hello@neuroconcepts.ai
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Handelsregister</h2>
            <p className="text-sm sm:text-base">
              Firmenbuchnummer: FN 123456a<br />
              Firmenbuchgericht: Handelsgericht Wien
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Umsatzsteuer-ID</h2>
            <p className="text-sm sm:text-base">
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG:<br />
              ATU12345678
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Geschäftsführung</h2>
            <p className="text-sm sm:text-base">
              [Name des Geschäftsführers]
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Aufsichtsbehörde</h2>
            <p className="text-sm sm:text-base">
              Magistrat der Stadt Wien
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Berufsbezeichnung und berufsrechtliche Regelungen</h2>
            <p className="text-sm sm:text-base">
              Berufsbezeichnung: IT-Dienstleistungen<br />
              Verliehen in: Österreich
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Streitschlichtung</h2>
            <p className="text-sm sm:text-base">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
            <p className="text-sm sm:text-base">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Haftung für Inhalte</h2>
            <p className="text-sm sm:text-base">
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 ECG für eigene Inhalte auf diesen 
              Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 ECG sind 
              wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte 
              fremde Informationen zu überwachen.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Haftung für Links</h2>
            <p className="text-sm sm:text-base">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir 
              keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine 
              Gewähr übernehmen.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Urheberrecht</h2>
            <p className="text-sm sm:text-base">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten 
              unterliegen dem österreichischen Urheberrecht. Die Vervielfältigung, Bearbeitung, 
              Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes 
              bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
