'use client';

import Link from 'next/link';
import { CheckCircle2, ArrowRight, Zap, Building2, Users } from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

export default function PreisePage() {
  const plans = [
    {
      name: 'Starter',
      description: 'Perfekt für Einzelmakler',
      price: '49',
      period: '/Monat',
      features: [
        'Jarvis KI-Assistent',
        'Bis zu 50 Objekte',
        'Bis zu 200 Leads',
        'E-Mail-Integration',
        'Exposé-Editor',
        'Kalender-Sync',
        'E-Mail Support'
      ],
      cta: 'Kostenlos starten',
      popular: false,
      icon: Zap
    },
    {
      name: 'Professional',
      description: 'Für wachsende Teams',
      price: '149',
      period: '/Monat',
      features: [
        'Alles aus Starter',
        'Unbegrenzte Objekte',
        'Unbegrenzte Leads',
        'Portal-Anbindung',
        'KI-Bildbearbeitung',
        'Team-Funktionen (3 Seats)',
        'Prioritäts-Support'
      ],
      cta: 'Kostenlos starten',
      popular: true,
      icon: Building2
    },
    {
      name: 'Enterprise',
      description: 'Für große Maklerbüros',
      price: 'Auf Anfrage',
      period: '',
      features: [
        'Alles aus Professional',
        'Unbegrenzte Seats',
        'Eigene Domain',
        'API-Zugang',
        'Dedizierter Account Manager',
        'Custom Integrationen',
        'SLA-Garantie'
      ],
      cta: 'Kontakt aufnehmen',
      popular: false,
      icon: Users
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="preise" />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 sm:mb-6">
            Einfache, transparente Preise
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Keine versteckten Kosten. Keine Überraschungen. 14 Tage kostenlos testen — ohne Kreditkarte.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {plans.map((plan, i) => (
              <div 
                key={i} 
                className={`relative rounded-2xl p-6 sm:p-8 ${
                  plan.popular 
                    ? 'bg-gray-900 text-white shadow-xl' 
                    : 'bg-white border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-amber-900 text-sm font-semibold rounded-full whitespace-nowrap">
                    Beliebteste Wahl
                  </div>
                )}
                
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 sm:mb-6 ${
                  plan.popular ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  <plan.icon className={`w-6 h-6 ${plan.popular ? 'text-white' : 'text-blue-600'}`} />
                </div>

                <h3 className={`text-xl sm:text-2xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-4 sm:mb-6 ${plan.popular ? 'text-gray-300' : 'text-gray-500'}`}>
                  {plan.description}
                </p>

                <div className="mb-6 sm:mb-8">
                  <span className={`text-4xl sm:text-5xl font-extrabold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price.startsWith('Auf') ? '' : '€'}{plan.price}
                  </span>
                  <span className={plan.popular ? 'text-gray-300' : 'text-gray-500'}>
                    {plan.period}
                  </span>
                </div>

                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3">
                      <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${
                        plan.popular ? 'text-gray-300' : 'text-green-500'
                      }`} />
                      <span className={`text-sm sm:text-base ${plan.popular ? 'text-white' : 'text-gray-700'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link 
                  href={plan.name === 'Enterprise' ? '/kontakt' : '/login'}
                  className={`w-full flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5 ${
                    plan.popular 
                      ? 'bg-white text-blue-600 hover:bg-gray-100' 
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-12">
            Häufige Fragen
          </h2>
          <div className="space-y-4 sm:space-y-6">
            {[
              {
                q: 'Kann ich jederzeit kündigen?',
                a: 'Ja, du kannst dein Abo jederzeit zum Ende des Abrechnungszeitraums kündigen. Keine Mindestlaufzeit.'
              },
              {
                q: 'Was passiert nach der Testphase?',
                a: 'Nach 14 Tagen wirst du automatisch auf den kostenlosen Plan umgestellt, wenn du keine Zahlungsmethode hinterlegt hast.'
              },
              {
                q: 'Kann ich später upgraden?',
                a: 'Ja, du kannst jederzeit auf einen höheren Plan wechseln. Die Differenz wird anteilig berechnet.'
              },
              {
                q: 'Gibt es Rabatte für jährliche Zahlung?',
                a: 'Ja, bei jährlicher Zahlung sparst du 20% gegenüber der monatlichen Abrechnung.'
              }
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-sm sm:text-base text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
