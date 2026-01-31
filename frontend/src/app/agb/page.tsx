'use client';

import Link from 'next/link';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

export default function AGBPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="agb" />

      {/* Content */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 sm:mb-8">Allgemeine Geschäftsbedingungen</h1>
          
          <div className="prose prose-sm sm:prose-lg max-w-none text-gray-600">
            <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">Stand: Januar 2026</p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">§ 1 Geltungsbereich</h2>
            <p className="text-sm sm:text-base">
              Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen der 
              NeuroConcepts AI GmbH und ihren Kunden über die Nutzung der NeuroConcepts-Plattform.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">§ 2 Vertragsgegenstand</h2>
            <p className="text-sm sm:text-base">
              NeuroConcepts stellt eine KI-gestützte Software-as-a-Service (SaaS) Plattform 
              für Immobilienmakler zur Verfügung. Der Funktionsumfang richtet sich nach dem 
              gewählten Tarif.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">§ 3 Vertragsschluss</h2>
            <p className="text-sm sm:text-base">
              Der Vertrag kommt durch die Registrierung auf der Plattform und die Bestätigung 
              der Registrierung durch NeuroConcepts zustande.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">§ 4 Testphase</h2>
            <p className="text-sm sm:text-base">
              Neukunden erhalten eine kostenlose Testphase von 14 Tagen. Nach Ablauf der 
              Testphase wird das Abonnement automatisch in den gewählten kostenpflichtigen 
              Tarif überführt, sofern eine Zahlungsmethode hinterlegt wurde.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">§ 5 Preise und Zahlung</h2>
            <p className="text-sm sm:text-base">
              Die aktuellen Preise sind auf der Website unter /preise einsehbar. 
              Die Abrechnung erfolgt monatlich oder jährlich im Voraus.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">§ 6 Kündigung</h2>
            <p className="text-sm sm:text-base">
              Der Vertrag kann jederzeit zum Ende des aktuellen Abrechnungszeitraums 
              gekündigt werden. Die Kündigung kann über die Kontoeinstellungen oder 
              per E-Mail erfolgen.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">§ 7 Verfügbarkeit</h2>
            <p className="text-sm sm:text-base">
              NeuroConcepts bemüht sich um eine Verfügbarkeit von 99,9% pro Monat. 
              Geplante Wartungsarbeiten werden vorab angekündigt.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">§ 8 Haftung</h2>
            <p className="text-sm sm:text-base">
              NeuroConcepts haftet nur für Schäden, die durch vorsätzliches oder grob 
              fahrlässiges Verhalten verursacht wurden. Die Haftung ist auf den 
              vorhersehbaren, vertragstypischen Schaden begrenzt.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">§ 9 Datenschutz</h2>
            <p className="text-sm sm:text-base">
              Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer 
              <Link href="/datenschutz" className="text-indigo-600 hover:underline"> Datenschutzerklärung</Link>.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">§ 10 Schlussbestimmungen</h2>
            <p className="text-sm sm:text-base">
              Es gilt österreichisches Recht. Gerichtsstand ist Wien. 
              Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit 
              der übrigen Bestimmungen unberührt.
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
