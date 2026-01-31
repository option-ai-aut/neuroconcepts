'use client';

import Link from 'next/link';
import { Sparkles, MapPin, Clock, ArrowRight, Heart, Zap, Users, Globe } from 'lucide-react';

export default function KarrierePage() {
  const jobs = [
    {
      title: 'Senior Full-Stack Developer',
      department: 'Engineering',
      location: 'Remote / Wien',
      type: 'Vollzeit',
      description: 'Du entwickelst neue Features für unsere KI-Plattform mit React, Node.js und AWS.'
    },
    {
      title: 'AI/ML Engineer',
      department: 'Engineering',
      location: 'Remote / Wien',
      type: 'Vollzeit',
      description: 'Du optimierst Jarvis und entwickelst neue KI-Funktionen mit Python und TensorFlow.'
    },
    {
      title: 'Product Designer',
      department: 'Design',
      location: 'Remote',
      type: 'Vollzeit',
      description: 'Du gestaltest intuitive Interfaces für komplexe Workflows in der Immobilienbranche.'
    },
    {
      title: 'Customer Success Manager',
      department: 'Customer Success',
      location: 'Wien',
      type: 'Vollzeit',
      description: 'Du hilfst unseren Kunden, das Maximum aus NeuroConcepts herauszuholen.'
    }
  ];

  const benefits = [
    { icon: Globe, title: 'Remote-first', description: 'Arbeite von überall aus' },
    { icon: Zap, title: 'Neueste Technologie', description: 'Modernster Tech-Stack' },
    { icon: Heart, title: 'Work-Life-Balance', description: 'Flexible Arbeitszeiten' },
    { icon: Users, title: 'Starkes Team', description: 'Talentierte Kollegen' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">NeuroConcepts</span>
            </Link>
            <div className="flex items-center space-x-4">
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
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
            Karriere bei NeuroConcepts
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Hilf uns, die Immobilienbranche zu revolutionieren. 
            Wir suchen talentierte Menschen, die etwas bewegen wollen.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Warum NeuroConcepts?</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-7 h-7 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Offene Stellen</h2>
          <div className="space-y-4">
            {jobs.map((job, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{job.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{job.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-medium">
                        {job.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {job.type}
                      </span>
                    </div>
                  </div>
                  <Link 
                    href="/kontakt"
                    className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
                  >
                    Bewerben
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Keine passende Stelle dabei?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Wir sind immer auf der Suche nach talentierten Menschen. 
            Schick uns eine Initiativbewerbung!
          </p>
          <Link 
            href="/kontakt"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
          >
            Initiativbewerbung senden
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2026 NeuroConcepts AI GmbH. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
}
