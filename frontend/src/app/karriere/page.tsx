'use client';

import Link from 'next/link';
import { MapPin, Clock, ArrowRight, Heart, Zap, Users, Globe } from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

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
      description: 'Du hilfst unseren Kunden, das Maximum aus Immivo herauszuholen.'
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
      <PublicNavigation currentPage="karriere" />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 sm:mb-6">
            Karriere bei Immivo
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Hilf uns, die Immobilienbranche zu revolutionieren. 
            Wir suchen talentierte Menschen, die etwas bewegen wollen.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-8 sm:mb-12">Warum Immivo?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="text-center">
                <div className="w-12 sm:w-14 h-12 sm:h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <benefit.icon className="w-6 sm:w-7 h-6 sm:h-7 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">{benefit.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-8 sm:mb-12">Offene Stellen</h2>
          <div className="space-y-4">
            {jobs.map((job, i) => (
              <div key={i} className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:shadow-lg transition-all">
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{job.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{job.description}</p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                      <span className="px-2 py-1 bg-gray-50 text-blue-600 rounded-md font-medium">
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
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm sm:text-base w-full sm:w-auto"
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
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
            Keine passende Stelle dabei?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 px-4">
            Wir sind immer auf der Suche nach talentierten Menschen. 
            Schick uns eine Initiativbewerbung!
          </p>
          <Link 
            href="/kontakt"
            className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 transition-all"
          >
            Initiativbewerbung senden
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
