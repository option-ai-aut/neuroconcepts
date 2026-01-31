'use client';

import Link from 'next/link';
import { Sparkles, Target, Heart, Zap, Users, ArrowRight } from 'lucide-react';

export default function UeberUnsPage() {
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
            Über NeuroConcepts
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Wir glauben, dass Immobilienmakler sich auf das konzentrieren sollten, 
            was sie am besten können: Menschen helfen, ihr Traumzuhause zu finden.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Unsere Mission</h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                NeuroConcepts wurde 2024 gegründet mit einer klaren Vision: 
                Die Immobilienbranche durch künstliche Intelligenz zu revolutionieren.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                Wir haben gesehen, wie viel Zeit Makler mit administrativen Aufgaben verbringen — 
                Zeit, die sie lieber mit Kunden verbringen würden. Jarvis, unser KI-Assistent, 
                übernimmt diese Aufgaben und gibt Maklern ihre Zeit zurück.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: Target, title: 'Vision', description: 'KI-gestützte Immobilienbranche' },
                { icon: Heart, title: 'Werte', description: 'Transparenz, Innovation, Qualität' },
                { icon: Zap, title: 'Antrieb', description: 'Effizienz durch Automatisierung' },
                { icon: Users, title: 'Fokus', description: 'Makler-zentrierte Entwicklung' }
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-6">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { value: '500+', label: 'Aktive Nutzer' },
              { value: '50.000+', label: 'Verarbeitete Anfragen' },
              { value: '15h', label: 'Zeitersparnis/Woche' },
              { value: '99.9%', label: 'Uptime' }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl font-extrabold text-indigo-600 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Bereit, uns kennenzulernen?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Teste NeuroConcepts 14 Tage kostenlos und überzeuge dich selbst.
          </p>
          <Link 
            href="/login"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
          >
            Jetzt kostenlos starten
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
