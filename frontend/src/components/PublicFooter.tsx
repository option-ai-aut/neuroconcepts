'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-8 md:mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center mb-4 md:mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center mr-3">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Immivo</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Das KI-gesteuerte Betriebssystem für moderne Immobilienmakler. 
              Mehr Abschlüsse, weniger Büro.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Produkt</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><Link href="/#jarvis" className="hover:text-white transition-colors">Jarvis KI</Link></li>
              <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/preise" className="hover:text-white transition-colors">Preise</Link></li>
              <li><Link href="/integrationen" className="hover:text-white transition-colors">Integrationen</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Unternehmen</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><Link href="/ueber-uns" className="hover:text-white transition-colors">Über uns</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/karriere" className="hover:text-white transition-colors">Karriere</Link></li>
              <li><Link href="/kontakt" className="hover:text-white transition-colors">Kontakt</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Rechtliches</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link></li>
              <li><Link href="/agb" className="hover:text-white transition-colors">AGB</Link></li>
              <li><Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 text-center md:text-left">© 2026 Immivo AI GmbH. Alle Rechte vorbehalten.</p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="flex w-2 h-2 bg-green-500 rounded-full"></span>
            Alle Systeme operational
          </div>
        </div>
      </div>
    </footer>
  );
}
