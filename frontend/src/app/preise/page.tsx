'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Zap,
  Building2,
  Users,
  Sparkles,
  Mail,
  Phone,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

// Intersection Observer Hook for scroll animations
function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.1, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
}

export default function PreisePage() {
  const [ yearly, setYearly ] = useState(false );
  const heroRef = useInView();
  const cardsRef = useInView();
  const faqRef = useInView();

  const plans = [
    {
      id: 'free',
      name: 'Free Trial',
      tagline: 'Kostenlos testen',
      price: 0,
      priceYearly: 0,
      period: '/Monat',
      subtext: '1 Woche gratis',
      features: [
        'Alle Grundfunktionen',
        'Jarvis auf 20 Eingaben beschränkt',
        'Bildstudio auf 3 Generierungen beschränkt',
        'KEIN Portal-Push',
        'E-Mail-Support',
      ],
      cta: 'Jetzt testen',
      href: '/login',
      popular: false,
      icon: Zap,
    },
    {
      id: 'solo',
      name: 'Solo',
      tagline: 'Für Einzelmakler',
      price: 99,
      priceYearly: 89.1,
      period: '/Monat',
      subtext: null,
      seats: '1 Seat',
      features: [
        'Zugriff auf ALLES',
        'Unbegrenzter Jarvis',
        'Unbegrenztes Bildstudio',
        '24 Portal-Integrationen',
        'KI-Exposé-Editor',
        'CRM + Lead-Management',
        'E-Mail & Kalender',
        'Priority Support',
      ],
      cta: 'Jetzt starten',
      href: '/login',
      popular: false,
      icon: Building2,
    },
    {
      id: 'team',
      name: 'Team',
      tagline: 'Für kleine Teams',
      price: 249,
      priceYearly: 224.1,
      period: '/Monat',
      subtext: null,
      seats: '3 Seats inklusive',
      features: [
        'Everything in Solo PLUS',
        'Team-Verwaltung',
        'Gemeinsame Objekte & Leads',
        'Rollen & Berechtigungen',
      ],
      cta: 'Jetzt starten',
      href: '/login',
      popular: true,
      badge: 'Beliebteste Wahl',
      icon: Users,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      tagline: 'Für große Teams',
      price: 699,
      priceYearly: 629.1,
      period: '/Monat',
      subtext: 'jeder weitere +50€/Monat',
      seats: 'Bis zu 10 Seats',
      features: [
        'Everything in Team PLUS',
        'Eigene Domain',
        'Dedizierter Account Manager',
        'API-Zugang',
        'Custom Integrationen',
        'SLA-Garantie',
      ],
      cta: 'Kontakt aufnehmen',
      href: '/kontakt',
      popular: false,
      icon: Sparkles,
    },
  ];

  const faqs = [
    {
      q: 'Kündigung',
      a: 'Du kannst dein Abo jederzeit zum Ende des Abrechnungszeitraums kündigen. Keine Mindestlaufzeit, keine versteckten Kosten.',
    },
    {
      q: 'Testphase',
      a: '1 Woche kostenlos testen — ohne Kreditkarte. Alle Grundfunktionen stehen dir zur Verfügung. Nach der Testphase kannst du auf einen kostenpflichtigen Plan wechseln oder pausieren.',
    },
    {
      q: 'Jahresabrechnung',
      a: 'Bei jährlicher Zahlung sparst du 10% gegenüber der monatlichen Abrechnung. Du kannst jederzeit zwischen monatlich und jährlich wechseln.',
    },
    {
      q: 'Seats',
      a: 'Solo beinhaltet 1 Seat, Team 3 Seats. Beim Enterprise-Plan sind bis zu 10 Seats inklusive — jeder weitere Seat kostet 50€/Monat zusätzlich.',
    },
    {
      q: 'Zahlungsmethoden',
      a: 'Wir akzeptieren Kreditkarte, SEPA-Lastschrift und Rechnung. Die Abrechnung erfolgt automatisch am Monats- oder Jahresende.',
    },
    {
      q: 'DSGVO',
      a: 'Wir hosten deine Daten DSGVO-konform auf AWS EU (Frankfurt). Alle Daten sind verschlüsselt. Keine Weitergabe an Dritte.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.8s ease-out forwards; }
      `}</style>

      <PublicNavigation currentPage="preise" />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-8 sm:pb-12 bg-gradient-to-b from-gray-50 to-white">
        <div
          ref={heroRef.ref}
          className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${heroRef.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 sm:mb-6">
            Einfache, transparente Preise
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            Keine versteckten Kosten. Keine Überraschungen.
          </p>

          {/* Jederzeit kündbar badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-200 mb-8">
            <CheckCircle2 className="w-4 h-4" />
            Jederzeit kündbar
          </div>

          {/* Monthly/Yearly Toggle */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap mb-4">
            <span
              className={`text-sm font-medium ${!yearly ? 'text-gray-900' : 'text-gray-500'}`}
            >
              Monatlich
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={yearly}
              onClick={() => setYearly(!yearly)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                yearly ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                  yearly ? 'left-7' : 'left-1'
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${yearly ? 'text-gray-900' : 'text-gray-500'}`}
            >
              Jährlich
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
              10% Rabatt
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 sm:py-16">
        <div
          ref={cardsRef.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${cardsRef.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {plans.map((plan, i) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 sm:p-8 flex flex-col ${
                  plan.popular
                    ? 'bg-gray-900 text-white shadow-xl ring-2 ring-gray-900 ring-offset-4 lg:scale-[1.02]'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-amber-900 text-sm font-semibold rounded-full whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 sm:mb-6 ${
                    plan.popular ? 'bg-white/20' : 'bg-gray-100'
                  }`}
                >
                  <plan.icon
                    className={`w-6 h-6 ${
                      plan.popular ? 'text-white' : 'text-gray-900'
                    }`}
                  />
                </div>

                <h3
                  className={`text-xl sm:text-2xl font-bold mb-1 ${
                    plan.popular ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mb-4 ${
                    plan.popular ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  {plan.tagline}
                </p>

                {plan.seats && (
                  <p
                    className={`text-sm font-medium mb-2 ${
                      plan.popular ? 'text-gray-200' : 'text-gray-600'
                    }`}
                  >
                    {plan.seats}
                  </p>
                )}

                <div className="mb-4 sm:mb-6">
                  {plan.price === 0 ? (
                    <div>
                      <span
                        className={`text-4xl sm:text-5xl font-extrabold ${
                          plan.popular ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        0€
                      </span>
                      <span
                        className={plan.popular ? 'text-gray-300' : 'text-gray-500'}
                      >
                        {' '}
                        {plan.subtext}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span
                        className={`text-4xl sm:text-5xl font-extrabold ${
                          plan.popular ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {yearly
                          ? plan.priceYearly.toLocaleString('de-DE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : plan.price}
                        €
                      </span>
                      <span
                        className={plan.popular ? 'text-gray-300' : 'text-gray-500'}
                      >
                        {plan.period}
                      </span>
                      {yearly && plan.price > 0 && (
                        <p
                          className={`text-xs mt-1 ${
                            plan.popular ? 'text-gray-400' : 'text-gray-400'
                          }`}
                        >
                          jährlich berechnet
                        </p>
                      )}
                      {plan.subtext && plan.price > 0 && (
                        <p
                          className={`text-xs mt-1 ${
                            plan.popular ? 'text-gray-400' : 'text-gray-400'
                          }`}
                        >
                          {plan.subtext}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          plan.popular ? 'text-gray-300' : 'text-green-500'
                        }`}
                      />
                      <span
                        className={`text-sm sm:text-base ${
                          plan.popular ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`w-full flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5 ${
                    plan.popular
                      ? 'bg-white text-gray-900 hover:bg-gray-100'
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
        <div
          ref={faqRef.ref}
          className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 ${faqRef.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-12 flex items-center justify-center gap-2">
            <HelpCircle className="w-8 h-8 text-gray-500" />
            Häufige Fragen
          </h2>
          <div className="space-y-4 sm:space-y-6">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group bg-white rounded-xl p-4 sm:p-6 border border-gray-100"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-gray-900">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-sm sm:text-base text-gray-600 mt-3 pt-3 border-t border-gray-100">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 mb-4">
            Noch Fragen? Wir helfen dir gerne weiter.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <a
              href="mailto:office@immivo.ai"
              className="inline-flex items-center gap-2 text-gray-900 font-medium hover:text-gray-700 transition-colors"
            >
              <Mail className="w-5 h-5" />
              office@immivo.ai
            </a>
            <a
              href="tel:+436703551221"
              className="inline-flex items-center gap-2 text-gray-900 font-medium hover:text-gray-700 transition-colors"
            >
              <Phone className="w-5 h-5" />
              +43 6703551221
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
