'use client';

import Link from 'next/link';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="datenschutz" />

      {/* Content */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 sm:mb-8">Datenschutzerklärung</h1>
          
          <div className="prose prose-sm sm:prose-lg max-w-none text-gray-600">
            <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">Stand: Januar 2026</p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">1. Verantwortlicher</h2>
            <p className="text-sm sm:text-base">
              NeuroConcepts AI GmbH<br />
              Musterstraße 123<br />
              1010 Wien, Österreich<br />
              E-Mail: datenschutz@neuroconcepts.ai
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
            <p className="text-sm sm:text-base">
              Wir erheben personenbezogene Daten nur, wenn Sie uns diese freiwillig mitteilen, 
              z.B. bei der Registrierung, beim Ausfüllen von Formularen oder beim Versenden von E-Mails.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">3. Nutzung und Weitergabe personenbezogener Daten</h2>
            <p className="text-sm sm:text-base">
              Ihre personenbezogenen Daten werden nur zur Beantwortung Ihrer Anfragen, 
              zur Abwicklung von Verträgen und für die technische Administration verwendet.
            </p>
            <p className="text-sm sm:text-base">
              Eine Weitergabe an Dritte erfolgt nur, wenn dies zur Vertragsabwicklung erforderlich ist 
              oder Sie ausdrücklich eingewilligt haben.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">4. Cookies</h2>
            <p className="text-sm sm:text-base">
              Unsere Website verwendet Cookies, um die Nutzererfahrung zu verbessern. 
              Sie können die Verwendung von Cookies in Ihren Browsereinstellungen deaktivieren.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">5. Hosting</h2>
            <p className="text-sm sm:text-base">
              Unsere Dienste werden auf Amazon Web Services (AWS) in Frankfurt, Deutschland gehostet. 
              Damit ist die Einhaltung der DSGVO-Anforderungen gewährleistet.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">6. Ihre Rechte</h2>
            <p className="text-sm sm:text-base">Sie haben das Recht auf:</p>
            <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
              <li>Auskunft über Ihre gespeicherten Daten</li>
              <li>Berichtigung unrichtiger Daten</li>
              <li>Löschung Ihrer Daten</li>
              <li>Einschränkung der Verarbeitung</li>
              <li>Datenübertragbarkeit</li>
              <li>Widerspruch gegen die Verarbeitung</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">7. Kontakt</h2>
            <p className="text-sm sm:text-base">
              Bei Fragen zum Datenschutz kontaktieren Sie uns bitte unter: 
              <a href="mailto:datenschutz@neuroconcepts.ai" className="text-indigo-600 hover:underline">
                datenschutz@neuroconcepts.ai
              </a>
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
