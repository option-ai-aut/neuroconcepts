'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Slight delay so it doesn't flash on load
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({ essential: true, analytics: true, timestamp: Date.now() }));
    setIsVisible(false);
  };

  const acceptEssential = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({ essential: true, analytics: false, timestamp: Date.now() }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 shrink-0">
            <Cookie className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Cookie-Einstellungen</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Wir verwenden essenzielle Cookies fuer die Funktion der Plattform (Authentifizierung, Sitzung). 
              Optionale Cookies helfen uns, die Nutzung zu analysieren und die Plattform zu verbessern.{' '}
              <Link href="/datenschutz" className="text-indigo-600 hover:underline">
                Mehr erfahren
              </Link>
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={acceptAll}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Alle akzeptieren
              </button>
              <button
                onClick={acceptEssential}
                className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Nur essenzielle
              </button>
            </div>
          </div>
          <button
            onClick={acceptEssential}
            className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
            aria-label="Schliessen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
