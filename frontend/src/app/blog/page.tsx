'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock } from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

export default function BlogPage() {
  const posts = [
    {
      title: 'Wie KI die Immobilienbranche revolutioniert',
      excerpt: 'Künstliche Intelligenz verändert die Art, wie Makler arbeiten. Erfahre, welche Trends 2026 wichtig werden.',
      date: '28. Januar 2026',
      readTime: '5 Min',
      category: 'KI & Technologie'
    },
    {
      title: 'Virtual Staging: Leere Räume verkaufen besser',
      excerpt: 'Warum Immobilien mit virtuell eingerichteten Räumen bis zu 73% mehr Aufmerksamkeit bekommen.',
      date: '25. Januar 2026',
      readTime: '4 Min',
      category: 'Marketing'
    },
    {
      title: '10 Tipps für effektivere Exposés',
      excerpt: 'So erstellst du Exposés, die Interessenten begeistern und zu mehr Besichtigungen führen.',
      date: '20. Januar 2026',
      readTime: '6 Min',
      category: 'Best Practices'
    },
    {
      title: 'Lead-Qualifizierung mit Jarvis automatisieren',
      excerpt: 'Wie unser KI-Assistent dir hilft, die besten Leads zu identifizieren und Zeit zu sparen.',
      date: '15. Januar 2026',
      readTime: '4 Min',
      category: 'Produktneuheiten'
    },
    {
      title: 'DSGVO-konformes CRM für Makler',
      excerpt: 'Was du bei der Datenspeicherung beachten musst und wie Immivo dir dabei hilft.',
      date: '10. Januar 2026',
      readTime: '7 Min',
      category: 'Rechtliches'
    },
    {
      title: 'Die Zukunft der Immobilienvermittlung',
      excerpt: 'Ein Ausblick auf die Trends und Technologien, die die Branche in den nächsten Jahren prägen werden.',
      date: '5. Januar 2026',
      readTime: '8 Min',
      category: 'Branchentrends'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="blog" />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Image src="/logo-icon.png" alt="Immivo" width={56} height={56} className="rounded-2xl mx-auto mb-6 shadow-lg" />
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 sm:mb-6">
            Blog
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Insights, Tipps und News rund um KI, Immobilien und effizientes Arbeiten.
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {posts.map((post, i) => (
              <article key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200" />
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">
                    <span className="px-2 py-1 bg-gray-50 text-blue-600 rounded-md text-xs font-medium">
                      {post.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 text-sm mb-3 sm:mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-400">{post.date}</span>
                    <span className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all cursor-pointer">
                      Lesen <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            Newsletter abonnieren
          </h2>
          <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">
            Erhalte die neuesten Artikel und Produkt-Updates direkt in dein Postfach.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="deine@email.de"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <button className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors">
              Abonnieren
            </button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
