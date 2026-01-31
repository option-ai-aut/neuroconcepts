'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function AGBPage() {
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
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Allgemeine Geschäftsbedingungen</h1>
          
          <div className="prose prose-lg max-w-none text-gray-600">
            <p className="text-sm text-gray-500 mb-8">Stand: Januar 2026</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">§ 1 Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen der 
              NeuroConcepts AI GmbH und ihren Kunden über die Nutzung der NeuroConcepts-Plattform.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">§ 2 Vertragsgegenstand</h2>
            <p>
              NeuroConcepts stellt eine KI-gestützte Software-as-a-Service (SaaS) Plattform 
              für Immobilienmakler zur Verfügung. Der Funktionsumfang richtet sich nach dem 
              gewählten Tarif.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">§ 3 Vertragsschluss</h2>
            <p>
              Der Vertrag kommt durch die Registrierung auf der Plattform und die Bestätigung 
              der Registrierung durch NeuroConcepts zustande.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">§ 4 Testphase</h2>
            <p>
              Neukunden erhalten eine kostenlose Testphase von 14 Tagen. Nach Ablauf der 
              Testphase wird das Abonnement automatisch in den gewählten kostenpflichtigen 
              Tarif überführt, sofern eine Zahlungsmethode hinterlegt wurde.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">§ 5 Preise und Zahlung</h2>
            <p>
              Die aktuellen Preise sind auf der Website unter /preise einsehbar. 
              Die Abrechnung erfolgt monatlich oder jährlich im Voraus.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">§ 6 Kündigung</h2>
            <p>
              Der Vertrag kann jederzeit zum Ende des aktuellen Abrechnungszeitraums 
              gekündigt werden. Die Kündigung kann über die Kontoeinstellungen oder 
              per E-Mail erfolgen.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">§ 7 Verfügbarkeit</h2>
            <p>
              NeuroConcepts bemüht sich um eine Verfügbarkeit von 99,9% pro Monat. 
              Geplante Wartungsarbeiten werden vorab angekündigt.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">§ 8 Haftung</h2>
            <p>
              NeuroConcepts haftet nur für Schäden, die durch vorsätzliches oder grob 
              fahrlässiges Verhalten verursacht wurden. Die Haftung ist auf den 
              vorhersehbaren, vertragstypischen Schaden begrenzt.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">§ 9 Datenschutz</h2>
            <p>
              Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer 
              <Link href="/datenschutz" className="text-indigo-600 hover:underline"> Datenschutzerklärung</Link>.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">§ 10 Schlussbestimmungen</h2>
            <p>
              Es gilt österreichisches Recht. Gerichtsstand ist Wien. 
              Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit 
              der übrigen Bestimmungen unberührt.
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
