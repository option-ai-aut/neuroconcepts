'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import {
  Plus,
  FileText,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Save,
} from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  author: string;
  category: string | null;
  tags: string[];
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function slugFromTitle(title: string): string {
  const map: Record<string, string> = {
    ä: 'ae',
    ö: 'oe',
    ü: 'ue',
    ß: 'ss',
    Ä: 'Ae',
    Ö: 'Oe',
    Ü: 'Ue',
  };
  let s = title;
  for (const [from, to] of Object.entries(map)) {
    s = s.split(from).join(to);
  }
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function BlogEditorPage() {
  const { session } = useAuth();
  const token = session?.getIdToken?.()?.getJwtToken?.();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const slugManuallyEdited = useRef(false);

  const selectedPost = posts.find((p) => p.id === selectedId);
  const isNew = selectedId === 'new';

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    category: '',
    author: 'Immivo Team',
    coverImage: '',
    content: '',
    tags: '',
    published: false,
  });

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${getApiUrl()}/admin/blog`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(msg);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (selectedPost) {
      setForm({
        title: selectedPost.title,
        slug: selectedPost.slug,
        excerpt: selectedPost.excerpt ?? '',
        category: selectedPost.category ?? '',
        author: selectedPost.author,
        coverImage: selectedPost.coverImage ?? '',
        content: selectedPost.content ?? '',
        tags: Array.isArray(selectedPost.tags) ? selectedPost.tags.join(', ') : '',
        published: selectedPost.published,
      });
      slugManuallyEdited.current = false;
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = selectedPost.content ?? '';
      }, 0);
    } else if (isNew) {
      setForm({
        title: '',
        slug: '',
        excerpt: '',
        category: '',
        author: 'Immivo Team',
        coverImage: '',
        content: '',
        tags: '',
        published: false,
      });
      slugManuallyEdited.current = false;
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = '';
      }, 0);
    }
  }, [selectedPost, isNew]);

  const handleTitleChange = (value: string) => {
    setForm((prev) => ({ ...prev, title: value }));
    if (!slugManuallyEdited.current) {
      setForm((prev) => ({ ...prev, slug: slugFromTitle(value) }));
    }
  };

  const handleNewPost = () => {
    setSelectedId('new');
  };

  const handleSelectPost = (id: string) => {
    setSelectedId(id);
  };

  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  const handleInsertLink = () => {
    const url = prompt('URL eingeben:');
    if (url) execCommand('createLink', url);
  };

  const handleInsertImage = () => {
    const url = prompt('Bild-URL eingeben:');
    if (url) execCommand('insertImage', url);
  };

  const handleSave = async () => {
    if (!token) {
      showToast('error', 'Bitte melde dich an.');
      return;
    }
    const content = editorRef.current?.innerHTML ?? form.content;
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: form.title,
      slug: form.slug || slugFromTitle(form.title),
      excerpt: form.excerpt || null,
      category: form.category || null,
      author: form.author,
      coverImage: form.coverImage || null,
      content,
      tags,
      published: form.published,
    };

    try {
      setSaving(true);
      setError(null);
      if (isNew) {
        const res = await fetch(`${getApiUrl()}/admin/blog`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Fehler beim Speichern');
        }
        const data = await res.json();
        setPosts((prev) => [data.post, ...prev]);
        setSelectedId(data.post.id);
        showToast('success', 'Artikel erstellt.');
      } else if (selectedId) {
        const res = await fetch(`${getApiUrl()}/admin/blog/${selectedId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Fehler beim Speichern');
        }
        const data = await res.json();
        setPosts((prev) => prev.map((p) => (p.id === selectedId ? data.post : p)));
        showToast('success', 'Artikel gespeichert.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Speichern';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || isNew) return;
    if (!confirm('Artikel wirklich löschen?')) return;
    if (!token) return;
    try {
      setDeleting(true);
      const res = await fetch(`${getApiUrl()}/admin/blog/${selectedId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      setPosts((prev) => prev.filter((p) => p.id !== selectedId));
      setSelectedId(null);
      showToast('success', 'Artikel gelöscht.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Löschen';
      showToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-white dark:bg-gray-950">
      {/* Left Panel - Blog List */}
      <div className="w-80 flex flex-col border-r border-gray-200 dark:border-gray-800 shrink-0">
        <div className="p-4 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Blog</h1>
          <button
            onClick={handleNewPost}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neuer Artikel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : posts.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
              Noch keine Artikel. Klicke auf &quot;Neuer Artikel&quot;.
            </div>
          ) : (
            <div className="py-2">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => handleSelectPost(post.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selectedId === post.id
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {post.title || 'Ohne Titel'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        post.published ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {post.published ? 'Veröffentlicht' : 'Entwurf'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(post.publishedAt ?? post.updatedAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {(selectedId && (selectedPost || isNew)) ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-5">
              <input
                type="text"
                placeholder="Titel"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-2xl font-bold border-0 border-b border-gray-200 dark:border-gray-700 bg-transparent focus:ring-0 focus:border-gray-400 dark:focus:border-gray-500 py-2 text-gray-900 dark:text-white placeholder-gray-400"
              />
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    slugManuallyEdited.current = true;
                    setForm((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                  placeholder="auto-erzeugter-slug"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Auszug</label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Kurzbeschreibung für die Übersicht"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Kategorie</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder="z.B. Immobilien"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Autor</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                    placeholder="Immivo Team"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Titelbild URL</label>
                <input
                  type="url"
                  value={form.coverImage}
                  onChange={(e) => setForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Rich Editor */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Inhalt</label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                  <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <button
                      type="button"
                      onClick={() => execCommand('bold')}
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title="Fett"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCommand('italic')}
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title="Kursiv"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCommand('underline')}
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title="Unterstrichen"
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 my-1" />
                    <button
                      type="button"
                      onClick={() => execCommand('formatBlock', 'h2')}
                      className="px-2 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title="Überschrift 2"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => execCommand('formatBlock', 'h3')}
                      className="px-2 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title="Überschrift 3"
                    >
                      H3
                    </button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 my-1" />
                    <button
                      type="button"
                      onClick={() => execCommand('insertUnorderedList')}
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title="Aufzählung"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCommand('insertOrderedList')}
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title="Nummerierte Liste"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 my-1" />
                    <button
                      type="button"
                      onClick={handleInsertLink}
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title="Link"
                    >
                      <Link className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertImage}
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title="Bild"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    className="prose prose-sm dark:prose-invert max-w-none min-h-[400px] p-4 text-gray-900 dark:text-gray-100 focus:outline-none"
                    style={{ minHeight: '400px' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tags (kommagetrennt)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="Tag1, Tag2, Tag3"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Veröffentlicht</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Speichern
                </button>
                {!isNew && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Löschen
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Kein Artikel ausgewählt</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
              Wähle einen Artikel aus der Liste oder erstelle einen neuen.
            </p>
            <button
              onClick={handleNewPost}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 font-medium"
            >
              <Plus className="w-4 h-4" />
              Neuer Artikel
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
