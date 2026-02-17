'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PublicNavigationProps {
  currentPage?: string;
}

export default function PublicNavigation({ currentPage }: PublicNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations('publicNav');

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

  return (
    <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center">
            <Image src="/logo-icon-only.png" alt="Immivo" width={36} height={36} className="hidden lg:block" />
            <Image src="/logo-black.png" alt="Immivo" width={180} height={60} className="lg:hidden h-12 w-auto" />
          </Link>

          <div className="hidden lg:flex items-center space-x-6">
            <div className="relative group">
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1">
                {t('product')}
                <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-2 min-w-[200px]">
                  {currentPage === 'home' ? (
                    <>
                      <a href="#jarvis" onClick={(e) => handleAnchorClick(e, 'jarvis')} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">{t('jarvisAi')}</a>
                      <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">{t('features')}</a>
                      <a href="#bildbearbeitung" onClick={(e) => handleAnchorClick(e, 'bildbearbeitung')} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">{t('aiImageEditing')}</a>
                    </>
                  ) : (
                    <>
                      <Link href="/#jarvis" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">{t('jarvisAi')}</Link>
                      <Link href="/#features" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">{t('features')}</Link>
                      <Link href="/#bildbearbeitung" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">{t('aiImageEditing')}</Link>
                    </>
                  )}
                  <Link href="/preise" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">{t('pricing')}</Link>
                </div>
              </div>
            </div>

            <Link href="/preise" className={`text-sm font-medium transition-colors ${currentPage === 'preise' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
              {t('pricing')}
            </Link>
            
            <div className="relative group">
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1">
                {t('company')}
                <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-2 min-w-[200px]">
                  <Link href="/ueber-uns" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">{t('aboutUs')}</Link>
                  <Link href="/blog" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">{t('blog')}</Link>
                  <Link href="/karriere" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">{t('careers')}</Link>
                  <Link href="/kontakt" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">{t('contact')}</Link>
                </div>
              </div>
            </div>

            {currentPage === 'home' ? (
              <a href="#demo" onClick={(e) => handleAnchorClick(e, 'demo')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">{t('demo')}</a>
            ) : (
              <Link href="/#demo" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">{t('demo')}</Link>
            )}
          </div>

          <div className="hidden lg:flex items-center space-x-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              {t('signIn')}
            </Link>
            <Link 
              href="/login?mode=register" 
              className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-gray-500/20 transition-all hover:-translate-y-0.5"
            >
              {t('getStartedFree')}
            </Link>
          </div>

          <button 
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('product')}</p>
              {currentPage === 'home' ? (
                <>
                  <a href="#jarvis" onClick={(e) => handleAnchorClick(e, 'jarvis')} className="block py-2 text-gray-600 hover:text-gray-900">{t('jarvisAi')}</a>
                  <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className="block py-2 text-gray-600 hover:text-gray-900">{t('features')}</a>
                  <a href="#bildbearbeitung" onClick={(e) => handleAnchorClick(e, 'bildbearbeitung')} className="block py-2 text-gray-600 hover:text-gray-900">{t('aiImageEditing')}</a>
                </>
              ) : (
                <>
                  <Link href="/#jarvis" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>{t('jarvisAi')}</Link>
                  <Link href="/#features" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>{t('features')}</Link>
                  <Link href="/#bildbearbeitung" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>{t('aiImageEditing')}</Link>
                </>
              )}
              <Link href="/preise" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>{t('pricing')}</Link>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <Link href="/preise" className={`block py-2 font-medium ${currentPage === 'preise' ? 'text-blue-600' : 'text-gray-900'}`} onClick={() => setMobileMenuOpen(false)}>
                {t('pricing')}
              </Link>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('company')}</p>
              <Link href="/ueber-uns" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>{t('aboutUs')}</Link>
              <Link href="/blog" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>{t('blog')}</Link>
              <Link href="/karriere" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>{t('careers')}</Link>
              <Link href="/kontakt" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>{t('contact')}</Link>
            </div>

            <div className="border-t border-gray-100 pt-4">
              {currentPage === 'home' ? (
                <a href="#demo" onClick={(e) => handleAnchorClick(e, 'demo')} className="block py-2 font-medium text-gray-900">{t('demoBook')}</a>
              ) : (
                <Link href="/#demo" className="block py-2 font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>{t('demoBook')}</Link>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <Link 
                href="/login" 
                className="block w-full text-center py-3 text-gray-600 font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('signIn')}
              </Link>
              <Link 
                href="/login?mode=register" 
                className="block w-full text-center py-3 bg-gray-900 text-white font-medium rounded-xl hover:shadow-lg transition-all"
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
