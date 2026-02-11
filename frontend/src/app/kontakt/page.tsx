'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

export default function KontaktPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="kontakt" />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Image src="/logo-icon.png" alt="Immivo" width={56} height={56} className="rounded-2xl mx-auto mb-6 shadow-lg" />
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 sm:mb-6">
            Kontakt
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Hast du Fragen? Wir sind für dich da. 
            Schreib uns eine Nachricht oder ruf uns an.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-16">
            {/* Contact Info */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">So erreichst du uns</h2>
              
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">E-Mail</h3>
                    <a href="mailto:hello@immivo.ai" className="text-blue-600 hover:underline text-sm sm:text-base">
                      hello@immivo.ai
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Telefon</h3>
                    <a href="tel:+4312345678" className="text-blue-600 hover:underline text-sm sm:text-base">
                      +43 1 234 56 78
                    </a>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Mo-Fr, 9:00-18:00 Uhr</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Adresse</h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Immivo AI GmbH<br />
                      Musterstraße 123<br />
                      1010 Wien, Österreich
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Demo buchen</h3>
                <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">
                  Möchtest du Immivo in Aktion sehen? 
                  Buche eine persönliche Demo mit unserem Team.
                </p>
                <Link 
                  href="/#demo"
                  className="inline-flex items-center text-blue-600 font-medium hover:underline text-sm sm:text-base"
                >
                  Demo-Termin vereinbaren →
                </Link>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              {submitted ? (
                <div className="bg-green-50 rounded-xl p-6 sm:p-8 text-center">
                  <div className="w-14 sm:w-16 h-14 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 sm:w-8 h-7 sm:h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Nachricht gesendet!</h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Vielen Dank für deine Nachricht. Wir melden uns innerhalb von 24 Stunden bei dir.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vorname</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nachname</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail</label>
                    <input 
                      type="email" 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Betreff</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option>Allgemeine Anfrage</option>
                      <option>Demo buchen</option>
                      <option>Technischer Support</option>
                      <option>Partnerschaft</option>
                      <option>Bewerbung</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nachricht</label>
                    <textarea 
                      rows={5}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full flex items-center justify-center px-6 py-3 sm:py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all"
                  >
                    Nachricht senden
                    <Send className="ml-2 w-5 h-5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
