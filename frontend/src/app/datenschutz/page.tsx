'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function DatenschutzPage() {
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
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Datenschutzerklärung</h1>
          
          <div className="prose prose-lg max-w-none text-gray-600">
            <p className="text-sm text-gray-500 mb-8">Stand: Januar 2026</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Verantwortlicher</h2>
            <p>
              NeuroConcepts AI GmbH<br />
              Musterstraße 123<br />
              1010 Wien, Österreich<br />
              E-Mail: datenschutz@neuroconcepts.ai
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
            <p>
              Wir erheben personenbezogene Daten nur, wenn Sie uns diese freiwillig mitteilen, 
              z.B. bei der Registrierung, beim Ausfüllen von Formularen oder beim Versenden von E-Mails.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Nutzung und Weitergabe personenbezogener Daten</h2>
            <p>
              Ihre personenbezogenen Daten werden nur zur Beantwortung Ihrer Anfragen, 
              zur Abwicklung von Verträgen und für die technische Administration verwendet.
            </p>
            <p>
              Eine Weitergabe an Dritte erfolgt nur, wenn dies zur Vertragsabwicklung erforderlich ist 
              oder Sie ausdrücklich eingewilligt haben.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Cookies</h2>
            <p>
              Unsere Website verwendet Cookies, um die Nutzererfahrung zu verbessern. 
              Sie können die Verwendung von Cookies in Ihren Browsereinstellungen deaktivieren.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Hosting</h2>
            <p>
              Unsere Dienste werden auf Amazon Web Services (AWS) in Frankfurt, Deutschland gehostet. 
              Damit ist die Einhaltung der DSGVO-Anforderungen gewährleistet.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Ihre Rechte</h2>
            <p>Sie haben das Recht auf:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Auskunft über Ihre gespeicherten Daten</li>
              <li>Berichtigung unrichtiger Daten</li>
              <li>Löschung Ihrer Daten</li>
              <li>Einschränkung der Verarbeitung</li>
              <li>Datenübertragbarkeit</li>
              <li>Widerspruch gegen die Verarbeitung</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Kontakt</h2>
            <p>
              Bei Fragen zum Datenschutz kontaktieren Sie uns bitte unter: 
              <a href="mailto:datenschutz@neuroconcepts.ai" className="text-indigo-600 hover:underline">
                datenschutz@neuroconcepts.ai
              </a>
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
