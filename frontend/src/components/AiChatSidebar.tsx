'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, Paperclip, FileText, RotateCcw, X, Image as ImageIcon, AlertCircle, Loader2, Square } from 'lucide-react';
import NextImage from 'next/image';
import { useGlobalState } from '@/context/GlobalStateContext';
import { getRuntimeConfig } from '@/components/EnvProvider';
import { fetchAuthSession } from 'aws-amplify/auth';

// Helper to get API URL without trailing slash
const getApiUrl = () => {
  const config = getRuntimeConfig();
  const url = config.apiUrl || '';
  return url.replace(/\/+$/, '');
};

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
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  isAction?: boolean; // Flag for action messages
  attachments?: { name: string; type: string }[]; // Show attachments in message
  toolsUsed?: string[]; // Tools that were used for this response
}

interface JarvisAction {
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
  
  // Exposés
  get_exposes: { label: 'Exposés geladen', icon: '📑' },
  create_expose_from_template: { label: 'Exposé erstellt', icon: '✨' },
  create_full_expose: { label: 'Exposé erstellt', icon: '✨' },
  delete_expose: { label: 'Exposé gelöscht', icon: '🗑️' },
  delete_all_exposes: { label: 'Alle Exposés gelöscht', icon: '🗑️' },
  get_expose_status: { label: 'Status geladen', icon: '📊' },
  set_expose_status: { label: 'Status geändert', icon: '✏️' },
  set_expose_theme: { label: 'Design geändert', icon: '🎨' },
  generate_expose_pdf: { label: 'PDF generiert', icon: '📄' },
  generate_expose_text: { label: 'Text generiert', icon: '✍️' },
  
  // Exposé Blocks
  create_expose_block: { label: 'Block hinzugefügt', icon: '➕' },
  update_expose_block: { label: 'Block aktualisiert', icon: '✏️' },
  delete_expose_block: { label: 'Block gelöscht', icon: '🗑️' },
  clear_expose_blocks: { label: 'Blöcke gelöscht', icon: '🗑️' },
  reorder_expose_blocks: { label: 'Blöcke sortiert', icon: '↕️' },
  
  // Templates
  create_expose_template: { label: 'Vorlage erstellt', icon: '✨' },
  get_expose_templates: { label: 'Vorlagen geladen', icon: '📋' },
  get_template: { label: 'Vorlage geladen', icon: '📋' },
  update_template: { label: 'Vorlage aktualisiert', icon: '✏️' },
  
  // Team Chat
  get_channels: { label: 'Kanäle geladen', icon: '💬' },
  get_channel_messages: { label: 'Nachrichten geladen', icon: '💬' },
  send_channel_message: { label: 'Nachricht gesendet', icon: '📤' },
  
  // Dashboard
  get_dashboard_stats: { label: 'Dashboard geladen', icon: '📊' },
};

// Helper to get tool label
const getToolLabel = (tool: string): { label: string; icon: string } => {
  return TOOL_LABELS[tool] || { label: tool.replace(/_/g, ' '), icon: '⚡' };
};

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

interface AiChatSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function AiChatSidebar({ mobile, onClose }: AiChatSidebarProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const { aiChatDraft, setAiChatDraft, activeExposeContext, triggerExposeRefresh, notifyAiAction, aiActionPerformed } = useGlobalState();
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTip, setActiveTip] = useState<ContextTip | null>(null);
  const [tipVisible, setTipVisible] = useState(false);
  const tipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Jarvis pending actions
  const [pendingActions, setPendingActions] = useState<JarvisAction[]>([]);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  
  // Abort controller for stopping stream
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get shown tips from localStorage
  const getShownTips = useCallback((): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('jarvis-shown-tips') || '[]');
    } catch {
      return [];
    }
  }, []);

  // Mark tip as shown
  const markTipAsShown = useCallback((tipId: string) => {
    if (typeof window === 'undefined') return;
    const shown = getShownTips();
    if (!shown.includes(tipId)) {
      localStorage.setItem('jarvis-shown-tips', JSON.stringify([...shown, tipId]));
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

  // Load pending Jarvis actions
  const loadPendingActions = useCallback(async () => {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      // Config not ready yet, will retry
      return;
    }
    
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`${apiUrl}/jarvis/actions?status=PENDING`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setPendingActions(data.actions || []);
      }
    } catch (error) {
      // Silently ignore fetch errors (e.g., when backend is not available)
      console.warn('Could not load pending actions:', error);
    }
  }, []);

  // Respond to a Jarvis action
  const handleRespondToAction = async (actionId: string, response: string) => {
    const apiUrl = getApiUrl();
    if (!apiUrl) return;
    
    setRespondingTo(actionId);
    try {
      const authHeaders = await getAuthHeaders();

      const res = await fetch(`${apiUrl}/jarvis/actions/${actionId}/respond`, {
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
          role: 'ASSISTANT',
          content: `✅ Erledigt: ${option?.label || response}`
        }]);
      }
    } catch (error) {
      console.error('Error responding to action:', error);
    } finally {
      setRespondingTo(null);
    }
  };

  // Load pending actions on mount and when AI performs actions
  useEffect(() => {
    loadPendingActions();
  }, [loadPendingActions]);

  useEffect(() => {
    if (aiActionPerformed) {
      loadPendingActions();
    }
  }, [aiActionPerformed, loadPendingActions]);

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
            console.log(`✅ Chat-Historie geladen: ${data.length} Nachrichten`);
            setMessages(data);
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = async () => {
    if (!confirm('Chat-Verlauf archivieren?\n\nJarvis behält sein Gedächtnis und kann bei Bedarf auf archivierte Gespräche zugreifen. Archivierte Chats werden nach 30 Tagen gelöscht.')) return;
    
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

    // Create user message with attachments info
    const attachments = uploadedFiles.map(f => ({ name: f.name, type: f.type }));
    const userMsg: Message = { 
      role: 'USER', 
      content: aiChatDraft || (uploadedFiles.length > 0 ? `[${uploadedFiles.length} Datei(en) angehängt]` : ''),
      attachments: attachments.length > 0 ? attachments : undefined
    };
    setMessages(prev => [...prev, userMsg]);
    
    // Store files for upload before clearing
    const filesToUpload = [...uploadedFiles];
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
        // Show action indicator
        setMessages(prev => [...prev, { role: 'SYSTEM', content: 'Jarvis führt Aktion aus...', isAction: true }]);
        
        // Determine endpoint
        const endpoint = hasTemplateContext 
          ? `${apiUrl}/templates/${activeExposeContext.templateId}/chat`
          : `${apiUrl}/exposes/${activeExposeContext.exposeId}/chat`;
        
        const authHeaders = await getAuthHeaders();
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            message: userMsg.content,
            history: messages.filter(m => !m.isAction).slice(-10),
          }),
          signal: abortController.signal,
        });
        const data = await res.json();
        
        // Remove action indicator and add response
        setMessages(prev => [
          ...prev.filter(m => !m.isAction), 
          { role: 'ASSISTANT', content: data.response }
        ]);
        
        if (data.actionsPerformed && data.actionsPerformed.length > 0) {
          triggerExposeRefresh();
        }
        setIsLoading(false);
      } else {
        // Regular chat endpoint with STREAMING
        // Note: userId and tenantId come from auth token on backend
        const authHeaders = await getAuthHeaders();
        
        // Use FormData if we have files, otherwise JSON
        let res: Response;
        if (filesToUpload.length > 0) {
          const formData = new FormData();
          formData.append('message', userMsg.content);
          filesToUpload.forEach((f, idx) => {
            formData.append('files', f.file);
          });
          
          res = await fetch(`${apiUrl}/chat/stream`, {
            method: 'POST',
            headers: {
              'Authorization': (authHeaders as Record<string, string>)['Authorization'] || '',
            },
            body: formData,
            signal: abortController.signal,
          });
        } else {
          res = await fetch(`${apiUrl}/chat/stream`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              message: userMsg.content,
            }),
            signal: abortController.signal,
          });
        }

        if (!res.body) throw new Error('No response body');

        // Add empty assistant message that we'll update
        const assistantMsgIndex = messages.length + 1;
        setMessages(prev => [...prev, { role: 'ASSISTANT', content: '' }]);
        setIsLoading(false);

        // Read the stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let hadFunctionCalls = false;
        let toolsUsed: string[] = [];
        let showingActionMessage = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              
              // Capture tools used and update message immediately
              if (data.toolsUsed && data.toolsUsed.length > 0) {
                toolsUsed = data.toolsUsed;
                // Update the assistant message with tools immediately
                setMessages(prev => {
                  const newMessages = [...prev];
                  const assistantIdx = newMessages.findIndex((m, idx) => idx === assistantMsgIndex && m.role === 'ASSISTANT');
                  if (assistantIdx !== -1) {
                    newMessages[assistantIdx] = {
                      ...newMessages[assistantIdx],
                      toolsUsed: toolsUsed
                    };
                  }
                  return newMessages;
                });
              }
              
              if (data.error) {
                // Remove action message if showing
                if (showingActionMessage) {
                  setMessages(prev => prev.filter(m => !m.isAction));
                  showingActionMessage = false;
                }
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[assistantMsgIndex] = { role: 'ASSISTANT', content: 'Fehler bei der Verbindung zu Jarvis.' };
                  return newMessages;
                });
                break;
              }
              
              if (data.done) {
                // Remove action message when done
                if (showingActionMessage) {
                  setMessages(prev => prev.filter(m => !m.isAction));
                  showingActionMessage = false;
                }
                
                // Check if AI performed actions
                if (data.hadFunctionCalls) {
                  hadFunctionCalls = true;
                }
                break;
              }
              
              if (data.chunk) {
                // Check if we should show action message
                // Show it when we detect function calls (usually starts with "[")
                if (!showingActionMessage && data.chunk.trim().startsWith('[')) {
                  setMessages(prev => [...prev, { role: 'SYSTEM', content: 'Jarvis führt Aktion aus...', isAction: true }]);
                  showingActionMessage = true;
                }

                // Update the assistant message with new chunk (preserve toolsUsed)
                setMessages(prev => {
                  const newMessages = [...prev];
                  // Find the assistant message (not the action message)
                  const assistantIdx = newMessages.findIndex((m, idx) => idx === assistantMsgIndex && m.role === 'ASSISTANT');
                  if (assistantIdx !== -1) {
                    newMessages[assistantIdx] = {
                      ...newMessages[assistantIdx], // Preserve existing properties like toolsUsed
                      content: (newMessages[assistantIdx]?.content || '') + data.chunk
                    };
                  }
                  return newMessages;
                });
              }
            }
          }
        }

        // Notify if AI performed actions
        if (hadFunctionCalls) {
          notifyAiAction();
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User stopped the generation — just clean up
        setMessages(prev => prev.filter(m => !m.isAction));
        setIsLoading(false);
        return;
      }
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'ASSISTANT', content: 'Fehler bei der Verbindung zu Jarvis.' }]);
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    // Remove any action indicator messages
    setMessages(prev => prev.filter(m => !m.isAction));
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
          <NextImage src="/logo-icon-only.png" alt="Jarvis" width={28} height={28} />
          <span className="text-sm font-bold text-gray-900">Jarvis</span>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white" style={{ overscrollBehavior: 'contain' }}>
        {/* Pending Jarvis Actions */}
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
            <NextImage src="/logo-icon-only.png" alt="Jarvis" width={48} height={48} className="opacity-40" />
            <div>
              <p className="font-medium text-gray-600">Wie kann ich helfen?</p>
              <p className="text-xs mt-1">
                {activeExposeContext 
                  ? 'Sag mir z.B. "Erstelle ein professionelles Exposé" oder "Füge einen Textblock hinzu"'
                  : 'Frag mich nach Leads, Objekten oder E-Mails.'
                }
              </p>
              <div className="mt-4 mx-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-left">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Jarvis ist ein KI-Assistent (GPT-5 mini). Deine Nachrichten werden 
                  zur Verarbeitung an OpenAI übermittelt. Es werden keine Daten für 
                  KI-Training verwendet. Alle Interaktionen werden protokolliert. 
                  Antworten können fehlerhaft sein — bitte prüfe wichtige Angaben.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {messages.map((msg, index) => {
          // Action message (system) - just show visual indicator, no text
          if (msg.isAction) {
            return (
              <div key={index} className="flex justify-center">
                <div className="bg-gray-100 text-gray-900 rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-ping"></div>
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-ping delay-75"></div>
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-ping delay-150"></div>
                </div>
              </div>
            );
          }

          // System info message (e.g. "older messages archived")
          if (msg.role === 'SYSTEM') {
            return (
              <div key={index} className="flex justify-center">
                <div className="bg-gray-100 text-gray-500 rounded-full px-3 py-1.5 text-[10px] font-medium">
                  {msg.content}
                </div>
              </div>
            );
          }
          
          // Regular messages
          return (
            <div key={index} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                msg.role === 'USER' 
                  ? 'bg-gray-900 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none'
              }`}>
                {/* Show tools used as tags - grouped by tool type with count */}
                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(() => {
                      // Group tools by name and count occurrences
                      const toolCounts = msg.toolsUsed.reduce((acc, tool) => {
                        acc[tool] = (acc[tool] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      
                      return Object.entries(toolCounts).map(([tool, count], i) => {
                        const { label, icon } = getToolLabel(tool);
                        return (
                          <span key={i} className="inline-flex items-center gap-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200 rounded-md px-2 py-0.5 text-[10px] font-medium shadow-sm">
                            <span>{icon}</span>
                            {count > 1 ? `${count}x ${label}` : label}
                          </span>
                        );
                      });
                    })()}
                  </div>
                )}
                {/* Show attachments if any */}
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
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg rounded-bl-none p-3">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
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
            placeholder="Nachricht an Jarvis..."
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
            {isLoading ? (
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
          KI-generierte Antworten. Jarvis kann Fehler machen — wichtige Angaben bitte prüfen.
        </p>
      </div>
    </div>
  );
}
