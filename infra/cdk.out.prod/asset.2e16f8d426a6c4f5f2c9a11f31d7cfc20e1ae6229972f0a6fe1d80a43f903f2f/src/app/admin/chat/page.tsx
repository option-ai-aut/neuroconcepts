'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MessageSquare, Plus, Hash, Send, Loader2, X, Trash2, Pencil, Check, Users, Menu
} from 'lucide-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getRuntimeConfig } from '@/components/EnvProvider';

function getApiUrl(): string {
  const config = getRuntimeConfig();
  return (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

async function adminFetch(path: string, options?: RequestInit) {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

interface Channel {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  _count?: { messages: number; members: number };
}

interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  user?: { firstName: string | null; lastName: string | null; email: string };
  createdAt: string;
}

export default function AdminChatPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // Channel management
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const data = await adminFetch('/admin/team/channels');
      setChannels(Array.isArray(data) ? data : data.channels || []);
    } catch (err) {
      console.error('Failed to load channels:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (channelId: string) => {
    setMessagesLoading(true);
    try {
      const data = await adminFetch(`/admin/team/channels/${channelId}/messages`);
      setMessages(Array.isArray(data) ? data : data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
      // Poll for new messages every 5s
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(selectedChannel.id);
      }, 5000);
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [selectedChannel, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;
    setSending(true);
    try {
      await adminFetch(`/admin/team/channels/${selectedChannel.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      setNewMessage('');
      fetchMessages(selectedChannel.id);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    setCreatingChannel(true);
    try {
      await adminFetch('/admin/team/channels', {
        method: 'POST',
        body: JSON.stringify({ name: newChannelName.trim() }),
      });
      setNewChannelName('');
      setShowCreateChannel(false);
      fetchChannels();
    } catch (err) {
      console.error('Failed to create channel:', err);
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleUpdateChannel = async () => {
    if (!editingChannel || !editChannelName.trim()) return;
    try {
      await adminFetch(`/admin/team/channels/${editingChannel.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editChannelName.trim() }),
      });
      setEditingChannel(null);
      fetchChannels();
    } catch (err) {
      console.error('Failed to update channel:', err);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Channel wirklich löschen?')) return;
    try {
      await adminFetch(`/admin/team/channels/${channelId}`, { method: 'DELETE' });
      if (selectedChannel?.id === channelId) setSelectedChannel(null);
      fetchChannels();
    } catch (err) {
      console.error('Failed to delete channel:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    } catch { return ''; }
  };

  return (
    <div className="h-full flex overflow-hidden bg-white relative">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Channels Sidebar */}
      <div className={`w-56 flex flex-col border-r border-gray-200 shrink-0 bg-gray-50 transition-transform duration-300 z-40
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        fixed lg:static inset-y-0 left-0 shadow-xl lg:shadow-none
      `}>
        <div className="p-3 flex items-center justify-between shrink-0 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Channels</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
              aria-label="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreateChannel(true)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title="Neuer Channel"
          >
            <Plus className="w-4 h-4" />
          </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : channels.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-gray-400">
              Noch keine Channels
            </div>
          ) : (
            channels.map((ch) => (
              <div
                key={ch.id}
                className={`group flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors ${
                  selectedChannel?.id === ch.id
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => { setSelectedChannel(ch); setSidebarOpen(false); }}
              >
                <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="flex-1 text-sm font-medium truncate">{ch.name}</span>
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingChannel(ch); setEditChannelName(ch.name); }}
                    className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteChannel(ch.id); }}
                    className="p-0.5 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="h-12 flex items-center gap-2 px-4 border-b border-gray-200 shrink-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Channels öffnen"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Hash className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-sm text-gray-900">{selectedChannel.name}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">
                  Noch keine Nachrichten in #{selectedChannel.name}
                </div>
              ) : (
                messages.map((msg) => {
                  const name = [msg.user?.firstName, msg.user?.lastName].filter(Boolean).join(' ') || msg.user?.email || 'Unbekannt';
                  return (
                    <div key={msg.id} className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0 mt-0.5">
                        {name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-gray-900">{name}</span>
                          <span className="text-[10px] text-gray-400">{formatDate(msg.createdAt)} {formatTime(msg.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={`Nachricht an #${selectedChannel.name}...`}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="p-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden absolute top-3 left-3 z-20 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
              aria-label="Channels öffnen"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">Team Chat</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Wähle einen Channel aus oder erstelle einen neuen.
            </p>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Neuer Channel</h3>
              <button onClick={() => setShowCreateChannel(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
                placeholder="z.B. allgemein"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowCreateChannel(false)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg">Abbrechen</button>
              <button onClick={handleCreateChannel} disabled={creatingChannel || !newChannelName.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5">
                {creatingChannel && <Loader2 className="w-3 h-3 animate-spin" />}
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Channel Modal */}
      {editingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Channel bearbeiten</h3>
              <button onClick={() => setEditingChannel(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={editChannelName}
                onChange={(e) => setEditChannelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateChannel()}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={() => setEditingChannel(null)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg">Abbrechen</button>
              <button onClick={handleUpdateChannel} disabled={!editChannelName.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5">
                <Check className="w-3 h-3" /> Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
