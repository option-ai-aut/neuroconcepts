'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Mail, Loader2 } from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';
import { getApiUrl, getImageUrl } from '@/lib/api';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  author: string;
  category: string | null;
  publishedAt: string | null;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [subscribeName, setSubscribeName] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${getApiUrl()}/blog/posts`);
        if (!res.ok) {
          // API not ready or no posts — treat as empty, not error
          setPosts([]);
          return;
        }
        const data = await res.json();
        setPosts(data.posts ?? []);
      } catch {
        // Network error / API unreachable — show empty state, not error
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribeStatus('loading');
    setSubscribeError(null);
    try {
      const res = await fetch(`${getApiUrl()}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: subscribeName.trim() || undefined, source: 'blog' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Anmeldung fehlgeschlagen');
      }
      setSubscribeStatus('success');
      setEmail('');
      setSubscribeName('');
    } catch (err: any) {
      setSubscribeStatus('error');
      setSubscribeError(err.message || 'Bitte versuche es später erneut.');
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="blog" />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 sm:mb-6">
            Blog
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Insights, Tipps und News rund um KI, Immobilien und effizientes Arbeiten.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-500">Artikel werden geladen...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-600 mb-2">{error}</p>
              <p className="text-gray-500 text-sm">Bitte versuche es später erneut.</p>
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Noch keine Artikel vorhanden</h2>
              <p className="text-gray-600">Komm bald wieder – wir arbeiten an spannenden Inhalten für dich.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <Link href={`/blog/${post.slug}`} className="block">
                    <div className="aspect-[16/9] bg-gray-100 relative overflow-hidden">
                      {post.coverImage ? (
                        <img
                          src={getImageUrl(post.coverImage)}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                      )}
                    </div>
                  </Link>
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">
                      {post.category && (
                        <span className="px-2 py-1 bg-gray-50 text-blue-600 rounded-md text-xs font-medium">
                          {post.category}
                        </span>
                      )}
                      {post.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(post.publishedAt)}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-gray-600 text-sm mb-3 sm:mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-gray-400">{post.author}</span>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
                      >
                        Lesen <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            Newsletter abonnieren
          </h2>
          <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">
            Erhalte die neuesten Artikel und Produkt-Updates direkt in dein Postfach.
          </p>
          {subscribeStatus === 'success' ? (
            <p className="text-green-600 font-medium">Erfolgreich angemeldet! Du erhältst bald unsere besten Inhalte.</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3 max-w-md mx-auto">
              <input
                type="text"
                value={subscribeName}
                onChange={(e) => setSubscribeName(e.target.value)}
                placeholder="Dein Name"
                disabled={subscribeStatus === 'loading'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:opacity-70"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  disabled={subscribeStatus === 'loading'}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:opacity-70"
                />
                <button
                  type="submit"
                  disabled={subscribeStatus === 'loading'}
                  className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {subscribeStatus === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    'Abonnieren'
                  )}
                </button>
              </div>
            </form>
          )}
          {subscribeError && (
            <p className="mt-3 text-red-600 text-sm">{subscribeError}</p>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
