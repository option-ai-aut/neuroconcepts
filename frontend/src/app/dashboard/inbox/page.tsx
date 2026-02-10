'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useEnv } from '@/components/EnvProvider';
import { 
  RefreshCw, Search, Mail, Inbox, Send, FileText, Trash2, 
  Star, StarOff, MoreHorizontal, Reply, Forward,
  Paperclip, ChevronDown, Plus, AlertCircle, Check, X, Loader2,
  Eye, EyeOff, Copy, Pencil
} from 'lucide-react';
import useSWR from 'swr';
import { useGlobalState } from '@/context/GlobalStateContext';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

// Sanitize and normalize HTML email content
function sanitizeEmailHtml(html: string): string {
  // Remove scripts, iframes, forms
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
  
  return clean;
}

// Extract plain text from HTML
function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
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
  { id: 'INBOX', label: 'Posteingang', icon: Inbox },
  { id: 'SENT', label: 'Gesendet', icon: Send },
  { id: 'DRAFTS', label: 'Entwürfe', icon: FileText },
  { id: 'TRASH', label: 'Papierkorb', icon: Trash2 },
];

// Isolated Email Body Viewer Component
function EmailBodyViewer({ email, onContentClick }: { email: Email; onContentClick?: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(400);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const content = email.bodyHtml 
      ? sanitizeEmailHtml(email.bodyHtml)
      : `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${email.bodyText || ''}</pre>`;

    // Create isolated document with consistent styling
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #374151;
              background: white;
              overflow-x: hidden;
            }
            body {
              padding: 24px;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            a {
              color: #4f46e5;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            table {
              max-width: 100%;
              border-collapse: collapse;
            }
            td, th {
              padding: 8px;
            }
            pre, code {
              font-family: 'SF Mono', Monaco, 'Courier New', monospace;
              font-size: 13px;
              background: #f3f4f6;
              padding: 2px 6px;
              border-radius: 4px;
            }
            pre {
              padding: 12px;
              overflow-x: auto;
            }
            blockquote {
              margin: 16px 0;
              padding-left: 16px;
              border-left: 3px solid #e5e7eb;
              color: #6b7280;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #111827;
              margin-top: 24px;
              margin-bottom: 12px;
              font-weight: 600;
            }
            h1 { font-size: 24px; }
            h2 { font-size: 20px; }
            h3 { font-size: 18px; }
            p {
              margin: 12px 0;
            }
            ul, ol {
              padding-left: 24px;
              margin: 12px 0;
            }
            li {
              margin: 4px 0;
            }
            hr {
              border: none;
              border-top: 1px solid #e5e7eb;
              margin: 24px 0;
            }
            /* Override common email template styles */
            .ExternalClass, .ReadMsgBody {
              width: 100%;
            }
            /* Force consistent text rendering */
            * {
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    doc.close();

    // Auto-resize iframe to content height
    const resizeObserver = new ResizeObserver(() => {
      const body = iframe.contentDocument?.body;
      if (body) {
        const newHeight = Math.max(200, body.scrollHeight + 48);
        setIframeHeight(Math.min(newHeight, 800)); // Max 800px, then scroll
      }
    });

    if (iframe.contentDocument?.body) {
      resizeObserver.observe(iframe.contentDocument.body);
    }

    // Also check after images load
    const checkHeight = () => {
      const body = iframe.contentDocument?.body;
      if (body) {
        const newHeight = Math.max(200, body.scrollHeight + 48);
        setIframeHeight(Math.min(newHeight, 800));
      }
    };

    iframe.contentWindow?.addEventListener('load', checkHeight);
    setTimeout(checkHeight, 100);
    setTimeout(checkHeight, 500);

    // Add click listener inside iframe to propagate clicks to parent
    const handleIframeClick = () => {
      onContentClick?.();
    };
    iframe.contentDocument?.addEventListener('click', handleIframeClick);

    return () => {
      resizeObserver.disconnect();
      iframe.contentWindow?.removeEventListener('load', checkHeight);
      iframe.contentDocument?.removeEventListener('click', handleIframeClick);
    };
  }, [email.bodyHtml, email.bodyText, onContentClick]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full border-0"
      style={{ height: iframeHeight, minHeight: 200 }}
      sandbox="allow-same-origin"
      title="Email content"
    />
  );
}

export default function InboxPage() {
  const { apiUrl } = useEnv();
  const { openDrawer, updateEmailForm } = useGlobalState();
  
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    email: Email;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Fetch emails
  const { data: emailsData, mutate, isValidating } = useSWR<EmailsResponse>(
    `${apiUrl}/emails?folder=${selectedFolder}&search=${searchQuery}`,
    (url: string) => fetchWithAuth(url),
    { revalidateOnFocus: false }
  );

  // Auto-sync on first load if no emails
  useEffect(() => {
    if (emailsData && emailsData.emails.length === 0 && !syncing) {
      // Only auto-sync once per session
      const hasAutoSynced = sessionStorage.getItem('inbox-auto-synced');
      if (!hasAutoSynced) {
        sessionStorage.setItem('inbox-auto-synced', 'true');
        handleSync();
      }
    }
  }, [emailsData]);

  const emails = emailsData?.emails || [];
  const unreadCounts = emailsData?.unreadCounts || {};

  // Fetch selected email
  const { data: selectedEmailData, mutate: mutateSelectedEmail } = useSWR<{ email: Email }>(
    selectedEmailId ? `${apiUrl}/emails/${selectedEmailId}` : null,
    (url: string) => fetchWithAuth(url)
  );

  const selectedEmail = selectedEmailData?.email;

  // Sync emails from providers
  const handleSync = async () => {
    setSyncing(true);
    try {
      console.log('📧 Starting email sync...');
      const result = await fetchWithAuth(`${apiUrl}/emails/sync`, { method: 'POST' });
      console.log('📧 Sync result:', result);
      mutate();
    } catch (error) {
      console.error('Sync error:', error);
      alert('Fehler beim Synchronisieren. Bitte prüfe die Konsole.');
    } finally {
      setSyncing(false);
    }
  };

  // Mark as read/unread
  const toggleRead = async (emailId: string, isRead: boolean) => {
    try {
      await fetchWithAuth(`${apiUrl}/emails/${emailId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: !isRead })
      });
      mutate();
      mutateSelectedEmail();
    } catch (error) {
      console.error('Error toggling read status:', error);
    }
  };

  // Move to folder
  const moveToFolder = async (emailId: string, folder: string) => {
    try {
      await fetchWithAuth(`${apiUrl}/emails/${emailId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder })
      });
      mutate();
      setContextMenu(null);
      if (selectedEmailId === emailId) {
        setSelectedEmailId(null);
      }
    } catch (error) {
      console.error('Error moving email:', error);
    }
  };

  // Delete email
  const deleteEmail = async (emailId: string, permanent: boolean = false) => {
    try {
      await fetchWithAuth(`${apiUrl}/emails/${emailId}?permanent=${permanent}`, {
        method: 'DELETE'
      });
      mutate();
      setContextMenu(null);
      if (selectedEmailId === emailId) {
        setSelectedEmailId(null);
      }
    } catch (error) {
      console.error('Error deleting email:', error);
    }
  };

  // Toggle star
  const toggleStar = async (emailId: string, isStarred: boolean) => {
    try {
      await fetchWithAuth(`${apiUrl}/emails/${emailId}/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !isStarred })
      });
      mutate();
      mutateSelectedEmail();
      setContextMenu(null);
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, email: Email) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      email
    });
  };

  const handleReply = (email: Email) => {
    updateEmailForm({
      to: email.from,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      replyTo: email.id
    });
    openDrawer('EMAIL');
    setContextMenu(null);
  };

  const handleReplyAll = (email: Email) => {
    const allRecipients = [email.from, ...(email.to || []), ...(email.cc || [])].filter(Boolean);
    updateEmailForm({
      to: email.from,
      cc: allRecipients.filter(r => r !== email.from).join(', '),
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      replyTo: email.id
    });
    openDrawer('EMAIL');
    setContextMenu(null);
  };

  const handleForward = (email: Email) => {
    const forwardBody = `\n\n---------- Weitergeleitete Nachricht ----------\nVon: ${email.fromName || email.from} <${email.from}>\nDatum: ${new Date(email.receivedAt || email.sentAt || '').toLocaleString('de-DE')}\nBetreff: ${email.subject}\nAn: ${email.to?.join(', ')}\n\n${email.bodyText || ''}`;
    updateEmailForm({
      subject: `Fwd: ${email.subject}`,
      body: forwardBody
    });
    openDrawer('EMAIL');
    setContextMenu(null);
  };

  const handleCopyText = async (email: Email) => {
    const text = email.bodyText || email.bodyHtml?.replace(/<[^>]*>/g, '') || '';
    await navigator.clipboard.writeText(text);
    setContextMenu(null);
  };

  const handleEditDraft = (email: Email) => {
    updateEmailForm({
      to: email.to?.[0] || '',
      cc: email.cc?.join(', ') || '',
      bcc: email.bcc?.join(', ') || '',
      subject: email.subject || '',
      body: email.bodyText || '',
      bodyHtml: email.bodyHtml || '',
      leadId: email.leadId || '',
      draftId: email.id,
    });
    openDrawer('EMAIL');
    setContextMenu(null);
  };

  // Close context menu on click outside, escape, or scroll
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    const handleScroll = () => {
      setContextMenu(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenu]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString('de-DE', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    }
  };

  // Get preview text
  const getPreview = (email: Email) => {
    const text = email.bodyText || email.bodyHtml?.replace(/<[^>]*>/g, '') || '';
    return text.substring(0, 100).trim() + (text.length > 100 ? '...' : '');
  };

  return (
    <div className="h-full flex bg-gray-50">
      {/* Folder Sidebar */}
      <div className="w-52 bg-gray-100 border-r border-gray-200 flex flex-col">
        <div className="p-4">
          <button
            onClick={() => {
              updateEmailForm({});
              openDrawer('EMAIL');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Neue E-Mail
          </button>
        </div>

        <nav className="flex-1 px-2">
          {FOLDERS.map((folder) => {
            const Icon = folder.icon;
            const unread = unreadCounts[folder.id] || 0;
            const isActive = selectedFolder === folder.id;

            return (
              <button
                key={folder.id}
                onClick={() => {
                  setSelectedFolder(folder.id);
                  setSelectedEmailId(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm font-medium'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                  {folder.label}
                </div>
                {unread > 0 && (
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisiere...' : 'E-Mails abrufen'}
          </button>
        </div>
      </div>

      {/* Email List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="E-Mails durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {isValidating && emails.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Mail className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Keine E-Mails</p>
            </div>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                onClick={() => {
                  // If it's a draft, open it in the email composer
                  if (selectedFolder === 'DRAFTS') {
                    updateEmailForm({
                      to: email.to?.[0] || '',
                      cc: email.cc?.join(', ') || '',
                      bcc: email.bcc?.join(', ') || '',
                      subject: email.subject || '',
                      body: email.bodyText || '',
                      bodyHtml: email.bodyHtml || '',
                      leadId: email.leadId || '',
                      draftId: email.id, // Important: track which draft we're editing
                    });
                    openDrawer('EMAIL');
                  } else {
                    setSelectedEmailId(email.id);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, email)}
                className={`w-full text-left p-4 transition-all duration-150 ${
                  selectedEmailId === email.id
                    ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                    : email.isRead
                    ? 'bg-white hover:bg-gray-50 border-l-2 border-l-transparent'
                    : 'bg-gradient-to-r from-blue-50/80 to-white hover:from-blue-50 border-l-2 border-l-blue-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar with Star */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                      !email.isRead 
                        ? 'bg-indigo-100 text-indigo-600' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {(email.fromName || email.from).charAt(0).toUpperCase()}
                    </div>
                    {email.isStarred && (
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-current mt-1" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Sender & Time */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm truncate ${!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {email.fromName || email.from.split('@')[0]}
                      </span>
                      <span className="text-xs text-gray-400 ml-2 shrink-0 tabular-nums">
                        {formatDate(email.receivedAt || email.sentAt || '')}
                      </span>
                    </div>
                    
                    {/* Subject */}
                    <div className={`text-sm truncate mb-1 ${!email.isRead ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                      {email.subject || '(Kein Betreff)'}
                    </div>
                    
                    {/* Preview */}
                    <div className="text-xs text-gray-400 truncate leading-relaxed">
                      {getPreview(email)}
                    </div>
                    
                    {/* Indicators */}
                    {(email.hasAttachments || email.leadId || email.providerData?.aiGenerated) && (
                      <div className="flex items-center gap-2 mt-2">
                        {email.providerData?.aiGenerated && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">
                            KI-generiert
                          </span>
                        )}
                        {email.hasAttachments && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Paperclip className="w-3 h-3" />
                          </span>
                        )}
                        {email.leadId && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                            Lead
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Email Detail */}
      <div className="flex-1 flex flex-col bg-white" onClick={() => setContextMenu(null)}>
        {selectedEmail ? (
          <>
            {/* Email Header */}
            <div className="p-6 border-b border-gray-100 bg-white">
              {/* Subject & Actions */}
              <div className="flex items-start justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900 leading-tight pr-4">
                  {selectedEmail.subject || '(Kein Betreff)'}
                </h2>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleStar(selectedEmail.id, selectedEmail.isStarred)}
                    className={`p-2 rounded-lg transition-colors ${
                      selectedEmail.isStarred 
                        ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50' 
                        : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                    }`}
                    title={selectedEmail.isStarred ? 'Markierung entfernen' : 'Mit Stern markieren'}
                  >
                    <Star className={`w-4 h-4 ${selectedEmail.isStarred ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => toggleRead(selectedEmail.id, selectedEmail.isRead)}
                    className={`p-2 rounded-lg transition-colors ${
                      selectedEmail.isRead 
                        ? 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50' 
                        : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'
                    }`}
                    title={selectedEmail.isRead ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
                  >
                    {selectedEmail.isRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => moveToFolder(selectedEmail.id, selectedFolder === 'TRASH' ? 'INBOX' : 'TRASH')}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={selectedFolder === 'TRASH' ? 'Wiederherstellen' : 'Löschen'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sender Info */}
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {(selectedEmail.fromName || selectedEmail.from).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">
                      {selectedEmail.fromName || selectedEmail.from.split('@')[0]}
                    </span>
                    <span className="text-sm text-gray-400">
                      &lt;{selectedEmail.from}&gt;
                    </span>
                    {selectedEmail.leadId && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Lead
                      </span>
                    )}
                    {selectedEmail.providerData?.aiGenerated && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
                        KI-generiert
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    An: {selectedEmail.to.join(', ')}
                  </div>
                </div>
                <div className="text-sm text-gray-400 tabular-nums shrink-0">
                  {new Date(selectedEmail.receivedAt || selectedEmail.sentAt || '').toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            {/* Email Body - Isolated iframe for consistent rendering */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <EmailBodyViewer email={selectedEmail} onContentClick={() => setContextMenu(null)} />
              </div>
            </div>

            {/* Email Actions */}
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => {
                  updateEmailForm({
                    to: selectedEmail.from,
                    subject: `Re: ${selectedEmail.subject}`,
                    replyTo: selectedEmail.id
                  });
                  openDrawer('EMAIL');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Reply className="w-4 h-4" />
                Antworten
              </button>
              <button
                onClick={() => {
                  updateEmailForm({
                    subject: `Fwd: ${selectedEmail.subject}`,
                    body: `\n\n---------- Weitergeleitete Nachricht ----------\nVon: ${selectedEmail.from}\nDatum: ${new Date(selectedEmail.receivedAt || '').toLocaleString('de-DE')}\nBetreff: ${selectedEmail.subject}\n\n${selectedEmail.bodyText || ''}`
                  });
                  openDrawer('EMAIL');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Forward className="w-4 h-4" />
                Weiterleiten
              </button>
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

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            maxHeight: 'calc(100vh - 20px)',
            overflowY: 'auto'
          }}
        >
          {/* Reply options - not for drafts or sent */}
          {selectedFolder !== 'DRAFTS' && selectedFolder !== 'SENT' && (
            <>
              <button
                onClick={() => handleReply(contextMenu.email)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Reply className="w-4 h-4 text-gray-400" />
                Antworten
              </button>
              <button
                onClick={() => handleReplyAll(contextMenu.email)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Reply className="w-4 h-4 text-gray-400 scale-x-[-1]" />
                Allen antworten
              </button>
            </>
          )}

          {/* Forward - not for drafts */}
          {selectedFolder !== 'DRAFTS' && (
            <button
              onClick={() => handleForward(contextMenu.email)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
            >
              <Forward className="w-4 h-4 text-gray-400" />
              Weiterleiten
            </button>
          )}

          {/* Edit draft */}
          {selectedFolder === 'DRAFTS' && (
            <button
              onClick={() => handleEditDraft(contextMenu.email)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
            >
              <Pencil className="w-4 h-4 text-gray-400" />
              Bearbeiten
            </button>
          )}

          <div className="border-t border-gray-100 my-1" />

          {/* Mark as read/unread */}
          <button
            onClick={() => {
              toggleRead(contextMenu.email.id, contextMenu.email.isRead);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
          >
            {contextMenu.email.isRead ? (
              <>
                <EyeOff className="w-4 h-4 text-gray-400" />
                Als ungelesen markieren
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-gray-400" />
                Als gelesen markieren
              </>
            )}
          </button>

          {/* Star/Unstar */}
          <button
            onClick={() => toggleStar(contextMenu.email.id, contextMenu.email.isStarred)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
          >
            {contextMenu.email.isStarred ? (
              <>
                <StarOff className="w-4 h-4 text-gray-400" />
                Markierung entfernen
              </>
            ) : (
              <>
                <Star className="w-4 h-4 text-yellow-500" />
                Mit Stern markieren
              </>
            )}
          </button>

          <div className="border-t border-gray-100 my-1" />

          {/* Move to folder */}
          {selectedFolder !== 'INBOX' && selectedFolder !== 'DRAFTS' && (
            <button
              onClick={() => moveToFolder(contextMenu.email.id, 'INBOX')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
            >
              <Inbox className="w-4 h-4 text-gray-400" />
              In Posteingang verschieben
            </button>
          )}

          {selectedFolder !== 'SPAM' && selectedFolder !== 'DRAFTS' && (
            <button
              onClick={() => moveToFolder(contextMenu.email.id, 'SPAM')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
            >
              <AlertCircle className="w-4 h-4 text-gray-400" />
              Als Spam markieren
            </button>
          )}

          <div className="border-t border-gray-100 my-1" />

          {/* Copy text */}
          <button
            onClick={() => handleCopyText(contextMenu.email)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
          >
            <Copy className="w-4 h-4 text-gray-400" />
            Text kopieren
          </button>

          <div className="border-t border-gray-100 my-1" />

          {/* Delete */}
          {selectedFolder === 'TRASH' ? (
            <button
              onClick={() => deleteEmail(contextMenu.email.id, true)}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
            >
              <Trash2 className="w-4 h-4" />
              Endgültig löschen
            </button>
          ) : (
            <button
              onClick={() => deleteEmail(contextMenu.email.id, false)}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
            >
              <Trash2 className="w-4 h-4" />
              Löschen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
