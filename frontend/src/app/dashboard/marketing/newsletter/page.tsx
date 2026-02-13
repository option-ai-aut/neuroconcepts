'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import {
  Users,
  Mail,
  Plus,
  Edit2,
  Trash2,
  Send,
  Save,
  Loader2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image as ImageIcon,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface Subscriber {
  id: string;
  email: string;
  name?: string;
  status: 'confirmed' | 'unsubscribed';
  source?: string;
  subscribedAt: string;
}

interface Campaign {
  id: string;
  subject: string;
  previewText?: string;
  htmlContent: string;
  status: 'draft' | 'sending' | 'sent';
  sentCount?: number;
  createdAt: string;
  sentAt?: string | null;
}

type TabId = 'subscribers' | 'campaigns';

export default function NewsletterPage() {
  const { session } = useAuth();
  const token = session?.getIdToken?.()?.getJwtToken?.();

  const [activeTab, setActiveTab] = useState<TabId>('subscribers');

  // Subscribers tab
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(true);
  const [subscribersError, setSubscribersError] = useState<string | null>(null);

  // Campaigns tab
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [isNewCampaign, setIsNewCampaign] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<number | null>(null);
  const [confirmSendOpen, setConfirmSendOpen] = useState<Campaign | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const [campaignForm, setCampaignForm] = useState({
    subject: '',
    previewText: '',
    htmlContent: '',
  });

  const getHeaders = useCallback(
    () =>
      ({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }) as HeadersInit,
    [token]
  );

  const fetchSubscribers = useCallback(async () => {
    if (!token) return;
    setSubscribersLoading(true);
    setSubscribersError(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/newsletter/subscribers`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Abonnenten konnten nicht geladen werden');
      const data = await res.json();
      setSubscribers(Array.isArray(data) ? data : data.subscribers ?? data.items ?? []);
    } catch (e) {
      setSubscribersError(e instanceof Error ? e.message : 'Fehler beim Laden');
      setSubscribers([]);
    } finally {
      setSubscribersLoading(false);
    }
  }, [token, getHeaders]);

  const fetchCampaigns = useCallback(async () => {
    if (!token) return;
    setCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/newsletter/campaigns`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Kampagnen konnten nicht geladen werden');
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : data.campaigns ?? data.items ?? []);
    } catch (e) {
      setCampaignsError(e instanceof Error ? e.message : 'Fehler beim Laden');
      setCampaigns([]);
    } finally {
      setCampaignsLoading(false);
    }
  }, [token, getHeaders]);

  useEffect(() => {
    if (activeTab === 'subscribers') fetchSubscribers();
    else fetchCampaigns();
  }, [activeTab, fetchSubscribers, fetchCampaigns]);

  const activeCount = subscribers.filter((s) => s.status === 'confirmed').length;
  const unsubscribedCount = subscribers.filter((s) => s.status === 'unsubscribed').length;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '–';
    try {
      return new Date(dateStr).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const statusLabel = (s: Subscriber) =>
    s.status === 'confirmed' ? 'bestätigt' : 'abgemeldet';

  const campaignStatusLabel = (c: Campaign) => {
    if (c.status === 'draft') return 'Entwurf';
    if (c.status === 'sending') return 'Wird gesendet';
    return 'Gesendet';
  };

  // Campaign editor: execCommand toolbar
  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = window.prompt('Link-URL eingeben:', 'https://');
    if (url) execCmd('createLink', url);
  };

  const insertImage = () => {
    const url = window.prompt('Bild-URL eingeben:', 'https://');
    if (url) execCmd('insertImage', url);
  };

  const openCampaignEditor = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaignId(campaign.id);
      setIsNewCampaign(false);
      setCampaignForm({
        subject: campaign.subject || '',
        previewText: campaign.previewText || '',
        htmlContent: campaign.htmlContent || '',
      });
    } else {
      setEditingCampaignId('new');
      setIsNewCampaign(true);
      setCampaignForm({ subject: '', previewText: '', htmlContent: '' });
    }
    setSendSuccess(null);
  };

  useEffect(() => {
    if (editorRef.current && editingCampaignId) {
      editorRef.current.innerHTML = campaignForm.htmlContent || '';
    }
  }, [editingCampaignId]);

  const closeCampaignEditor = () => {
    setEditingCampaignId(null);
    setIsNewCampaign(false);
    setConfirmSendOpen(null);
    fetchCampaigns();
  };

  const handleSaveCampaign = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const body = { subject: campaignForm.subject, previewText: campaignForm.previewText, htmlContent: editorRef.current?.innerHTML ?? campaignForm.htmlContent };
      if (isNewCampaign) {
        const res = await fetch(`${getApiUrl()}/admin/newsletter/campaigns`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Kampagne konnte nicht erstellt werden');
        const created = await res.json();
        setEditingCampaignId(created.id ?? created.campaign?.id);
        setIsNewCampaign(false);
        fetchCampaigns();
      } else {
        const id = editingCampaignId === 'new' ? '' : editingCampaignId;
        const res = await fetch(`${getApiUrl()}/admin/newsletter/campaigns/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Kampagne konnte nicht gespeichert werden');
        fetchCampaigns();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleSendCampaign = async () => {
    const c = confirmSendOpen;
    if (!c || !token) return;
    setSending(true);
    setConfirmSendOpen(null);
    try {
      const id = c.id;
      const res = await fetch(`${getApiUrl()}/admin/newsletter/campaigns/${id}/send`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Kampagne konnte nicht gesendet werden');
      const data = await res.json();
      const sent = data.sentCount ?? data.sent ?? activeCount;
      setSendSuccess(sent);
      fetchCampaigns();
      fetchSubscribers();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Fehler beim Senden');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteCampaign = async () => {
    const id = editingCampaignId === 'new' ? null : editingCampaignId;
    if (!id || !token) return;
    if (!confirm('Kampagne wirklich löschen?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`${getApiUrl()}/admin/newsletter/campaigns/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Kampagne konnte nicht gelöscht werden');
      closeCampaignEditor();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  const campaignToSend = confirmSendOpen;
  const subscriberCountForSend = campaignToSend ? activeCount : 0;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#111111]">
      <div className="shrink-0 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Newsletter
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Abonnenten verwalten und Kampagnen versenden
        </p>
      </div>

      {/* Tabs */}
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-1 px-6">
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'subscribers'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Abonnenten
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'campaigns'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Kampagnen
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {/* Tab 1: Subscribers */}
        {activeTab === 'subscribers' && (
          <div className="p-6">
            {subscribersLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : subscribersError ? (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{subscribersError}</span>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium">
                    <Users className="w-4 h-4" />
                    {subscribers.length} gesamt
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
                    {activeCount} bestätigt
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium">
                    {unsubscribedCount} abgemeldet
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                          <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                            E-Mail
                          </th>
                          <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                            Name
                          </th>
                          <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                            Status
                          </th>
                          <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                            Quelle
                          </th>
                          <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                            Anmeldedatum
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscribers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                              Keine Abonnenten vorhanden
                            </td>
                          </tr>
                        ) : (
                          subscribers.map((s) => (
                            <tr
                              key={s.id}
                              className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                            >
                              <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                                {s.email}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {s.name || '–'}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                    s.status === 'confirmed'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                  }`}
                                >
                                  {statusLabel(s)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {s.source || '–'}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {formatDate(s.subscribedAt)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Campaigns */}
        {activeTab === 'campaigns' && (
          <div className="p-6">
            {!editingCampaignId ? (
              <>
                {campaignsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : campaignsError ? (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{campaignsError}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end mb-6">
                      <button
                        onClick={() => openCampaignEditor()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 font-medium transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Neue Kampagne
                      </button>
                    </div>

                    <div className="space-y-3">
                      {campaigns.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center text-gray-500 dark:text-gray-400">
                          <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Noch keine Kampagnen. Erstelle deine erste Newsletter-Kampagne.</p>
                          <button
                            onClick={() => openCampaignEditor()}
                            className="mt-4 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                          >
                            Kampagne erstellen
                          </button>
                        </div>
                      ) : (
                        campaigns.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-900 dark:text-white truncate">
                                  {c.subject || '(Ohne Betreff)'}
                                </span>
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                    c.status === 'sent'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : c.status === 'sending'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                  }`}
                                >
                                  {campaignStatusLabel(c)}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {c.status === 'sent' && c.sentCount != null && (
                                  <span>{c.sentCount} gesendet</span>
                                )}
                                <span>{formatDate(c.sentAt ?? c.createdAt)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => openCampaignEditor(c)}
                              className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                              title="Bearbeiten"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              /* Campaign Editor */
              <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center gap-2">
                  <button
                    onClick={closeCampaignEditor}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium"
                  >
                    ← Zurück
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isNewCampaign ? 'Neue Kampagne' : 'Kampagne bearbeiten'}
                  </span>
                </div>

                {sendSuccess != null && (
                  <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 flex items-center gap-2">
                    <Mail className="w-5 h-5 shrink-0" />
                    <span>Kampagne erfolgreich an {sendSuccess} Abonnenten gesendet.</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Betreff
                    </label>
                    <input
                      type="text"
                      value={campaignForm.subject}
                      onChange={(e) =>
                        setCampaignForm((f) => ({ ...f, subject: e.target.value }))
                      }
                      placeholder="Newsletter-Betreff"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vorschau-Text
                    </label>
                    <input
                      type="text"
                      value={campaignForm.previewText}
                      onChange={(e) =>
                        setCampaignForm((f) => ({ ...f, previewText: e.target.value }))
                      }
                      placeholder="Wird in E-Mail-Clients als Vorschau angezeigt"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Inhalt (HTML)
                    </label>
                    <div className="rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
                      <div className="flex flex-wrap gap-1 p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={() => execCmd('bold')}
                          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Fett"
                        >
                          <Bold className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => execCmd('italic')}
                          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Kursiv"
                        >
                          <Italic className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => execCmd('underline')}
                          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Unterstrichen"
                        >
                          <Underline className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => execCmd('formatBlock', 'h2')}
                          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold"
                          title="Überschrift 2"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => execCmd('formatBlock', 'h3')}
                          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold"
                          title="Überschrift 3"
                        >
                          H3
                        </button>
                        <button
                          type="button"
                          onClick={() => execCmd('insertUnorderedList')}
                          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Aufzählung"
                        >
                          <List className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => execCmd('insertOrderedList')}
                          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Nummerierte Liste"
                        >
                          <ListOrdered className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={insertLink}
                          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Link"
                        >
                          <Link className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={insertImage}
                          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Bild"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div
                        ref={editorRef}
                        contentEditable
                        className="min-h-[300px] p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white prose prose-sm max-w-none focus:outline-none"
                        style={{ minHeight: 300 }}
                        onInput={(e) =>
                          setCampaignForm((f) => ({
                            ...f,
                            htmlContent: (e.target as HTMLDivElement).innerHTML,
                          }))
                        }
                        suppressContentEditableWarning
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-4">
                    <button
                      onClick={handleSaveCampaign}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 font-medium disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Speichern
                    </button>
                    {!isNewCampaign && editingCampaignId !== 'new' && (
                      <button
                        onClick={() =>
                          setConfirmSendOpen(
                            campaigns.find((c) => c.id === editingCampaignId) ?? {
                              id: editingCampaignId,
                              subject: campaignForm.subject,
                              previewText: campaignForm.previewText,
                              htmlContent: campaignForm.htmlContent,
                              status: 'draft',
                              createdAt: '',
                            }
                          )
                        }
                        disabled={sending || activeCount === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Senden
                      </button>
                    )}
                    {!isNewCampaign && editingCampaignId !== 'new' && (
                      <button
                        onClick={handleDeleteCampaign}
                        disabled={deleting}
                        className="inline-flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium disabled:opacity-50"
                      >
                        {deleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Send confirmation modal */}
        {confirmSendOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Kampagne senden?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Wirklich an {subscriberCountForSend} Abonnenten senden?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmSendOpen(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSendCampaign}
                  disabled={sending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {sending ? 'Wird gesendet…' : 'Senden'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
