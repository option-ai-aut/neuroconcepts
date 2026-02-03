'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, Paperclip, FileText, RotateCcw, X } from 'lucide-react';
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

interface Message {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  isAction?: boolean; // Flag for action messages
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

export default function AiChatSidebar() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { aiChatDraft, setAiChatDraft, activeExposeContext, triggerExposeRefresh, notifyAiAction } = useGlobalState();
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTip, setActiveTip] = useState<ContextTip | null>(null);
  const [tipVisible, setTipVisible] = useState(false);
  const tipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // TODO: Get real User ID from Auth
  const userId = 'default-user-id'; 
  const tenantId = 'default-tenant';

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
        if (!apiUrl || !userId) {
          // Retry after a short delay if config not ready
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(loadHistory, 200);
          }
          return;
        }

        // Load history
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${apiUrl}/chat/history?userId=${userId}`, {
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
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = async () => {
    if (!confirm('Neuen Chat starten? Der aktuelle Chat wird archiviert und nach 7 Tagen gelöscht.')) return;
    
    try {
      const apiUrl = getApiUrl();
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`${apiUrl}/chat/new`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ userId })
      });
      
      if (res.ok) {
        setMessages([]);
        console.log('🆕 Neuer Chat gestartet');
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiChatDraft.trim()) return;

    const userMsg = { role: 'USER' as const, content: aiChatDraft };
    setMessages(prev => [...prev, userMsg]);
    setAiChatDraft('');
    setIsLoading(true);

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
            tenantId,
          })
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
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${apiUrl}/chat/stream`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            message: userMsg.content,
            history: messages,
            tenantId,
            userId,
          })
        });

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

                // Update the assistant message with new chunk
                setMessages(prev => {
                  const newMessages = [...prev];
                  // Find the assistant message (not the action message)
                  const assistantIdx = newMessages.findIndex((m, idx) => idx === assistantMsgIndex && m.role === 'ASSISTANT');
                  if (assistantIdx !== -1) {
                    newMessages[assistantIdx] = {
                      role: 'ASSISTANT',
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
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'ASSISTANT', content: 'Fehler bei der Verbindung zu Jarvis.' }]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white w-80 z-20 relative shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.1)]">
      <div className="h-16 px-4 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center shadow-md shadow-indigo-900/50">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">Jarvis</span>
        </div>
        <button
          onClick={handleNewChat}
          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Neuen Chat starten"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center animate-alive">
              <Bot className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <p className="font-medium text-gray-600">Wie kann ich helfen?</p>
              <p className="text-xs mt-1">
                {activeExposeContext 
                  ? 'Sag mir z.B. "Erstelle ein professionelles Exposé" oder "Füge einen Textblock hinzu"'
                  : 'Frag mich nach Leads, Objekten oder E-Mails.'
                }
              </p>
            </div>
          </div>
        )}
        
        {messages.map((msg, index) => {
          // Action message (system) - just show visual indicator, no text
          if (msg.isAction) {
            return (
              <div key={index} className="flex justify-center">
                <div className="bg-indigo-50 text-indigo-600 rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-ping"></div>
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-ping delay-75"></div>
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-ping delay-150"></div>
                </div>
              </div>
            );
          }
          
          // Regular messages
          return (
            <div key={index} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                msg.role === 'USER' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none'
              }`}>
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
            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-3 relative">
              <button
                onClick={dismissTip}
                className="absolute top-2 right-2 p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
              <p className="text-xs text-indigo-700 pr-6">{activeTip.message}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
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
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all placeholder-gray-400 resize-none overflow-y-auto"
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
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Anhang hinzufügen"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={isLoading || !aiChatDraft.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
            >
              Senden
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
