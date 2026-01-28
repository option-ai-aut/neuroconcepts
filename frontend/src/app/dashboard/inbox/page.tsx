'use client';

import { useState } from 'react';
import { Lead, fetcher, API_ENDPOINTS, sendDraftMessage } from '@/lib/api';
import { RefreshCw, Search, User, Clock, MessageSquare, Send, Mail } from 'lucide-react';
import useSWR from 'swr';
import { useGlobalState } from '@/context/GlobalStateContext';

export default function InboxPage() {
  const { data: leads = [], mutate, isValidating } = useSWR<Lead[]>(API_ENDPOINTS.LEADS, fetcher, { 
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  });
  
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { updateEmailForm, openDrawer } = useGlobalState();

  // Filter leads
  const filteredLeads = leads.filter(lead => 
    lead.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch selected lead details
  const { data: selectedLead, mutate: mutateSelectedLead } = useSWR<Lead>(
    selectedLeadId ? `${API_ENDPOINTS.LEADS}/${selectedLeadId}` : null,
    fetcher
  );

  const handleSendDraft = async (messageId: string) => {
    try {
      await sendDraftMessage(messageId);
      mutateSelectedLead();
      mutate(); // Refresh list as status might change
    } catch (error) {
      alert('Fehler beim Senden: ' + error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Posteingang</h1>
        <button 
          onClick={() => mutate()}
          disabled={isValidating}
          className={`p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all ${isValidating ? 'animate-spin' : ''}`}
          title="Aktualisieren"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Message List */}
        <div className="w-96 border-r border-gray-200 flex flex-col bg-gray-50/30">
          {/* Search */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-0 rounded-lg text-sm transition-all"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                Keine Nachrichten gefunden.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full text-left p-4 hover:bg-white transition-colors flex flex-col gap-1 ${
                      selectedLeadId === lead.id ? 'bg-white border-l-4 border-indigo-600 shadow-sm' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className={`text-sm font-semibold truncate ${selectedLeadId === lead.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                        {lead.firstName} {lead.lastName}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">{lead.email}</div>
                    <div className="text-xs text-gray-400 line-clamp-2 mt-1">
                      {lead.messages?.[0]?.content || 'Keine Nachrichtenvorschau'}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                        lead.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                        lead.status === 'CONTACTED' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {lead.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Detail View */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {selectedLeadId && selectedLead ? (
            <>
              {/* Message Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {selectedLead.firstName?.charAt(0)}{selectedLead.lastName?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedLead.firstName} {selectedLead.lastName}</h2>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Mail className="w-3.5 h-3.5 mr-1.5" />
                      {selectedLead.email}
                      {selectedLead.phone && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{selectedLead.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                   {/* Actions could go here */}
                </div>
              </div>

              {/* Conversation History */}
              <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                <div className="max-w-3xl mx-auto space-y-8">
                  {selectedLead.messages?.map((msg, index) => (
                    <div key={msg.id} className="flex gap-4 group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                        msg.role === 'USER' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {msg.role === 'USER' ? <User className="w-4 h-4" /> : <BotIcon className="w-4 h-4" />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {msg.role === 'USER' ? `${selectedLead.firstName} ${selectedLead.lastName}` : 'Jarvis'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          msg.role === 'USER' 
                            ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-none' 
                            : msg.status === 'DRAFT'
                              ? 'bg-amber-50 border border-amber-200 text-gray-800 rounded-tl-none'
                              : 'bg-indigo-50 border border-indigo-100 text-gray-800 rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          
                          {msg.status === 'DRAFT' && (
                            <div className="mt-3 pt-3 border-t border-amber-200/50 flex justify-end">
                              <button
                                onClick={() => handleSendDraft(msg.id)}
                                className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center"
                              >
                                <Send className="w-3 h-3 mr-1.5" />
                                Entwurf senden
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Reply Action */}
                  <div className="pl-12">
                    <button
                      onClick={() => {
                        updateEmailForm({ leadId: selectedLead.id });
                        openDrawer('EMAIL');
                      }}
                      className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Antworten...
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-500">Wähle eine Nachricht aus</p>
              <p className="text-sm">Details werden hier angezeigt.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
