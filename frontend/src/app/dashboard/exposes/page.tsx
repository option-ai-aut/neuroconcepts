'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Plus, Search, Edit2, Trash2, Sparkles, Calendar, Eye, ImageIcon, ChevronDown } from 'lucide-react';
import { getExposeTemplates, deleteExposeTemplate, createExposeTemplate, updateExposeTemplate, ExposeTemplate, API_ENDPOINTS, getProperties, Property, getImageUrl } from '@/lib/api';
import { useGlobalState } from '@/context/GlobalStateContext';
import useSWR from 'swr';

// A4 dimensions - MUST match ExposeEditor.tsx exactly
const A4_WIDTH_PX = 595;
const A4_HEIGHT_PX = 842;
const A4_PADDING_PX = 40;

// Block heights for page calculation - MUST match ExposeEditor.tsx
const BLOCK_HEIGHTS: Record<string, number> = {
  hero: 280,
  stats: 100,
  text: 150,
  features: 180,
  highlights: 180,
  gallery: 300,
  floorplan: 350,
  video: 250,
  virtualTour: 250,
  priceTable: 200,
  energyCertificate: 150,
  location: 120,
  contact: 140,
  leadInfo: 120,
  cta: 150,
  quote: 120,
  twoColumn: 200,
  pageBreak: 0,
};

export default function ExposesPage() {
  const { openDrawer, updateExposeEditor, aiActionPerformed } = useGlobalState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [previewProperty, setPreviewProperty] = useState<Property | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch templates from API
  const { data: templates = [], mutate, isValidating } = useSWR<ExposeTemplate[]>(
    API_ENDPOINTS.EXPOSE_TEMPLATES,
    getExposeTemplates,
    { revalidateOnFocus: true, revalidateOnReconnect: true }
  );

  // Revalidate when AI performs an action
  useEffect(() => {
    if (aiActionPerformed) {
      mutate();
    }
  }, [aiActionPerformed, mutate]);

  // Fetch properties for preview
  const { data: properties = [] } = useSWR<Property[]>(
    'properties-for-preview',
    getProperties
  );

  const selectedTemplate = templates.find(t => t.id === selectedId);

  // Don't auto-select property - show raw fields by default
  // User can manually select a property if they want to preview with real data

  // Focus input when editing name
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleCreateTemplate = async () => {
    try {
      const newTemplate = await createExposeTemplate({
        name: 'Neue Vorlage',
        blocks: [],
        theme: 'default',
        isDefault: false,
      });
      mutate();
      setSelectedId(newTemplate.id);
      // Open editor immediately
      handleEditTemplate(newTemplate.id);
    } catch (error) {
      alert('Fehler beim Erstellen: ' + error);
    }
  };

  const handleEditTemplate = (templateId: string) => {
    updateExposeEditor({
      exposeId: undefined,
      propertyId: undefined,
      templateId: templateId,
      isTemplate: true,
    });
    openDrawer('EXPOSE_EDITOR');
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Möchtest du diese Vorlage wirklich löschen?')) return;
    try {
      await deleteExposeTemplate(id);
      mutate();
      if (selectedId === id) setSelectedId(null);
    } catch (error) {
      alert('Fehler beim Löschen: ' + error);
    }
  };

  const handleNameClick = () => {
    if (selectedTemplate) {
      setEditedName(selectedTemplate.name);
      setIsEditingName(true);
    }
  };

  const handleNameSave = async () => {
    if (!selectedTemplate || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }
    
    try {
      await updateExposeTemplate(selectedTemplate.id, { name: editedName.trim() });
      mutate();
      setIsEditingName(false);
    } catch (error) {
      alert('Fehler beim Umbenennen: ' + error);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  // Variable labels for display (German names)
  const VARIABLE_LABELS: Record<string, string> = {
    '{{property.title}}': 'Objekttitel',
    '{{property.address}}': 'Adresse',
    '{{property.city}}': 'Stadt',
    '{{property.zipCode}}': 'PLZ',
    '{{property.price}}': 'Preis',
    '{{property.priceFormatted}}': 'Preis (formatiert)',
    '{{property.rooms}}': 'Zimmer',
    '{{property.area}}': 'Wohnfläche',
    '{{property.plotArea}}': 'Grundstück',
    '{{property.bedrooms}}': 'Schlafzimmer',
    '{{property.bathrooms}}': 'Badezimmer',
    '{{property.floor}}': 'Etage',
    '{{property.totalFloors}}': 'Gesamtetagen',
    '{{property.yearBuilt}}': 'Baujahr',
    '{{property.propertyType}}': 'Objektart',
    '{{property.heatingType}}': 'Heizungsart',
    '{{property.energyClass}}': 'Energieklasse',
    '{{property.description}}': 'Beschreibung',
    '{{user.name}}': 'Makler Name',
    '{{user.email}}': 'Makler E-Mail',
    '{{user.phone}}': 'Makler Telefon',
    '{{company.name}}': 'Firmenname',
    '{{lead.name}}': 'Lead Name',
    '{{lead.firstName}}': 'Lead Vorname',
    '{{lead.lastName}}': 'Lead Nachname',
    '{{lead.email}}': 'Lead E-Mail',
    '{{lead.phone}}': 'Lead Telefon',
    '{{lead.greeting}}': 'Anrede',
    '{{date.today}}': 'Heutiges Datum',
    '{{date.year}}': 'Aktuelles Jahr',
  };

  // Replace template variables with preview data OR display as styled chips
  const replaceVariables = (text: string | undefined): string => {
    if (!text) return '';
    
    // If we have a preview property, replace with actual values
    if (previewProperty) {
      const replacements: Record<string, string> = {
        '{{property.title}}': previewProperty.title || '',
        '{{property.address}}': previewProperty.address || '',
        '{{property.city}}': previewProperty.city || '',
        '{{property.price}}': previewProperty.salePrice 
          ? `${previewProperty.salePrice.toLocaleString('de-DE')} €`
          : previewProperty.rentCold 
            ? `${previewProperty.rentCold.toLocaleString('de-DE')} €/Monat`
            : '',
        '{{property.rooms}}': previewProperty.rooms?.toString() || '',
        '{{property.area}}': previewProperty.livingArea ? `${previewProperty.livingArea} m²` : '',
      };
      
      let result = text;
      for (const [variable, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
      }
      return result;
    }
    
    // No preview property - return text as-is (will be rendered with styled chips)
    return text;
  };

  // Render text with variable chips (for display without preview property)
  const renderTextWithVariables = (text: string | undefined): React.ReactNode => {
    if (!text) return null;
    if (previewProperty) return replaceVariables(text);
    
    // Split text by variables and render chips
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    return parts.map((part, i) => {
      if (part.match(/^\{\{[^}]+\}\}$/)) {
        const label = VARIABLE_LABELS[part] || part.replace(/[{}]/g, '');
        return (
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            {label}
          </span>
        );
      }
      return part;
    });
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Gerade eben';
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    return date.toLocaleDateString('de-DE');
  };

  // Calculate pages from blocks - MUST match ExposeEditor.tsx logic
  const calculatePages = useMemo(() => {
    if (!selectedTemplate) return [];
    
    const blocks = selectedTemplate.blocks || [];
    const pages: any[][] = [[]];
    let currentPageHeight = 0;
    const contentHeight = A4_HEIGHT_PX - (A4_PADDING_PX * 2);

    for (const block of blocks) {
      if (block.type === 'pageBreak') {
        pages.push([]);
        currentPageHeight = 0;
        continue;
      }

      const blockHeight = BLOCK_HEIGHTS[block.type] || 100;
      
      if (currentPageHeight + blockHeight > contentHeight && pages[pages.length - 1].length > 0) {
        pages.push([]);
        currentPageHeight = 0;
      }
      
      pages[pages.length - 1].push(block);
      currentPageHeight += blockHeight;
    }

    return pages;
  }, [selectedTemplate]);

  // Get theme colors
  const getThemeColors = () => {
    const theme = selectedTemplate?.theme || 'default';
    const themes: Record<string, { primary: string; secondary: string; accent: string }> = {
      default: { primary: '#111827', secondary: '#1F2937', accent: '#2563EB' },
      modern: { primary: '#111827', secondary: '#0F172A', accent: '#2563EB' },
      elegant: { primary: '#78716C', secondary: '#292524', accent: '#A8A29E' },
      minimal: { primary: '#18181B', secondary: '#27272A', accent: '#52525B' },
    };
    return themes[theme] || themes.default;
  };

  const themeColors = getThemeColors();

  // Render block content - matches ExposeEditor.tsx exactly
  // Use rv() for rendering with variable chips, pv() for plain text replacement
  const renderBlockContent = (block: any) => {
    const pv = (text: string | undefined, fallback: string = '') => replaceVariables(text) || fallback;
    const rv = (text: string | undefined, fallback: string = '') => {
      if (!text) return fallback;
      return renderTextWithVariables(text) || fallback;
    };

    switch (block.type) {
      case 'hero':
        return (
          <div className="relative h-64 bg-black overflow-hidden">
            {block.imageUrl ? (
              <img src={getImageUrl(block.imageUrl || '')} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/30">
                <ImageIcon className="w-16 h-16" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white bg-gradient-to-t from-black/60 via-black/30 to-transparent pt-16">
              <h1 className="text-3xl font-bold mb-2">{rv(block.title, 'Titel eingeben...')}</h1>
              <p className="text-lg opacity-90">{rv(block.subtitle, 'Untertitel eingeben...')}</p>
            </div>
          </div>
        );

      case 'stats':
        const stats = block.items || [
          { label: 'Zimmer', value: '{{property.rooms}}' },
          { label: 'Wohnfläche', value: '{{property.area}} m²' },
          { label: 'Preis', value: '{{property.price}} €' },
        ];
        return (
          <div className="py-6 px-4 bg-gray-50 flex justify-around">
            {stats.map((stat: any, i: number) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold" style={{ color: themeColors.primary }}>{rv(stat.value)}</div>
                <div className="text-sm text-gray-500">{rv(stat.label)}</div>
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <div className={`p-6 ${block.style === 'highlight' ? 'bg-gray-50 border-l-4' : ''}`} style={block.style === 'highlight' ? { borderColor: themeColors.primary } : {}}>
            {block.title && <h3 className="text-lg font-semibold mb-3" style={{ color: themeColors.secondary }}>{rv(block.title)}</h3>}
            <p className="text-gray-600 whitespace-pre-wrap">{rv(block.content, 'Text eingeben...')}</p>
          </div>
        );

      case 'features':
      case 'highlights':
        const items = block.items || [];
        return (
          <div className="p-6">
            {block.title && <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>{rv(block.title)}</h3>}
            <div className="grid grid-cols-2 gap-3">
              {items.length > 0 ? items.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColors.primary }} />
                  <span className="text-sm text-gray-600">{rv(typeof item === 'string' ? item : item.text)}</span>
                </div>
              )) : (
                <span className="text-gray-400 text-sm">Elemente hinzufügen...</span>
              )}
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="p-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-2" style={{ color: themeColors.secondary }}>{rv(block.title, 'Lage')}</h3>
            <p className="text-gray-600 mb-2">{rv(block.address, '{{property.address}}')}</p>
            {block.description && <p className="text-sm text-gray-500">{rv(block.description)}</p>}
          </div>
        );

      case 'contact':
        return (
          <div className="p-6 text-white" style={{ backgroundColor: themeColors.primary }}>
            <h3 className="text-lg font-semibold mb-3">{rv(block.title, 'Ihr Ansprechpartner')}</h3>
            <p>{rv(block.name, '{{user.name}}')}</p>
            <p className="opacity-80">{rv(block.email, '{{user.email}}')}</p>
            {block.phone && <p className="opacity-80">{rv(block.phone)}</p>}
          </div>
        );

      case 'leadInfo':
        return (
          <div className="p-6 bg-gray-50 border-l-4" style={{ borderColor: themeColors.accent }}>
            {block.showGreeting !== false && (
              <p className="text-sm text-gray-500 mb-2">Erstellt für</p>
            )}
            <h3 className="text-lg font-semibold mb-2" style={{ color: themeColors.secondary }}>
              {rv(block.leadName, '{{lead.name}}')}
            </h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>{rv(block.leadEmail, '{{lead.email}}')}</p>
              {block.leadPhone && <p>{rv(block.leadPhone)}</p>}
            </div>
          </div>
        );

      case 'priceTable':
        const priceItems = block.items || [
          { label: 'Kaltmiete', value: '{{property.price}} €' },
          { label: 'Nebenkosten', value: 'ca. 200 €' },
          { label: 'Kaution', value: '3 Monatsmieten' },
        ];
        return (
          <div className="p-6">
            {block.title && <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>{rv(block.title)}</h3>}
            <div className="space-y-2">
              {priceItems.map((item: any, i: number) => (
                <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{rv(item.label)}</span>
                  <span className="font-medium">{rv(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="p-8 text-center bg-gray-50">
            <h3 className="text-xl font-semibold mb-4" style={{ color: themeColors.secondary }}>{rv(block.title, 'Interesse geweckt?')}</h3>
            <button className="px-6 py-3 text-white rounded-lg font-medium" style={{ backgroundColor: themeColors.primary }}>
              {rv(block.buttonText, 'Jetzt Termin vereinbaren')}
            </button>
          </div>
        );

      case 'quote':
        return (
          <div className="p-6 border-l-4" style={{ borderColor: themeColors.accent }}>
            <p className="text-lg italic text-gray-600 mb-2">"{rv(block.text, 'Zitat eingeben...')}"</p>
            {block.author && <p className="text-sm text-gray-500">— {rv(block.author)}</p>}
          </div>
        );

      case 'gallery':
        const images = block.images || [];
        return (
          <div className="p-6">
            <div className={`grid gap-2 ${block.columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {images.length > 0 ? images.map((img: string, i: number) => (
                <div key={i} className="aspect-video bg-gray-200 rounded overflow-hidden">
                  <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                </div>
              )) : (
                <div className="aspect-video bg-gray-200 rounded flex items-center justify-center text-gray-400 col-span-2">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
            </div>
          </div>
        );

      case 'floorplan':
        return (
          <div className="p-6">
            {block.title && <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>{rv(block.title)}</h3>}
            {block.imageUrl ? (
              <img src={getImageUrl(block.imageUrl || '')} alt="Grundriss" className="w-full" />
            ) : (
              <div className="aspect-video bg-gray-200 rounded flex items-center justify-center text-gray-400">
                <ImageIcon className="w-12 h-12" />
              </div>
            )}
          </div>
        );

      case 'twoColumn':
        return (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="prose prose-sm">
                <p className="text-gray-600 whitespace-pre-wrap">{rv(block.leftContent, 'Linke Spalte...')}</p>
              </div>
              <div className="prose prose-sm">
                <p className="text-gray-600 whitespace-pre-wrap">{rv(block.rightContent, 'Rechte Spalte...')}</p>
              </div>
            </div>
          </div>
        );

      case 'energyCertificate':
        return (
          <div className="p-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>Energieausweis</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: themeColors.primary }}>
                {rv(block.energyClass, 'B')}
              </div>
              <div>
                <p className="text-sm text-gray-500">Energieeffizienzklasse</p>
                <p className="font-medium">{rv(block.consumption, '85 kWh/(m²·a)')}</p>
              </div>
            </div>
          </div>
        );

      case 'video':
      case 'virtualTour':
        return (
          <div className="p-6">
            {block.title && <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>{rv(block.title)}</h3>}
            <div className="aspect-video bg-gray-100 rounded flex flex-col items-center justify-center text-gray-500">
              <Eye className="w-12 h-12 mb-2" />
              <span className="text-sm">{block.type === 'video' ? 'Video' : '360° Tour'}</span>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">{block.type}</span>
              {block.title && <span className="text-sm text-gray-600">{pv(block.title)}</span>}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar List */}
        <div className="w-96 flex flex-col bg-white">
          {/* Search */}
          <div className="p-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-0 rounded-md text-sm transition-all"
              />
            </div>
            <button 
              onClick={handleCreateTemplate}
              className="bg-gray-900 text-white p-2 rounded-md hover:bg-gray-800 transition-colors"
              title="Neue Vorlage"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                {templates.length === 0 ? 'Keine Vorlagen vorhanden.' : 'Keine Treffer.'}
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedId(template.id)}
                  className={`w-full text-left p-4 transition-colors flex flex-col gap-1 ${
                    selectedId === template.id 
                      ? 'bg-gray-100/80 rounded-r-lg' 
                      : 'bg-transparent hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-sm font-semibold truncate text-gray-900">
                      {template.name}
                    </span>
                    {template.isDefault && (
                      <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{(template.blocks || []).length} Blöcke • {template.theme}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{formatDate(template.updatedAt)}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content Area - Redesigned */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          {selectedTemplate ? (
            <div className="h-full flex flex-col min-h-0">
              {/* Compact Header with Inline Edit */}
              <div className="px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 flex-1">
                  {isEditingName ? (
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleNameSave}
                      onKeyDown={handleNameKeyDown}
                      className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-gray-300 focus:outline-none px-1"
                    />
                  ) : (
                    <h2 
                      onClick={handleNameClick}
                      className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors px-1"
                      title="Klicken zum Umbenennen"
                    >
                      {selectedTemplate.name}
                    </h2>
                  )}
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    selectedTemplate.isDefault 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedTemplate.isDefault ? 'Standard' : 'Vorlage'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditTemplate(selectedId!)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-medium shadow-sm hover:shadow-md"
                  >
                    <Edit2 className="w-4 h-4" />
                    Bearbeiten
                  </button>
                  <button 
                    onClick={() => handleDeleteTemplate(selectedId!)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Stats Bar - moved to top */}
              {(selectedTemplate.blocks || []).length > 0 && (
                <div className="px-6 py-3 bg-white shrink-0">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Blöcke:</span>
                      <span className="text-sm font-semibold text-gray-900">{(selectedTemplate.blocks || []).length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Seiten:</span>
                      <span className="text-sm font-semibold text-blue-600">{calculatePages.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Theme:</span>
                      <span className="text-sm font-semibold text-gray-900 capitalize">{selectedTemplate.theme || 'Standard'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(selectedTemplate.updatedAt)}
                    </div>
                    
                    {/* Preview Property Selector */}
                    <div className="flex items-center gap-2 ml-auto">
                      <Eye className="w-3 h-3 text-gray-400 shrink-0" />
                      <select
                        value={previewProperty?.id || ''}
                        onChange={(e) => {
                          const prop = properties.find(p => p.id === e.target.value);
                          setPreviewProperty(prop || null);
                        }}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[180px] truncate"
                      >
                        <option value="">Variablen anzeigen</option>
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Area */}
              <div className="flex-1 min-h-0 overflow-y-auto bg-white">
                {(selectedTemplate.blocks || []).length === 0 ? (
                  /* Empty State */
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                      <Sparkles className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Vorlage ist leer</h3>
                    <p className="text-gray-500 mb-6 max-w-sm">
                      Klicke auf "Bearbeiten" um Blöcke hinzuzufügen und dein erstes Exposé zu erstellen.
                    </p>
                    <button 
                      onClick={() => handleEditTemplate(selectedId!)}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-medium shadow-lg"
                    >
                      <Edit2 className="w-5 h-5" />
                      Jetzt bearbeiten
                    </button>
                  </div>
                ) : (
                  /* Live Preview - All Pages */
                  <div className="p-8 flex flex-col items-center gap-8 bg-white">
                    {calculatePages.map((pageBlocks, pageIndex) => (
                      <div key={pageIndex} className="relative">
                        {/* Page Number Badge */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs px-3 py-1 rounded-full z-10">
                          Seite {pageIndex + 1} von {calculatePages.length}
                        </div>
                        
                        {/* A4 Page - exact same dimensions as Editor */}
                        <div 
                          className="bg-white shadow-xl rounded-lg overflow-hidden"
                          style={{ 
                            width: `${A4_WIDTH_PX}px`, 
                            minHeight: `${A4_HEIGHT_PX}px`,
                          }}
                        >
                          {pageBlocks.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-300" style={{ minHeight: `${A4_HEIGHT_PX}px` }}>
                              <span className="text-sm">Leere Seite</span>
                            </div>
                          ) : (
                            <div style={{ minHeight: `${A4_HEIGHT_PX}px` }}>
                              {pageBlocks.map((block: any, blockIndex: number) => (
                                <div key={block.id || blockIndex}>
                                  {renderBlockContent(block)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State - No Template Selected */
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <FileText className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Keine Vorlage ausgewählt</h3>
              <p className="text-gray-500 mb-8 max-w-md">
                Wähle eine Vorlage aus der Liste oder erstelle eine neue, um loszulegen.
              </p>
              <button 
                onClick={handleCreateTemplate}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-medium shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Neue Vorlage erstellen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

