'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, Lock } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12 mb-8 md:mb-12">
          {/* Brand & Contact */}
          <div className="col-span-2">
            <Link href="/" className="inline-block mb-4 md:mb-6">
              <Image src="/logo-white.png" alt="Immivo" width={160} height={160} className="w-28 sm:w-36 h-auto" />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Das KI-gesteuerte Betriebssystem für moderne Immobilienmakler. 
              Mehr Abschlüsse, weniger Büro.
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <a href="mailto:office@immivo.ai" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4 flex-shrink-0" />
                office@immivo.ai
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Dynamo Lab Technologies GmbH<br />Sterngasse 3, 1010 Wien</span>
              </div>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Produkt</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><Link href="/#jarvis" className="hover:text-white transition-colors">Jarvis KI</Link></li>
              <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/#bildbearbeitung" className="hover:text-white transition-colors">KI-Bildstudio</Link></li>
              <li><Link href="/preise" className="hover:text-white transition-colors">Preise</Link></li>
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
          <p className="text-sm text-gray-500 text-center md:text-left">© 2026 Dynamo Lab Technologies GmbH. Alle Rechte vorbehalten.</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Lock className="w-3.5 h-3.5" />
              Sichere Bezahlung via Stripe
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="flex w-2 h-2 bg-green-500 rounded-full"></span>
              Alle Systeme operational
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
