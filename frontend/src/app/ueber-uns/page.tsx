'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Mail, MapPin, ArrowRight, Sparkles, Shield, Users, Target, Code } from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';
import { useTranslations } from 'next-intl';

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsInView(true);
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, isInView };
}

export default function UeberUnsPage() {
  const t = useTranslations('about');
  const heroRef = useInView();
  const storyTextRef = useInView();
  const storyCardRef = useInView();
  const foundersHeaderRef = useInView();
  const josefRef = useInView();
  const dennisRef = useInView();
  const valuesHeaderRef = useInView();
  const valueRefs = [useInView(), useInView(), useInView(), useInView()];
  const ctaRef = useInView();

  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="ueber-uns" />

      {/* Hero — Bold, full-width */}
      <section className="relative pt-24 sm:pt-32 pb-20 sm:pb-32 bg-black text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-white/2 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-white/2 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>
        <div 
          ref={heroRef.ref}
          className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          style={{
            opacity: heroRef.isInView ? 1 : 0,
            transform: heroRef.isInView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold mb-6 leading-tight">
            {t.rich('title', { bold: (chunks) => <><br /><span className="text-gray-400">{chunks}</span></> })}
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Story — Engaging narrative */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div 
              ref={storyTextRef.ref}
              style={{
                opacity: storyTextRef.isInView ? 1 : 0,
                transform: storyTextRef.isInView ? 'translateX(0)' : 'translateX(-30px)',
                transition: 'opacity 0.7s ease, transform 0.7s ease',
              }}
            >
              <span className="text-gray-500 font-semibold text-sm uppercase tracking-wider">{t('storyLabel')}</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-3 mb-6">
                {t('storyTitle')}
              </h2>
              <div className="space-y-4 text-gray-600 text-base sm:text-lg leading-relaxed">
                <p>
                  {t('storyP1')}
                </p>
                <p>
                  {t('storyP2')}
                </p>
                <p className="font-medium text-gray-900">
                  {t('storyP3')}
                </p>
              </div>
            </div>
            <div 
              ref={storyCardRef.ref}
              className="grid grid-cols-1 gap-4"
              style={{
                opacity: storyCardRef.isInView ? 1 : 0,
                transform: storyCardRef.isInView ? 'translateX(0)' : 'translateX(30px)',
                transition: 'opacity 0.7s ease, transform 0.7s ease',
              }}
            >
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center">
                <Code className="w-6 h-6 text-gray-900 mx-auto mb-3" />
                <p className="text-2xl font-bold text-gray-900">{t('developedIn')}</p>
                <p className="text-sm text-gray-500">{t('developed')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founders — Josef first, no quotes */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={foundersHeaderRef.ref}
            className="text-center mb-12"
            style={{
              opacity: foundersHeaderRef.isInView ? 1 : 0,
              transform: foundersHeaderRef.isInView ? 'translateY(0)' : 'translateY(30px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            <span className="text-gray-500 font-semibold text-sm uppercase tracking-wider">{t('teamLabel')}</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-3">
              {t('teamTitle')}
            </h2>
            <p className="text-gray-600 mt-3 max-w-xl mx-auto">{t('teamSubtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Josef Leutgeb — First */}
            <div 
              ref={josefRef.ref}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow"
              style={{
                opacity: josefRef.isInView ? 1 : 0,
                transform: josefRef.isInView ? 'translateY(0)' : 'translateY(30px)',
                transition: 'opacity 0.7s ease 0ms, transform 0.7s ease 0ms',
              }}
            >
              <div className="flex items-center gap-5 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  JL
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{t('josefName')}</h3>
                  <p className="text-gray-500 font-medium">{t('josefRole')}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                {t('josefDesc')}
              </p>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <a href="mailto:josef.leutgeb@immivo.ai" className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                  <Mail className="w-4 h-4" />
                  josef.leutgeb@immivo.ai
                </a>
              </div>
            </div>

            {/* Dennis Kral — Second */}
            <div 
              ref={dennisRef.ref}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow"
              style={{
                opacity: dennisRef.isInView ? 1 : 0,
                transform: dennisRef.isInView ? 'translateY(0)' : 'translateY(30px)',
                transition: 'opacity 0.7s ease 150ms, transform 0.7s ease 150ms',
              }}
            >
              <div className="flex items-center gap-5 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  DK
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{t('dennisName')}</h3>
                  <p className="text-gray-500 font-medium">{t('dennisRole')}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                {t('dennisDesc')}
              </p>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <a href="mailto:dennis.kral@immivo.ai" className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                  <Mail className="w-4 h-4" />
                  dennis.kral@immivo.ai
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={valuesHeaderRef.ref}
            className="text-center mb-12"
            style={{
              opacity: valuesHeaderRef.isInView ? 1 : 0,
              transform: valuesHeaderRef.isInView ? 'translateY(0)' : 'translateY(30px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            <span className="text-gray-500 font-semibold text-sm uppercase tracking-wider">{t('valuesLabel')}</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-3">
              {t('valuesTitle')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Sparkles, titleKey: 'innovation', descKey: 'innovationDesc' },
              { icon: Target, titleKey: 'simplicity', descKey: 'simplicityDesc' },
              { icon: Shield, titleKey: 'trust', descKey: 'trustDesc' },
              { icon: Users, titleKey: 'customerSuccess', descKey: 'customerSuccessDesc' },
            ].map((value, index) => (
              <div 
                key={value.titleKey} 
                ref={valueRefs[index].ref}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow"
                style={{
                  opacity: valueRefs[index].isInView ? 1 : 0,
                  transform: valueRefs[index].isInView ? 'translateY(0)' : 'translateY(30px)',
                  transition: `opacity 0.7s ease ${index * 100}ms, transform 0.7s ease ${index * 100}ms`,
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{t(value.titleKey)}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{t(value.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Info + CTA */}
      <section className="py-16 sm:py-24 bg-white text-gray-900">
        <div 
          ref={ctaRef.ref}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          style={{
            opacity: ctaRef.isInView ? 1 : 0,
            transform: ctaRef.isInView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t('ctaTitle')}
          </h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            {t('ctaSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/#demo" className="inline-flex items-center px-8 py-4 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 transition-colors">
              {t('ctaDemo')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link href="/login?mode=register" className="inline-flex items-center px-8 py-4 border-2 border-gray-200 text-gray-900 rounded-full font-semibold hover:bg-gray-50 transition-colors">
              {t('ctaStart')}
            </Link>
          </div>
          <div className="pt-8 border-t border-gray-200">
            <p className="font-semibold text-lg mb-4">Leutgeb Holding &amp; Management GmbH</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-gray-500">
              <a href="https://maps.google.com/?q=Sterngasse+3,+1010+Wien" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-gray-900 transition-colors">
                <MapPin className="w-4 h-4" /> Sterngasse 3, 1010 Wien
              </a>
              <a href="mailto:office@immivo.ai" className="flex items-center gap-2 hover:text-gray-900 transition-colors">
                <Mail className="w-4 h-4" /> office@immivo.ai
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
