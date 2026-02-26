'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MessageSquare, Plus, Hash, Send, Loader2, X, Trash2, Pencil, Check, Users, Menu, Video, Copy, ExternalLink
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

  // Meeting room
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingCreating, setMeetingCreating] = useState(false);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);
  const [meetingCopied, setMeetingCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // localStorage-based unread tracking
  // { [channelId]: { readCount: number, lastReadAt: string } }
  const [channelReadState, setChannelReadState] = useState<Record<string, { readCount: number; lastReadAt: string }>>({});
  // Timestamp to split "old" vs "new" messages when opening a channel
  const [newMessagesBoundary, setNewMessagesBoundary] = useState<string | null>(null);

  const loadReadState = useCallback(() => {
    try {
      const raw = localStorage.getItem('admin_chat_read_v1');
      setChannelReadState(raw ? JSON.parse(raw) : {});
    } catch {
      setChannelReadState({});
    }
  }, []);

  const markChannelRead = useCallback((channelId: string, msgCount: number) => {
    try {
      const raw = localStorage.getItem('admin_chat_read_v1');
      const state = raw ? JSON.parse(raw) : {};
      state[channelId] = { readCount: msgCount, lastReadAt: new Date().toISOString() };
      localStorage.setItem('admin_chat_read_v1', JSON.stringify(state));
      setChannelReadState({ ...state });
    } catch {}
  }, []);

  const isChannelUnread = useCallback((ch: Channel) => {
    const msgCount = ch._count?.messages ?? 0;
    const stored = channelReadState[ch.id];
    if (!stored) return msgCount > 0;
    return msgCount > stored.readCount;
  }, [channelReadState]);

  useEffect(() => { loadReadState(); }, [loadReadState]);

  const fetchChannels = useCallback(async () => {
    try {
      const data = await adminFetch('/admin/team/channels');
      setChannels(Array.isArray(data) ? data : data.channels || []);
      loadReadState();
    } catch (err) {
      console.error('Failed to load channels:', err);
    } finally {
      setLoading(false);
    }
  }, [loadReadState]);

  const fetchMessages = useCallback(async (channelId: string) => {
    setMessagesLoading(true);
    try {
      const data = await adminFetch(`/admin/team/channels/${channelId}/messages`);
      const msgs = Array.isArray(data) ? data : data.messages || [];
      setMessages(msgs);
      // Keep read count updated to actual message count
      if (msgs.length > 0) {
        markChannelRead(channelId, msgs.length);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [markChannelRead]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  useEffect(() => {
    if (selectedChannel) {
      // Capture the "last read at" before marking as read – used for the divider
      try {
        const raw = localStorage.getItem('admin_chat_read_v1');
        const state = raw ? JSON.parse(raw) : {};
        const prevState = state[selectedChannel.id];
        setNewMessagesBoundary(prevState?.lastReadAt ?? null);
      } catch {
        setNewMessagesBoundary(null);
      }

      // Mark as read immediately (use current _count.messages)
      const msgCount = selectedChannel._count?.messages ?? 0;
      markChannelRead(selectedChannel.id, msgCount);

      fetchMessages(selectedChannel.id);
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(selectedChannel.id);
        // Keep read count in sync with latest messages
        markChannelRead(selectedChannel.id, selectedChannel._count?.messages ?? 0);
      }, 5000);
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [selectedChannel, fetchMessages, markChannelRead]);

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

  const handleCreateMeeting = async () => {
    setMeetingCreating(true);
    setMeetingLink(null);
    try {
      const data = await adminFetch('/meet/rooms', { method: 'POST' });
      setMeetingLink(data.url);
      // Optionally post the link to the current channel
      if (selectedChannel) {
        await adminFetch(`/admin/team/channels/${selectedChannel.id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ content: `Video-Meeting gestartet: ${data.url}` }),
        });
        fetchMessages(selectedChannel.id);
      }
    } catch (err) {
      console.error('Failed to create meeting:', err);
    } finally {
      setMeetingCreating(false);
    }
  };

  const handleCopyMeetingLink = () => {
    if (!meetingLink) return;
    navigator.clipboard.writeText(meetingLink).then(() => {
      setMeetingCopied(true);
      setTimeout(() => setMeetingCopied(false), 2000);
    });
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
            channels.map((ch) => {
              const active = selectedChannel?.id === ch.id;
              const unread = !active && isChannelUnread(ch);
              return (
                <div
                  key={ch.id}
                  className={`group flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors ${
                    active
                      ? 'bg-white shadow-sm text-gray-900'
                      : unread
                        ? 'text-gray-900 hover:bg-gray-100'
                        : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  onClick={() => { setSelectedChannel(ch); setSidebarOpen(false); }}
                >
                  <Hash className={`w-3.5 h-3.5 shrink-0 ${unread ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className={`flex-1 text-sm truncate ${unread ? 'font-bold text-gray-900' : 'font-medium'}`}>{ch.name}</span>
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
                  {unread && <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />}
                </div>
              );
            })
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
              <span className="font-semibold text-sm text-gray-900 flex-1">{selectedChannel.name}</span>
              <button
                onClick={() => { setShowMeetingModal(true); setMeetingLink(null); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                title="Neues Meeting erstellen"
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Meeting</span>
              </button>
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
                (() => {
                  let dividerInserted = false;
                  return messages.map((msg) => {
                    const name = [msg.user?.firstName, msg.user?.lastName].filter(Boolean).join(' ') || msg.user?.email || 'Unbekannt';
                    const isNew = newMessagesBoundary && new Date(msg.createdAt) > new Date(newMessagesBoundary);
                    const showDivider = isNew && !dividerInserted;
                    if (showDivider) dividerInserted = true;

                    return (
                      <div key={msg.id}>
                        {showDivider && (
                          <div className="flex items-center gap-3 my-3">
                            <div className="flex-1 h-px bg-red-200" />
                            <span className="text-[11px] font-semibold text-red-500 whitespace-nowrap">Neue Nachrichten</span>
                            <div className="flex-1 h-px bg-red-200" />
                          </div>
                        )}
                        <div className="flex items-start gap-2.5">
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
                      </div>
                    );
                  });
                })()
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

      {/* Meeting Room Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Neues Meeting</h3>
              </div>
              <button onClick={() => { setShowMeetingModal(false); setMeetingLink(null); }} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              {!meetingLink ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Erstelle einen Meetingraum und teile den Link mit deinem Team oder externen Teilnehmern.
                  </p>
                  {selectedChannel && (
                    <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg mb-4">
                      Der Link wird automatisch in #{selectedChannel.name} gepostet.
                    </p>
                  )}
                  <button
                    onClick={handleCreateMeeting}
                    disabled={meetingCreating}
                    className="w-full py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {meetingCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                    {meetingCreating ? 'Erstelle Raum...' : 'Meeting erstellen'}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Meeting bereit!</p>
                      <p className="text-xs text-gray-500">Teile den Link mit den Teilnehmern</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
                    <span className="flex-1 text-xs text-gray-700 truncate">{meetingLink}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyMeetingLink}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      {meetingCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {meetingCopied ? 'Kopiert!' : 'Kopieren'}
                    </button>
                    <a
                      href={meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Beitreten
                    </a>
                  </div>
                </>
              )}
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
