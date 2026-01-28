'use client';

import { useEffect, useState, use, useRef } from 'react';
import { getProperty, Property, updateProperty, deleteProperty } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Building, MapPin, Euro, Maximize, Home, FileText, ArrowLeft, MoreVertical, Trash2, Save } from 'lucide-react';
import Link from 'next/link';

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [formData, setFormData] = useState<Partial<Property>>({});
  
  // UI State
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadProperty();
    
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

  const handleDeleteProperty = async () => {
    if (!confirm('Möchtest du dieses Objekt wirklich unwiderruflich löschen?')) return;
    try {
      await deleteProperty(id);
      router.push('/dashboard/crm/properties');
    } catch (error) {
      alert('Fehler beim Löschen: ' + error);
    }
  };

  const loadProperty = () => {
    getProperty(id).then((data) => {
      setProperty(data);
      setFormData(data || {});
      setLoading(false);
    });
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

  if (loading) return <div className="p-8 text-center text-gray-500">Laden...</div>;
  if (!property) return <div className="p-8 text-center text-red-500">Objekt nicht gefunden.</div>;

  return (
    <div className="h-full flex flex-col bg-gray-50/30">
      {/* Top Bar */}
      <div className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center">
          <Link href="/dashboard/crm/properties" className="mr-4 p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900 truncate max-w-md">
            {formData.title || 'Unbenanntes Objekt'}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
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
                  onClick={handleDeleteProperty}
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

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Basic Info Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2 text-indigo-600" />
              Stammdaten
            </h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel (Intern)</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="z.B. Penthouse Wien Mitte"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="Musterstraße 1, 1010 Wien"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preis (€)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Euro className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zimmer</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Home className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={formData.rooms || ''}
                      onChange={(e) => handleInputChange('rooms', parseFloat(e.target.value))}
                      className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fläche (m²)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Maximize className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={formData.area || ''}
                      onChange={(e) => handleInputChange('area', parseFloat(e.target.value))}
                      className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-600" />
              Beschreibung
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung (Exposé-Text)</label>
                <textarea
                  rows={6}
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="Detaillierte Beschreibung der Immobilie..."
                />
              </div>
            </div>
          </div>

          {/* AI Context Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-indigo-600 mr-2">✨</span>
                Jarvis-Kontext
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fakten für Jarvis</label>
                <p className="text-xs text-gray-500 mb-2">
                  Diese Informationen nutzt Jarvis, um Fragen zu beantworten, die nicht in den Stammdaten stehen.
                </p>
                <textarea
                  rows={6}
                  // @ts-ignore
                  value={formData.aiFacts || ''}
                  // @ts-ignore
                  onChange={(e) => handleInputChange('aiFacts', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="- Haustiere erlaubt nach Absprache&#10;- Tiefgarage verfügbar (100€/Monat)&#10;- Frühester Einzug: 01.05.2026&#10;- Keine WG gewünscht"
                />
              </div>
            </div>
          </div>

          {/* Bilder & Dokumente Placeholder */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 border-dashed flex flex-col items-center justify-center text-center h-64">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Bilder & Dokumente</p>
            <p className="text-xs text-gray-400 mt-1">Coming Soon</p>
          </div>

        </div>
      </div>
    </div>
  );
}
