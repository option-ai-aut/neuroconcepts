'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import DOMPurify from 'dompurify';
import { getRuntimeConfig } from '@/components/EnvProvider';
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
  Upload,
  UserPlus,
  X,
  Download,
  FileSpreadsheet,
} from 'lucide-react';

function getApiUrl(): string {
  const config = getRuntimeConfig();
  return (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

async function getAdminToken(): Promise<string | undefined> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  } catch { return undefined; }
}

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
  const [token, setToken] = useState<string | undefined>();
  useEffect(() => { getAdminToken().then(setToken); }, []);

  const [activeTab, setActiveTab] = useState<TabId>('subscribers');

  // Subscribers state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(true);
  const [subscribersError, setSubscribersError] = useState<string | null>(null);
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [addingManual, setAddingManual] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvData, setCsvData] = useState<{ name: string; email: string }[]>([]);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingSubscriber, setDeletingSubscriber] = useState<string | null>(null);
  const [subscriberToast, setSubscriberToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Campaigns state
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

  const showSubToast = useCallback((type: 'success' | 'error', text: string) => {
    setSubscriberToast({ type, text });
    setTimeout(() => setSubscriberToast(null), 4000);
  }, []);

  const getHeaders = useCallback(
    () =>
      ({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }) as HeadersInit,
    [token]
  );

  /* ==================== SUBSCRIBERS ==================== */

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

  const handleAddManual = async () => {
    if (!token || !manualEmail.trim()) return;
    setAddingManual(true);
    try {
      const res = await fetch(`${getApiUrl()}/admin/newsletter/subscribers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email: manualEmail.trim(), name: manualName.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Fehler beim Hinzufügen');
      }
      showSubToast('success', `${manualEmail.trim()} hinzugefügt.`);
      setManualEmail('');
      setManualName('');
      setShowAddManual(false);
      fetchSubscribers();
    } catch (e) {
      showSubToast('error', e instanceof Error ? e.message : 'Fehler beim Hinzufügen');
    } finally {
      setAddingManual(false);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const parsed: { name: string; email: string }[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Try to detect header row
        if (i === 0 && (line.toLowerCase().includes('email') || line.toLowerCase().includes('e-mail'))) continue;
        // Split by comma or semicolon
        const parts = line.split(/[,;]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2) {
          // Detect which is email
          const emailIdx = parts.findIndex((p) => p.includes('@'));
          if (emailIdx >= 0) {
            const email = parts[emailIdx];
            const name = parts.filter((_, i) => i !== emailIdx).join(' ').trim();
            parsed.push({ name, email });
          }
        } else if (parts.length === 1 && parts[0].includes('@')) {
          parsed.push({ name: '', email: parts[0] });
        }
      }
      setCsvData(parsed);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!token || csvData.length === 0) return;
    setImportingCsv(true);
    try {
      const res = await fetch(`${getApiUrl()}/admin/newsletter/subscribers/import`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ subscribers: csvData }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Fehler beim Import');
      }
      const data = await res.json();
      showSubToast('success', `${data.imported ?? csvData.length} Abonnenten importiert.`);
      setCsvData([]);
      setCsvFileName(null);
      setShowCsvImport(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchSubscribers();
    } catch (e) {
      showSubToast('error', e instanceof Error ? e.message : 'Fehler beim Import');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    if (!token || !confirm('Abonnent wirklich entfernen?')) return;
    setDeletingSubscriber(id);
    try {
      const res = await fetch(`${getApiUrl()}/admin/newsletter/subscribers/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
      showSubToast('success', 'Abonnent entfernt.');
    } catch (e) {
      showSubToast('error', e instanceof Error ? e.message : 'Fehler');
    } finally {
      setDeletingSubscriber(null);
    }
  };

  /* ==================== CAMPAIGNS ==================== */

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
      editorRef.current.innerHTML = DOMPurify.sanitize(campaignForm.htmlContent || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const body = {
        subject: campaignForm.subject,
        previewText: campaignForm.previewText,
        htmlContent: editorRef.current?.innerHTML ?? campaignForm.htmlContent,
      };
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

  const subscriberCountForSend = confirmSendOpen ? activeCount : 0;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#111111]">
      <div className="shrink-0 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Newsletter</h1>
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
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Abonnenten
            </span>
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'campaigns'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Kampagnen
            </span>
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {/* ==================== SUBSCRIBERS TAB ==================== */}
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
                {/* Stats + Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex flex-wrap items-center gap-3">
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowAddManual(!showAddManual); setShowCsvImport(false); }}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 text-sm font-medium transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Manuell hinzufügen
                    </button>
                    <button
                      onClick={() => { setShowCsvImport(!showCsvImport); setShowAddManual(false); }}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      CSV Import
                    </button>
                  </div>
                </div>

                {/* Manual Add Form */}
                {showAddManual && (
                  <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Abonnent hinzufügen</h3>
                      <button onClick={() => setShowAddManual(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3 items-end">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                        <input
                          type="text"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          placeholder="Max Mustermann"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">E-Mail *</label>
                        <input
                          type="email"
                          value={manualEmail}
                          onChange={(e) => setManualEmail(e.target.value)}
                          placeholder="max@beispiel.de"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
                        />
                      </div>
                      <button
                        onClick={handleAddManual}
                        disabled={addingManual || !manualEmail.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        {addingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hinzufügen'}
                      </button>
                    </div>
                  </div>
                )}

                {/* CSV Import Panel */}
                {showCsvImport && (
                  <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">CSV Import</h3>
                      <button onClick={() => { setShowCsvImport(false); setCsvData([]); setCsvFileName(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      CSV-Datei mit Name und E-Mail hochladen. Format: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">Name,E-Mail</code> oder <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">E-Mail,Name</code> (komma- oder semikolongetrennt).
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-400 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-sm transition-colors">
                        <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">{csvFileName || 'CSV auswählen'}</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleCsvFileChange}
                          className="hidden"
                        />
                      </label>
                      {csvData.length > 0 && (
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                          {csvData.length} Einträge erkannt
                        </span>
                      )}
                    </div>
                    {csvData.length > 0 && (
                      <>
                        <div className="max-h-48 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg mb-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Name</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">E-Mail</th>
                              </tr>
                            </thead>
                            <tbody>
                              {csvData.slice(0, 20).map((row, i) => (
                                <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                                  <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{row.name || '–'}</td>
                                  <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{row.email}</td>
                                </tr>
                              ))}
                              {csvData.length > 20 && (
                                <tr>
                                  <td colSpan={2} className="px-3 py-2 text-center text-gray-500">
                                    ... und {csvData.length - 20} weitere
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <button
                          onClick={handleCsvImport}
                          disabled={importingCsv}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
                        >
                          {importingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          {csvData.length} Abonnenten importieren
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Subscribers Table */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                          <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">E-Mail</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Name</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Quelle</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Anmeldedatum</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscribers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                              Keine Abonnenten vorhanden. Füge welche manuell oder per CSV hinzu.
                            </td>
                          </tr>
                        ) : (
                          subscribers.map((s) => (
                            <tr
                              key={s.id}
                              className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                            >
                              <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{s.email}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.name || '–'}</td>
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
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.source || '–'}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(s.subscribedAt)}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleDeleteSubscriber(s.id)}
                                  disabled={deletingSubscriber === s.id}
                                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                                  title="Entfernen"
                                >
                                  {deletingSubscriber === s.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
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

        {/* ==================== CAMPAIGNS TAB ==================== */}
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
                    &larr; Zurück
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Betreff</label>
                    <input
                      type="text"
                      value={campaignForm.subject}
                      onChange={(e) => setCampaignForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder="Newsletter-Betreff"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vorschau-Text</label>
                    <input
                      type="text"
                      value={campaignForm.previewText}
                      onChange={(e) => setCampaignForm((f) => ({ ...f, previewText: e.target.value }))}
                      placeholder="Wird in E-Mail-Clients als Vorschau angezeigt"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Rich Text Editor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inhalt (HTML)</label>
                    <div className="rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
                      <div className="flex flex-wrap gap-1 p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                        <button type="button" onClick={() => execCmd('bold')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Fett"><Bold className="w-4 h-4" /></button>
                        <button type="button" onClick={() => execCmd('italic')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Kursiv"><Italic className="w-4 h-4" /></button>
                        <button type="button" onClick={() => execCmd('underline')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Unterstrichen"><Underline className="w-4 h-4" /></button>
                        <button type="button" onClick={() => execCmd('formatBlock', 'h2')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold" title="Überschrift 2">H2</button>
                        <button type="button" onClick={() => execCmd('formatBlock', 'h3')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold" title="Überschrift 3">H3</button>
                        <button type="button" onClick={() => execCmd('insertUnorderedList')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Aufzählung"><List className="w-4 h-4" /></button>
                        <button type="button" onClick={() => execCmd('insertOrderedList')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Nummerierte Liste"><ListOrdered className="w-4 h-4" /></button>
                        <button type="button" onClick={insertLink} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Link"><Link className="w-4 h-4" /></button>
                        <button type="button" onClick={insertImage} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Bild"><ImageIcon className="w-4 h-4" /></button>
                      </div>
                      <div
                        ref={editorRef}
                        contentEditable
                        className="min-h-[300px] p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white prose prose-sm max-w-none focus:outline-none"
                        style={{ minHeight: 300 }}
                        onInput={(e) => setCampaignForm((f) => ({ ...f, htmlContent: (e.target as HTMLDivElement).innerHTML }))}
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
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Speichern
                    </button>
                    {!isNewCampaign && editingCampaignId !== 'new' && (
                      <button
                        onClick={() => setConfirmSendOpen(
                          campaigns.find((c) => c.id === editingCampaignId) ?? {
                            id: editingCampaignId!,
                            subject: campaignForm.subject,
                            previewText: campaignForm.previewText,
                            htmlContent: campaignForm.htmlContent,
                            status: 'draft',
                            createdAt: '',
                          }
                        )}
                        disabled={sending || activeCount === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Senden
                      </button>
                    )}
                    {!isNewCampaign && editingCampaignId !== 'new' && (
                      <button
                        onClick={handleDeleteCampaign}
                        disabled={deleting}
                        className="inline-flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium disabled:opacity-50"
                      >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Send confirmation modal */}
      {confirmSendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Kampagne senden?</h3>
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

      {/* Toast */}
      {subscriberToast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 ${
            subscriberToast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {subscriberToast.text}
        </div>
      )}
    </div>
  );
}
