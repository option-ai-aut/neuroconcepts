'use client';

import { useState, useEffect, useRef } from 'react';
import { Hash, Plus, Search, User, Send, Menu, X, ChevronRight } from 'lucide-react';
import { getChannels, getChannelMessages, sendChannelMessage, getMe, getSeats } from '@/lib/api';
import useSWR from 'swr';

export default function TeamChatPage() {
  const { data: user } = useSWR('/me', getMe);
  const { data: channels = [], mutate: mutateChannels } = useSWR('/channels', getChannels);
  const { data: seats = [] } = useSWR('/seats', getSeats);
  
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set default channel
  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  const { data: messages = [], mutate: mutateMessages } = useSWR(
    activeChannelId ? `/channels/${activeChannelId}/messages` : null,
    () => getChannelMessages(activeChannelId!),
    { refreshInterval: 2000 } // Poll for new messages
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !activeChannelId) return;
    try {
      await sendChannelMessage(activeChannelId, message);
      setMessage('');
      mutateMessages();
    } catch (error) {
      alert('Fehler beim Senden: ' + error);
    }
  };

  const activeChannel = channels.find((c: any) => c.id === activeChannelId);

  return (
    <div className="h-full flex flex-col relative bg-white">
      <div className="pt-2 shrink-0" />

      {/* Mobile: Channel Header with burger menu */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-1.5">
          <Hash className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
            {activeChannel?.name || 'Channel wählen'}
          </span>
        </div>
        <div className="flex items-center text-xs text-gray-400">
          <User className="w-3.5 h-3.5 mr-0.5" />
          {activeChannel?._count?.members || 0}
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-72 bg-white h-full shadow-xl animate-slide-right flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Channels</h2>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Search */}
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Suchen..." 
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-0 rounded-lg text-sm transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-5 pb-8">
              {/* Channels */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">Channels</h3>
                <div className="space-y-0.5">
                  {channels.map((channel: any) => (
                    <button
                      key={channel.id}
                      onClick={() => {
                        setActiveChannelId(channel.id);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg group ${
                        activeChannelId === channel.id 
                          ? 'bg-indigo-50 text-indigo-700' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center min-w-0">
                        <Hash className={`w-4 h-4 mr-2 shrink-0 ${activeChannelId === channel.id ? 'text-indigo-500' : 'text-gray-400'}`} />
                        <span className="truncate">{channel.name}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Messages */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">Direktnachrichten</h3>
                <div className="space-y-0.5">
                  {seats.filter((s: any) => s.id !== user?.id).map((seat: any) => (
                    <button
                      key={seat.id}
                      className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 group"
                    >
                      <div className="relative mr-2">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
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
        {/* Desktop Left Sidebar: Channels & DMs — hidden on mobile */}
        <div className="hidden lg:flex w-64 flex-col bg-gray-50/30">
          <div className="p-4 bg-transparent">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Suchen..." 
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-0 rounded-lg text-sm transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-6">
            {/* Channels */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Channels</h3>
                <button 
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => alert('Channel erstellen noch nicht implementiert')}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-0.5">
                {channels.map((channel: any) => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannelId(channel.id)}
                    className={`w-full flex items-center px-2 py-1.5 text-sm font-medium rounded-md group ${
                      activeChannelId === channel.id 
                        ? 'bg-gray-200 text-gray-900' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Hash className="w-4 h-4 mr-2 text-gray-400 group-hover:text-gray-500" />
                    <span className="truncate"> {channel.name} </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Messages (Mock for now based on seats) */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direktnachrichten</h3>
                <button className="text-gray-400 hover:text-gray-600">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-0.5">
                {seats.filter((s: any) => s.id !== user?.id).map((seat: any) => (
                  <button
                    key={seat.id}
                    className="w-full flex items-center px-2 py-1.5 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 group"
                  >
                    <div className="relative mr-2">
                      <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    </div>
                    <span className="truncate">{seat.firstName} {seat.lastName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {activeChannel ? (
            <>
              {/* Desktop Channel Header — hidden on mobile (mobile has its own above) */}
              <div className="hidden lg:flex px-6 py-3 items-center justify-between">
                <div className="flex items-center">
                  <Hash className="w-5 h-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-bold text-gray-900">{activeChannel.name}</h2>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <User className="w-4 h-4 mr-1" />
                  {activeChannel._count?.members || 0} Mitglieder
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6">
                {messages.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
                    Noch keine Nachrichten in diesem Channel
                  </div>
                )}
                {messages.map((msg: any) => (
                  <div key={msg.id} className="flex items-start space-x-2.5 lg:space-x-3 group">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs lg:text-sm shrink-0">
                      {msg.user.firstName?.charAt(0)}{msg.user.lastName?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline space-x-2">
                        <span className="font-semibold lg:font-bold text-sm text-gray-900 truncate">{msg.user.firstName} {msg.user.lastName}</span>
                        <span className="text-[10px] lg:text-xs text-gray-400 shrink-0">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-gray-800 text-sm mt-0.5 break-words">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 lg:p-4 safe-bottom">
                <div className="bg-gray-50 rounded-xl p-1.5 lg:p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                  <textarea
                    rows={1}
                    className="w-full bg-transparent border-none focus:ring-0 resize-none text-[16px] lg:text-sm p-2"
                    placeholder={`Nachricht an #${activeChannel.name}...`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <div className="flex justify-between items-center px-2 pb-1">
                    <div className="flex space-x-2">
                      {/* Formatting tools could go here */}
                    </div>
                    <button 
                      onClick={handleSendMessage}
                      className={`p-2 rounded-lg transition-colors ${
                        message.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!message.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              Wähle einen Channel aus
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
