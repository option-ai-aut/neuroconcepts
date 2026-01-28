'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Paperclip } from 'lucide-react';
import { useGlobalState } from '@/context/GlobalStateContext';
import { getRuntimeConfig } from '@/components/EnvProvider';

interface Message {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

export default function AiChatSidebar() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { aiChatDraft, setAiChatDraft } = useGlobalState();
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TODO: Get real User ID from Auth
  const userId = 'default-user-id'; 
  const tenantId = 'default-tenant';

  useEffect(() => {
    const config = getRuntimeConfig();
    // Load history
    fetch(`${config.apiUrl}/chat/history?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(err => console.error('Failed to load chat history', err));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiChatDraft.trim()) return;

    const userMsg = { role: 'USER' as const, content: aiChatDraft };
    setMessages(prev => [...prev, userMsg]);
    setAiChatDraft('');
    setIsLoading(true);

    try {
      const config = getRuntimeConfig();
      const res = await fetch(`${config.apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages, // Send context
          tenantId,
          userId
        })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'ASSISTANT', content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'ASSISTANT', content: 'Fehler bei der Verbindung zu Jarvis.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80 shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.1)] z-20 relative">
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-900/50">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">Jarvis</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center animate-alive">
              <Bot className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <p className="font-medium text-gray-600">Wie kann ich helfen?</p>
              <p className="text-xs mt-1">Frag mich nach Leads, Objekten oder E-Mails.</p>
            </div>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
              msg.role === 'USER' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-3 shadow-sm">
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

      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={aiChatDraft}
              onChange={(e) => setAiChatDraft(e.target.value)}
              placeholder="Nachricht an Jarvis..."
              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder-gray-400"
            />
            <div className="absolute right-2 flex items-center space-x-1">
              <button
                type="button"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Anhang hinzufügen"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={isLoading || !aiChatDraft.trim()}
                className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
