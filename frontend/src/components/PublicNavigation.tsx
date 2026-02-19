'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PublicNavigationProps {
  currentPage?: string;
}

export default function PublicNavigation({ currentPage }: PublicNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations('publicNav');
  const navRef = useRef<HTMLElement>(null);
  const defaultDark = currentPage === 'home' || currentPage === 'ueber-uns';
  const [isDark, setIsDark] = useState(defaultDark);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const obs = new MutationObserver(() => {
      const theme = document.documentElement.dataset.navTheme;
      if (theme === 'light') setIsDark(false);
      else if (theme === 'dark') setIsDark(true);
      else setIsDark(defaultDark);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-nav-theme'] });
    const theme = document.documentElement.dataset.navTheme;
    if (theme === 'light') setIsDark(false);
    else if (theme === 'dark') setIsDark(true);
    else setIsDark(defaultDark);
    return () => obs.disconnect();
  }, [defaultDark]);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (currentPage === 'home') {
      e.preventDefault();
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setMobileMenuOpen(false);
    }
  };

  const textClass = isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900';
  const activeTextClass = isDark ? 'text-blue-400' : 'text-blue-600';
  const iconClass = isDark ? 'text-gray-300' : 'text-gray-600';
  const borderClass = isDark ? 'border-white/[0.04]' : 'border-black/[0.06]';
  const ctaBg = isDark
    ? 'bg-white text-gray-900 hover:bg-gray-100 hover:shadow-white/10'
    : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-black/10';
  const logoFilter = isDark ? 'none' : 'invert(1)';
  const dropdownBg = 'backdrop-blur-xl bg-gray-900/90 border-white/10';
  const dropdownText = 'text-gray-300 hover:bg-white/10 hover:text-white';

  return (
    <nav
      ref={navRef}
      className="fixed w-full z-50 backdrop-blur-2xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex justify-between items-center h-16">
          <Link href="/" className="flex items-center relative z-10">
            <Image src="/logo-white-no-text.png" alt="Immivo" width={36} height={36} className="hidden lg:block" style={{ filter: logoFilter, transition: 'filter 0.4s ease' }} />
            <Image src="/logo-white-no-text.png" alt="Immivo" width={44} height={44} className="lg:hidden h-10 w-auto" style={{ filter: logoFilter, transition: 'filter 0.4s ease' }} />
          </Link>

          <div className="hidden lg:flex items-center space-x-6 absolute left-1/2 -translate-x-1/2" style={{ transition: 'color 0.4s ease' }}>
            <div className="relative group">
              <Link href="/" prefetch={false} className={`text-sm font-medium transition-colors flex items-center gap-1 ${textClass}`}>
                {t('product')}
                <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className={`${dropdownBg} rounded-xl shadow-xl border py-2 min-w-[200px]`}>
                  {currentPage === 'home' ? (
                    <>
                      <a href="#jarvis" onClick={(e) => handleAnchorClick(e, 'jarvis')} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('jarvisAi')}</a>
                      <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('features')}</a>
                      <a href="#bildbearbeitung" onClick={(e) => handleAnchorClick(e, 'bildbearbeitung')} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('aiImageEditing')}</a>
                    </>
                  ) : (
                    <>
                      <Link href="/#jarvis" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('jarvisAi')}</Link>
                      <Link href="/#features" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('features')}</Link>
                      <Link href="/#bildbearbeitung" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('aiImageEditing')}</Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Link href="/preise" prefetch={false} className={`text-sm font-medium transition-colors ${currentPage === 'preise' ? activeTextClass : textClass}`}>
              {t('pricing')}
            </Link>
            
            <div className="relative group">
              <Link href="/ueber-uns" prefetch={false} className={`text-sm font-medium transition-colors flex items-center gap-1 ${textClass}`}>
                {t('company')}
                <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className={`${dropdownBg} rounded-xl shadow-xl border py-2 min-w-[200px]`}>
                  <Link href="/ueber-uns" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('aboutUs')}</Link>
                  <Link href="/blog" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('blog')}</Link>
                  <Link href="/karriere" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('careers')}</Link>
                  <Link href="/kontakt" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('contact')}</Link>
                </div>
              </div>
            </div>

            {currentPage === 'home' ? (
              <a href="#demo" onClick={(e) => handleAnchorClick(e, 'demo')} className={`text-sm font-medium transition-colors ${textClass}`}>{t('demo')}</a>
            ) : (
              <Link href="/#demo" prefetch={false} className={`text-sm font-medium transition-colors ${textClass}`}>{t('demo')}</Link>
            )}
          </div>

          <div className="hidden lg:flex items-center space-x-4 relative z-10">
            <Link href="/login" prefetch={false} className={`text-sm font-medium transition-colors ${textClass}`}>
              {t('signIn')}
            </Link>
            <Link 
              href="/login?mode=register"
              prefetch={false}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-lg ${ctaBg}`}
            >
              {t('getStartedFree')}
            </Link>
          </div>

          <button 
            className={`lg:hidden p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className={`w-6 h-6 ${iconClass}`} /> : <Menu className={`w-6 h-6 ${iconClass}`} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden backdrop-blur-xl bg-gray-950/95 border-t border-white/[0.06] max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('product')}</p>
              {currentPage === 'home' ? (
                <>
                  <a href="#jarvis" onClick={(e) => handleAnchorClick(e, 'jarvis')} className="block py-2 text-gray-300 hover:text-white">{t('jarvisAi')}</a>
                  <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className="block py-2 text-gray-300 hover:text-white">{t('features')}</a>
                  <a href="#bildbearbeitung" onClick={(e) => handleAnchorClick(e, 'bildbearbeitung')} className="block py-2 text-gray-300 hover:text-white">{t('aiImageEditing')}</a>
                </>
              ) : (
                <>
                  <Link href="/#jarvis" prefetch={false} className="block py-2 text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>{t('jarvisAi')}</Link>
                  <Link href="/#features" prefetch={false} className="block py-2 text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>{t('features')}</Link>
                  <Link href="/#bildbearbeitung" prefetch={false} className="block py-2 text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>{t('aiImageEditing')}</Link>
                </>
              )}
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <Link href="/preise" prefetch={false} className={`block py-2 font-medium ${currentPage === 'preise' ? 'text-blue-400' : 'text-white'}`} onClick={() => setMobileMenuOpen(false)}>
                {t('pricing')}
              </Link>
            </div>

            <div className="border-t border-white/[0.06] pt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('company')}</p>
              <Link href="/ueber-uns" prefetch={false} className="block py-2 text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>{t('aboutUs')}</Link>
              <Link href="/blog" prefetch={false} className="block py-2 text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>{t('blog')}</Link>
              <Link href="/karriere" prefetch={false} className="block py-2 text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>{t('careers')}</Link>
              <Link href="/kontakt" prefetch={false} className="block py-2 text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>{t('contact')}</Link>
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              {currentPage === 'home' ? (
                <a href="#demo" onClick={(e) => handleAnchorClick(e, 'demo')} className="block py-2 font-medium text-white">{t('demoBook')}</a>
              ) : (
                <Link href="/#demo" prefetch={false} className="block py-2 font-medium text-white" onClick={() => setMobileMenuOpen(false)}>{t('demoBook')}</Link>
              )}
            </div>

            <div className="border-t border-white/[0.06] pt-4 space-y-3">
              <Link 
                href="/login"
                prefetch={false}
                className="block w-full text-center py-3 text-gray-300 font-medium border border-white/15 rounded-xl hover:bg-white/5 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('signIn')}
              </Link>
              <Link 
                href="/login?mode=register"
                prefetch={false}
                className="block w-full text-center py-3 bg-white text-gray-900 font-medium rounded-xl hover:shadow-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('getStartedFree')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
