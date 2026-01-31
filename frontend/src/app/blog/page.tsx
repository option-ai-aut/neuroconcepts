'use client';

import Link from 'next/link';
import { Sparkles, Calendar, ArrowRight, Clock } from 'lucide-react';

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
      excerpt: 'Was du bei der Datenspeicherung beachten musst und wie NeuroConcepts dir dabei hilft.',
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
            Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Insights, Tipps und News rund um KI, Immobilien und effizientes Arbeiten.
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, i) => (
              <article key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="aspect-[16/9] bg-gradient-to-br from-indigo-100 to-violet-100" />
                <div className="p-6">
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-medium">
                      {post.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{post.date}</span>
                    <span className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all cursor-pointer">
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
      <section className="py-16 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Newsletter abonnieren
          </h2>
          <p className="text-gray-600 mb-8">
            Erhalte die neuesten Artikel und Produkt-Updates direkt in dein Postfach.
          </p>
          <div className="flex gap-4 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="deine@email.de"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
              Abonnieren
            </button>
          </div>
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
