'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Sparkles, Menu, X } from 'lucide-react';

interface PublicNavigationProps {
  currentPage?: string;
}

export default function PublicNavigation({ currentPage }: PublicNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    // Only handle anchor clicks on homepage
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
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">NeuroConcepts</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {/* Produkt Dropdown */}
            <div className="relative group">
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1">
                Produkt
                <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-2 min-w-[200px]">
                  {currentPage === 'home' ? (
                    <>
                      <a href="#jarvis" onClick={(e) => handleAnchorClick(e, 'jarvis')} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">Jarvis KI</a>
                      <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">Features</a>
                      <a href="#bildbearbeitung" onClick={(e) => handleAnchorClick(e, 'bildbearbeitung')} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">KI-Bildbearbeitung</a>
                    </>
                  ) : (
                    <>
                      <Link href="/#jarvis" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">Jarvis KI</Link>
                      <Link href="/#features" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">Features</Link>
                      <Link href="/#bildbearbeitung" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">KI-Bildbearbeitung</Link>
                    </>
                  )}
                  <Link href="/integrationen" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">Integrationen</Link>
                </div>
              </div>
            </div>

            <Link href="/preise" className={`text-sm font-medium transition-colors ${currentPage === 'preise' ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}>
              Preise
            </Link>
            
            {/* Unternehmen Dropdown */}
            <div className="relative group">
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1">
                Unternehmen
                <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-2 min-w-[200px]">
                  <Link href="/ueber-uns" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">Über uns</Link>
                  <Link href="/blog" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">Blog</Link>
                  <Link href="/karriere" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">Karriere</Link>
                  <Link href="/kontakt" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">Kontakt</Link>
                </div>
              </div>
            </div>

            {currentPage === 'home' ? (
              <a href="#demo" onClick={(e) => handleAnchorClick(e, 'demo')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Demo</a>
            ) : (
              <Link href="/#demo" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Demo</Link>
            )}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
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

          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-4 space-y-4">
            {/* Produkt Section */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Produkt</p>
              {currentPage === 'home' ? (
                <>
                  <a href="#jarvis" onClick={(e) => handleAnchorClick(e, 'jarvis')} className="block py-2 text-gray-600 hover:text-gray-900">Jarvis KI</a>
                  <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className="block py-2 text-gray-600 hover:text-gray-900">Features</a>
                  <a href="#bildbearbeitung" onClick={(e) => handleAnchorClick(e, 'bildbearbeitung')} className="block py-2 text-gray-600 hover:text-gray-900">KI-Bildbearbeitung</a>
                </>
              ) : (
                <>
                  <Link href="/#jarvis" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>Jarvis KI</Link>
                  <Link href="/#features" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>Features</Link>
                  <Link href="/#bildbearbeitung" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>KI-Bildbearbeitung</Link>
                </>
              )}
              <Link href="/integrationen" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>Integrationen</Link>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <Link href="/preise" className={`block py-2 font-medium ${currentPage === 'preise' ? 'text-indigo-600' : 'text-gray-900'}`} onClick={() => setMobileMenuOpen(false)}>
                Preise
              </Link>
            </div>

            {/* Unternehmen Section */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unternehmen</p>
              <Link href="/ueber-uns" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>Über uns</Link>
              <Link href="/blog" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>Blog</Link>
              <Link href="/karriere" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>Karriere</Link>
              <Link href="/kontakt" className="block py-2 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>Kontakt</Link>
            </div>

            <div className="border-t border-gray-100 pt-4">
              {currentPage === 'home' ? (
                <a href="#demo" onClick={(e) => handleAnchorClick(e, 'demo')} className="block py-2 font-medium text-gray-900">Demo buchen</a>
              ) : (
                <Link href="/#demo" className="block py-2 font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>Demo buchen</Link>
              )}
            </div>

            {/* Mobile CTA */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <Link 
                href="/login" 
                className="block w-full text-center py-3 text-gray-600 font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Anmelden
              </Link>
              <Link 
                href="/login" 
                className="block w-full text-center py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                Kostenlos starten
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
