'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Hash, Plus, Search, User, Send, Menu, X, ChevronRight, 
  Shield, Loader2, MoreHorizontal, Pencil, Trash2,
  ChevronUp, AtSign, Bot, Paperclip, FileText
} from 'lucide-react';
import Image from 'next/image';
import { 
  getChannels, getChannelMessages, sendChannelMessage, getMe, getSeats,
  createChannel, deleteChannel, editChannelMessage, deleteChannelMessage,
  getChannelMembers, getOrCreateDM
} from '@/lib/api';
import useSWR from 'swr';

// ==========================================
// Types
// ==========================================
interface ChannelMessage {
  id: string;
  content: string;
  isJarvis: boolean;
  mentions: string[] | null;
  editedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface ChannelMember {
  userId: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: string;
  isDefault: boolean;
  _count: { members: number; messages: number };
  members?: ChannelMember[];
}

interface Seat {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  lastSeenAt: string | null;
}

// ==========================================
// Presence helpers
// ==========================================
type PresenceStatus = 'online' | 'away' | 'offline';

function getPresenceStatus(lastSeenAt: string | null): PresenceStatus {
  if (!lastSeenAt) return 'offline';
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  const minutes = diff / 60_000;
  if (minutes < 5) return 'online';
  if (minutes < 30) return 'away';
  return 'offline';
}

function PresenceDot({ status }: { status: PresenceStatus }) {
  const colors: Record<PresenceStatus, string> = {
    online: 'bg-green-500',
    away: 'bg-yellow-400',
    offline: 'bg-gray-300 dark:bg-gray-600',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${colors[status]}`} />
  );
}

// ==========================================
// Mention parsing helpers
// ==========================================
function parseMentions(content: string): React.ReactNode[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1 rounded font-medium">
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [content];
}

function formatTime(dateString: string) {
  const d = new Date(dateString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  if (isYesterday) return `Gestern ${time}`;
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${time}`;
}

// ==========================================
// Main Component
// ==========================================
export default function TeamChatPage() {
  const { data: user } = useSWR('/me', getMe);
  const { data: channels = [], mutate: mutateChannels } = useSWR('/channels', getChannels);
  const { data: seats = [] } = useSWR('/seats', getSeats);

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [oldestId, setOldestId] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create channel modal
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Message actions
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);

  // Mention autocomplete
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  // File uploads
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; file: File; name: string; type: string; preview?: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Set default channel
  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      const def = channels.find((c: Channel) => c.isDefault);
      setActiveChannelId(def?.id || channels[0].id);
    }
  }, [channels, activeChannelId]);

  // Load messages for active channel
  const loadMessages = useCallback(async (channelId: string, append = false, beforeId?: string) => {
    if (!channelId) return;
    if (append) setLoadingMore(true);
    else setLoadingMessages(true);

    try {
      const data = await getChannelMessages(channelId, beforeId, 30);
      if (append) {
        setMessages(prev => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
      }
      setHasMore(data.hasMore);
      setOldestId(data.oldestId);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (activeChannelId) {
      loadMessages(activeChannelId);
    }
  }, [activeChannelId, loadMessages]);

  // Poll for new messages (every 3s)
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeChannelId) return;

    pollRef.current = setInterval(async () => {
      try {
        const data = await getChannelMessages(activeChannelId, undefined, 30);
        setMessages(prev => {
          // Only update if there are new messages
          if (data.messages.length !== prev.length || 
              (data.messages.length > 0 && prev.length > 0 && data.messages[data.messages.length - 1]?.id !== prev[prev.length - 1]?.id)) {
            return data.messages;
          }
          return prev;
        });
        setHasMore(data.hasMore);
        setOldestId(data.oldestId);
      } catch { /* ignore polling errors */ }
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChannelId]);

  // Scroll to bottom on initial load and new messages (only if near bottom)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom || loadingMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingMessages]);

  // Load more handler
  const handleLoadMore = () => {
    if (activeChannelId && oldestId && hasMore && !loadingMore) {
      loadMessages(activeChannelId, true, oldestId);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!message.trim() || !activeChannelId || sending) return;
    setSending(true);
    try {
      await sendChannelMessage(activeChannelId, message.trim());
      setMessage('');
      // Immediately refresh
      const data = await getChannelMessages(activeChannelId, undefined, 30);
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setOldestId(data.oldestId);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      console.error('Send failed:', error);
    } finally {
      setSending(false);
    }
  };

  // Edit message
  const handleEditMessage = async () => {
    if (!editingMessageId || !editContent.trim() || !activeChannelId) return;
    try {
      await editChannelMessage(activeChannelId, editingMessageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent('');
      loadMessages(activeChannelId);
    } catch (error) {
      console.error('Edit failed:', error);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChannelId) return;
    try {
      await deleteChannelMessage(activeChannelId, messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setMenuMessageId(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Create channel
  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || creatingChannel) return;
    setCreatingChannel(true);
    try {
      await createChannel({
        name: newChannelName.trim(),
        description: newChannelDesc.trim() || undefined,
        type: 'PUBLIC'
      });
      mutateChannels();
      setNewChannelName('');
      setNewChannelDesc('');
      setShowCreateChannel(false);
    } catch (error: any) {
      alert(error.message || 'Fehler beim Erstellen');
    } finally {
      setCreatingChannel(false);
    }
  };

  // Mention autocomplete logic
  const handleMessageChange = (value: string) => {
    setMessage(value);
    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1].toLowerCase());
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  // Jarvis virtual seat for mentions
  const jarvisSeat: Seat = { id: 'jarvis', firstName: 'Jarvis', lastName: '', email: 'ki-assistent', role: 'BOT', lastSeenAt: new Date().toISOString() };

  const filteredMentionSeats = [
    // Always show Jarvis if it matches the query
    ...( 'jarvis'.includes(mentionQuery) || 'ki'.includes(mentionQuery) ? [jarvisSeat] : []),
    ...seats.filter((s: Seat) => {
      if (s.id === user?.id) return false;
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      return fullName.includes(mentionQuery) || s.email.toLowerCase().includes(mentionQuery);
    })
  ].slice(0, 6);

  const insertMention = (seat: Seat) => {
    const cursorPos = textareaRef.current?.selectionStart || message.length;
    const textBeforeCursor = message.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const before = message.slice(0, atIndex);
    const after = message.slice(cursorPos);
    const mention = `@[${seat.firstName}${seat.lastName ? ' ' + seat.lastName : ''}](${seat.id}) `;
    setMessage(before + mention + after);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  // Handle keyboard in textarea
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredMentionSeats.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => Math.min(prev + 1, filteredMentionSeats.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentionSeats[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        handleEditMessage();
      } else {
        handleSendMessage();
      }
    }
  };

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).map(file => {
      const id = Math.random().toString(36).slice(2);
      const isImage = file.type.startsWith('image/');
      return {
        id,
        file,
        name: file.name,
        type: file.type,
        preview: isImage ? URL.createObjectURL(file) : undefined,
      };
    });
    setUploadedFiles(prev => [...prev, ...newFiles]);
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== fileId);
    });
  };

  // Close menus on click outside
  useEffect(() => {
    const handler = () => setMenuMessageId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Open or create DM with a team member
  const handleOpenDM = async (targetUserId: string) => {
    try {
      const dmChannel = await getOrCreateDM(targetUserId);
      // Refresh channels list to include the new/existing DM
      await mutateChannels();
      setActiveChannelId(dmChannel.id);
      setMobileDrawerOpen(false);
    } catch (error) {
      console.error('Failed to open DM:', error);
    }
  };

  // Helper: get display name for a DM channel (show the other user's name)
  const getDmDisplayName = (channel: Channel): string => {
    if (channel.type !== 'DM' || !channel.members) return channel.name;
    const other = channel.members.find((m: ChannelMember) => m.userId !== user?.id);
    if (other) return `${other.user.firstName} ${other.user.lastName}`;
    return channel.name;
  };

  // Helper: get initials for DM partner
  const getDmInitials = (channel: Channel): string => {
    if (channel.type !== 'DM' || !channel.members) return '';
    const other = channel.members.find((m: ChannelMember) => m.userId !== user?.id);
    if (other) return `${other.user.firstName?.charAt(0) || ''}${other.user.lastName?.charAt(0) || ''}`;
    return '';
  };

  const activeChannel = channels.find((c: Channel) => c.id === activeChannelId);
  const publicChannels = channels.filter((c: Channel) => 
    c.type !== 'DM' && (!searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const dmChannels = channels.filter((c: Channel) =>
    c.type === 'DM' && (!searchQuery || getDmDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="h-full flex flex-col relative bg-white dark:bg-[#111]">
      <div className="pt-1 shrink-0" />

      {/* Mobile: Channel Header */}
      <div className="lg:hidden flex h-11 items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => setMobileDrawerOpen(true)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-1.5">
          {activeChannel?.type === 'DM' ? (
            <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[8px] font-bold">
              {activeChannel && getDmInitials(activeChannel)}
            </div>
          ) : (
            <Hash className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
            {activeChannel ? (activeChannel.type === 'DM' ? getDmDisplayName(activeChannel) : activeChannel.name) : 'Channel wählen'}
          </span>
        </div>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileDrawerOpen(false)} />
          <div className="relative w-72 bg-white dark:bg-[#111] h-full shadow-xl animate-slide-right flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Channels</h2>
              <button onClick={() => setMobileDrawerOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Suchen..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-8 space-y-5">
              {/* Channels */}
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Channels</h3>
                  {isAdmin && (
                    <button onClick={() => { setShowCreateChannel(true); setMobileDrawerOpen(false); }} className="text-gray-400 hover:text-gray-600">
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {publicChannels.map((channel: Channel) => (
                    <button
                      key={channel.id}
                      onClick={() => { setActiveChannelId(channel.id); setMobileDrawerOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg ${
                        activeChannelId === channel.id ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center min-w-0">
                        <Hash className={`w-4 h-4 mr-2 shrink-0 ${activeChannelId === channel.id ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="truncate">{channel.name}</span>
                        {channel.isDefault && <span className="ml-1.5 text-[9px] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1 rounded">Standard</span>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* DMs */}
              {dmChannels.length > 0 && (
                <div>
                  <div className="px-2 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direktnachrichten</h3>
                  </div>
                  <div className="space-y-0.5">
                    {dmChannels.map((channel: Channel) => (
                      <button
                        key={channel.id}
                        onClick={() => { setActiveChannelId(channel.id); setMobileDrawerOpen(false); }}
                        className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${
                          activeChannelId === channel.id ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold mr-2 shrink-0">
                          {getDmInitials(channel)}
                        </div>
                        <span className="truncate">{getDmDisplayName(channel)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div>
                <div className="px-2 mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Team</h3>
                </div>
                <div className="space-y-0.5">
                  {seats.filter((s: Seat) => s.id !== user?.id).map((seat: Seat) => (
                    <button
                      key={seat.id}
                      onClick={() => handleOpenDM(seat.id)}
                      className="w-full flex items-center px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                    >
                      <div className="relative mr-2 shrink-0">
                        <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                          {seat.firstName?.charAt(0)}{seat.lastName?.charAt(0)}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5"><PresenceDot status={getPresenceStatus(seat.lastSeenAt)} /></span>
                      </div>
                      <span className="truncate">{seat.firstName} {seat.lastName}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex w-64 flex-col bg-gray-50/50 dark:bg-[#0d0d0d] border-r border-gray-100 dark:border-gray-800">
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Suchen..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-5">
            {/* Channels */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Channels</h3>
                {isAdmin && (
                  <button onClick={() => setShowCreateChannel(true)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Channel erstellen">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {publicChannels.map((channel: Channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannelId(channel.id)}
                    className={`w-full flex items-center px-2 py-1.5 text-sm font-medium rounded-md group ${
                      activeChannelId === channel.id
                        ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <Hash className="w-4 h-4 mr-2 text-gray-400 group-hover:text-gray-500 shrink-0" />
                    <span className="truncate">{channel.name}</span>
                    {channel.isDefault && <span className="ml-auto text-[9px] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1 rounded shrink-0">Standard</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Messages */}
            {dmChannels.length > 0 && (
              <div>
                <div className="px-2 mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direktnachrichten</h3>
                </div>
                <div className="space-y-0.5">
                  {dmChannels.map((channel: Channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setActiveChannelId(channel.id)}
                      className={`w-full flex items-center px-2 py-1.5 text-sm font-medium rounded-md group ${
                        activeChannelId === channel.id
                          ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold mr-2 shrink-0">
                        {getDmInitials(channel)}
                      </div>
                      <span className="truncate">{getDmDisplayName(channel)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Team Members */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Team</h3>
              </div>
              <div className="space-y-0.5">
                {seats.filter((s: Seat) => s.id !== user?.id).map((seat: Seat) => (
                  <button
                    key={seat.id}
                    onClick={() => handleOpenDM(seat.id)}
                    className="w-full flex items-center px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-md cursor-pointer transition-colors"
                  >
                    <div className="relative mr-2 shrink-0">
                      <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                        {seat.firstName?.charAt(0)}{seat.lastName?.charAt(0)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5"><PresenceDot status={getPresenceStatus(seat.lastSeenAt)} /></span>
                    </div>
                    <span className="truncate">{seat.firstName} {seat.lastName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Security badge */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 px-2 py-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <Shield className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-green-700 dark:text-green-400">Ende-zu-Ende verschlüsselt</p>
                <p className="text-[10px] text-green-600/70 dark:text-green-500/70">AES-256 • Nur dein Team</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeChannel ? (
            <>
              {/* Desktop Header */}
              <div className="hidden lg:flex h-11 px-6 items-center justify-between border-b border-gray-100 dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    {activeChannel.type === 'DM' ? (
                      <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[9px] font-bold mr-2 text-gray-600 dark:text-gray-300">
                        {getDmInitials(activeChannel)}
                      </div>
                    ) : (
                      <Hash className="w-5 h-5 text-gray-400 mr-2" />
                    )}
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                      {activeChannel.type === 'DM' ? getDmDisplayName(activeChannel) : activeChannel.name}
                    </h2>
                  </div>
                  {activeChannel.description && activeChannel.type !== 'DM' && (
                    <span className="text-xs text-gray-400 border-l border-gray-200 dark:border-gray-700 pl-3">{activeChannel.description}</span>
                  )}
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <User className="w-4 h-4 mr-1" />
                  {activeChannel._count?.members || 0}
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-3">
                {/* Load More */}
                {hasMore && (
                  <div className="text-center pb-2">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                      {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronUp className="w-3 h-3" />}
                      {loadingMore ? 'Laden...' : 'Ältere Nachrichten laden'}
                    </button>
                  </div>
                )}

                {loadingMessages && messages.length === 0 && (
                  <div className="flex-1 flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                )}

                {!loadingMessages && messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                      {activeChannel.type === 'DM' ? (
                        <User className="w-6 h-6 text-gray-400" />
                      ) : (
                        <Hash className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {activeChannel.type === 'DM'
                        ? `Konversation mit ${getDmDisplayName(activeChannel)}`
                        : `Willkommen in #${activeChannel.name}`
                      }
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activeChannel.type === 'DM'
                        ? 'Schreibe die erste Nachricht.'
                        : 'Schreibe die erste Nachricht in diesem Channel.'
                      }
                    </p>
                  </div>
                )}

                {messages.map((msg) => {
                  const isOwn = msg.user.id === user?.id;
                  const isEditing = editingMessageId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start space-x-2.5 lg:space-x-3 group relative ${msg.isJarvis ? 'bg-blue-50/50 dark:bg-blue-900/10 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2 rounded-lg border-l-2 border-blue-500' : ''}`}
                    >
                      {/* Avatar */}
                      {msg.isJarvis ? (
                        <Image src="/logo-icon-only.png" alt="Jarvis" width={32} height={32} className="w-8 h-8 lg:w-9 lg:h-9 shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 shrink-0 mt-0.5">
                          {msg.user.firstName?.charAt(0)}{msg.user.lastName?.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className={`font-semibold text-sm ${msg.isJarvis ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'} truncate`}>
                            {msg.isJarvis ? 'Jarvis' : `${msg.user.firstName} ${msg.user.lastName}`}
                          </span>
                          {msg.isJarvis && (
                            <span className="text-[9px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded leading-none">KI</span>
                          )}
                          {msg.user.role === 'ADMIN' && !msg.isJarvis && (
                            <span className="text-[9px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded leading-none">Admin</span>
                          )}
                          <span className="text-[10px] lg:text-xs text-gray-400 shrink-0">{formatTime(msg.createdAt)}</span>
                          {msg.editedAt && <span className="text-[10px] text-gray-400 italic">(bearbeitet)</span>}
                        </div>

                        {isEditing ? (
                          <div className="mt-1">
                            <textarea
                              value={editContent}
                              onChange={e => setEditContent(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditMessage(); }
                                if (e.key === 'Escape') setEditingMessageId(null);
                              }}
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm resize-none focus:ring-2 focus:ring-blue-500"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex gap-2 mt-1">
                              <button onClick={handleEditMessage} className="text-xs text-blue-600 hover:underline">Speichern</button>
                              <button onClick={() => setEditingMessageId(null)} className="text-xs text-gray-400 hover:underline">Abbrechen</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 break-words whitespace-pre-wrap">
                            {parseMentions(msg.content)}
                          </p>
                        )}
                      </div>

                      {/* Message actions (hover) */}
                      {(isOwn || isAdmin) && !isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-0">
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setMenuMessageId(menuMessageId === msg.id ? null : msg.id); }}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {menuMessageId === msg.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 py-1 min-w-[140px]" onClick={e => e.stopPropagation()}>
                                {isOwn && (
                                  <button
                                    onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.content); setMenuMessageId(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> Bearbeiten
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Löschen
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="px-3 pt-3 pb-5 lg:px-5 lg:pt-4 lg:pb-6 safe-bottom relative border-t border-gray-100 dark:border-gray-800">
                {/* Mention autocomplete popup */}
                {showMentions && filteredMentionSeats.length > 0 && (
                  <div className="absolute bottom-full left-3 right-3 lg:left-5 lg:right-5 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {filteredMentionSeats.map((seat: Seat, i: number) => (
                      <button
                        key={seat.id}
                        onClick={() => insertMention(seat)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${i === mentionIndex ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                      >
                        {seat.id === 'jarvis' ? (
                          <Image src="/logo-icon-only.png" alt="Jarvis" width={24} height={24} className="w-6 h-6 shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[10px] font-bold">
                            {seat.firstName?.charAt(0)}{seat.lastName?.charAt(0)}
                          </div>
                        )}
                        <span className={`font-medium ${seat.id === 'jarvis' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          {seat.firstName}{seat.lastName ? ` ${seat.lastName}` : ''}
                        </span>
                        <span className="text-gray-400 text-xs ml-auto">
                          {seat.id === 'jarvis' ? 'KI-Assistent' : seat.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* File Upload Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="relative group">
                        {file.preview ? (
                          <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center">
                            <FileText className="w-7 h-7 text-gray-400" />
                            <span className="text-[9px] text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[68px] px-1">{file.name}</span>
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

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-[16px] lg:text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 resize-none overflow-y-auto"
                  style={{ maxHeight: '8rem', minHeight: '2.75rem' }}
                  placeholder={activeChannel.type === 'DM' ? `Nachricht an ${getDmDisplayName(activeChannel)}...` : `Nachricht an #${activeChannel.name}... (@ für Erwähnungen)`}
                  value={message}
                  onChange={e => handleMessageChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />

                {/* Action bar */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Dateien anhängen"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowMentions(!showMentions); setMentionQuery(''); }}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Erwähnen (@)"
                    >
                      <AtSign className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      message.trim() && !sending
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!message.trim() || sending}
                  >
                    {sending ? (
                      <>
                        Senden
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        Senden
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
              <div className="text-center">
                <Hash className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>Wähle einen Channel aus</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateChannel(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Neuen Channel erstellen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="z.B. Vertrieb, Marketing..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung (optional)</label>
                <input
                  type="text"
                  value={newChannelDesc}
                  onChange={e => setNewChannelDesc(e.target.value)}
                  placeholder="Worum geht es in diesem Channel?"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Alle Team-Mitglieder werden automatisch hinzugefügt.</p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreateChannel(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                Abbrechen
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim() || creatingChannel}
                className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
              >
                {creatingChannel ? 'Wird erstellt...' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
