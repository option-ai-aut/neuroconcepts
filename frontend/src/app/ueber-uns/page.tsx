'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Target, Heart, Zap, Users, ArrowRight } from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

export default function UeberUnsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="ueber-uns" />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Image src="/logo-icon.png" alt="Immivo" width={56} height={56} className="rounded-2xl mx-auto mb-6 shadow-lg" />
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 sm:mb-6">
            Über Immivo
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Wir glauben, dass Immobilienmakler sich auf das konzentrieren sollten, 
            was sie am besten können: Menschen helfen, ihr Traumzuhause zu finden.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-16 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Unsere Mission</h2>
              <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                Immivo wurde 2024 gegründet mit einer klaren Vision: 
                Die Immobilienbranche durch künstliche Intelligenz zu revolutionieren.
              </p>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                Wir haben gesehen, wie viel Zeit Makler mit administrativen Aufgaben verbringen — 
                Zeit, die sie lieber mit Kunden verbringen würden. Jarvis, unser KI-Assistent, 
                übernimmt diese Aufgaben und gibt Maklern ihre Zeit zurück.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {[
                { icon: Target, title: 'Vision', description: 'KI-gestützte Immobilienbranche' },
                { icon: Heart, title: 'Werte', description: 'Transparenz, Innovation, Qualität' },
                { icon: Zap, title: 'Antrieb', description: 'Effizienz durch Automatisierung' },
                { icon: Users, title: 'Fokus', description: 'Makler-zentrierte Entwicklung' }
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 sm:p-6">
                  <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                    <item.icon className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { value: '500+', label: 'Aktive Nutzer' },
              { value: '50.000+', label: 'Verarbeitete Anfragen' },
              { value: '15h', label: 'Zeitersparnis/Woche' },
              { value: '99.9%', label: 'Uptime' }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-2xl sm:text-4xl font-extrabold text-blue-600 mb-1 sm:mb-2">{stat.value}</div>
                <div className="text-sm sm:text-base text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Image src="/logo-icon.png" alt="Immivo" width={48} height={48} className="rounded-xl mx-auto mb-5 shadow-md" />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
            Bereit, uns kennenzulernen?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 px-4">
            Teste Immivo 14 Tage kostenlos und überzeuge dich selbst.
          </p>
          <Link 
            href="/login"
            className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 transition-all"
          >
            Jetzt kostenlos starten
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
