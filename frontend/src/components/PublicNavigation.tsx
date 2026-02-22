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
  const defaultDark = currentPage === 'home' || currentPage === 'about';
  const [isDark, setIsDark] = useState(defaultDark);

  // System dark mode detection (for mobile)
  const [systemDark, setSystemDark] = useState(false);
  const [isMobileWidth, setIsMobileWidth] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const check = () => setIsMobileWidth(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // On mobile: follow system dark/light preference
  // On desktop: follow page-based theme (data-nav-theme or page type)
  const effectiveDark = isMobileWidth ? systemDark : isDark;

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
      // The home page uses a slide system (no DOM IDs). Setting the hash triggers
      // the hashchange listener in page.tsx which calls setActiveIdx().
      window.location.hash = `#${targetId}`;
      setMobileMenuOpen(false);
    }
  };

  // Desktop nav uses effectiveDark (= isDark on desktop, systemDark on mobile)
  const textClass = effectiveDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900';
  const activeTextClass = effectiveDark ? 'text-white font-semibold' : 'text-gray-900 font-semibold';
  const iconClass = effectiveDark ? 'text-gray-300' : 'text-gray-600';
  const borderClass = effectiveDark ? 'border-white/[0.04]' : 'border-black/[0.06]';
  const ctaBg = effectiveDark
    ? 'bg-white text-gray-900 hover:bg-gray-100 hover:shadow-white/10'
    : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-black/10';
  const logoFilter = effectiveDark ? 'none' : 'invert(1)';
  const dropdownBg = 'backdrop-blur-xl border-white/10';
  const dropdownStyle = { background: 'rgba(15,15,15,0.95)' };
  const dropdownText = 'text-gray-300 hover:bg-white/10 hover:text-white';

  // Mobile: fully opaque black/white — no gray shimmer from transparency
  // Desktop: glassmorphism with backdrop-blur
  const navBg = isMobileWidth
    ? (effectiveDark ? '#000000' : '#ffffff')
    : (effectiveDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.75)');

  // Mobile menu — fully opaque to match header
  const menuBg = isMobileWidth
    ? (effectiveDark ? '#0a0a0a' : '#ffffff')
    : (effectiveDark ? 'rgba(10,10,10,0.88)' : 'rgba(248,248,248,0.88)');
  const menuBorder = effectiveDark ? 'border-white/[0.08]' : 'border-black/[0.06]';
  const menuText = effectiveDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900';
  const menuActive = effectiveDark ? 'text-white font-semibold' : 'text-gray-900 font-semibold';
  const menuLabel = effectiveDark ? 'text-gray-500' : 'text-gray-400';
  const menuSignIn = effectiveDark
    ? 'text-gray-300 border-white/20 hover:bg-white/5'
    : 'text-gray-700 border-black/10 hover:bg-black/5';
  const menuSignUp = effectiveDark
    ? 'bg-white text-gray-900 hover:bg-gray-100'
    : 'bg-gray-900 text-white hover:bg-gray-800';

  return (
    <nav
      ref={navRef}
      className={`fixed w-full z-50 ${isMobileWidth ? '' : 'backdrop-blur-2xl'}`}
      style={{ background: navBg, transition: 'background 0.4s ease' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex justify-between items-center h-16">
          <Link
            href="/"
            className="flex items-center relative z-10"
            onClick={(e) => {
              if (currentPage === 'home') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('landing-go-top'));
              }
            }}
          >
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
                <div className={`${dropdownBg} rounded-xl shadow-xl border py-2 min-w-[200px]`} style={dropdownStyle}>
                  {currentPage === 'home' ? (
                    <>
                      <a href="#mivo" onClick={(e) => handleAnchorClick(e, 'mivo')} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('mivoAi')}</a>
                      <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('features')}</a>
                      <a href="#bildbearbeitung" onClick={(e) => handleAnchorClick(e, 'bildbearbeitung')} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('aiImageEditing')}</a>
                    </>
                  ) : (
                    <>
                      <Link href="/#mivo" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('mivoAi')}</Link>
                      <Link href="/#features" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('features')}</Link>
                      <Link href="/#bildbearbeitung" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('aiImageEditing')}</Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Link href="/pricing" prefetch={false} className={`text-sm font-medium transition-colors ${currentPage === 'pricing' ? activeTextClass : textClass}`}>
              {t('pricing')}
            </Link>
            
            <div className="relative group">
              <Link href="/about" prefetch={false} className={`text-sm font-medium transition-colors flex items-center gap-1 ${textClass}`}>
                {t('company')}
                <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className={`${dropdownBg} rounded-xl shadow-xl border py-2 min-w-[200px]`} style={dropdownStyle}>
                  <Link href="/about" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('aboutUs')}</Link>
                  <Link href="/blog" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('blog')}</Link>
                  <Link href="/careers" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('careers')}</Link>
                  <Link href="/contact" prefetch={false} className={`block px-4 py-2 text-sm ${dropdownText}`}>{t('contact')}</Link>
                </div>
              </div>
            </div>

            <Link href="/demo" prefetch={false} className={`text-sm font-medium transition-colors ${currentPage === 'demo' ? activeTextClass : textClass}`}>{t('demo')}</Link>
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
            className={`lg:hidden p-2 rounded-lg transition-colors ${effectiveDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className={`w-6 h-6 ${iconClass}`} /> : <Menu className={`w-6 h-6 ${iconClass}`} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className={`lg:hidden border-t ${menuBorder} max-h-[calc(100vh-4rem)] overflow-y-auto`}
          style={{ background: menuBg, transition: 'background 0.3s ease' }}
        >
          <div className="px-5 py-5 space-y-5">
            <div className="space-y-1">
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${menuLabel}`}>{t('product')}</p>
              {currentPage === 'home' ? (
                <>
                  <a href="#mivo" onClick={(e) => handleAnchorClick(e, 'mivo')} className={`block py-2 text-sm transition-colors ${menuText}`}>{t('mivoAi')}</a>
                  <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className={`block py-2 text-sm transition-colors ${menuText}`}>{t('features')}</a>
                  <a href="#bildbearbeitung" onClick={(e) => handleAnchorClick(e, 'bildbearbeitung')} className={`block py-2 text-sm transition-colors ${menuText}`}>{t('aiImageEditing')}</a>
                </>
              ) : (
                <>
                  <Link href="/#mivo" prefetch={false} className={`block py-2 text-sm transition-colors ${menuText}`} onClick={() => setMobileMenuOpen(false)}>{t('mivoAi')}</Link>
                  <Link href="/#features" prefetch={false} className={`block py-2 text-sm transition-colors ${menuText}`} onClick={() => setMobileMenuOpen(false)}>{t('features')}</Link>
                  <Link href="/#bildbearbeitung" prefetch={false} className={`block py-2 text-sm transition-colors ${menuText}`} onClick={() => setMobileMenuOpen(false)}>{t('aiImageEditing')}</Link>
                </>
              )}
            </div>

            <div className={`border-t ${menuBorder} pt-4`}>
              <Link href="/pricing" prefetch={false} className={`block py-2 text-sm transition-colors ${currentPage === 'pricing' ? menuActive : menuText}`} onClick={() => setMobileMenuOpen(false)}>
                {t('pricing')}
              </Link>
            </div>

            <div className={`border-t ${menuBorder} pt-4 space-y-1`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${menuLabel}`}>{t('company')}</p>
              <Link href="/about" prefetch={false} className={`block py-2 text-sm transition-colors ${currentPage === 'about' ? menuActive : menuText}`} onClick={() => setMobileMenuOpen(false)}>{t('aboutUs')}</Link>
              <Link href="/blog" prefetch={false} className={`block py-2 text-sm transition-colors ${currentPage === 'blog' ? menuActive : menuText}`} onClick={() => setMobileMenuOpen(false)}>{t('blog')}</Link>
              <Link href="/careers" prefetch={false} className={`block py-2 text-sm transition-colors ${currentPage === 'careers' ? menuActive : menuText}`} onClick={() => setMobileMenuOpen(false)}>{t('careers')}</Link>
              <Link href="/contact" prefetch={false} className={`block py-2 text-sm transition-colors ${currentPage === 'contact' ? menuActive : menuText}`} onClick={() => setMobileMenuOpen(false)}>{t('contact')}</Link>
            </div>

            <div className={`border-t ${menuBorder} pt-4`}>
              <Link href="/demo" prefetch={false} className={`block py-2 text-sm transition-colors ${currentPage === 'demo' ? menuActive : menuText}`} onClick={() => setMobileMenuOpen(false)}>{t('demoBook')}</Link>
            </div>

            <div className={`border-t ${menuBorder} pt-4 space-y-3`}>
              <Link
                href="/login"
                prefetch={false}
                className={`block w-full text-center py-3 text-sm font-medium border rounded-xl transition-colors ${menuSignIn}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('signIn')}
              </Link>
              <Link
                href="/login?mode=register"
                prefetch={false}
                className={`block w-full text-center py-3 text-sm font-semibold rounded-xl transition-all hover:shadow-lg ${menuSignUp}`}
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
