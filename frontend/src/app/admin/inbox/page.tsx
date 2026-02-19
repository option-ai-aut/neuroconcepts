'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  RefreshCw, Search, Mail, Inbox, Send, FileText, Trash2, 
  Star, MoreHorizontal, Reply, Forward,
  Paperclip, Plus, AlertCircle, Loader2,
  Eye, EyeOff, ArrowLeft, Menu, X, Shield
} from 'lucide-react';
import { getAdminEmails, markAdminEmailRead, getAdminUnreadCounts, AdminEmail } from '@/lib/adminApi';
import DOMPurify from 'dompurify';

function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'br', 'a', 'b', 'i', 'u', 'strong', 'em',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'img', 'blockquote', 'pre', 'code', 'hr', 'style',
      'font', 'center', 'small', 'big', 'sub', 'sup',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
      'style', 'class', 'id', 'colspan', 'rowspan', 'align', 'valign',
      'border', 'cellpadding', 'cellspacing', 'bgcolor', 'color', 'face', 'size',
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  });
}

const MAILBOXES = [
  { email: 'dennis.kral@immivo.ai', label: 'Mein Postfach', shortLabel: 'Mein', color: 'bg-blue-600' },
  { email: 'office@immivo.ai', label: 'Office', shortLabel: 'Office', color: 'bg-gray-900' },
  { email: 'support@immivo.ai', label: 'Support', shortLabel: 'Support', color: 'bg-amber-600' },
];

const FOLDERS = [
  { id: 'INBOX', label: 'Posteingang', icon: Inbox },
  { id: 'SENT', label: 'Gesendet', icon: Send },
  { id: 'DRAFTS', label: 'Entwürfe', icon: FileText },
  { id: 'TRASH', label: 'Papierkorb', icon: Trash2 },
];

// Email Body Viewer (sandboxed iframe)
function EmailBodyViewer({ email }: { email: AdminEmail }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(400);

  const hasBody = !!(email.bodyHtml || email.bodyText);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !hasBody) return;

    let content: string;
    if (email.bodyHtml) {
      content = sanitizeEmailHtml(email.bodyHtml);
    } else {
      const escaped = (email.bodyText || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      content = `<div>${escaped}</div>`;
    }

    const doc = iframe.contentDocument;
    if (!doc) return;

    const baseStyles = `
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937; background: white; overflow-x: hidden; word-wrap: break-word; }
      body { padding: 24px 28px; }
      img { max-width: 100% !important; height: auto !important; }
      a { color: #2563eb; }
      pre, code { font-family: 'SF Mono', Monaco, monospace; font-size: 13px; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
      blockquote { margin: 16px 0; padding-left: 16px; border-left: 3px solid #e5e7eb; color: #6b7280; }
    `;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>${content}</body></html>`);
    doc.close();

    const checkHeight = () => {
      const body = iframe.contentDocument?.body;
      if (body) setIframeHeight(Math.max(100, body.scrollHeight + 20));
    };
    setTimeout(checkHeight, 100);
    setTimeout(checkHeight, 500);
  }, [email.bodyHtml, email.bodyText, hasBody]);

  if (!hasBody) {
    return <div className="p-6 text-center text-gray-400 text-sm italic">Kein Inhalt vorhanden</div>;
  }

  return (
    <iframe ref={iframeRef} className="w-full border-0" style={{ height: iframeHeight, minHeight: 100 }} sandbox="allow-same-origin" title="Email content" />
  );
}

export default function AdminInboxPage() {
  const [activeMailbox, setActiveMailbox] = useState(MAILBOXES[0].email);
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmail, setSelectedEmail] = useState<AdminEmail | null>(null);
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showMobileFolders, setShowMobileFolders] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminEmails(activeMailbox, selectedFolder, searchQuery || undefined);
      setEmails(data.emails || []);
    } catch (err) {
      console.error('Failed to load emails:', err);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [activeMailbox, selectedFolder, searchQuery]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  useEffect(() => {
    getAdminUnreadCounts().then(d => setUnreadCounts(d.counts || {})).catch(() => {});
  }, []);

  const handleEmailClick = async (email: AdminEmail) => {
    setSelectedEmail(email);
    if (!email.isRead) {
      try {
        await markAdminEmailRead(email.id, true);
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isRead: true } : e));
      } catch {}
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7) return date.toLocaleDateString('de-DE', { weekday: 'short' });
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const getPreview = (email: AdminEmail) => {
    const text = email.bodyText || email.bodyHtml?.replace(/<[^>]*>/g, '') || '';
    return text.substring(0, 100).trim() + (text.length > 100 ? '...' : '');
  };

  const currentFolder = FOLDERS.find(f => f.id === selectedFolder)!;
  const activeMailboxInfo = MAILBOXES.find(m => m.email === activeMailbox)!;

  // Email List Item
  const EmailListItem = ({ email, compact }: { email: AdminEmail; compact?: boolean }) => (
    <button
      onClick={() => handleEmailClick(email)}
      className={`w-full text-left transition-all duration-150 ${compact ? 'px-4 py-3' : 'p-4'} ${
        selectedEmail?.id === email.id
          ? 'bg-gray-50 md:border-l-2 md:border-l-gray-300'
          : email.isRead
          ? 'bg-white hover:bg-gray-50'
          : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center shrink-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
            !email.isRead ? 'bg-gray-100 text-blue-600' : 'bg-gray-100 text-gray-500'
          }`}>
            {(email.fromName || email.from).charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className={`text-sm truncate ${!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
              {email.fromName || email.from.split('@')[0]}
            </span>
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              {!email.isRead && <div className="w-2 h-2 bg-gray-800 rounded-full lg:hidden" />}
              <span className="text-xs text-gray-400 tabular-nums">{formatDate(email.receivedAt)}</span>
            </div>
          </div>
          <div className={`text-sm truncate ${!email.isRead ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
            {email.subject || '(Kein Betreff)'}
          </div>
          <div className="text-xs text-gray-400 truncate leading-relaxed mt-0.5">
            {getPreview(email)}
          </div>
          {email.hasAttachments && (
            <div className="flex items-center gap-2 mt-1.5">
              <Paperclip className="w-3 h-3 text-gray-400" />
            </div>
          )}
        </div>
      </div>
    </button>
  );

  // ── MOBILE: Email Detail ──
  if (selectedEmail) {
    return (
      <>
        <div className="h-full flex flex-col bg-white lg:hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 shrink-0">
            <button onClick={() => setSelectedEmail(null)} className="flex items-center gap-1 text-blue-600 text-sm font-medium -ml-1 p-1">
              <ArrowLeft className="w-5 h-5" /> Zurück
            </button>
          </div>
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 leading-snug mb-2">
              {selectedEmail.subject || '(Kein Betreff)'}
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {(selectedEmail.fromName || selectedEmail.from).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-gray-900 text-sm">{selectedEmail.fromName || selectedEmail.from.split('@')[0]}</span>
                <div className="text-xs text-gray-400 truncate">
                  {selectedEmail.from} · {new Date(selectedEmail.receivedAt).toLocaleString('de-DE', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-white">
            <EmailBodyViewer email={selectedEmail} />
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex gap-2 bg-white">
            <a href={`mailto:${selectedEmail.from}?subject=Re: ${encodeURIComponent(selectedEmail.subject)}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg">
              <Reply className="w-4 h-4" /> Antworten
            </a>
          </div>
        </div>

        {/* Desktop stays in layout */}
        <div className="hidden lg:flex h-full bg-gray-50">{renderDesktopLayout()}</div>
      </>
    );
  }

  function renderDesktopLayout() {
    return (
      <>
        {/* Folder Sidebar */}
        <div className="w-52 bg-gray-100 border-r border-gray-200 flex flex-col">
          {/* Mailbox Selector */}
          <div className="p-3 border-b border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Postfach</p>
            {MAILBOXES.map((mb) => (
              <button
                key={mb.email}
                onClick={() => { setActiveMailbox(mb.email); setSelectedEmail(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                  activeMailbox === mb.email ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${mb.color}`} />
                  {mb.shortLabel}
                </div>
                {(unreadCounts[mb.email] || 0) > 0 && (
                  <span className="text-xs font-semibold text-blue-600 bg-gray-100 px-1.5 py-0.5 rounded">
                    {unreadCounts[mb.email]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Folders */}
          <nav className="flex-1 px-2 pt-2">
            {FOLDERS.map((folder) => {
              const Icon = folder.icon;
              const isActive = selectedFolder === folder.id;
              return (
                <button key={folder.id}
                  onClick={() => { setSelectedFolder(folder.id); setSelectedEmail(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                    isActive ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-600 hover:bg-gray-200'
                  }`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  {folder.label}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-200">
            <button onClick={fetchEmails} disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Laden...' : 'Aktualisieren'}
            </button>
          </div>
        </div>

        {/* Email List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="E-Mails durchsuchen..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-300 focus:ring-1 focus:ring-blue-500 transition-all" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading && emails.length === 0 ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <Mail className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm">Keine E-Mails</p>
              </div>
            ) : emails.map((email) => <EmailListItem key={email.id} email={email} />)}
          </div>
        </div>

        {/* Email Detail */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedEmail ? (
            <>
              <div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-white">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 leading-snug pr-4">
                    {selectedEmail.subject || '(Kein Betreff)'}
                  </h2>
                </div>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {(selectedEmail.fromName || selectedEmail.from).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{selectedEmail.fromName || selectedEmail.from.split('@')[0]}</span>
                      <span className="text-sm text-gray-400">&lt;{selectedEmail.from}&gt;</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      An: {selectedEmail.to.join(', ')}
                      {selectedEmail.cc.length > 0 && <span className="ml-3">CC: {selectedEmail.cc.join(', ')}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 tabular-nums shrink-0">
                    {new Date(selectedEmail.receivedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-white">
                <EmailBodyViewer email={selectedEmail} />
              </div>
              <div className="px-5 py-3 border-t border-gray-100 flex gap-2 bg-white">
                <a href={`mailto:${selectedEmail.from}?subject=Re: ${encodeURIComponent(selectedEmail.subject)}`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                  <Reply className="w-4 h-4" /> Antworten
                </a>
                <a href={`mailto:?subject=Fwd: ${encodeURIComponent(selectedEmail.subject)}`}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  <Forward className="w-4 h-4" /> Weiterleiten
                </a>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-500">Wähle eine E-Mail aus</p>
              <p className="text-sm">Details werden hier angezeigt</p>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── MAIN RENDER ──
  return (
    <div className="h-full flex flex-col lg:flex-row bg-gray-50">

      {/* MOBILE */}
      <div className="lg:hidden flex flex-col h-full bg-white">
        {/* Mailbox Toggle */}
        <div className="flex items-center gap-1 px-3 pt-3 pb-1 overflow-x-auto">
          {MAILBOXES.map((mb) => (
            <button
              key={mb.email}
              onClick={() => { setActiveMailbox(mb.email); setSelectedEmail(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-all ${
                activeMailbox === mb.email ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeMailbox === mb.email ? 'bg-white' : mb.color}`} />
              {mb.shortLabel}
              {(unreadCounts[mb.email] || 0) > 0 && (
                <span className={`text-[10px] font-bold ${activeMailbox === mb.email ? 'text-gray-300' : 'text-blue-600'}`}>
                  {unreadCounts[mb.email]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 shrink-0">
          <button onClick={() => setShowMobileFolders(true)} className="flex items-center gap-2 text-gray-900">
            <Menu className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-base">{currentFolder.label}</span>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowMobileSearch(!showMobileSearch)} className="p-2 text-gray-500 rounded-lg">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showMobileSearch && (
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Suchen..." value={searchQuery} autoFocus
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-100 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500" />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setShowMobileSearch(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loading && emails.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Mail className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm font-medium text-gray-500">Keine E-Mails</p>
            </div>
          ) : emails.map((email) => <EmailListItem key={email.id} email={email} compact />)}
        </div>
      </div>

      {/* Mobile Folder Drawer */}
      {showMobileFolders && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileFolders(false)} />
          <div className="relative w-72 bg-white h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-semibold text-gray-900">Ordner</span>
              <button onClick={() => setShowMobileFolders(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-1">
              {FOLDERS.map((folder) => {
                const Icon = folder.icon;
                const isActive = selectedFolder === folder.id;
                return (
                  <button key={folder.id}
                    onClick={() => { setSelectedFolder(folder.id); setSelectedEmail(null); setShowMobileFolders(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                      isActive ? 'bg-gray-50 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    {folder.label}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <button onClick={() => { fetchEmails(); setShowMobileFolders(false); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-gray-600 bg-gray-50 rounded-xl">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Aktualisieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP */}
      <div className="hidden lg:flex h-full w-full">{renderDesktopLayout()}</div>
    </div>
  );
}
