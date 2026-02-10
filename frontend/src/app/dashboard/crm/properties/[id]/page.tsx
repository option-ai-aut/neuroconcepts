'use client';

import { useEffect, useState, use, useRef } from 'react';
import { getProperty, Property, updateProperty, deleteProperty, getExposes, Expose, downloadExposePdf, getExposeTemplates, ExposeTemplate, getAuthHeaders, uploadPropertyDocuments, deletePropertyDocument, DocumentFile } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Building, MapPin, Euro, Maximize, Home, FileText, ArrowLeft, MoreVertical, Trash2, Save, FileImage, Plus, Upload, X, Image as ImageIcon, Globe, Check, Download, File, FileSpreadsheet, FileType, Users, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useGlobalState } from '@/context/GlobalStateContext';
import { getRuntimeConfig } from '@/components/EnvProvider';

// Helper to get full image URL (handles relative /uploads/ paths)
const getImageUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads/')) {
    const config = getRuntimeConfig();
    const apiUrl = config.apiUrl || '';
    return `${apiUrl}${url}`;
  }
  return url;
};

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [exposes, setExposes] = useState<Expose[]>([]);
  const [exposeTemplates, setExposeTemplates] = useState<ExposeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [formData, setFormData] = useState<Partial<Property>>({});
  
  // UI State
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  
  // Image Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const floorplanInputRef = useRef<HTMLInputElement>(null);

  // Portal Sync State
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [portals, setPortals] = useState<any[]>([]);
  const [selectedPortals, setSelectedPortals] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  
  // PDF Download State
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  
  // Document Upload State
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  // Assigned Users State
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [showUserSelector, setShowUserSelector] = useState(false);

  const router = useRouter();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { openDrawer, updateExposeEditor, aiActionPerformed } = useGlobalState();

  useEffect(() => {
    loadProperty();
    loadTeamMembers();
    
    // Close dropdowns when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [id]);
  
  const loadTeamMembers = async () => {
    try {
      const config = getRuntimeConfig();
      const headers = await getAuthHeaders();
      const res = await fetch(`${config.apiUrl}/team`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };
  
  const loadAssignedUsers = async () => {
    try {
      const config = getRuntimeConfig();
      const headers = await getAuthHeaders();
      const res = await fetch(`${config.apiUrl}/properties/${id}/assignments`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAssignedUserIds(data.userIds || []);
      }
    } catch (error) {
      console.error('Error loading assigned users:', error);
    }
  };
  
  const handleToggleUserAssignment = async (userId: string) => {
    const isAssigned = assignedUserIds.includes(userId);
    const newAssignedIds = isAssigned 
      ? assignedUserIds.filter(id => id !== userId)
      : [...assignedUserIds, userId];
    
    setAssignedUserIds(newAssignedIds);
    
    try {
      const config = getRuntimeConfig();
      const headers = await getAuthHeaders();
      await fetch(`${config.apiUrl}/properties/${id}/assignments`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: newAssignedIds }),
      });
    } catch (error) {
      console.error('Error updating assignments:', error);
      // Revert on error
      setAssignedUserIds(assignedUserIds);
    }
  };

  // Reload property when AI performs an action
  useEffect(() => {
    if (aiActionPerformed) {
      loadProperty();
    }
  }, [aiActionPerformed]);

  const handleDeleteProperty = async () => {
    if (!confirm('Möchtest du dieses Objekt wirklich unwiderruflich löschen?')) return;
    try {
      await deleteProperty(id);
      router.push('/dashboard/crm/properties');
    } catch (error) {
      alert('Fehler beim Löschen: ' + error);
    }
  };

  const loadProperty = async () => {
    const [propertyData, exposesData, templatesData] = await Promise.all([
      getProperty(id),
      getExposes(id).catch(() => []),
      getExposeTemplates().catch(() => [])
    ]);
    setProperty(propertyData);
    setFormData(propertyData || {});
    setExposes(exposesData);
    setExposeTemplates(templatesData);
    
    // Load published portals
    if (propertyData?.publishedPortals) {
      setSelectedPortals(propertyData.publishedPortals);
    }
    
    // Load assigned users
    loadAssignedUsers();
    
    setLoading(false);
  };

  const loadPortals = async () => {
    try {
      const config = getRuntimeConfig();
      const res = await fetch(`${config.apiUrl}/portal-connections/effective?userId=${userId}&tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        // Only show connected portals
        setPortals(data.filter((p: any) => p.isConnected));
      }
    } catch (error) {
      console.error('Error loading portals:', error);
    }
  };

  const handleSyncToPortals = async () => {
    if (selectedPortals.length === 0) {
      alert('Bitte wähle mindestens ein Portal aus');
      return;
    }
    
    setSyncing(true);
    try {
      const config = getRuntimeConfig();
      const res = await fetch(`${config.apiUrl}/properties/${id}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalIds: selectedPortals,
          userId,
          tenantId
        })
      });
      
      if (res.ok) {
        const result = await res.json();
        alert(result.message);
        await loadProperty();
        setShowSyncDialog(false);
      }
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Fehler beim Synchronisieren');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenExposeEditor = (exposeId?: string) => {
    updateExposeEditor({ 
      propertyId: id, 
      exposeId: exposeId,
      isTemplate: false 
    });
    openDrawer('EXPOSE_EDITOR');
  };

  const handleDownloadPdf = async (exposeId: string) => {
    setDownloadingPdf(true);
    try {
      await downloadExposePdf(exposeId);
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('PDF-Generierung fehlgeschlagen');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleInputChange = (field: keyof Property, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Debounced Auto-Save
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveProperty(newData);
      }, 1000); // Save after 1 second of inactivity

      return newData;
    });
  };

  const saveProperty = async (data: Partial<Property>) => {
    try {
      await updateProperty(id, data);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  // Image Upload Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent, isFloorplan: boolean = false) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    await uploadImages(files, isFloorplan);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isFloorplan: boolean = false) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    await uploadImages(files, isFloorplan);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const uploadImages = async (files: File[], isFloorplan: boolean = false) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('Bitte nur Bilder hochladen');
      return;
    }

    setUploading(true);
    try {
      const config = getRuntimeConfig();
      const authHeaders = await getAuthHeaders();
      const formData = new FormData();
      imageFiles.forEach(file => formData.append('images', file));
      formData.append('isFloorplan', String(isFloorplan));

      const res = await fetch(`${config.apiUrl}/properties/${id}/images`, {
        method: 'POST',
        headers: {
          'Authorization': (authHeaders as Record<string, string>)['Authorization'] || '',
        },
        body: formData
      });

      if (!res.ok) throw new Error('Upload fehlgeschlagen');
      
      await loadProperty(); // Reload to show new images
    } catch (error) {
      console.error('Upload error:', error);
      alert('Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (imageUrl: string, isFloorplan: boolean = false) => {
    try {
      const config = getRuntimeConfig();
      const authHeaders = await getAuthHeaders();
      await fetch(`${config.apiUrl}/properties/${id}/images`, {
        method: 'DELETE',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, isFloorplan })
      });
      await loadProperty();
    } catch (error) {
      console.error('Remove error:', error);
      alert('Fehler beim Löschen');
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
      await uploadPropertyDocuments(id, files);
      await loadProperty();
    } catch (error) {
      console.error('Document upload error:', error);
      alert('Fehler beim Hochladen');
    } finally {
      setUploadingDocs(false);
    }
  };

  const removeDocument = async (documentId: string) => {
    try {
      await deletePropertyDocument(id, documentId);
      await loadProperty();
    } catch (error) {
      console.error('Document delete error:', error);
      alert('Fehler beim Löschen');
    }
  };

  const downloadDocument = (doc: DocumentFile) => {
    const url = getImageUrl(doc.url);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getDocumentIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-6 h-6 text-red-500" />;
    if (type.includes('word') || type.includes('document')) return <FileType className="w-6 h-6 text-blue-500" />;
    if (type.includes('sheet') || type.includes('excel')) return <FileSpreadsheet className="w-6 h-6 text-green-500" />;
    return <File className="w-6 h-6 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Laden...</div>;
  if (!property) return <div className="p-8 text-center text-red-500">Objekt nicht gefunden.</div>;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="pt-8 px-8 pb-6 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <Link href="/dashboard/crm/properties" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Zurück zu Objekten
            </Link>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {formData.title || 'Unbenanntes Objekt'}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadPortals();
                setShowSyncDialog(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
            >
              <Globe className="w-4 h-4" />
              An Portale senden
              {property?.publishedPortals && property.publishedPortals.length > 0 && (
                <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  {property.publishedPortals.length}
                </span>
              )}
            </button>
            
            <div className="relative" ref={actionMenuRef}>
              <button 
                onClick={() => setActionMenuOpen(!actionMenuOpen)}
                className="p-2 text-gray-400 hover:text-gray-900 rounded-md hover:bg-gray-50 transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {actionMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={handleDeleteProperty}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Löschen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="max-w-6xl space-y-12 pt-12">
          
          {/* Stammdaten */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Stammdaten</h2>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Objekttyp */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Objekttyp</label>
                <select
                  value={formData.propertyType || 'APARTMENT'}
                  onChange={(e) => handleInputChange('propertyType', e.target.value)}
                  className="w-full px-4 py-3 pr-10 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjOUI5QkEyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
                >
                  <option value="APARTMENT">Wohnung</option>
                  <option value="HOUSE">Haus</option>
                  <option value="COMMERCIAL">Gewerbe</option>
                  <option value="LAND">Grundstück</option>
                  <option value="GARAGE">Garage/Stellplatz</option>
                  <option value="OTHER">Sonstiges</option>
                </select>
              </div>

              {/* Kauf/Miete Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Vermarktungsart</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInputChange('marketingType', 'SALE')}
                    className={`flex-1 px-4 py-3 rounded-md font-medium transition-all ${
                      (formData.marketingType || 'SALE') === 'SALE'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Kauf
                  </button>
                  <button
                    onClick={() => handleInputChange('marketingType', 'RENT')}
                    className={`flex-1 px-4 py-3 rounded-md font-medium transition-all ${
                      formData.marketingType === 'RENT'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Miete
                  </button>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-2">Titel (Intern)</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
                />
              </div>

              {/* Assigned Users */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-2">Zuständige Mitarbeiter</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowUserSelector(!showUserSelector)}
                    className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-400" />
                      <span>
                        {assignedUserIds.length === 0 
                          ? 'Keine Mitarbeiter zugewiesen' 
                          : `${assignedUserIds.length} Mitarbeiter zugewiesen`}
                      </span>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showUserSelector ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showUserSelector && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {teamMembers.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">
                          Keine Team-Mitglieder gefunden
                        </div>
                      ) : (
                        teamMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleToggleUserAssignment(member.id)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-indigo-600">
                                  {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-medium text-gray-900">{member.name || 'Unbekannt'}</p>
                                <p className="text-xs text-gray-500">{member.email}</p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              assignedUserIds.includes(member.id) 
                                ? 'bg-indigo-600 border-indigo-600' 
                                : 'border-gray-300'
                            }`}>
                              {assignedUserIds.includes(member.id) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                {/* Show assigned users as tags */}
                {assignedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {assignedUserIds.map((userId) => {
                      const member = teamMembers.find(m => m.id === userId);
                      return member ? (
                        <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                          {member.name || member.email}
                          <button
                            type="button"
                            onClick={() => handleToggleUserAssignment(userId)}
                            className="hover:text-indigo-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-2">Adresse</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">PLZ</label>
                <input
                  type="text"
                  value={formData.zipCode || ''}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Stadt</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
                />
              </div>

              {/* Dynamic Price Fields based on marketingType */}
              {(formData.marketingType || 'SALE') === 'SALE' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Kaufpreis</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Euro className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={formData.salePrice || formData.price || ''}
                      onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value))}
                      className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Kaltmiete</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Euro className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        value={formData.rentCold || ''}
                        onChange={(e) => handleInputChange('rentCold', parseFloat(e.target.value))}
                        className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Nebenkosten</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Euro className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        value={formData.additionalCosts || ''}
                        onChange={(e) => handleInputChange('additionalCosts', parseFloat(e.target.value))}
                        className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Zimmer</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Home className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.rooms || ''}
                    onChange={(e) => handleInputChange('rooms', parseFloat(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Wohnfläche (m²)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Maximize className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={formData.livingArea || formData.area || ''}
                    onChange={(e) => handleInputChange('livingArea', parseFloat(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Baujahr</label>
                <input
                  type="number"
                  value={formData.yearBuilt || ''}
                  onChange={(e) => handleInputChange('yearBuilt', parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Zustand</label>
                <select
                  value={formData.condition || ''}
                  onChange={(e) => handleInputChange('condition', e.target.value)}
                  className="w-full px-4 py-3 pr-10 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjOUI5QkEyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
                >
                  <option value="">Bitte wählen</option>
                  <option value="FIRST_OCCUPANCY">Erstbezug</option>
                  <option value="NEW">Neuwertig</option>
                  <option value="RENOVATED">Renoviert</option>
                  <option value="REFURBISHED">Saniert</option>
                  <option value="WELL_MAINTAINED">Gepflegt</option>
                  <option value="MODERNIZED">Modernisiert</option>
                  <option value="NEEDS_RENOVATION">Renovierungsbedürftig</option>
                </select>
              </div>
            </div>
          </div>

          {/* Energieausweis (GEG §87 Pflicht) */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Energieausweis</h2>
            <p className="text-sm text-gray-500 mb-6">
              Pflichtangaben nach GEG §87 für Immobilienanzeigen
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Art des Energieausweises</label>
                <select
                  value={formData.energyCertificateType || ''}
                  onChange={(e) => handleInputChange('energyCertificateType', e.target.value)}
                  className="w-full px-4 py-3 pr-10 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjOUI5QkEyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
                >
                  <option value="">Bitte wählen</option>
                  <option value="DEMAND">Bedarfsausweis</option>
                  <option value="CONSUMPTION">Verbrauchsausweis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Energieeffizienzklasse</label>
                <select
                  value={formData.energyEfficiencyClass || ''}
                  onChange={(e) => handleInputChange('energyEfficiencyClass', e.target.value)}
                  className="w-full px-4 py-3 pr-10 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjOUI5QkEyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
                >
                  <option value="">Bitte wählen</option>
                  <option value="A_PLUS">A+</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                  <option value="G">G</option>
                  <option value="H">H</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Energieverbrauch (kWh/m²·a)</label>
                <input
                  type="number"
                  value={formData.energyConsumption || ''}
                  onChange={(e) => handleInputChange('energyConsumption', parseFloat(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
                  placeholder="75"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Energieträger</label>
                <input
                  type="text"
                  value={formData.primaryEnergySource || ''}
                  onChange={(e) => handleInputChange('primaryEnergySource', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
                  placeholder="Gas, Fernwärme, etc."
                />
              </div>
            </div>
          </div>

          {/* Beschreibung */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Beschreibung</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Exposé-Text</label>
              <textarea
                rows={6}
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all resize-none"
              />
            </div>
          </div>

          {/* Exposé */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Exposé</h2>
            
            {/* Template Selection for Auto-Generation */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Vorlage für automatische Exposé-Erstellung
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Wenn ein Lead für dieses Objekt eingeht, wird automatisch ein Exposé mit dieser Vorlage erstellt und als PDF beim Lead abgelegt.
              </p>
              <select
                value={formData.defaultExposeTemplateId || ''}
                onChange={(e) => handleInputChange('defaultExposeTemplateId', e.target.value || null)}
                className="w-full px-4 py-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 transition-all"
              >
                <option value="">Keine automatische Erstellung</option>
                {exposeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.isDefault && '(Standard)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Existing Exposes */}
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Erstellte Exposés</h3>

            {exposes.length > 0 ? (
              <div className="space-y-3">
                {exposes.map((expose) => (
                  <div
                    key={expose.id}
                    className="flex items-center justify-between p-4 bg-gray-100 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div 
                      className="flex items-center gap-4 flex-1 cursor-pointer"
                      onClick={() => handleOpenExposeEditor(expose.id)}
                    >
                      <div className="w-12 h-12 bg-indigo-50 rounded-md flex items-center justify-center">
                        <FileImage className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-base font-medium text-gray-900">
                          {expose.template?.name || 'Individuelles Exposé'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {expose.blocks?.length || 0} Blöcke • {expose.status === 'PUBLISHED' ? 'Veröffentlicht' : 'Entwurf'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadPdf(expose.id); }}
                        disabled={downloadingPdf}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-50"
                        title="Als PDF herunterladen"
                      >
                        {downloadingPdf ? (
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
                        ) : (
                          <Download className="w-5 h-5" />
                        )}
                      </button>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        expose.status === 'PUBLISHED' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {expose.status === 'PUBLISHED' ? 'Live' : 'Entwurf'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg">
                <FileImage className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-base">Noch kein Exposé erstellt</p>
                <p className="text-sm mt-1">Klicke auf "Erstellen" um loszulegen</p>
              </div>
            )}
          </div>

          {/* Bilder */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Bilder</h2>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e, false)}
              className="hidden"
            />

            {/* Combined Upload Zone with Images */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, false)}
              className={`border-2 border-dashed rounded-xl p-4 transition-all ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50/50' 
                  : 'border-gray-200 bg-gray-100'
              }`}
            >
              {property.images && property.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {property.images.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square">
                      <img 
                        src={getImageUrl(img)} 
                        alt={`Bild ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(img, false); }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {/* Add More Button */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
                  >
                    <Plus className="w-8 h-8 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Hinzufügen</span>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="py-8 text-center cursor-pointer"
                >
                  <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <p className="text-base text-gray-600 font-medium">
                    {uploading ? 'Wird hochgeladen...' : 'Bilder hierher ziehen oder klicken'}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">JPG, PNG, WEBP bis 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Grundrisse */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Grundrisse</h2>

            <input
              ref={floorplanInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e, true)}
              className="hidden"
            />

            {/* Combined Upload Zone with Floorplans */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, true)}
              className={`border-2 border-dashed rounded-xl p-4 transition-all ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50/50' 
                  : 'border-gray-200 bg-gray-100'
              }`}
            >
              {property.floorplans && property.floorplans.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {property.floorplans.map((fp, idx) => (
                    <div key={idx} className="relative group aspect-square">
                      <img 
                        src={getImageUrl(fp)} 
                        alt={`Grundriss ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(fp, true); }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {/* Add More Button */}
                  <div 
                    onClick={() => floorplanInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
                  >
                    <Plus className="w-8 h-8 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Hinzufügen</span>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => floorplanInputRef.current?.click()}
                  className="py-8 text-center cursor-pointer"
                >
                  <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <p className="text-base text-gray-600 font-medium">
                    {uploading ? 'Wird hochgeladen...' : 'Grundrisse hierher ziehen oder klicken'}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">JPG, PNG, WEBP bis 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Dokumente */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Dokumente</h2>

            <input
              ref={documentInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
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
                <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel bis 10MB</p>
              </div>
            </div>

            {/* Document List */}
            {property.documents && property.documents.length > 0 && (
              <div className="space-y-2">
                {property.documents.map((doc) => (
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
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
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

        </div>
      </div>
      
      {/* Portal Sync Dialog */}
      {showSyncDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">An Portale senden</h2>
              <p className="text-sm text-gray-500 mt-1">
                Wähle die Portale aus, auf denen dieses Objekt veröffentlicht werden soll
              </p>
            </div>
            
            {/* Portal List */}
            <div className="flex-1 overflow-y-auto p-6">
              {portals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Keine Portale verbunden</p>
                  <p className="text-sm mt-1">Gehe zu Einstellungen → Portale um Verbindungen einzurichten</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {portals.map((item: any) => {
                    const isSelected = selectedPortals.includes(item.portal.id);
                    return (
                      <button
                        key={item.portal.id}
                        onClick={() => {
                          setSelectedPortals(prev =>
                            isSelected
                              ? prev.filter(id => id !== item.portal.id)
                              : [...prev, item.portal.id]
                          );
                        }}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.portal.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {item.level === 'user' ? 'Eigener Account' : 'Firmen-Account'}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-5 h-5 text-indigo-600 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {selectedPortals.length} Portal(e) ausgewählt
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSyncDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSyncToPortals}
                  disabled={syncing || selectedPortals.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {syncing ? 'Sende...' : 'Jetzt senden'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
