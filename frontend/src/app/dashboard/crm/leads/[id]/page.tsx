'use client';

import { useEffect, useState, use, useRef } from 'react';
import { getLead, Lead, sendDraftMessage, updateLead, sendManualEmail, deleteLead, uploadLeadDocuments, deleteLeadDocument, DocumentFile, getAuthHeaders } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Mail, Phone, User, Send, MessageSquare, FileText, ArrowLeft, MoreVertical, Calendar, Clock, ChevronDown, Plus, Trash2, Euro, Home, MapPin, Building, Activity, CheckCircle2, Edit3, FileCheck, Upload, Download, File, FileSpreadsheet, FileType, X, Users } from 'lucide-react';
import Link from 'next/link';
import { useGlobalState } from '@/context/GlobalStateContext';
import { getRuntimeConfig } from '@/components/EnvProvider';

// Helper to get full file URL
const getFileUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads/')) {
    const config = getRuntimeConfig();
    const apiUrl = config.apiUrl || '';
    return `${apiUrl}${url}`;
  }
  return url;
};

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { openDrawer, updateEmailForm } = useGlobalState();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  
  // Edit State
  const [formData, setFormData] = useState<Partial<Lead>>({});

  // UI State
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  
  // Document Upload State
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  // Assigned Property & Users State
  const [assignedProperty, setAssignedProperty] = useState<any>(null);
  const [assignedUsers, setAssignedUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);

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

  const loadLead = async () => {
    try {
      const data = await getLead(id);
      setLead(data);
      setFormData(data || {});
      
      // Load activities
      const config = getRuntimeConfig();
      const headers = await getAuthHeaders();
      const res = await fetch(`${config.apiUrl}/leads/${id}/activities`, { headers });
      if (res.ok) {
        const activitiesData = await res.json();
        setActivities(activitiesData);
      }
      
      // Load assigned property and users if lead has a propertyId
      if (data?.propertyId) {
        await loadPropertyAndUsers(data.propertyId);
      } else {
        setAssignedProperty(null);
        setAssignedUsers([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading lead:', error);
      setLoading(false);
    }
  };
  
  const loadPropertyAndUsers = async (propertyId: string) => {
    try {
      const config = getRuntimeConfig();
      const headers = await getAuthHeaders();
      
      // Load property details
      const propRes = await fetch(`${config.apiUrl}/properties/${propertyId}`, { headers });
      if (propRes.ok) {
        const propData = await propRes.json();
        setAssignedProperty(propData);
      }
      
      // Load assigned users
      const assignRes = await fetch(`${config.apiUrl}/properties/${propertyId}/assignments`, { headers });
      if (assignRes.ok) {
        const assignData = await assignRes.json();
        setAssignedUsers(assignData.users || []);
      }
    } catch (error) {
      console.error('Error loading property/users:', error);
    }
  };

  const handleInputChange = (field: keyof Lead, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Debounced Auto-Save
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveLead(newData);
      }, 1000);

      return newData;
    });
  };

  const saveLead = async (data: Partial<Lead>) => {
    try {
      await updateLead(id, data);
      // Reload activities after update
      const config = getRuntimeConfig();
      const res = await fetch(`${config.apiUrl}/leads/${id}/activities`);
      if (res.ok) {
        const activitiesData = await res.json();
        setActivities(activitiesData);
      }
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

  // Document upload handlers
  const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    await uploadDocuments(files);
    e.target.value = '';
  };

  const uploadDocuments = async (files: File[]) => {
    if (files.length === 0) return;
    
    setUploadingDocs(true);
    try {
      await uploadLeadDocuments(id, files);
      await loadLead();
    } catch (error) {
      console.error('Document upload error:', error);
      alert('Fehler beim Hochladen');
    } finally {
      setUploadingDocs(false);
    }
  };

  const removeDocument = async (documentId: string) => {
    try {
      await deleteLeadDocument(id, documentId);
      await loadLead();
    } catch (error) {
      console.error('Document delete error:', error);
      alert('Fehler beim Löschen');
    }
  };

  const downloadDocument = (doc: DocumentFile) => {
    const url = getFileUrl(doc.url);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getDocumentIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (type.includes('word') || type.includes('document')) return <FileType className="w-5 h-5 text-blue-500" />;
    if (type.includes('sheet') || type.includes('excel')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Lead stages for pipeline
  const LEAD_STAGES = [
    { id: 'NEW', label: 'Neu', color: 'blue' },
    { id: 'CONTACTED', label: 'Kontaktiert', color: 'yellow' },
    { id: 'CONVERSATION', label: 'Im Gespräch', color: 'gray' },
    { id: 'BOOKED', label: 'Termin', color: 'gray' },
    { id: 'WON', label: 'Abschluss', color: 'green' },
  ];

  const getCurrentStageIndex = () => {
    if (formData.status === 'LOST') return -1;
    if (formData.status === 'WON') return LEAD_STAGES.length - 1;
    return LEAD_STAGES.findIndex(s => s.id === formData.status);
  };

  const handleStageClick = (stageId: string) => {
    // If clicking on a previous stage, confirm
    const currentIndex = getCurrentStageIndex();
    const newIndex = LEAD_STAGES.findIndex(s => s.id === stageId);
    
    if (newIndex < currentIndex && currentIndex !== -1) {
      if (!confirm('Möchtest du den Status wirklich zurücksetzen?')) return;
    }
    
    handleInputChange('status', stageId);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Laden...</div>;
  if (!lead) return <div className="p-8 text-center text-red-500">Lead nicht gefunden.</div>;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="pt-8 px-8 pb-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link href="/dashboard/crm/leads" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Zurück zu Leads
            </Link>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {formData.firstName} {formData.lastName}
            </h1>
            <p className="text-sm text-gray-500 mt-2">{formData.email}</p>
          </div>
        
          <div className="flex items-center gap-4">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer transition-all font-medium text-sm ${
                formData.status === 'NEW' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                formData.status === 'CONTACTED' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                formData.status === 'CONVERSATION' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' :
                formData.status === 'BOOKED' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                formData.status === 'WON' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
              <span>
                {formData.status === 'NEW' && 'Neu'}
                {formData.status === 'CONTACTED' && 'Kontaktiert'}
                {formData.status === 'CONVERSATION' && 'Im Gespräch'}
                {formData.status === 'BOOKED' && 'Termin gebucht'}
                {formData.status === 'WON' && 'Abgeschlossen'}
                {formData.status === 'LOST' && 'Verloren'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {statusDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                {[
                  { value: 'NEW', label: 'Neu', color: 'text-blue-700 hover:bg-blue-50' },
                  { value: 'CONTACTED', label: 'Kontaktiert', color: 'text-yellow-700 hover:bg-yellow-50' },
                  { value: 'CONVERSATION', label: 'Im Gespräch', color: 'text-gray-700 hover:bg-gray-50' },
                  { value: 'BOOKED', label: 'Termin gebucht', color: 'text-gray-700 hover:bg-gray-50' },
                  { value: 'WON', label: 'Abgeschlossen', color: 'text-emerald-700 hover:bg-emerald-50' },
                  { value: 'LOST', label: 'Verloren', color: 'text-gray-700 hover:bg-gray-50' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      handleInputChange('status', option.value);
                      setStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-between ${option.color}`}
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
              className="p-2 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {actionMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
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

        {/* Lead Pipeline */}
        {formData.status !== 'LOST' && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-end gap-0">
              {LEAD_STAGES.map((stage, index) => {
                const currentIndex = getCurrentStageIndex();
                const isActive = index === currentIndex;
                const isCompleted = index < currentIndex;

                // Get stage-specific colors
                const getBarColor = () => {
                  if (isCompleted) return 'bg-green-500';
                  if (!isActive) return 'bg-gray-200';
                  switch (stage.color) {
                    case 'blue': return 'bg-blue-500';
                    case 'yellow': return 'bg-yellow-500';
                    case 'purple': return 'bg-gray-400';
                    case 'indigo': return 'bg-gray-800';
                    case 'green': return 'bg-green-500';
                    default: return 'bg-gray-400';
                  }
                };

                const getDotColor = () => {
                  if (isCompleted) return 'bg-green-500 border-green-500';
                  if (!isActive) return 'bg-white border-gray-300 group-hover:border-gray-400';
                  switch (stage.color) {
                    case 'blue': return 'bg-blue-500 border-blue-500';
                    case 'yellow': return 'bg-yellow-500 border-yellow-500';
                    case 'purple': return 'bg-gray-400 border-gray-400';
                    case 'indigo': return 'bg-gray-800 border-gray-800';
                    case 'green': return 'bg-green-500 border-green-500';
                    default: return 'bg-gray-400 border-gray-400';
                  }
                };

                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStageClick(stage.id)}
                    className="flex-1 relative group"
                  >
                    {/* Label above */}
                    <div className={`text-xs font-medium mb-4 text-center transition-colors ${
                      isActive ? 'text-gray-900 font-semibold' :
                      isCompleted ? 'text-green-600' :
                      'text-gray-400'
                    }`}>
                      {stage.label}
                    </div>
                    {/* Progress bar - full width, no gaps */}
                    <div className={`h-1.5 transition-all ${getBarColor()} ${
                      index === 0 ? 'rounded-l-full' : ''
                    } ${
                      index === LEAD_STAGES.length - 1 ? 'rounded-r-full' : ''
                    }`} />
                    {/* Dot indicator centered on bar */}
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${getDotColor()}`}>
                      {isCompleted && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {formData.status === 'LOST' && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 text-gray-500">
              <X className="w-4 h-4" />
              <span className="text-sm">Lead wurde als verloren markiert</span>
            </div>
          </div>
        )}
        
        {/* Assigned Property & Users */}
        {assignedProperty && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <Link 
                    href={`/dashboard/crm/properties/${assignedProperty.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {assignedProperty.title}
                  </Link>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-500">{assignedProperty.address}</span>
                </div>
              </div>
              
              {assignedUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Zuständig:</span>
                  <div className="flex items-center gap-1">
                    {assignedUsers.map((user, index) => (
                      <span key={user.id} className="inline-flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {user.name || user.email}
                        </span>
                        {index < assignedUsers.length - 1 && <span className="text-gray-300">,</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="max-w-6xl space-y-12 pt-12">
          
          {/* Kontaktdaten */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Kontaktdaten</h2>
            
            <div className="grid grid-cols-5 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Anrede</label>
                <select
                  value={formData.salutation || 'NONE'}
                  onChange={(e) => handleInputChange('salutation', e.target.value)}
                  className="w-full px-4 py-3 pr-10 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjOUI5QkEyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
                >
                  <option value="NONE">Keine</option>
                  <option value="MR">Herr</option>
                  <option value="MS">Frau</option>
                  <option value="DIVERSE">Divers</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-500 mb-2">Ansprache</label>
                <div className="flex items-center h-[50px]">
                  <button
                    type="button"
                    onClick={() => handleInputChange('formalAddress', true)}
                    className={`px-4 py-2 text-sm font-medium rounded-l-md border transition-colors ${
                      formData.formalAddress !== false
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Per Sie
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('formalAddress', false)}
                    className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b transition-colors ${
                      formData.formalAddress === false
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Per Du
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Vorname</label>
                <input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-2">Nachname</label>
                <input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">E-Mail</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Telefon</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Käufer-Präferenzen */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Käufer-Präferenzen</h2>
            <p className="text-sm text-gray-500 mb-6">
              Für automatisches Matching mit passenden Objekten
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Budget Min (€)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Euro className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={formData.budgetMin || ''}
                    onChange={(e) => handleInputChange('budgetMin', parseFloat(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Budget Max (€)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Euro className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={formData.budgetMax || ''}
                    onChange={(e) => handleInputChange('budgetMax', parseFloat(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Gewünschte Objektart</label>
                <select
                  value={formData.preferredType || ''}
                  onChange={(e) => handleInputChange('preferredType', e.target.value)}
                  className="w-full px-4 py-3 pr-10 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjOUI5QkEyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
                >
                  <option value="">Keine Präferenz</option>
                  <option value="APARTMENT">Wohnung</option>
                  <option value="HOUSE">Haus</option>
                  <option value="COMMERCIAL">Gewerbe</option>
                  <option value="LAND">Grundstück</option>
                  <option value="GARAGE">Garage/Stellplatz</option>
                  <option value="OTHER">Sonstiges</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Gewünschte Lage</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.preferredLocation || ''}
                    onChange={(e) => handleInputChange('preferredLocation', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Min. Zimmer</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Home className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.minRooms || ''}
                    onChange={(e) => handleInputChange('minRooms', parseFloat(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Min. Wohnfläche (m²)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={formData.minArea || ''}
                    onChange={(e) => handleInputChange('minArea', parseFloat(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Zeitrahmen</label>
                <select
                  value={formData.timeFrame || ''}
                  onChange={(e) => handleInputChange('timeFrame', e.target.value)}
                  className="w-full px-4 py-3 pr-10 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjOUI5QkEyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
                >
                  <option value="">Bitte wählen</option>
                  <option value="IMMEDIATE">Sofort</option>
                  <option value="THREE_MONTHS">1-3 Monate</option>
                  <option value="SIX_MONTHS">3-6 Monate</option>
                  <option value="TWELVE_MONTHS">6-12 Monate</option>
                  <option value="LONGTERM">&gt;12 Monate</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Finanzierungsstatus</label>
                <select
                  value={formData.financingStatus || 'NOT_CLARIFIED'}
                  onChange={(e) => handleInputChange('financingStatus', e.target.value)}
                  className="w-full px-4 py-3 pr-10 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjOUI5QkEyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
                >
                  <option value="NOT_CLARIFIED">Noch nicht geklärt</option>
                  <option value="PRE_QUALIFIED">Vorqualifiziert</option>
                  <option value="APPROVED">Genehmigt</option>
                  <option value="CASH_BUYER">Barzahler</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lead-Quelle */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Lead-Quelle</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Quelle</label>
                <select
                  value={formData.source || 'WEBSITE'}
                  onChange={(e) => handleInputChange('source', e.target.value)}
                  className="w-full px-4 py-3 pr-10 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjOUI5QkEyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
                >
                  <option value="WEBSITE">Eigene Website</option>
                  <option value="PORTAL">Immobilienportal</option>
                  <option value="REFERRAL">Empfehlung</option>
                  <option value="SOCIAL_MEDIA">Social Media</option>
                  <option value="COLD_CALL">Kaltakquise</option>
                  <option value="EVENT">Veranstaltung</option>
                  <option value="OTHER">Sonstiges</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Details zur Quelle</label>
                <input
                  type="text"
                  value={formData.sourceDetails || ''}
                  onChange={(e) => handleInputChange('sourceDetails', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Notizen */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Interne Notizen</h2>
            <p className="text-sm text-gray-500 mb-6">
              Nur für das Team sichtbar
            </p>
            <div>
              <textarea
                rows={6}
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 transition-all resize-none"
              />
            </div>
          </div>

          {/* Dokumente */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dokumente</h2>
            <p className="text-sm text-gray-500 mb-6">
              Führerschein, Pass, Mietverträge, etc.
            </p>

            <input
              ref={documentInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png"
              onChange={handleDocumentSelect}
              className="hidden"
            />

            {/* Document Upload Zone */}
            <div
              onClick={() => documentInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer border-gray-200 bg-gray-100 hover:bg-gray-50 mb-4"
            >
              <div className="py-4 text-center">
                <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 font-medium">
                  {uploadingDocs ? 'Wird hochgeladen...' : 'Dokumente hochladen'}
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Bilder bis 10MB</p>
              </div>
            </div>

            {/* Document List */}
            {lead.documents && lead.documents.length > 0 && (
              <div className="space-y-2">
                {lead.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getDocumentIcon(doc.type)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(doc.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => downloadDocument(doc)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                        title="Herunterladen"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aktivitäten */}
          <div>
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Aktivitäten</h2>
              <button
                onClick={() => {
                  updateEmailForm({ leadId: lead.id });
                  openDrawer('EMAIL');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
              >
                <Mail className="w-4 h-4" />
                E-Mail schreiben
              </button>
            </div>

            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              <div className="space-y-6">
                {activities.length > 0 ? (
                  activities.map((activity, index) => {
                    const isLast = index === activities.length - 1;
                    
                    // Icon & Color based on type
                    let icon = <Activity className="w-4 h-4" />;
                    let iconBg = 'bg-gray-100 text-gray-600';
                    
                    if (activity.type === 'LEAD_CREATED') {
                      icon = <CheckCircle2 className="w-4 h-4" />;
                      iconBg = 'bg-green-100 text-green-600';
                    } else if (activity.type === 'STATUS_CHANGED') {
                      icon = <Activity className="w-4 h-4" />;
                      iconBg = 'bg-blue-100 text-blue-600';
                    } else if (activity.type === 'EMAIL_SENT') {
                      icon = <Send className="w-4 h-4" />;
                      iconBg = 'bg-gray-100 text-gray-600';
                    } else if (activity.type === 'EMAIL_RECEIVED') {
                      icon = <Mail className="w-4 h-4" />;
                      iconBg = 'bg-gray-100 text-gray-600';
                    } else if (activity.type === 'NOTE_ADDED') {
                      icon = <FileText className="w-4 h-4" />;
                      iconBg = 'bg-yellow-100 text-yellow-600';
                    } else if (activity.type === 'FIELD_UPDATED') {
                      icon = <Edit3 className="w-4 h-4" />;
                      iconBg = 'bg-gray-100 text-gray-600';
                    }
                    
                    return (
                      <div key={activity.id} className="relative pl-16">
                        {/* Icon */}
                        <div className={`absolute left-0 w-12 h-12 rounded-md ${iconBg} flex items-center justify-center shadow-sm z-10`}>
                          {icon}
                        </div>
                        
                        {/* Content */}
                        <div className={`bg-white rounded-md p-4 border border-gray-200 ${!isLast ? 'mb-6' : ''}`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {activity.description}
                            </span>
                            <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                              {new Date(activity.createdAt).toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          {/* Email Content */}
                          {activity.content && (
                            <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                              {activity.content}
                            </p>
                          )}
                          
                          {/* Draft Actions */}
                          {activity.status === 'DRAFT' && (
                            <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                              <button
                                onClick={() => handleSendDraft(activity.id)}
                                className="text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-md transition-colors flex items-center"
                              >
                                <Send className="w-3 h-3 mr-1.5" />
                                Senden
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Noch keine Aktivitäten vorhanden
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
