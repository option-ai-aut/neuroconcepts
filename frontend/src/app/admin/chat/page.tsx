'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Hash, Plus, Send, Search, Settings, Users, Lock, Globe,
  Smile, Paperclip, MoreVertical, Pin, Bell, BellOff, X, Loader2
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private';
  unread: number;
  members: number;
  pinned?: boolean;
}

interface ChatMessage {
  id: string;
  user: { name: string; initials: string; color: string };
  content: string;
  time: string;
  reactions?: { emoji: string; count: number }[];
}

const CHANNELS: Channel[] = [
  { id: '1', name: 'general', description: 'Allgemeine Kommunikation', type: 'public', unread: 3, members: 12, pinned: true },
  { id: '2', name: 'engineering', description: 'Dev & Technik', type: 'private', unread: 0, members: 4 },
  { id: '3', name: 'support-intern', description: 'Interne Support-Besprechung', type: 'private', unread: 5, members: 6 },
  { id: '4', name: 'sales', description: 'Vertrieb & Akquise', type: 'public', unread: 0, members: 5 },
  { id: '5', name: 'product', description: 'Produkt-Roadmap & Features', type: 'public', unread: 1, members: 8 },
  { id: '6', name: 'random', description: 'Off-Topic, Memes, Spaß', type: 'public', unread: 0, members: 12 },
  { id: '7', name: 'announcements', description: 'Wichtige Ankündigungen', type: 'public', unread: 0, members: 12, pinned: true },
  { id: '8', name: 'finance-intern', description: 'Buchhaltung & Rechnungen', type: 'private', unread: 0, members: 3 },
];

const MOCK_MESSAGES: ChatMessage[] = [
  { id: '1', user: { name: 'Dennis Kral', initials: 'DK', color: 'from-red-500 to-orange-500' }, content: 'Guten Morgen zusammen! Stand-up in 10 Minuten.', time: '09:00' },
  { id: '2', user: { name: 'Max Huber', initials: 'MH', color: 'from-violet-500 to-indigo-500' }, content: 'Bin dabei. Kurze Info: der neue Email-Parser für Homegate ist fertig und in Staging deployed. Tests laufen durch.', time: '09:02', reactions: [{ emoji: '🚀', count: 3 }, { emoji: '👍', count: 2 }] },
  { id: '3', user: { name: 'Sarah Weber', initials: 'SW', color: 'from-blue-500 to-cyan-500' }, content: 'Super! Wir haben 3 neue Tickets von gestern Abend. Eines ist urgent — Kalender-Sync bei Kellner Immobilien funktioniert nicht mehr.', time: '09:05' },
  { id: '4', user: { name: 'Tom Fischer', initials: 'TF', color: 'from-emerald-500 to-teal-500' }, content: 'Das schaue ich mir direkt an. Wahrscheinlich ist der Google OAuth Token abgelaufen. Fixe ich vor dem Standup.', time: '09:06', reactions: [{ emoji: '💪', count: 2 }] },
  { id: '5', user: { name: 'Dennis Kral', initials: 'DK', color: 'from-red-500 to-orange-500' }, content: 'Perfekt, danke Tom. @Sarah bitte dem Kunden schon mal Bescheid geben, dass wir dran sind.', time: '09:07' },
  { id: '6', user: { name: 'Lisa Müller', initials: 'LM', color: 'from-pink-500 to-rose-500' }, content: 'Ich hab gestern noch zwei Demo-Calls mit neuen Leads gehabt. Sieht gut aus — einer davon ist eine Kette mit 15 Maklern. 🎯', time: '09:10', reactions: [{ emoji: '🔥', count: 4 }, { emoji: '🎉', count: 2 }] },
];

export default function AdminChat() {
  const [activeChannel, setActiveChannel] = useState(CHANNELS[0]);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredChannels = CHANNELS.filter(c => c.name.includes(channelSearch.toLowerCase()));
  const pinnedChannels = filteredChannels.filter(c => c.pinned);
  const regularChannels = filteredChannels.filter(c => !c.pinned);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, {
      id: String(Date.now()),
      user: { name: 'Dennis Kral', initials: 'DK', color: 'from-red-500 to-orange-500' },
      content: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setInput('');
  };

  return (
    <div className="flex h-[calc(100vh-48px)]">
      {/* Channel Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900">Channels</h2>
            <button
              onClick={() => setShowNewChannel(true)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {pinnedChannels.length > 0 && (
            <div className="px-3 mb-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Pin className="w-2.5 h-2.5" /> Angepinnt
              </p>
              {pinnedChannels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                    activeChannel.id === channel.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs font-medium truncate flex-1">{channel.name}</span>
                  {channel.unread > 0 && (
                    <span className="bg-indigo-600 text-white text-[10px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full">{channel.unread}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="px-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Channels</p>
            {regularChannels.map(channel => (
              <button
                key={channel.id}
                onClick={() => setActiveChannel(channel)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                  activeChannel.id === channel.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {channel.type === 'private' ? <Lock className="w-3 h-3 text-gray-400 shrink-0" /> : <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                <span className="text-xs font-medium truncate flex-1">{channel.name}</span>
                {channel.unread > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">{channel.unread}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Channel Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{activeChannel.name}</h3>
              <p className="text-[10px] text-gray-400">{activeChannel.description} · {activeChannel.members} Mitglieder</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
              <Users className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
              <Pin className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-3 group">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${msg.user.color} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                {msg.user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-gray-900">{msg.user.name}</span>
                  <span className="text-[10px] text-gray-400">{msg.time}</span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{msg.content}</p>
                {msg.reactions && (
                  <div className="flex gap-1 mt-1.5">
                    {msg.reactions.map((r, i) => (
                      <button key={i} className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs transition-colors">
                        <span>{r.emoji}</span>
                        <span className="text-gray-500 font-medium">{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-3 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={`Nachricht an #${activeChannel.name}...`}
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none"
                style={{ maxHeight: '6rem' }}
              />
              <div className="flex items-center gap-1 shrink-0">
                <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md transition-colors">
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-30 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
