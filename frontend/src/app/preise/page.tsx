'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Zap,
  Building2,
  Users,
  Sparkles,
  Mail,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('pricing');
  const tCommon = useTranslations('common');
  const [ yearly, setYearly ] = useState(false );
  const heroRef = useInView();
  const cardsRef = useInView();
  const faqRef = useInView();
  const contactRef = useInView();

  const plans = [
    {
      id: 'free',
      name: 'Free Trial',
      tagline: t('free.tagline'),
      price: 0,
      priceYearly: 0,
      period: tCommon('perMonth'),
      subtext: t('free.subtext'),
      features: [
        { text: t('free.features.0'), color: 'green' as const },
        { text: t('free.features.1'), color: 'yellow' as const },
        { text: t('free.features.2'), color: 'yellow' as const },
        { text: t('free.features.3'), color: 'red' as const },
        { text: t('free.features.4'), color: 'green' as const },
      ],
      cta: t('free.cta'),
      href: '/login',
      popular: false,
      icon: Zap,
    },
    {
      id: 'solo',
      name: 'Solo',
      tagline: t('solo.tagline'),
      price: 149,
      priceYearly: 134.1,
      period: tCommon('perMonth'),
      subtext: null,
      seats: t('solo.seats'),
      features: [
        { text: t('solo.features.0'), color: 'green' as const },
        { text: t('solo.features.1'), color: 'green' as const },
        { text: t('solo.features.2'), color: 'green' as const },
        { text: t('solo.features.3'), color: 'green' as const },
        { text: t('solo.features.4'), color: 'green' as const },
        { text: t('solo.features.5'), color: 'green' as const },
        { text: t('solo.features.6'), color: 'green' as const },
        { text: t('solo.features.7'), color: 'green' as const },
      ],
      cta: t('solo.cta'),
      href: '/login',
      popular: false,
      icon: Building2,
    },
    {
      id: 'team',
      name: 'Team',
      tagline: t('team.tagline'),
      price: 699,
      priceYearly: 629.1,
      period: tCommon('perMonth'),
      subtext: null,
      seats: t('team.seats'),
      features: [
        { text: t('team.features.0'), color: 'green' as const },
        { text: t('team.features.1'), color: 'green' as const },
        { text: t('team.features.2'), color: 'green' as const },
        { text: t('team.features.3'), color: 'green' as const },
      ],
      cta: t('solo.cta'),
      href: '/login',
      popular: true,
      badge: t('team.badge'),
      icon: Users,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      tagline: t('enterprise.tagline'),
      price: -1,
      priceYearly: -1,
      period: '',
      subtext: t('enterprise.subtext'),
      seats: t('enterprise.seats'),
      features: [
        { text: t('enterprise.features.0'), color: 'green' as const },
        { text: t('enterprise.features.1'), color: 'green' as const },
        { text: t('enterprise.features.2'), color: 'green' as const },
        { text: t('enterprise.features.3'), color: 'green' as const },
        { text: t('enterprise.features.4'), color: 'green' as const },
        { text: t('enterprise.features.5'), color: 'green' as const },
      ],
      cta: t('enterprise.cta'),
      href: '/kontakt',
      popular: false,
      icon: Sparkles,
    },
  ];

  const faqs = Array.from({ length: 10 }, (_, i) => ({
    q: t(`faq.q${i + 1}`),
    a: t(`faq.a${i + 1}`),
  }));

  return (
    <div className="min-h-screen bg-white">

      <PublicNavigation currentPage="preise" />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-8 sm:pb-12 bg-white">
        <div
          ref={heroRef.ref}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          style={{
            opacity: heroRef.isInView ? 1 : 0,
            transform: heroRef.isInView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 sm:mb-6">
            {t('title')}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            {t('subtitle')}
          </p>

          {/* Jederzeit kündbar badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-200 mb-8">
            <CheckCircle2 className="w-4 h-4" />
            {t('cancelAnytime')}
          </div>

          {/* Monthly/Yearly Toggle */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap mb-4">
            <span
              className={`text-sm font-medium ${!yearly ? 'text-gray-900' : 'text-gray-500'}`}
            >
              {t('monthly')}
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
              {t('yearly')}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
              {t('discount')}
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 sm:py-16">
        <div ref={cardsRef.ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {plans.map((plan, i) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 sm:p-8 flex flex-col ${
                  plan.popular
                    ? 'bg-gray-900 text-white shadow-xl ring-2 ring-gray-900 ring-offset-4 lg:scale-[1.02]'
                    : 'bg-white border border-gray-200'
                }`}
                style={{
                  opacity: cardsRef.isInView ? 1 : 0,
                  transform: cardsRef.isInView ? 'translateY(0)' : 'translateY(30px)',
                  transition: 'opacity 0.6s ease, transform 0.6s ease',
                  transitionDelay: `${i * 100}ms`,
                }}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full whitespace-nowrap">
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
                        {t('free.price')}
                      </span>
                      <span
                        className={plan.popular ? 'text-gray-300' : 'text-gray-500'}
                      >
                        {' '}
                        {plan.subtext}
                      </span>
                    </div>
                  ) : plan.price === -1 ? (
                    <div>
                      <span
                        className={`text-3xl sm:text-4xl font-extrabold ${
                          plan.popular ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {t('enterprise.price')}
                      </span>
                      {plan.subtext && (
                        <p
                          className={`text-xs mt-1 ${
                            plan.popular ? 'text-gray-400' : 'text-gray-400'
                          }`}
                        >
                          {plan.subtext}
                        </p>
                      )}
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
                          {t('billedYearly')}
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
                  {plan.features.map((feature, j) => {
                    const color = feature.color || 'green';
                    const iconColor = plan.popular
                      ? 'text-gray-300'
                      : color === 'red'
                      ? 'text-red-500'
                      : color === 'yellow'
                      ? 'text-amber-500'
                      : 'text-green-500';
                    const Icon = color === 'red' ? XCircle : color === 'yellow' ? AlertCircle : CheckCircle2;
                    return (
                      <li key={j} className="flex items-start gap-3">
                        <Icon
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`}
                        />
                        <span
                          className={`text-sm sm:text-base ${
                            plan.popular ? 'text-white' : color === 'red' ? 'text-gray-400' : 'text-gray-700'
                          }`}
                        >
                          {feature.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <Link
                  href={plan.href}
                  className={`w-full flex items-center justify-center px-6 py-3 rounded-full font-semibold transition-all hover:-translate-y-0.5 ${
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
      <section className="py-12 sm:py-16 bg-white">
        <div
          ref={faqRef.ref}
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
          style={{
            opacity: faqRef.isInView ? 1 : 0,
            transform: faqRef.isInView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-12 flex items-center justify-center gap-2">
            <HelpCircle className="w-8 h-8 text-gray-500" />
            {t('faqTitle')}
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
        <div
          ref={contactRef.ref}
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          style={{
            opacity: contactRef.isInView ? 1 : 0,
            transform: contactRef.isInView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <p className="text-gray-600 mb-4">
            {t('stillQuestions')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <a
              href="mailto:office@immivo.ai"
              className="inline-flex items-center gap-2 text-gray-900 font-medium hover:text-gray-700 transition-colors"
            >
              <Mail className="w-5 h-5" />
              office@immivo.ai
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
