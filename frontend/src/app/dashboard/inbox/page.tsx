'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { fetchWithAuth } from '@/lib/api';
import { useEnv } from '@/components/EnvProvider';
import { 
  RefreshCw, Search, Mail, Inbox, Send, FileText, Trash2, 
  Star, StarOff, MoreHorizontal, Reply, Forward,
  Paperclip, ChevronDown, Plus, AlertCircle, Check, X, Loader2,
  Eye, EyeOff, Copy, Pencil, ArrowLeft, Menu, SquarePen,
  MailOpen, Users, Zap, LinkIcon
} from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';
import { useGlobalState } from '@/context/GlobalStateContext';
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
    // Allow data: URIs on img src so that inline images stored as base64 data URLs display correctly
    ADD_URI_SAFE_ATTR: ['src'],
  });
}

interface Email {
  id: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  folder: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  leadId?: string;
  receivedAt: string;
  sentAt?: string;
  providerData?: { aiGenerated?: boolean; generatedBy?: string };
}

interface EmailsResponse {
  emails: Email[];
  total: number;
  page: number;
  totalPages: number;
  unreadCounts: Record<string, number>;
}

const FOLDERS = [
  { id: 'INBOX', key: 'inbox', icon: Inbox },
  { id: 'FORWARDING', key: 'forwarding', icon: MailOpen },
  { id: 'SENT', key: 'sent', icon: Send },
  { id: 'DRAFTS', key: 'drafts', icon: FileText },
  { id: 'TRASH', key: 'trash', icon: Trash2 },
];

// Isolated Email Body Viewer
function EmailBodyViewer({ email, onContentClick }: { email: Email; onContentClick?: () => void }) {
  const t = useTranslations('inbox');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(400);

  const hasBody = !!(email.bodyHtml || email.bodyText);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !hasBody) return;

    let content: string;
    const isHtml = !!email.bodyHtml;

    if (isHtml) {
      content = sanitizeEmailHtml(email.bodyHtml!);
    } else {
      const escaped = (email.bodyText || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      content = `<div>${escaped}</div>`;
    }

    const doc = iframe.contentDocument;
    if (!doc) return;

    // Base styles — only applied as defaults; email's own <style> tags take precedence
    const baseStyles = `
      * { box-sizing: border-box; }
      html, body {
        margin: 0; padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px; line-height: 1.6; color: #1f2937; background: white;
        overflow-x: hidden;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      body { padding: 24px 28px; }
      img { max-width: 100% !important; height: auto !important; }
      a { color: #2563eb; text-decoration: none; }
      a:hover { text-decoration: underline; }
      pre, code { font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 13px; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }
      pre { padding: 12px; overflow-x: auto; }
      blockquote { margin: 16px 0; padding-left: 16px; border-left: 3px solid #e5e7eb; color: #6b7280; }
      p { margin: 8px 0; }
      hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
      * { -webkit-font-smoothing: antialiased; }
    `;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${baseStyles}</style></head><body>${content}</body></html>`);
    doc.close();

    const checkHeight = () => {
      const body = iframe.contentDocument?.body;
      if (body) {
        const h = body.scrollHeight + 20;
        setIframeHeight(Math.max(100, h));
      }
    };

    const resizeObserver = new ResizeObserver(checkHeight);
    if (iframe.contentDocument?.body) resizeObserver.observe(iframe.contentDocument.body);

    // Images inside the email may load async — recalculate after they load
    const images = iframe.contentDocument?.querySelectorAll('img') || [];
    images.forEach((img) => {
      if (!img.complete) img.addEventListener('load', checkHeight);
    });

    iframe.contentWindow?.addEventListener('load', checkHeight);
    setTimeout(checkHeight, 100);
    setTimeout(checkHeight, 500);
    setTimeout(checkHeight, 1500);

    iframe.contentDocument?.addEventListener('click', () => onContentClick?.());

    return () => {
      resizeObserver.disconnect();
      iframe.contentWindow?.removeEventListener('load', checkHeight);
    };
  }, [email.bodyHtml, email.bodyText, hasBody, onContentClick]);

  if (!hasBody) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm italic">
        {t('noContent')}
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className="w-full border-0"
      style={{ height: iframeHeight, minHeight: 100 }}
      sandbox="allow-same-origin"
      title="Email content"
    />
  );
}

export default function InboxPage() {
  const t = useTranslations('inbox');
  const { apiUrl } = useEnv();
  const { openDrawer, updateEmailForm } = useGlobalState();
  
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showMobileFolders, setShowMobileFolders] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [emailConnected, setEmailConnected] = useState<boolean | null>(null);
  const [forwardingEmail, setForwardingEmail] = useState<string | null>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; email: Email;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Check email integration status
  useEffect(() => {
    if (!apiUrl) return;
    const check = async () => {
      try {
        const [statusRes, tenantRes] = await Promise.all([
          fetchWithAuth(`${apiUrl}/email/status`).catch(() => null),
          fetchWithAuth(`${apiUrl}/settings/tenant`).catch(() => null),
        ]);
        const hasGmail = statusRes?.gmail?.connected;
        const hasOutlook = statusRes?.outlook?.connected;
        setEmailConnected(hasGmail || hasOutlook || false);
        if (tenantRes?.inboundLeadEmail) {
          setForwardingEmail(`${tenantRes.inboundLeadEmail}@leads.immivo.ai`);
        }
      } catch {
        setEmailConnected(false);
      }
    };
    check();
  }, [apiUrl]);

  // Fetch emails
  const { data: emailsData, mutate, isValidating } = useSWR<EmailsResponse>(
    emailConnected !== false ? `${apiUrl}/emails?folder=${selectedFolder}&search=${searchQuery}` : null,
    (url: string) => fetchWithAuth(url),
    { revalidateOnFocus: false }
  );

  // Auto-sync: pull new emails from Gmail every 15s while page is visible
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncingRef = useRef(false); // avoid overlapping syncs

  useEffect(() => {
    if (!apiUrl || emailConnected === false) return;

    const doSync = async () => {
      if (syncingRef.current || document.visibilityState !== 'visible') return;
      syncingRef.current = true;
      setSyncing(true);
      try {
        await fetchWithAuth(`${apiUrl}/emails/sync`, { method: 'POST' });
        mutate();
      } catch (error) {
        console.error('Auto-sync error:', error);
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    };

    // Initial sync on mount
    doSync();

    // Then sync every 15 seconds (only when page is visible)
    syncIntervalRef.current = setInterval(doSync, 15_000);

    const onVisibility = () => {
      // Sync immediately when returning to the tab
      if (document.visibilityState === 'visible') doSync();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const emails = emailsData?.emails || [];
  const unreadCounts = emailsData?.unreadCounts || {};

  // Fetch selected email
  const { data: selectedEmailData, mutate: mutateSelectedEmail } = useSWR<{ email: Email }>(
    selectedEmailId ? `${apiUrl}/emails/${selectedEmailId}` : null,
    (url: string) => fetchWithAuth(url)
  );
  const selectedEmail = selectedEmailData?.email;

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetchWithAuth(`${apiUrl}/emails/sync`, { method: 'POST' });
      mutate();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const toggleRead = async (emailId: string, isRead: boolean) => {
    try {
      await fetchWithAuth(`${apiUrl}/emails/${emailId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: !isRead })
      });
      mutate(); mutateSelectedEmail();
    } catch (error) { console.error('Error toggling read:', error); }
  };

  const moveToFolder = async (emailId: string, folder: string) => {
    try {
      await fetchWithAuth(`${apiUrl}/emails/${emailId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder })
      });
      mutate(); setContextMenu(null);
      if (selectedEmailId === emailId) setSelectedEmailId(null);
    } catch (error) { console.error('Error moving email:', error); }
  };

  const deleteEmail = async (emailId: string, permanent = false) => {
    try {
      await fetchWithAuth(`${apiUrl}/emails/${emailId}?permanent=${permanent}`, { method: 'DELETE' });
      mutate(); setContextMenu(null);
      if (selectedEmailId === emailId) setSelectedEmailId(null);
    } catch (error) { console.error('Error deleting email:', error); }
  };

  const toggleStar = async (emailId: string, isStarred: boolean) => {
    try {
      await fetchWithAuth(`${apiUrl}/emails/${emailId}/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !isStarred })
      });
      mutate(); mutateSelectedEmail(); setContextMenu(null);
    } catch (error) { console.error('Error toggling star:', error); }
  };

  const handleContextMenu = (e: React.MouseEvent, email: Email) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, email });
  };

  const handleReply = (email: Email) => {
    updateEmailForm({
      to: email.from,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      replyTo: email.id
    });
    openDrawer('EMAIL'); setContextMenu(null);
  };

  const handleForward = (email: Email) => {
    const forwardBody = `\n\n${t('forwardHeader')}\n${t('forwardFrom')} ${email.fromName || email.from} <${email.from}>\n${t('forwardDate')} ${new Date(email.receivedAt || email.sentAt || '').toLocaleString('de-DE')}\n${t('forwardSubject')} ${email.subject}\n${t('forwardTo')} ${email.to?.join(', ')}\n\n${email.bodyText || ''}`;
    updateEmailForm({ subject: `Fwd: ${email.subject}`, body: forwardBody });
    openDrawer('EMAIL'); setContextMenu(null);
  };

  const handleEditDraft = (email: Email) => {
    updateEmailForm({
      to: email.to?.[0] || '', cc: email.cc?.join(', ') || '', bcc: email.bcc?.join(', ') || '',
      subject: email.subject || '', body: email.bodyText || '', bodyHtml: email.bodyHtml || '',
      leadId: email.leadId || '', draftId: email.id,
    });
    openDrawer('EMAIL'); setContextMenu(null);
  };

  const handleNewEmail = () => {
    updateEmailForm({});
    openDrawer('EMAIL');
  };

  const handleEmailClick = (email: Email) => {
    if (selectedFolder === 'DRAFTS') {
      handleEditDraft(email);
    } else {
      setSelectedEmailId(email.id);
      // Mark as read immediately in the UI (backend does this on GET /emails/:id too)
      if (!email.isRead) {
        // Optimistically update the list, then revalidate
        mutate(
          (prev: EmailsResponse | undefined) => {
            if (!prev) return prev;
            return {
              ...prev,
              emails: prev.emails.map(e => e.id === email.id ? { ...e, isRead: true } : e),
              unreadCounts: {
                ...prev.unreadCounts,
                [selectedFolder]: Math.max(0, (prev.unreadCounts[selectedFolder] || 0) - 1)
              }
            };
          },
          { revalidate: false }
        );
      }
    }
  };

  // Close context menu on outside click/escape
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
      document.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7) return date.toLocaleDateString('de-DE', { weekday: 'short' });
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const getPreview = (email: Email) => {
    const text = email.bodyText || email.bodyHtml?.replace(/<[^>]*>/g, '') || '';
    return text.substring(0, 100).trim() + (text.length > 100 ? '...' : '');
  };

  const currentFolder = FOLDERS.find(f => f.id === selectedFolder)!;
  const inboxUnread = unreadCounts['INBOX'] || 0;

  // ──────────── EMAIL LIST ITEM (shared between mobile & desktop) ────────────
  const EmailListItem = ({ email, compact }: { email: Email; compact?: boolean }) => (
    <button
      key={email.id}
      onClick={() => handleEmailClick(email)}
      onContextMenu={(e) => handleContextMenu(e, email)}
      className={`w-full text-left transition-all duration-150 ${compact ? 'px-4 py-3' : 'p-4'} ${
        selectedEmailId === email.id
          ? 'bg-gray-50 md:border-l-2 md:border-l-gray-300'
          : email.isRead
          ? 'bg-white hover:bg-gray-50'
          : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex flex-col items-center shrink-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
            !email.isRead ? 'bg-gray-100 text-blue-600' : 'bg-gray-100 text-gray-500'
          }`}>
            {(email.fromName || email.from).charAt(0).toUpperCase()}
          </div>
          {email.isStarred && <Star className="w-3 h-3 text-yellow-500 fill-current mt-1" />}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Sender & Time */}
          <div className="flex items-center justify-between mb-0.5">
            <span className={`text-sm truncate ${!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
              {email.fromName || email.from.split('@')[0]}
            </span>
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              {!email.isRead && <div className="w-2 h-2 bg-gray-800 rounded-full lg:hidden" />}
              <span className="text-xs text-gray-400 tabular-nums">
                {formatDate(email.receivedAt || email.sentAt || '')}
              </span>
            </div>
          </div>
          
          {/* Subject */}
          <div className={`text-sm truncate ${!email.isRead ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
            {email.subject || t('noSubject')}
          </div>
          
          {/* Preview */}
          <div className="text-xs text-gray-400 truncate leading-relaxed mt-0.5">
            {getPreview(email)}
          </div>
          
          {/* Indicators */}
          {(email.hasAttachments || email.leadId || email.providerData?.aiGenerated) && (
            <div className="flex items-center gap-2 mt-1.5">
              {email.providerData?.aiGenerated && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">{t('aiGeneratedShort')}</span>
              )}
              {email.hasAttachments && <Paperclip className="w-3 h-3 text-gray-400" />}
              {email.leadId && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">{t('leadBadge')}</span>}
            </div>
          )}
        </div>
      </div>
    </button>
  );

  // ──────────── MOBILE: Email Detail View ────────────
  if (selectedEmailId && selectedEmail) {
    return (
      <>
        {/* MOBILE Detail View */}
        <div className="h-full flex flex-col bg-white lg:hidden">
          {/* Mobile Detail Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 shrink-0">
            <button
              onClick={() => setSelectedEmailId(null)}
              className="flex items-center gap-1 text-blue-600 text-sm font-medium -ml-1 p-1"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('back')}
            </button>
            <div className="flex items-center gap-0.5">
              <button onClick={() => toggleStar(selectedEmail.id, selectedEmail.isStarred)}
                className={`p-2 rounded-lg ${selectedEmail.isStarred ? 'text-yellow-500' : 'text-gray-400'}`}>
                <Star className={`w-4.5 h-4.5 ${selectedEmail.isStarred ? 'fill-current' : ''}`} />
              </button>
              <button onClick={() => toggleRead(selectedEmail.id, selectedEmail.isRead)} className="p-2 text-gray-400 rounded-lg">
                {selectedEmail.isRead ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
              <button onClick={() => moveToFolder(selectedEmail.id, selectedFolder === 'TRASH' ? 'INBOX' : 'TRASH')}
                className="p-2 text-gray-400 rounded-lg">
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Subject + Sender */}
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 leading-snug mb-2">
              {selectedEmail.subject || t('noSubject')}
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {(selectedEmail.fromName || selectedEmail.from).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">
                    {selectedEmail.fromName || selectedEmail.from.split('@')[0]}
                  </span>
                  {selectedEmail.leadId && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">{t('leadBadge')}</span>}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {selectedEmail.from} · {new Date(selectedEmail.receivedAt || selectedEmail.sentAt || '').toLocaleString('de-DE', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Body — direct rendering, no card */}
          <div className="flex-1 overflow-y-auto bg-white">
            <EmailBodyViewer email={selectedEmail} />
          </div>

          {/* Actions */}
          <div className="px-4 py-3 border-t border-gray-100 flex gap-2 safe-bottom bg-white">
            <button
              onClick={() => handleReply(selectedEmail)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg"
            >
              <Reply className="w-4 h-4" />
              {t('reply')}
            </button>
            <button
              onClick={() => handleForward(selectedEmail)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg"
            >
              <Forward className="w-4 h-4" />
              {t('forward')}
            </button>
          </div>
        </div>

        {/* DESKTOP Detail View stays in the 3-col layout — rendered below */}
        <div className="hidden lg:flex h-full bg-gray-50">
          {renderDesktopLayout()}
        </div>
      </>
    );
  }

  // ──────────── DESKTOP 3-Column Layout ────────────
  function renderDesktopLayout() {
    return (
      <>
        {/* Folder Sidebar */}
        <div className="w-52 bg-gray-100 border-r border-gray-200 flex flex-col">
          <div className="p-4">
            <button onClick={handleNewEmail}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> {t('newEmail')}
            </button>
          </div>
          <nav className="flex-1 px-2">
            {FOLDERS.map((folder) => {
              const Icon = folder.icon;
              const unread = unreadCounts[folder.id] || 0;
              const isActive = selectedFolder === folder.id;
              return (
                <button key={folder.id}
                  onClick={() => { setSelectedFolder(folder.id); setSelectedEmailId(null); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                    isActive ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-600 hover:bg-gray-200'
                  }`}>
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    {t(`folders.${folder.key}`)}
                  </div>
                  {unread > 0 && <span className="text-xs font-semibold text-blue-600 bg-gray-100 px-1.5 py-0.5 rounded">{unread}</span>}
                </button>
              );
            })}
          </nav>
          {forwardingEmail && (
            <div className="mx-3 mb-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-1.5 mb-1">
                <LinkIcon className="w-3 h-3 text-gray-400" />
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Weiterleitung</span>
              </div>
              <code className="text-[11px] text-gray-600 break-all leading-tight">{forwardingEmail}</code>
            </div>
          )}
          <div className="p-4 border-t border-gray-200">
            <button onClick={handleSync} disabled={syncing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? t('syncing') : t('syncButton')}
            </button>
          </div>
      </div>

        {/* Email List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-300 focus:ring-1 focus:ring-blue-500 transition-all" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {isValidating && emails.length === 0 ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <Mail className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm">{t('noEmails')}</p>
              </div>
            ) : emails.map((email) => <EmailListItem key={email.id} email={email} />)}
          </div>
        </div>

        {/* Email Detail */}
        <div className="flex-1 flex flex-col bg-white" onClick={() => setContextMenu(null)}>
          {selectedEmail ? (
            <>
              {/* Header: Subject + Actions */}
              <div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-white">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 leading-snug pr-4">
                    {selectedEmail.subject || t('noSubject')}
                  </h2>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleStar(selectedEmail.id, selectedEmail.isStarred)}
                      className={`p-1.5 rounded-lg transition-colors ${selectedEmail.isStarred ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'}`}>
                      <Star className={`w-4 h-4 ${selectedEmail.isStarred ? 'fill-current' : ''}`} />
                    </button>
                    <button onClick={() => toggleRead(selectedEmail.id, selectedEmail.isRead)}
                      className={`p-1.5 rounded-lg transition-colors ${selectedEmail.isRead ? 'text-gray-400 hover:text-blue-600 hover:bg-gray-50' : 'text-blue-600 hover:bg-gray-50'}`}>
                      {selectedEmail.isRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => moveToFolder(selectedEmail.id, selectedFolder === 'TRASH' ? 'INBOX' : 'TRASH')}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* Sender info */}
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {(selectedEmail.fromName || selectedEmail.from).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{selectedEmail.fromName || selectedEmail.from.split('@')[0]}</span>
                      <span className="text-sm text-gray-400">&lt;{selectedEmail.from}&gt;</span>
                      {selectedEmail.leadId && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{t('leadBadge')}</span>}
                      {selectedEmail.providerData?.aiGenerated && (
                        <span className="text-xs bg-gray-50 text-blue-600 border border-gray-200 px-2 py-0.5 rounded-full font-medium">{t('aiGenerated')}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {t('detailTo')} {selectedEmail.to.join(', ')}
                      {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                        <span className="ml-3">{t('detailCc')} {selectedEmail.cc.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 tabular-nums shrink-0">
                    {new Date(selectedEmail.receivedAt || selectedEmail.sentAt || '').toLocaleString('de-DE', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              {/* Email body — no card wrapper, direct rendering like Apple Mail */}
              <div className="flex-1 overflow-y-auto bg-white">
                <EmailBodyViewer email={selectedEmail} onContentClick={() => setContextMenu(null)} />
              </div>
              {/* Actions */}
              <div className="px-5 py-3 border-t border-gray-100 flex gap-2 bg-white">
                <button onClick={() => handleReply(selectedEmail)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                  <Reply className="w-4 h-4" /> {t('reply')}
                </button>
                <button onClick={() => handleForward(selectedEmail)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  <Forward className="w-4 h-4" /> {t('forward')}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-500">{t('selectEmail')}</p>
              <p className="text-sm">{t('selectEmailDesc')}</p>
            </div>
          )}
        </div>
      </>
    );
  }

  // ──────────── LOADING STATE ────────────
  if (emailConnected === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // ──────────── EMPTY STATE ────────────
  if (emailConnected === false) {
    return (
      <div className="h-full flex flex-col">
        <div className="pt-2" />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto">
              <Mail className="w-10 h-10 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">{t('emptyState.title')}</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{t('emptyState.description')}</p>
            </div>
            <div className="space-y-3 pt-4">
              <div className="flex items-start gap-3 text-left">
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Inbox className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{t('emptyState.centralInbox')}</div>
                  <div className="text-xs text-gray-500">{t('emptyState.centralInboxDesc')}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-left">
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{t('emptyState.aiResponses')}</div>
                  <div className="text-xs text-gray-500">{t('emptyState.aiResponsesDesc')}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-left">
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{t('emptyState.leadSync')}</div>
                  <div className="text-xs text-gray-500">{t('emptyState.leadSyncDesc')}</div>
                </div>
              </div>
            </div>
            {forwardingEmail && (
              <div className="pt-2 text-left bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Weiterleitungs-Adresse:</div>
                <code className="text-sm font-mono text-gray-800">{forwardingEmail}</code>
              </div>
            )}
            <div className="pt-4">
              <Link href="/dashboard/settings/integrations"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 transition-colors w-full">
                {t('emptyState.connectButton')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────── MAIN RENDER ────────────
  return (
    <div className="h-full flex flex-col lg:flex-row bg-gray-50">

      {/* ═══ MOBILE: Header + List ═══ */}
      <div className="lg:hidden flex flex-col h-full bg-white">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
          <button
            onClick={() => setShowMobileFolders(true)}
            className="flex items-center gap-2 text-gray-900"
          >
            <Menu className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-base">{t(`folders.${currentFolder.key}`)}</span>
            {inboxUnread > 0 && selectedFolder === 'INBOX' && (
              <span className="text-xs font-semibold text-blue-600 bg-gray-100 px-1.5 py-0.5 rounded-full">{inboxUnread}</span>
            )}
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="p-2 text-gray-500 rounded-lg">
              <Search className="w-5 h-5" />
            </button>
            <button onClick={handleNewEmail}
              className="p-2 text-blue-600 rounded-lg">
              <SquarePen className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (collapsible) */}
        {showMobileSearch && (
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder={t('searchPlaceholderShort')} value={searchQuery} autoFocus
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-100 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setShowMobileSearch(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Email List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {(isValidating || syncing) && emails.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto mb-2" />
                <p className="text-xs text-gray-400">{syncing ? t('syncing') : t('loading')}</p>
              </div>
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Mail className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm font-medium text-gray-500">{t('noEmails')}</p>
              <p className="text-xs mt-0.5">{t('pullToRefresh')}</p>
            </div>
          ) : emails.map((email) => <EmailListItem key={email.id} email={email} compact />)}
        </div>
      </div>

      {/* ═══ MOBILE: Folder Drawer (overlay) ═══ */}
      {showMobileFolders && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileFolders(false)} />
          
          {/* Drawer */}
          <div className="relative w-72 bg-white h-full shadow-xl animate-slide-right flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-semibold text-gray-900">{t('foldersTitle')}</span>
              <button onClick={() => setShowMobileFolders(false)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-1">
              {FOLDERS.map((folder) => {
                const Icon = folder.icon;
                const unread = unreadCounts[folder.id] || 0;
                const isActive = selectedFolder === folder.id;
                return (
                  <button key={folder.id}
                    onClick={() => {
                      setSelectedFolder(folder.id);
                      setSelectedEmailId(null);
                      setShowMobileFolders(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${
                      isActive ? 'bg-gray-50 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      {t(`folders.${folder.key}`)}
                    </div>
                    {unread > 0 && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>{unread}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-100">
              <button onClick={() => { handleSync(); setShowMobileFolders(false); }} disabled={syncing}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-gray-600 bg-gray-50 rounded-xl">
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? t('syncing') : t('syncButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DESKTOP: 3-Column Layout ═══ */}
      <div className="hidden lg:flex h-full w-full">
        {renderDesktopLayout()}
      </div>

      {/* ═══ Context Menu (Desktop) ═══ */}
      {contextMenu && (
        <div ref={contextMenuRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px] hidden lg:block"
          style={{ left: contextMenu.x, top: contextMenu.y, maxHeight: 'calc(100vh - 20px)', overflowY: 'auto' }}>
          {selectedFolder !== 'DRAFTS' && selectedFolder !== 'SENT' && (
            <>
              <button onClick={() => handleReply(contextMenu.email)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
                <Reply className="w-4 h-4 text-gray-400" /> {t('reply')}
              </button>
            </>
          )}
          {selectedFolder !== 'DRAFTS' && (
            <button onClick={() => handleForward(contextMenu.email)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
              <Forward className="w-4 h-4 text-gray-400" /> {t('forward')}
            </button>
          )}
          {selectedFolder === 'DRAFTS' && (
            <button onClick={() => handleEditDraft(contextMenu.email)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
              <Pencil className="w-4 h-4 text-gray-400" /> {t('contextMenu.edit')}
            </button>
          )}
          <div className="border-t border-gray-100 my-1" />
          <button onClick={() => { toggleRead(contextMenu.email.id, contextMenu.email.isRead); setContextMenu(null); }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
            {contextMenu.email.isRead ? <><EyeOff className="w-4 h-4 text-gray-400" /> {t('contextMenu.markUnread')}</> : <><Eye className="w-4 h-4 text-gray-400" /> {t('contextMenu.markRead')}</>}
          </button>
          <button onClick={() => toggleStar(contextMenu.email.id, contextMenu.email.isStarred)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
            {contextMenu.email.isStarred ? <><StarOff className="w-4 h-4 text-gray-400" /> {t('contextMenu.removeStar')}</> : <><Star className="w-4 h-4 text-yellow-500" /> {t('contextMenu.addStar')}</>}
          </button>
          <div className="border-t border-gray-100 my-1" />
          {selectedFolder !== 'INBOX' && selectedFolder !== 'DRAFTS' && (
            <button onClick={() => moveToFolder(contextMenu.email.id, 'INBOX')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
              <Inbox className="w-4 h-4 text-gray-400" /> {t('contextMenu.moveToInbox')}
            </button>
          )}
          <button onClick={() => deleteEmail(contextMenu.email.id, selectedFolder === 'TRASH')}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3">
            <Trash2 className="w-4 h-4" /> {selectedFolder === 'TRASH' ? t('contextMenu.deletePermanently') : t('contextMenu.delete')}
          </button>
        </div>
      )}
    </div>
  );
}
