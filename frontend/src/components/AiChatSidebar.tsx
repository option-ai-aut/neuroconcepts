'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, Paperclip, FileText, RotateCcw, X, Image as ImageIcon, AlertCircle, Loader2, Square } from 'lucide-react';
import NextImage from 'next/image';
import { usePathname } from 'next/navigation';
import { useGlobalState } from '@/context/GlobalStateContext';
import { getRuntimeConfig } from '@/components/EnvProvider';
import { useRealtimeEvents } from '@/components/RealtimeEventProvider';
import { fetchAuthSession } from 'aws-amplify/auth';

// Helper to get API URL without trailing slash
const getApiUrl = () => {
  const config = getRuntimeConfig();
  const url = config.apiUrl || '';
  return url.replace(/\/+$/, '');
};

// Get Lambda Function URL for streaming (bypasses API GW 29s timeout)
// Falls back to regular API URL if Function URL not configured

// Get auth headers for API calls
const getAuthHeaders = async (): Promise<HeadersInit> => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  } catch (error) {
    console.error('Error fetching auth session:', error);
    return { 'Content-Type': 'application/json' };
  }
};

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  preview?: string; // Base64 preview for images
  file: File;
}

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  isAction?: boolean;
  isExecutingTools?: boolean;
  status?: 'thinking' | 'streaming' | 'done' | 'error';
  attachments?: { name: string; type: string }[];
  toolsUsed?: string[];
}

interface MivoAction {
  id: string;
  leadId?: string;
  propertyId?: string;
  type: string;
  question: string;
  options?: Array<{ id: string; label: string }>;
  allowCustom: boolean;
  status: string;
  createdAt: string;
}

// Human-readable tool names with icons
const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  // Team & Contacts
  get_team_members: { label: 'Team durchsucht', icon: '👥' },
  search_contacts: { label: 'Kontakte durchsucht', icon: '🔍' },
  
  // Leads
  create_lead: { label: 'Lead erstellt', icon: '✨' },
  get_leads: { label: 'Leads geladen', icon: '📋' },
  get_lead: { label: 'Lead geladen', icon: '👤' },
  update_lead: { label: 'Lead aktualisiert', icon: '✏️' },
  delete_lead: { label: 'Lead gelöscht', icon: '🗑️' },
  delete_all_leads: { label: 'Alle Leads gelöscht', icon: '🗑️' },
  get_lead_statistics: { label: 'Statistiken geladen', icon: '📊' },
  
  // Properties
  create_property: { label: 'Objekt erstellt', icon: '🏠' },
  get_properties: { label: 'Objekte geladen', icon: '🏘️' },
  get_property: { label: 'Objekt geladen', icon: '🏠' },
  update_property: { label: 'Objekt aktualisiert', icon: '✏️' },
  delete_property: { label: 'Objekt gelöscht', icon: '🗑️' },
  delete_all_properties: { label: 'Alle Objekte gelöscht', icon: '🗑️' },
  search_properties: { label: 'Objekte durchsucht', icon: '🔍' },
  get_property_statistics: { label: 'Statistiken geladen', icon: '📊' },
  
  // Property Images
  upload_images_to_property: { label: 'Bilder hochgeladen', icon: '📸' },
  get_property_images: { label: 'Bilder geladen', icon: '🖼️' },
  delete_property_image: { label: 'Bild gelöscht', icon: '🗑️' },
  delete_all_property_images: { label: 'Alle Bilder gelöscht', icon: '🗑️' },
  move_image_to_floorplan: { label: 'Als Grundriss markiert', icon: '📐' },
  
  // E-Mails
  get_emails: { label: 'E-Mails geladen', icon: '📬' },
  get_email: { label: 'E-Mail geladen', icon: '📧' },
  send_email: { label: 'E-Mail gesendet', icon: '📤' },
  reply_to_email: { label: 'Antwort gesendet', icon: '↩️' },
  draft_email: { label: 'Entwurf erstellt', icon: '📝' },
  get_email_templates: { label: 'Vorlagen geladen', icon: '📋' },
  
  // Calendar
  get_calendar_events: { label: 'Termine geladen', icon: '📅' },
  create_calendar_event: { label: 'Termin erstellt', icon: '📆' },
  update_calendar_event: { label: 'Termin aktualisiert', icon: '✏️' },
  delete_calendar_event: { label: 'Termin gelöscht', icon: '🗑️' },
  get_calendar_availability: { label: 'Verfügbarkeit geprüft', icon: '⏰' },
  
  // Memory & Context
  search_chat_history: { label: 'Verlauf durchsucht', icon: '🔍' },
  get_conversation_context: { label: 'Kontext geladen', icon: '💭' },
  get_memory_summary: { label: 'Gedächtnis abgerufen', icon: '🧠' },
  get_last_conversation: { label: 'Letzte Unterhaltung', icon: '💬' },
  
  // Exposés & Vorlagen — für den User ist beides "Vorlage" / "Exposé"
  get_exposes: { label: 'Exposés geladen', icon: '📑' },
  create_expose_from_template: { label: 'Exposé erstellt', icon: '✨' },
  create_full_expose: { label: 'Vorlage aufgebaut', icon: '✨' },
  delete_expose: { label: 'Exposé gelöscht', icon: '🗑️' },
  delete_all_exposes: { label: 'Alle Exposés gelöscht', icon: '🗑️' },
  get_expose_status: { label: 'Status geprüft', icon: '📊' },
  set_expose_status: { label: 'Status geändert', icon: '✏️' },
  set_expose_theme: { label: 'Design geändert', icon: '🎨' },
  generate_expose_pdf: { label: 'PDF generiert', icon: '📄' },
  generate_expose_text: { label: 'Text generiert', icon: '✍️' },

  create_expose_block: { label: 'Block hinzugefügt', icon: '➕' },
  update_expose_block: { label: 'Block aktualisiert', icon: '✏️' },
  delete_expose_block: { label: 'Block gelöscht', icon: '🗑️' },
  clear_expose_blocks: { label: 'Blöcke gelöscht', icon: '🗑️' },
  reorder_expose_blocks: { label: 'Blöcke sortiert', icon: '↕️' },

  create_expose_template: { label: 'Vorlage erstellt', icon: '✨' },
  get_expose_templates: { label: 'Vorlagen geprüft', icon: '📋' },
  get_template: { label: 'Vorlage geladen', icon: '📋' },
  update_template: { label: 'Vorlage aktualisiert', icon: '✏️' },
  update_expose_template: { label: 'Vorlage aktualisiert', icon: '✏️' },
  delete_expose_template: { label: 'Vorlage gelöscht', icon: '🗑️' },

  // Team Chat
  get_team_channels: { label: 'Kanäle geladen', icon: '💬' },
  send_team_message: { label: 'Nachricht gesendet', icon: '📤' },
  get_channel_messages: { label: 'Nachrichten geladen', icon: '💬' },
  
  // Dashboard
  get_dashboard_stats: { label: 'Dashboard geladen', icon: '📊' },
  
  // Image Studio
  virtual_staging: { label: 'Virtual Staging', icon: '🎨' },
  add_video_to_property: { label: 'Video hinzugefügt', icon: '🎬' },
  set_virtual_tour: { label: 'Tour gesetzt', icon: '🔄' },

  // Company & misc
  get_company_info: { label: 'Firmendaten geladen', icon: '🏢' },
  semantic_search: { label: 'Suche läuft', icon: '🔍' },
  upload_documents_to_lead: { label: 'Dokument hochgeladen', icon: '📎' },

  // Export
  export_data: { label: 'Export erstellt', icon: '📥' },

  // Email Signature
  get_email_signature: { label: 'Signatur geladen', icon: '✍️' },
  update_email_signature: { label: 'Signatur gespeichert', icon: '✍️' },
};

const getToolLabel = (tool: string): { label: string; icon: string } => {
  return TOOL_LABELS[tool] || { label: tool.replace(/_/g, ' '), icon: '⚡' };
};

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
    .replace(/^### (.+)$/gm, '<div class="font-semibold text-sm mt-2 mb-1">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="font-bold text-sm mt-2 mb-1">$1</div>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-1.5 ml-1"><span class="text-gray-400 shrink-0">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, (_, p1, offset, str) => {
      const linesBefore = str.substring(0, offset).split('\n');
      const num = linesBefore.filter((l: string) => /^\d+\./.test(l)).length + 1;
      return `<div class="flex gap-1.5 ml-1"><span class="text-gray-400 shrink-0 tabular-nums">${num}.</span><span>${p1}</span></div>`;
    });
}

// Contextual tips that show once per context
interface ContextTip {
  id: string;
  context: string; // What triggers this tip
  message: string;
}

const CONTEXT_TIPS: ContextTip[] = [
  { id: 'expose-editor-template', context: 'template', message: 'Ich kann dir beim Erstellen der Vorlage helfen. Sag mir einfach was du brauchst!' },
  { id: 'expose-editor-expose', context: 'expose', message: 'Ich kann Blöcke hinzufügen, Texte generieren oder das komplette Exposé erstellen.' },
  { id: 'crm-leads', context: 'crm-leads', message: 'Frag mich nach Lead-Statistiken oder lass mich einen neuen Lead anlegen.' },
  { id: 'crm-properties', context: 'crm-properties', message: 'Ich kann Objekte suchen, anlegen oder Exposés dafür erstellen.' },
  { id: 'inbox', context: 'inbox', message: 'Ich kann E-Mails zusammenfassen, beantworten oder Leads daraus erstellen.' },
];

// Map pathname to human-readable page context for Mivo
function getPageContext(pathname: string, exposeCtx?: { isTemplate?: boolean; templateId?: string; exposeId?: string } | null): string {
  const parts: string[] = [];

  if (pathname.startsWith('/dashboard/inbox')) parts.push('Posteingang (E-Mails)');
  else if (pathname.startsWith('/dashboard/crm/leads/') && pathname.split('/').length > 4) parts.push(`Lead-Detailseite (Lead-ID: ${pathname.split('/')[4]})`);
  else if (pathname.startsWith('/dashboard/crm/leads')) parts.push('CRM – Leads-Übersicht');
  else if (pathname.startsWith('/dashboard/crm/properties/') && pathname.split('/').length > 4) parts.push(`Objekt-Detailseite (Objekt-ID: ${pathname.split('/')[4]})`);
  else if (pathname.startsWith('/dashboard/crm/properties')) parts.push('CRM – Objekte-Übersicht');
  else if (pathname.startsWith('/dashboard/calendar')) parts.push('Kalender');
  else if (pathname.startsWith('/dashboard/exposes')) parts.push('Exposés & Vorlagen');
  else if (pathname.startsWith('/dashboard/assistant')) parts.push('Team Chat');
  else if (pathname.startsWith('/dashboard/image-studio')) parts.push('KI-Bildstudio');
  else if (pathname.startsWith('/dashboard/settings')) parts.push('Einstellungen');
  else if (pathname.startsWith('/dashboard/activities')) parts.push('Aktivitäten');
  else if (pathname === '/dashboard') parts.push('Dashboard-Übersicht');

  if (exposeCtx?.isTemplate && exposeCtx.templateId) parts.push(`Exposé-Vorlage wird gerade im Editor bearbeitet (templateId: ${exposeCtx.templateId})`);
  else if (!exposeCtx?.isTemplate && exposeCtx?.exposeId) parts.push(`Exposé wird gerade im Editor bearbeitet (exposeId: ${exposeCtx.exposeId})`);

  return parts.join(' – ');
}

interface AiChatSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

const mkId = () => crypto.randomUUID?.() || Math.random().toString(36).substring(2, 11);

export default function AiChatSidebar({ mobile, onClose }: AiChatSidebarProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const pathname = usePathname();
  const { aiChatDraft, setAiChatDraft, activeExposeContext, triggerExposeRefresh, notifyAiAction, aiActionPerformed } = useGlobalState();
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [activeTip, setActiveTip] = useState<ContextTip | null>(null);
  const [tipVisible, setTipVisible] = useState(false);
  const tipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [pendingActions, setPendingActions] = useState<MivoAction[]>([]);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSubmittingRef = useRef(false); // atomic guard — no stale-closure issue unlike React state
  const lastSentMessageRef = useRef<string>('');
  const messagesRef = useRef<Message[]>([]); // mirrors messages state for sync reads in event handlers
  const [removingMsgId, setRemovingMsgId] = useState<string | null>(null);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Get shown tips from localStorage
  const getShownTips = useCallback((): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('mivo-shown-tips') || '[]');
    } catch {
      return [];
    }
  }, []);

  // Mark tip as shown
  const markTipAsShown = useCallback((tipId: string) => {
    if (typeof window === 'undefined') return;
    const shown = getShownTips();
    if (!shown.includes(tipId)) {
      localStorage.setItem('mivo-shown-tips', JSON.stringify([...shown, tipId]));
    }
  }, [getShownTips]);

  // Show tip with animation
  const showTip = useCallback((tip: ContextTip) => {
    const shownTips = getShownTips();
    if (shownTips.includes(tip.id)) return;

    setActiveTip(tip);
    // Small delay for animation
    setTimeout(() => setTipVisible(true), 50);
    markTipAsShown(tip.id);

    // Auto-hide after 10 seconds
    if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
    tipTimeoutRef.current = setTimeout(() => {
      setTipVisible(false);
      setTimeout(() => setActiveTip(null), 300);
    }, 10000);
  }, [getShownTips, markTipAsShown]);

  // Dismiss tip manually
  const dismissTip = useCallback(() => {
    if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
    setTipVisible(false);
    setTimeout(() => setActiveTip(null), 300);
  }, []);

  // Load pending Mivo actions
  const loadPendingActions = useCallback(async () => {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      // Config not ready yet, will retry
      return;
    }
    
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`${apiUrl}/mivo/actions?status=PENDING`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setPendingActions(data.actions || []);
      }
    } catch (error) {
      // Silently ignore fetch errors (e.g., when backend is not available)
      console.warn('Could not load pending actions:', error);
    }
  }, []);

  // Respond to a Mivo action
  const handleRespondToAction = async (actionId: string, response: string) => {
    const apiUrl = getApiUrl();
    if (!apiUrl) return;
    
    setRespondingTo(actionId);
    try {
      const authHeaders = await getAuthHeaders();

      const res = await fetch(`${apiUrl}/mivo/actions/${actionId}/respond`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ response }),
      });

      if (res.ok) {
        // Remove from local state
        setPendingActions(prev => prev.filter(a => a.id !== actionId));
        // Notify that an action was performed
        notifyAiAction();
        // Add confirmation message to chat
        const action = pendingActions.find(a => a.id === actionId);
        const option = action?.options?.find(o => o.id === response);
        setMessages(prev => [...prev, {
          id: mkId(),
          role: 'ASSISTANT',
          content: `Erledigt: ${option?.label || response}`,
          status: 'done',
        }]);
      }
    } catch (error) {
      console.error('Error responding to action:', error);
    } finally {
      setRespondingTo(null);
    }
  };

  // SSE: reload pending actions when realtime events arrive
  const { eventVersion } = useRealtimeEvents();

  // Load pending actions on mount, when AI performs actions, and when SSE events arrive
  useEffect(() => {
    loadPendingActions();
  }, [loadPendingActions]);

  useEffect(() => {
    if (aiActionPerformed) {
      loadPendingActions();
    }
  }, [aiActionPerformed, loadPendingActions]);

  // Re-fetch on SSE event (no polling needed)
  useEffect(() => {
    if (eventVersion > 0) {
      loadPendingActions();
    }
  }, [eventVersion, loadPendingActions]);

  // Determine current context and show relevant tip
  useEffect(() => {
    let contextKey = '';
    
    if (activeExposeContext) {
      contextKey = activeExposeContext.isTemplate ? 'template' : 'expose';
    }
    // Could add more context detection here based on URL, etc.

    if (contextKey) {
      const tip = CONTEXT_TIPS.find(t => t.context === contextKey);
      if (tip) {
        // Small delay to let the UI settle
        setTimeout(() => showTip(tip), 500);
      }
    }

    return () => {
      if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
    };
  }, [activeExposeContext, showTip]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;

    const loadHistory = async () => {
      try {
        const apiUrl = getApiUrl();
        if (!apiUrl) {
          // Retry after a short delay if config not ready
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(loadHistory, 200);
          }
          return;
        }

        // Load history - userId comes from auth token on backend
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${apiUrl}/chat/history`, {
          headers: authHeaders
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setMessages(data.map((m: any) => ({ ...m, id: m.id || mkId(), status: 'done' as const })));
          } else {
            console.log('ℹ️ Keine Chat-Historie gefunden');
          }
        } else {
          console.warn('⚠️ Chat-Historie konnte nicht geladen werden:', res.status);
        }
      } catch (error) {
        console.warn('⚠️ Backend nicht erreichbar, versuche erneut...', error);
        // Retry if backend not available yet
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(loadHistory, 500);
        }
      }
    };

    loadHistory();
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleNewChat = async () => {
    if (!confirm('Chat-Verlauf archivieren?\n\nMivo behält sein Gedächtnis und kann bei Bedarf auf archivierte Gespräche zugreifen. Archivierte Chats werden nach 30 Tagen gelöscht.')) return;
    
    try {
      const apiUrl = getApiUrl();
      const authHeaders = await getAuthHeaders();
      // userId comes from auth token on backend
      const res = await fetch(`${apiUrl}/chat/new`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({})
      });
      
      if (res.ok) {
        setMessages([]);
        console.log('🆕 Chat archiviert, neuer Chat gestartet');
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  };

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = ''; // Reset input
  };

  const processFiles = async (files: File[]) => {
    const newFiles: UploadedFile[] = [];
    
    for (const file of files) {
      const uploadedFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        file: file,
      };
      
      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        uploadedFile.preview = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }
      
      newFiles.push(uploadedFile);
    }
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  }, []);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiChatDraft.trim() && uploadedFiles.length === 0) return;

    // Use a ref-based guard to prevent double-submission (avoids stale-closure issue with React state)
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const attachments = uploadedFiles.map(f => ({ name: f.name, type: f.type }));
    const userMsg: Message = { 
      id: mkId(),
      role: 'USER', 
      content: aiChatDraft || (uploadedFiles.length > 0 ? `[${uploadedFiles.length} Datei(en) angehängt]` : ''),
      attachments: attachments.length > 0 ? attachments : undefined,
      status: 'done',
    };
    setMessages(prev => [...prev, userMsg]);
    
    // Store files for upload before clearing
    const filesToUpload = [...uploadedFiles];
    lastSentMessageRef.current = aiChatDraft;
    setAiChatDraft('');
    setUploadedFiles([]);
    setIsLoading(true);
    
    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const apiUrl = getApiUrl();
      
      // Check if we have an active expose/template context - use specific endpoint
      const hasExposeContext = activeExposeContext?.exposeId && !activeExposeContext.isTemplate;
      const hasTemplateContext = activeExposeContext?.templateId && activeExposeContext.isTemplate;
      
      if (hasExposeContext || hasTemplateContext) {
        setMessages(prev => [...prev, { id: mkId(), role: 'SYSTEM', content: 'Mivo führt Aktion aus...', isAction: true }]);
        
        // Determine endpoint — use API Gateway
        const baseUrl = getApiUrl();
        const endpoint = hasTemplateContext 
          ? `${baseUrl}/templates/${activeExposeContext.templateId}/chat`
          : `${baseUrl}/exposes/${activeExposeContext.exposeId}/chat`;
        
        const authHeaders = await getAuthHeaders();
        const exposePageContext = getPageContext(pathname, activeExposeContext);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            message: userMsg.content,
            history: messages.filter(m => !m.isAction).slice(-10),
            pageContext: exposePageContext || undefined,
          }),
          signal: abortController.signal,
        });
        const data = await res.json().catch(() => ({ response: 'Fehler bei der Verbindung zu Mivo.' }));
        
        setMessages(prev => [
          ...prev.filter(m => !m.isAction), 
          { id: mkId(), role: 'ASSISTANT', content: data.response || data.text || 'Mivo konnte nicht antworten.', status: 'done' }
        ]);
        
        if (data.actionsPerformed && data.actionsPerformed.length > 0) {
          triggerExposeRefresh();
        }
        isSubmittingRef.current = false;
        setIsLoading(false);
        lastSentMessageRef.current = '';
      } else {
        // Use Lambda Function URL for streaming (no 29s API Gateway timeout)
        // Falls back to regular API URL if streamUrl not configured
        const runtimeCfg = getRuntimeConfig();
        const streamBaseUrl = (runtimeCfg.streamUrl || runtimeCfg.apiUrl || '').replace(/\/+$/, '');
        const apiBaseUrl = getApiUrl();
        const authHeaders = await getAuthHeaders();
        
        // Use FormData if we have files, otherwise JSON
        let res: Response;
        if (filesToUpload.length > 0) {
          const formData = new FormData();
          formData.append('message', userMsg.content);
          const pageContext = getPageContext(pathname, activeExposeContext);
          if (pageContext) formData.append('pageContext', pageContext);
          filesToUpload.forEach((f, idx) => {
            formData.append('files', f.file);
          });
          
          res = await fetch(`${streamBaseUrl}/chat/stream`, {
            method: 'POST',
            headers: {
              'Authorization': (authHeaders as Record<string, string>)['Authorization'] || '',
            },
            body: formData,
            signal: abortController.signal,
          });
        } else {
          const pageContext = getPageContext(pathname, activeExposeContext);
          res = await fetch(`${streamBaseUrl}/chat/stream`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              message: userMsg.content,
              pageContext: pageContext || undefined,
            }),
            signal: abortController.signal,
          });
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server-Fehler (${res.status})`);
        }

        if (!res.body) throw new Error('No response body');

        // Bail out if stop was pressed before streaming started
        if (abortController.signal.aborted) return;

        const assistantMsgId = mkId();
        setMessages(prev => [...prev, { id: assistantMsgId, role: 'ASSISTANT', content: '', status: 'thinking' }]);
        setIsLoading(false);
        setIsStreaming(true);
        // NOTE: lastSentMessageRef is cleared only in the finally block on success,
        // so handleStop can always restore the user's text even during streaming.

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let hadFunctionCalls = false;
        let toolsUsed: string[] = [];
        let streamTimeout: ReturnType<typeof setTimeout> | null = null;
        const tick = () => new Promise<void>(r => setTimeout(r, 0));

        const resetStreamTimeout = () => {
          if (streamTimeout) clearTimeout(streamTimeout);
          streamTimeout = setTimeout(() => { abortControllerRef.current?.abort(); }, 45000);
        };
        resetStreamTimeout();

        const updateMsg = (patch: Partial<Message>) => {
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, ...patch } : m));
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            resetStreamTimeout();

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            // Collect all events from this chunk first
            const events: any[] = [];
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try { events.push(JSON.parse(line.slice(6))); } catch { /* skip */ }
            }

            // Process events with micro-delays so React can render between them
            let fullText = '';
            for (const data of events) {
              if (data.heartbeat) continue;
              
              if (data.toolsUsed && data.toolsUsed.length > 0) {
                toolsUsed = data.toolsUsed;
                updateMsg({ toolsUsed: [...toolsUsed], isExecutingTools: true, status: 'thinking' });
                await tick();
                await new Promise(r => setTimeout(r, 150));
              }
              
              if (data.error) {
                updateMsg({
                  content: data.error === 'AI Error' ? 'Fehler bei der Verbindung zu Mivo.' : data.error,
                  status: 'error', isExecutingTools: false,
                });
                break;
              }
              
              if (data.done) {
                if (data.hadFunctionCalls) hadFunctionCalls = true;
                updateMsg({
                  isExecutingTools: false, status: 'done',
                  toolsUsed: data.toolsUsed?.length > 0 ? data.toolsUsed : toolsUsed,
                });
                break;
              }
              
              if (data.chunk) {
                fullText += data.chunk;
              }
            }

            // Animate text appearance — type out in word-sized chunks
            if (fullText) {
              const words = fullText.split(/(\s+)/);
              let typed = '';
              for (let i = 0; i < words.length; i++) {
                // Stop animation immediately if aborted
                if (abortController.signal.aborted) break;
                typed += words[i];
                if (i % 3 === 2 || i === words.length - 1) {
                  const t = typed;
                  const isLast = i === words.length - 1;
                  setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
                    ...m, content: (m.content || '') + t, status: isLast ? 'done' as const : 'streaming' as const,
                  } : m));
                  typed = '';
                  await tick();
                  if (!isLast) await new Promise(r => setTimeout(r, 18));
                }
              }
            }
          }
        } finally {
          if (streamTimeout) clearTimeout(streamTimeout);
          isSubmittingRef.current = false;
          // Always reset streaming state — prevents isStreaming getting stuck when
          // handleStop fires just before setIsStreaming(true) was called.
          setIsStreaming(false);
          if (!abortController.signal.aborted) {
            lastSentMessageRef.current = ''; // clear only on normal completion
            setMessages(prev => prev.map(m => m.status === 'streaming' ? { ...m, status: 'done' as const } : m));
          }
        }

        if (!abortController.signal.aborted && hadFunctionCalls) {
          notifyAiAction();
        }
      }
    } catch (error: any) {
      isSubmittingRef.current = false;
      if (error.name === 'AbortError') return;
      console.error('Chat error:', error);
      const errMsg = error instanceof Error && error.message === 'Failed to fetch'
        ? 'Verbindung zum Server fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.'
        : 'Fehler bei der Verbindung zu Mivo.';
      setMessages(prev => [...prev, { id: mkId(), role: 'ASSISTANT', content: errMsg, status: 'error' }]);
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isSubmittingRef.current = false;
    lastSentMessageRef.current = '';
    setIsLoading(false);
    setIsStreaming(false);

    // The user message is already persisted server-side the moment the request
    // arrives, so we must NOT pretend it was "unsent" (that caused duplicates
    // when the user re-sent the restored draft).  Instead: keep the user
    // message, discard action indicators and incomplete assistant messages.
    // Partial responses with visible text are kept and marked done.
    setMessages(prev => prev
      .filter(m => !m.isAction)
      .map(m => {
        if (m.role === 'ASSISTANT' && m.status !== 'done') {
          return m.content?.trim() ? { ...m, status: 'done' as const } : null;
        }
        return m;
      })
      .filter(Boolean) as Message[]
    );
  };

  return (
    <div 
      className={`flex flex-col h-full bg-white relative ${
        mobile 
          ? 'w-full' 
          : 'w-80 z-20 shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.1)]'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-gray-900/10 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center backdrop-blur-[1px]">
          <div className="bg-white rounded-xl shadow-lg px-6 py-4 text-center">
            <Paperclip className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-800">Dateien hier ablegen</p>
            <p className="text-xs text-gray-500 mt-0.5">Bilder, PDFs, Dokumente</p>
          </div>
        </div>
      )}
      <div className={`px-4 flex items-center justify-between bg-white shrink-0 ${mobile ? 'h-14 pt-[env(safe-area-inset-top)]' : 'h-12'}`}>
        <div className="flex items-center space-x-2">
          <NextImage src="/logo-icon-only.png" alt="Mivo" width={28} height={28} />
          <span className="text-sm font-bold text-gray-900">Mivo</span>
          <span className="text-[9px] font-medium text-blue-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 leading-none">KI</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleNewChat}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Chat archivieren"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {mobile && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3 bg-white" style={{ overscrollBehavior: 'contain' }}
        onScroll={(e) => {
          const el = e.currentTarget;
          isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {/* Pending Mivo Actions */}
        {pendingActions.length > 0 && (
          <div className="space-y-3 mb-4">
            {pendingActions.map((action) => (
              <div key={action.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-800">{action.question}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {action.options?.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleRespondToAction(action.id, option.id)}
                      disabled={respondingTo === action.id}
                      className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {respondingTo === action.id && (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {messages.length === 0 && pendingActions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-3">
            <NextImage src="/logo-icon-only.png" alt="Mivo" width={48} height={48} className="opacity-40" />
            <div>
              <p className="font-medium text-gray-600">Wie kann ich helfen?</p>
              <p className="text-xs mt-1">
                {activeExposeContext 
                  ? 'Sag mir z.B. "Erstelle ein professionelles Exposé" oder "Füge einen Textblock hinzu"'
                  : 'Frag mich nach Leads, Objekten oder E-Mails.'
                }
              </p>
              <div className="mt-4 mx-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Mivo ist ein KI-Assistent. Deine Nachrichten werden 
                  zur Verarbeitung an OpenAI übermittelt. Alle Interaktionen werden 
                  protokolliert. Antworten können fehlerhaft sein — bitte prüfe 
                  wichtige Angaben.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {messages.map((msg) => {
          if (msg.isAction) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-gray-100 text-gray-900 rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-ping"></div>
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-ping" style={{ animationDelay: '75ms' }}></div>
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-ping" style={{ animationDelay: '150ms' }}></div>
                </div>
              </div>
            );
          }

          if (msg.role === 'SYSTEM') {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-gray-100 text-gray-500 rounded-full px-3 py-1.5 text-[10px] font-medium">
                  {msg.content}
                </div>
              </div>
            );
          }
          
          return (
            <div key={msg.id} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'} transition-all duration-300 ${removingMsgId === msg.id ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
              <div className={`max-w-[92%] rounded-lg p-3 text-sm break-words ${
                msg.role === 'USER' 
                  ? 'bg-gray-900 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none'
              }`}>
                {/* Status indicator for thinking/processing */}
                {msg.role === 'ASSISTANT' && msg.status === 'thinking' && !msg.content && !msg.toolsUsed?.length && (
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <div className="flex space-x-0.5">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '75ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    </div>
                    <span>Denkt nach...</span>
                  </div>
                )}
                {/* Tool tags */}
                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(() => {
                      const toolCounts = msg.toolsUsed.reduce((acc, tool) => {
                        acc[tool] = (acc[tool] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      
                      return Object.entries(toolCounts).map(([tool, count], i) => {
                        const { label, icon } = getToolLabel(tool);
                        const isActive = msg.isExecutingTools;
                        return (
                          <span key={i} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium shadow-sm transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border border-indigo-200 animate-pulse'
                              : 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isActive ? (
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                            ) : (
                              <span className="text-emerald-500">✓</span>
                            )}
                            <span>{icon}</span>
                            {count > 1 ? `${count}x ${label}` : label}
                          </span>
                        );
                      });
                    })()}
                  </div>
                )}
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {msg.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-1 bg-white/20 rounded px-1.5 py-0.5 text-[10px]">
                        {att.type.startsWith('image/') ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        <span className="truncate max-w-[80px]">{att.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Message content with basic markdown */}
                {(() => {
                  const msgContent = msg.content || '';
                  if (!msgContent) return null;

                  // Normalize markdown links containing download/image URLs to bare URLs
                  // e.g. [Download: file.csv](https://...csv) → https://...csv
                  const normalized = msgContent.replace(
                    /\[([^\]]*)\]\((https?:\/\/[^\s)]+?\.(csv|xlsx|png|jpg|jpeg|webp|gif)[^\s)]*)\)/gi,
                    '$2'
                  );

                  const hasMediaUrls = /(https?:\/\/[^\s]+?\.(png|jpg|jpeg|webp|gif|csv|xlsx)(\?[^\s]*)?)/gi.test(normalized);

                  if (!hasMediaUrls) {
                    return <div className="whitespace-pre-wrap mivo-markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(normalized) }} />;
                  }

                  const elements: React.ReactNode[] = [];
                  let lastIndex = 0;
                  const regex = /(https?:\/\/[^\s]+?\.(png|jpg|jpeg|webp|gif|csv|xlsx)(\?[^\s]*)?)/gi;
                  let match;

                  while ((match = regex.exec(normalized)) !== null) {
                    if (match.index > lastIndex) {
                      const textBefore = normalized.slice(lastIndex, match.index).trim();
                      if (textBefore) elements.push(<div key={`t-${lastIndex}`} className="whitespace-pre-wrap mivo-markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(textBefore) }} />);
                    }
                    const url = match[0];
                    const ext = (match[2] || '').toLowerCase();
                    if (ext === 'csv' || ext === 'xlsx') {
                      const fname = url.split('/').pop()?.split('?')[0] || `export.${ext}`;
                      const isXlsx = ext === 'xlsx';
                      elements.push(
                        <a
                          key={`dl-${match.index}`}
                          href={url}
                          download={fname}
                          className="inline-flex items-center gap-2.5 mt-2 mb-1 pl-3 pr-4 py-2 bg-gray-900 hover:bg-gray-700 active:bg-gray-800 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
                        >
                          <svg className="w-4 h-4 flex-shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          <div className="flex flex-col items-start leading-tight">
                            <span className="text-[11px] font-semibold">{isXlsx ? 'Excel' : 'CSV'} herunterladen</span>
                            <span className="text-[10px] text-white/60 font-normal">{fname}</span>
                          </div>
                        </a>
                      );
                    } else {
                      elements.push(
                        <a key={`img-${match.index}`} href={url} target="_blank" rel="noopener noreferrer" className="block my-2">
                          <img src={url} alt="Ergebnis" loading="lazy" className="rounded-lg max-w-full max-h-64 object-contain border border-gray-100" />
                        </a>
                      );
                    }
                    lastIndex = regex.lastIndex;
                  }
                  if (lastIndex < normalized.length) {
                    const remaining = normalized.slice(lastIndex).trim();
                    if (remaining) elements.push(<div key={`t-${lastIndex}`} className="whitespace-pre-wrap mivo-markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(remaining) }} />);
                  }

                  return <>{elements}</>;
                })()}
                {/* Streaming cursor */}
                {msg.status === 'streaming' && (
                  <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg rounded-bl-none p-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="flex space-x-0.5">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '75ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                </div>
                <span>Mivo denkt nach...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white">
        {/* Contextual Tip - appears above input */}
        <div className={`overflow-hidden transition-all duration-300 ease-out ${
          activeTip && tipVisible ? 'max-h-24 opacity-100 mb-3' : 'max-h-0 opacity-0 mb-0'
        }`}>
          {activeTip && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 relative">
              <button
                onClick={dismissTip}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
              <p className="text-xs text-gray-700 pr-6">{activeTip.message}</p>
            </div>
          )}
        </div>

        {/* File Upload Preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="relative group">
                {file.preview ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-400" />
                    <span className="text-[8px] text-gray-500 mt-1 truncate max-w-[56px] px-1">{file.name}</span>
                  </div>
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <textarea
            value={aiChatDraft}
            onChange={(e) => setAiChatDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Nachricht an Mivo..."
            rows={1}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-[16px] lg:text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all placeholder-gray-400 resize-none overflow-y-auto"
            style={{ maxHeight: '5.5rem', minHeight: '2.25rem' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 88) + 'px';
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Dateien anhängen"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            {isLoading || isStreaming ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors"
              >
                Stopp
                <Square className="w-3 h-3 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!aiChatDraft.trim() && uploadedFiles.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 transition-colors"
              >
                Senden
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
        <p className="text-[10px] text-gray-400 text-center mt-2 leading-tight">
          KI-generierte Antworten. Mivo kann Fehler machen — wichtige Angaben bitte prüfen.
        </p>
      </div>
    </div>
  );
}
