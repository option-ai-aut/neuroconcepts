'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Paperclip } from 'lucide-react';

interface Message {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

export default function AiChatSidebar() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TODO: Get real User ID from Auth
  const userId = 'default-user-id'; 
  const tenantId = 'default-tenant';

  useEffect(() => {
    // Load history
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/history?userId=${userId}`)
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
    if (!input.trim()) return;

    const userMsg = { role: 'USER' as const, content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
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
      setMessages(prev => [...prev, { role: 'ASSISTANT', content: 'Fehler bei der Verbindung zur KI.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80 shadow-lg">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold text-gray-800">KI Assistent</span>
        </div>
        <div className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Online</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-10">
            <Bot className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p>Wie kann ich helfen?</p>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
              msg.role === 'USER' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-3 shadow-sm">
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

      <div className="p-3 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nachricht..."
            className="w-full pl-4 pr-10 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          <button
            type="button"
            className="absolute right-10 top-3 text-gray-400 hover:text-gray-600"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
