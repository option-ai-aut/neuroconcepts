'use client';

import { useEffect, useState, use, useRef } from 'react';
import { getLead, Lead, sendDraftMessage, updateLead, sendManualEmail, deleteLead } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Mail, Phone, User, Send, MessageSquare, FileText, ArrowLeft, MoreVertical, Calendar, Clock, ChevronDown, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useGlobalState } from '@/context/GlobalStateContext';

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { openDrawer, updateEmailForm } = useGlobalState();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [showNotes, setShowNotes] = useState(false);

  // Email State
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // UI State
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadLead();
    
    // Close dropdowns when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [id]);

  const handleDeleteLead = async () => {
    if (!confirm('Möchtest du diesen Lead wirklich unwiderruflich löschen?')) return;
    try {
      await deleteLead(id);
      router.push('/dashboard/crm/leads');
    } catch (error) {
      alert('Fehler beim Löschen: ' + error);
    }
  };

  const loadLead = () => {
    getLead(id).then((data) => {
      setLead(data);
      setFormData(data || {});
      if (data?.notes) setShowNotes(true);
      setLoading(false);
    });
  };

  const handleInputChange = (field: keyof Lead, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Debounced Auto-Save
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveLead(newData);
      }, 1000); // Save after 1 second of inactivity

      return newData;
    });
  };

  const saveLead = async (data: Partial<Lead>) => {
    try {
      await updateLead(id, data);
      // Optional: Show small "Saved" indicator
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSendDraft = async (messageId: string) => {
    try {
      await sendDraftMessage(messageId);
      loadLead();
    } catch (error) {
      alert('Fehler beim Senden: ' + error);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Laden...</div>;
  if (!lead) return <div className="p-8 text-center text-red-500">Lead nicht gefunden.</div>;

  return (
    <div className="h-full flex flex-col bg-gray-50/30">
      {/* Top Bar */}
      <div className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center">
          <Link href="/dashboard/crm/leads" className="mr-4 p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">
            {formData.firstName} {formData.lastName}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full cursor-pointer transition-all ${
                formData.status === 'NEW' ? 'bg-blue-900/50 text-blue-200 hover:bg-blue-900/70' :
                formData.status === 'CONTACTED' ? 'bg-yellow-900/50 text-yellow-200 hover:bg-yellow-900/70' :
                formData.status === 'CONVERSATION' ? 'bg-purple-900/50 text-purple-200 hover:bg-purple-900/70' :
                formData.status === 'BOOKED' ? 'bg-green-900/50 text-green-200 hover:bg-green-900/70' :
                'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}>
              <span className="text-sm font-semibold">
                {formData.status === 'NEW' && 'Neu'}
                {formData.status === 'CONTACTED' && 'Kontaktiert'}
                {formData.status === 'CONVERSATION' && 'Im Gespräch'}
                {formData.status === 'BOOKED' && 'Termin gebucht'}
                {formData.status === 'LOST' && 'Verloren'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${statusDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>
            
            {/* Custom Dropdown Menu */}
            {statusDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                {[
                  { value: 'NEW', label: 'Neu', color: 'text-blue-300 hover:bg-blue-900/30' },
                  { value: 'CONTACTED', label: 'Kontaktiert', color: 'text-yellow-300 hover:bg-yellow-900/30' },
                  { value: 'CONVERSATION', label: 'Im Gespräch', color: 'text-purple-300 hover:bg-purple-900/30' },
                  { value: 'BOOKED', label: 'Termin gebucht', color: 'text-green-300 hover:bg-green-900/30' },
                  { value: 'LOST', label: 'Verloren', color: 'text-gray-300 hover:bg-gray-700/50' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      handleInputChange('status', option.value);
                      setStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-between ${
                      formData.status === option.value ? 'bg-gray-700/50 ' + option.color : option.color
                    }`}
                  >
                    {option.label}
                    {formData.status === option.value && <div className="w-2 h-2 rounded-full bg-current" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="relative" ref={actionMenuRef}>
            <button 
              onClick={() => setActionMenuOpen(!actionMenuOpen)}
              className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {actionMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={handleDeleteLead}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid grid-cols-12 gap-6 h-full">
          
          {/* Left Column: Compact Info */}
          <div className="col-span-4 flex flex-col space-y-4 overflow-y-auto pr-2">
            
            {/* Profile Card (Compact) */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0">
                  {lead.firstName?.charAt(0)}{lead.lastName?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{lead.firstName} {lead.lastName}</div>
                  <div className="text-sm text-gray-500 truncate">{lead.email}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Phone className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                  <input 
                    type="text" 
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="flex-1 border-none p-0 focus:ring-0 text-gray-700 placeholder-gray-400 bg-transparent text-sm"
                    placeholder="Telefonnummer hinzufügen..."
                  />
                </div>
                <div className="flex items-center text-sm">
                  <Mail className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                  <input 
                    type="text" 
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="flex-1 border-none p-0 focus:ring-0 text-gray-700 placeholder-gray-400 bg-transparent text-sm truncate"
                  />
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                  <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {showNotes ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col transition-all duration-300">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-medium text-gray-900 text-sm flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-gray-400" />
                    Notizen
                  </h3>
                  <button onClick={() => setShowNotes(false)} className="text-xs text-gray-400 hover:text-gray-600">Minimieren</button>
                </div>
                <textarea
                  className="w-full min-h-[150px] p-4 border-none focus:ring-0 bg-yellow-50/30 text-sm leading-relaxed text-gray-700 placeholder-gray-400 resize-y rounded-b-xl"
                  placeholder="Interne Notizen..."
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </div>
            ) : (
              <button 
                onClick={() => setShowNotes(true)}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Notiz hinzufügen
              </button>
            )}

          </div>

          {/* Right Column: Activity Timeline (Main Focus) */}
          <div className="col-span-8 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-indigo-600" />
                Aktivitäten & Kommunikation
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              <div className="space-y-8 max-w-3xl mx-auto">
                {/* Timeline Items */}
                {lead.messages?.map((msg, index) => (
                  <div key={msg.id} className="relative pl-8 pb-2 last:pb-0 group">
                    {/* Timeline Line */}
                    {index !== lead.messages!.length - 1 && (
                      <div className="absolute left-3.5 top-8 bottom-[-2rem] w-0.5 bg-gray-200 group-last:hidden"></div>
                    )}
                    
                    {/* Timeline Icon */}
                    <div className={`absolute left-0 top-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 ${
                      msg.role === 'USER' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {msg.role === 'USER' ? <User className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-900">
                          {msg.role === 'USER' ? 'Nachricht vom Lead' : 'Antwort gesendet'}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      
                      {/* Message Bubble */}
                      <div className={`mt-2 p-4 rounded-xl text-sm border shadow-sm ${
                        msg.role === 'USER' 
                        ? 'bg-white border-gray-200 text-gray-700' 
                        : msg.status === 'DRAFT'
                        ? 'bg-amber-50 border-amber-200 text-gray-800'
                        : 'bg-white border-gray-200 text-gray-800'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        
                        {msg.status === 'DRAFT' && (
                          <div className="mt-3 pt-3 border-t border-amber-200/50 flex justify-end">
                            <button
                              onClick={() => handleSendDraft(msg.id)}
                              className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center"
                            >
                              <Send className="w-3 h-3 mr-1.5" />
                              Senden
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Write Email Action */}
                <div className="relative pl-8 pt-6">
                    <div className="absolute left-0 top-7 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white text-gray-400 z-10">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <button
                      onClick={() => {
                        updateEmailForm({ leadId: lead.id });
                        openDrawer('EMAIL');
                      }}
                      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group"
                    >
                      <span className="text-sm font-medium text-gray-500 group-hover:text-indigo-600 flex items-center">
                        E-Mail schreiben...
                      </span>
                    </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
