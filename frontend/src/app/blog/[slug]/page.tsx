'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Mail, Loader2, FileQuestion } from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';
import { getApiUrl, getImageUrl } from '@/lib/api';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  author: string;
  category: string | null;
  publishedAt: string | null;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : params.slug?.[0] ?? '';
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [subscribeName, setSubscribeName] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    async function fetchPost() {
      try {
        setLoading(true);
        setNotFound(false);
        setError(null);
        const res = await fetch(`${getApiUrl()}/blog/posts/${slug}`);
        if (res.status === 404) {
          setNotFound(true);
          setPost(null);
          return;
        }
        if (!res.ok) throw new Error('Fehler beim Laden des Artikels');
        const data = await res.json();
        setPost(data.post ?? null);
        if (!data.post) setNotFound(true);
      } catch (err: any) {
        setError(err.message || 'Ein Fehler ist aufgetreten');
        setPost(null);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [slug]);

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

      <main className="pt-24 sm:pt-32 pb-12 sm:pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-500">Artikel wird geladen...</p>
            </div>
          ) : notFound || !post ? (
            <div className="text-center py-20">
              <div className="flex justify-center mb-4">
                <FileQuestion className="w-16 h-16 text-gray-300" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Artikel nicht gefunden</h1>
              <p className="text-gray-600 mb-6">
                {error || 'Der angeforderte Artikel existiert nicht oder wurde entfernt.'}
              </p>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück zum Blog
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium mb-8 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück zum Blog
              </Link>

              <article className="animate-fade-in">
                {post.category && (
                  <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-md text-sm font-medium mb-4">
                    {post.category}
                  </span>
                )}
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                  {post.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-8">
                  <span>{post.author}</span>
                  {post.publishedAt && (
                    <>
                      <span className="text-gray-300">·</span>
                      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    </>
                  )}
                </div>

                {post.coverImage && (
                  <div className="aspect-[16/9] rounded-xl overflow-hidden mb-10 bg-gray-100">
                    <img
                      src={getImageUrl(post.coverImage)}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div
                  className="prose prose-lg prose-gray max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto prose-blockquote:border-l-blue-600 prose-blockquote:bg-gray-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-pre:overflow-x-auto prose-table:block prose-table:overflow-x-auto overflow-x-hidden break-words"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </article>

              {/* Newsletter */}
              <section className="mt-16 pt-12 border-t border-gray-200">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-blue-50 rounded-full">
                      <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Newsletter abonnieren
                  </h2>
                  <p className="text-gray-600 text-sm mb-6">
                    Erhalte die neuesten Artikel direkt in dein Postfach.
                  </p>
                  {subscribeStatus === 'success' ? (
                    <p className="text-green-600 font-medium">Erfolgreich angemeldet!</p>
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
            </>
          )}
        </div>
      </main>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>

      <PublicFooter />
    </div>
  );
}
