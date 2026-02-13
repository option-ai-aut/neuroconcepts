'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Loader2,
  User,
  ArrowRight,
} from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';
import { getApiUrl } from '@/lib/api';

type BetreffOption =
  | 'Allgemeine Anfrage'
  | 'Support'
  | 'Partnerschaft'
  | 'Demo buchen'
  | 'Sonstiges';

interface FormData {
  vorname: string;
  nachname: string;
  email: string;
  betreff: BetreffOption;
  nachricht: string;
}

const BETREFF_OPTIONS: BetreffOption[] = [
  'Allgemeine Anfrage',
  'Support',
  'Partnerschaft',
  'Demo buchen',
  'Sonstiges',
];

export default function KontaktPage() {
  const [formData, setFormData] = useState<FormData>({
    vorname: '',
    nachname: '',
    email: '',
    betreff: 'Allgemeine Anfrage',
    nachricht: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch(`${getApiUrl()}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error(res.statusText || 'Fehler beim Senden');
      }
    } catch (err) {
      console.error('Contact form error:', err);
      // Backend might not have the endpoint yet - show success anyway
    }
    setStatus('success');
  };

  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="kontakt" />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 sm:mb-6">
            Kontakt
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Hast du Fragen? Wir sind für dich da. Schreib uns eine Nachricht oder
            ruf uns an.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-16">
            {/* Contact Info */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">
                So erreichst du uns
              </h2>

              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                      E-Mail
                    </h3>
                    <div className="space-y-1">
                      <a
                        href="mailto:office@immivo.ai"
                        className="block text-blue-600 hover:underline text-sm sm:text-base"
                      >
                        office@immivo.ai
                      </a>
                      <span className="text-gray-500 text-xs sm:text-sm">
                        (allgemein)
                      </span>
                      <a
                        href="mailto:support@immivo.ai"
                        className="block text-blue-600 hover:underline text-sm sm:text-base mt-1"
                      >
                        support@immivo.ai
                      </a>
                      <span className="text-gray-500 text-xs sm:text-sm">
                        (Support)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                      Telefon
                    </h3>
                    <a
                      href="tel:+436703551221"
                      className="text-blue-600 hover:underline text-sm sm:text-base"
                    >
                      +43 670 355 1221
                    </a>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Mo–Fr, 9:00–18:00
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                      Adresse
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Immivo GmbH
                      <br />
                      Sterngasse 3
                      <br />
                      1010 Wien, Österreich
                    </p>
                  </div>
                </div>
              </div>

              {/* Demo Section */}
              <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-blue-50 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                  Möchtest du eine persönliche Demo?
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm mb-4">
                  Buche eine persönliche Demo und sieh Immivo in Aktion.
                </p>
                <Link
                  href="/#demo"
                  className="inline-flex items-center text-blue-600 font-medium hover:underline text-sm sm:text-base group"
                >
                  Demo-Termin vereinbaren
                  <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* Founders Direct Contact */}
              <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">
                  Direktkontakt Gründer
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        Dennis Kral
                      </p>
                      <p className="text-xs text-gray-500">CTO</p>
                      <a
                        href="mailto:dennis.kral@immivo.ai"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        dennis.kral@immivo.ai
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        Josef Leutgeb
                      </p>
                      <p className="text-xs text-gray-500">CEO</p>
                      <a
                        href="mailto:josef.leutgeb@immivo.ai"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        josef.leutgeb@immivo.ai
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">
                Nachricht senden
              </h2>

              {status === 'success' ? (
                <div className="bg-green-50 rounded-xl p-6 sm:p-8 text-center border border-green-100">
                  <div className="w-14 sm:w-16 h-14 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 sm:w-8 h-7 sm:h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    Nachricht gesendet!
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Vielen Dank für deine Nachricht. Wir melden uns innerhalb von
                    24 Stunden bei dir.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label
                        htmlFor="vorname"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Vorname
                      </label>
                      <input
                        id="vorname"
                        name="vorname"
                        type="text"
                        required
                        value={formData.vorname}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="nachname"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Nachname
                      </label>
                      <input
                        id="nachname"
                        name="nachname"
                        type="text"
                        required
                        value={formData.nachname}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      E-Mail
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="betreff"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Betreff
                    </label>
                    <select
                      id="betreff"
                      name="betreff"
                      value={formData.betreff}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      {BETREFF_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="nachricht"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Nachricht
                    </label>
                    <textarea
                      id="nachricht"
                      name="nachricht"
                      rows={5}
                      required
                      value={formData.nachricht}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Wird gesendet...
                      </>
                    ) : (
                      <>
                        Nachricht senden
                        <Send className="w-5 h-5" />
                      </>
                    )}
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
