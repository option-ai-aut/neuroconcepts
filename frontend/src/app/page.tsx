'use client';

import Link from 'next/link';
import { Bot, TrendingUp, Clock, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-2 shadow-lg shadow-indigo-500/30">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="font-bold text-xl tracking-tight">NeuroConcepts</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Anmelden
              </Link>
              <Link 
                href="/login" 
                className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
              >
                Kostenlos starten
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-50/50 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-50/30 rounded-full blur-3xl opacity-30" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium mb-8 border border-indigo-100">
            <span className="flex w-2 h-2 bg-indigo-600 rounded-full mr-2 animate-pulse"></span>
            Neu: Jarvis 2.0 ist live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-[1.1]">
            Mehr Abschlüsse. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
              Weniger Büro.
            </span>
          </h1>
          
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500 mb-10 leading-relaxed">
            NeuroConcepts ist das intelligente Betriebssystem für moderne Immobilienunternehmen. 
            Jarvis (deine KI) qualifiziert Leads, vereinbart Termine und schreibt Exposés. 
            Du machst nur noch das, was Geld bringt.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-indigo-600 rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1"
            >
              Jetzt loslegen
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link 
              href="#features" 
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-all hover:-translate-y-1"
            >
              Mehr erfahren
            </Link>
          </div>

          {/* Social Proof / Trust */}
          <div className="mt-16 pt-8 border-t border-gray-100">
            <p className="text-sm text-gray-400 mb-6">Vertraut von innovativen Maklern in DACH</p>
            <div className="flex justify-center gap-8 opacity-40 grayscale">
               {/* Placeholders for logos */}
               <div className="h-8 w-24 bg-gray-300 rounded"></div>
               <div className="h-8 w-24 bg-gray-300 rounded"></div>
               <div className="h-8 w-24 bg-gray-300 rounded"></div>
               <div className="h-8 w-24 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Grid */}
      <section id="features" className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Jarvis KI-Assistent</h3>
              <p className="text-gray-500 leading-relaxed">
                Jarvis antwortet auf Anfragen von ImmoScout & Co. in Sekundenschnelle. 24/7, freundlich und extrem kompetent. Er filtert "Touristen" von echten Käufern.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6 text-green-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Automatische Termine</h3>
              <p className="text-gray-500 leading-relaxed">
                Kein E-Mail-Ping-Pong mehr. Jarvis schlägt Termine vor, die in deinen Kalender passen, und bucht sie direkt ein. Du bekommst nur die Bestätigung.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Alles an einem Ort</h3>
              <p className="text-gray-500 leading-relaxed">
                Leads, Objekte, E-Mails und Kalender. NeuroConcepts ersetzt 3-4 andere Tools und spart dir hunderte Euro Softwarekosten pro Monat.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Highlight Section */}
      <section className="py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="mb-12 lg:mb-0">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                So fühlt sich Arbeit <br />
                <span className="text-indigo-600">im Jahr 2026 an.</span>
              </h2>
              <p className="text-lg text-gray-500 mb-8">
                Stell dir vor, du kommst morgens ins Büro und alle E-Mails sind beantwortet, Exposés versendet und Besichtigungen gebucht. Das ist kein Traum, das ist NeuroConcepts.
              </p>
              
              <ul className="space-y-4">
                {[
                  'Automatische Lead-Qualifizierung',
                  'Exposé-Erstellung per Klick',
                  'Rechtssichere Kommunikation',
                  'Synchronisation mit allen Portalen'
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative">
              {/* Abstract UI Mockup */}
              <div className="relative rounded-2xl bg-gray-900 shadow-2xl border border-gray-800 p-2 aspect-[4/3] transform rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-2xl" />
                <div className="h-full w-full bg-gray-800/50 rounded-xl overflow-hidden backdrop-blur-sm p-6">
                  {/* Mock Chat Interface */}
                  <div className="flex flex-col h-full space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex-shrink-0" />
                      <div className="bg-gray-700 rounded-lg rounded-tl-none p-3 text-sm text-gray-300 max-w-[80%]">
                        Hallo! Ich habe eine neue Anfrage für das Penthouse in Wien erhalten. Soll ich das Exposé senden?
                      </div>
                    </div>
                    <div className="flex items-start justify-end space-x-3">
                      <div className="bg-indigo-600 rounded-lg rounded-tr-none p-3 text-sm text-white max-w-[80%]">
                        Ja, bitte mach das. Und schlag direkt einen Termin für Dienstag vor.
                      </div>
                      <div className="w-8 h-8 bg-gray-500 rounded-full flex-shrink-0" />
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex-shrink-0" />
                      <div className="bg-gray-700 rounded-lg rounded-tl-none p-3 text-sm text-gray-300 max-w-[80%]">
                        Erledigt. E-Mail ist raus. Terminoptionen für Dienstag sind blockiert.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Bereit für das Upgrade?</h2>
          <p className="text-xl text-gray-400 mb-10">
            Starte jetzt kostenlos und erlebe, wie Jarvis dein Business verändert. Keine Kreditkarte erforderlich.
          </p>
          <Link 
            href="/login" 
            className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-all shadow-lg hover:scale-105"
          >
            Kostenlos registrieren
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center mr-2">
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <span className="font-bold text-gray-900">NeuroConcepts</span>
          </div>
          <p className="text-sm text-gray-500">© 2026 NeuroConcepts AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
