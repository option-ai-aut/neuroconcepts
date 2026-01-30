'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Minus, Maximize2, Save, Download, RefreshCw, 
  Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Image, Type, LayoutGrid, MapPin, User, List, Zap,
  Home, DollarSign, Thermometer, Phone, Quote, MousePointer,
  Columns, Video, Eye, Upload, ImageIcon, FileImage
} from 'lucide-react';
import { useGlobalState } from '@/context/GlobalStateContext';
import { 
  getExpose, updateExpose, regenerateExpose, 
  getExposeTemplates, getExposeTemplate, updateExposeTemplate, 
  createExpose, ExposeBlock, Expose, ExposeTemplate, Property,
  downloadExposePdf, downloadTemplatePdf, getProperty
} from '@/lib/api';

// ============================================
// BLOCK TYPE DEFINITIONS
// ============================================

interface BlockTypeDefinition {
  type: string;
  label: string;
  icon: any;
  category: 'header' | 'content' | 'media' | 'data' | 'cta';
  defaultData: Partial<ExposeBlock>;
}

const BLOCK_TYPES: BlockTypeDefinition[] = [
  // Header
  { type: 'hero', label: 'Hero-Bild', icon: Image, category: 'header', defaultData: { title: '', subtitle: '', imageUrl: '' } },
  
  // Content
  { type: 'text', label: 'Textblock', icon: Type, category: 'content', defaultData: { title: '', content: '', style: 'normal' } },
  { type: 'features', label: 'Ausstattung', icon: List, category: 'content', defaultData: { title: 'Ausstattung', items: [] } },
  { type: 'highlights', label: 'Highlights', icon: Zap, category: 'content', defaultData: { title: 'Highlights', items: [] } },
  { type: 'twoColumn', label: 'Zwei Spalten', icon: Columns, category: 'content', defaultData: { leftContent: '', rightContent: '' } },
  { type: 'quote', label: 'Zitat', icon: Quote, category: 'content', defaultData: { text: '', author: '' } },
  
  // Media
  { type: 'gallery', label: 'Bildergalerie', icon: LayoutGrid, category: 'media', defaultData: { images: [], columns: 2 } },
  { type: 'floorplan', label: 'Grundriss', icon: Home, category: 'media', defaultData: { title: 'Grundriss', imageUrl: '' } },
  { type: 'video', label: 'Video', icon: Video, category: 'media', defaultData: { title: '', videoUrl: '' } },
  { type: 'virtualTour', label: '360° Tour', icon: Eye, category: 'media', defaultData: { title: 'Virtuelle Besichtigung', tourUrl: '' } },
  
  // Data
  { type: 'stats', label: 'Eckdaten', icon: LayoutGrid, category: 'data', defaultData: { items: [] } },
  { type: 'priceTable', label: 'Preistabelle', icon: DollarSign, category: 'data', defaultData: { title: 'Kosten', items: [] } },
  { type: 'energyCertificate', label: 'Energieausweis', icon: Thermometer, category: 'data', defaultData: { energyClass: '', consumption: '' } },
  { type: 'location', label: 'Lage', icon: MapPin, category: 'data', defaultData: { title: 'Lage', address: '', description: '' } },
  
  // CTA
  { type: 'contact', label: 'Kontakt', icon: User, category: 'cta', defaultData: { title: 'Ihr Ansprechpartner', name: '', email: '', phone: '' } },
  { type: 'cta', label: 'Call-to-Action', icon: MousePointer, category: 'cta', defaultData: { title: 'Interesse geweckt?', buttonText: 'Jetzt Termin vereinbaren', buttonUrl: '' } },
];

const CATEGORY_LABELS: Record<string, string> = {
  header: 'Header',
  content: 'Inhalt',
  media: 'Medien',
  data: 'Daten',
  cta: 'Aktionen',
};

// ============================================
// THEME DEFINITIONS
// ============================================

interface ThemeDefinition {
  id: string;
  name: string;
  colors: { primary: string; secondary: string; accent: string; background: string };
}

const THEMES: ThemeDefinition[] = [
  { id: 'default', name: 'Standard', colors: { primary: '#4F46E5', secondary: '#1F2937', accent: '#6366F1', background: '#FFFFFF' } },
  { id: 'modern', name: 'Modern', colors: { primary: '#0F172A', secondary: '#334155', accent: '#3B82F6', background: '#F8FAFC' } },
  { id: 'elegant', name: 'Elegant', colors: { primary: '#78350F', secondary: '#451A03', accent: '#D97706', background: '#FFFBEB' } },
  { id: 'minimal', name: 'Minimal', colors: { primary: '#18181B', secondary: '#3F3F46', accent: '#71717A', background: '#FAFAFA' } },
  { id: 'luxury', name: 'Luxus', colors: { primary: '#1C1917', secondary: '#44403C', accent: '#B45309', background: '#FAFAF9' } },
];

// ============================================
// PROPS
// ============================================

interface ExposeEditorProps {
  exposeId?: string;
  propertyId?: string;
  templateId?: string;
  isTemplate?: boolean;
  onClose: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ExposeEditor({ exposeId, propertyId, templateId, isTemplate = false, onClose }: ExposeEditorProps) {
  const { setActiveExposeContext, activeExposeContext } = useGlobalState();
  
  // State
  const [expose, setExpose] = useState<Expose | null>(null);
  const [template, setTemplate] = useState<ExposeTemplate | null>(null);
  const [templates, setTemplates] = useState<ExposeTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [showBlockLibrary, setShowBlockLibrary] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [property, setProperty] = useState<Property | null>(null);
  const [showImagePicker, setShowImagePicker] = useState<{ blockIndex: number; field: string; type: 'image' | 'floorplan' | 'gallery' } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Animate in on mount
  useEffect(() => {
    // Small delay to ensure CSS transition works
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Animated close function
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsVisible(false);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);
  
  // Reload data function (called when AI makes changes)
  const reloadData = useCallback(async () => {
    try {
      if (isTemplate && templateId) {
        const templateData = await getExposeTemplate(templateId);
        setTemplate(templateData);
      } else if (exposeId || expose?.id) {
        const exposeData = await getExpose(exposeId || expose!.id);
        setExpose(exposeData);
      }
    } catch (error) {
      console.error('Error reloading data:', error);
    }
  }, [isTemplate, templateId, exposeId, expose?.id]);

  // Set active context for AI Chat to know what's open
  useEffect(() => {
    const context = {
      exposeId: expose?.id || exposeId,
      propertyId: expose?.propertyId || propertyId,
      templateId: template?.id || templateId,
      isTemplate,
      onBlocksUpdated: reloadData,
    };
    setActiveExposeContext(context);
    
    return () => {
      setActiveExposeContext(null);
    };
  }, [expose?.id, exposeId, propertyId, template?.id, templateId, isTemplate, setActiveExposeContext, reloadData]);

  // Listen for refresh triggers from AI
  useEffect(() => {
    if (activeExposeContext?.onBlocksUpdated && refreshKey > 0) {
      reloadData();
    }
  }, [refreshKey]);

  // Get current blocks and theme
  const currentBlocks = isTemplate ? (template?.blocks as ExposeBlock[] || []) : (expose?.blocks as ExposeBlock[] || []);
  const currentTheme = isTemplate ? (template?.theme || 'default') : (expose?.theme || 'default');
  const themeColors = THEMES.find(t => t.id === currentTheme)?.colors || THEMES[0].colors;

  // ============================================
  // DATA LOADING
  // ============================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (isTemplate && templateId) {
          // Edit existing template
          const templateData = await getExposeTemplate(templateId);
          setTemplate(templateData);
        } else if (exposeId) {
          // Edit existing expose
          const exposeData = await getExpose(exposeId);
          setExpose(exposeData);
          // Load property data for image selection
          if (exposeData?.propertyId) {
            const propertyData = await getProperty(exposeData.propertyId);
            setProperty(propertyData);
          }
        } else if (propertyId) {
          // Create new expose for property - load templates for selection
          const templatesData = await getExposeTemplates();
          setTemplates(templatesData);
          // Also load property data
          const propertyData = await getProperty(propertyId);
          setProperty(propertyData);
        } else if (isTemplate && !templateId) {
          // Create new template
          setTemplate({
            id: '',
            name: 'Neue Vorlage',
            blocks: [],
            theme: 'default',
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [exposeId, propertyId, templateId, isTemplate]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isTemplate && template) {
        await updateExposeTemplate(template.id, {
          name: template.name,
          blocks: template.blocks,
          theme: template.theme,
        });
      } else if (expose) {
        await updateExpose(expose.id, {
          blocks: expose.blocks,
          theme: expose.theme,
          status: expose.status,
        });
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      if (isTemplate && template) {
        await downloadTemplatePdf(template.id);
      } else if (expose) {
        await downloadExposePdf(expose.id);
      }
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('PDF-Generierung fehlgeschlagen');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCreateFromTemplate = async (selectedId: string) => {
    if (!propertyId || !selectedId) return;
    setLoading(true);
    try {
      const newExpose = await createExpose(propertyId, selectedId);
      setExpose(newExpose);
      setTemplates([]);
    } catch (error) {
      console.error('Error creating expose:', error);
      alert('Fehler beim Erstellen des Exposés');
    } finally {
      setLoading(false);
    }
  };

  // Block manipulation
  const updateBlocks = useCallback((newBlocks: ExposeBlock[]) => {
    if (isTemplate && template) {
      setTemplate({ ...template, blocks: newBlocks });
    } else if (expose) {
      setExpose({ ...expose, blocks: newBlocks });
    }
  }, [isTemplate, template, expose]);

  const addBlock = (type: string) => {
    const blockDef = BLOCK_TYPES.find(b => b.type === type);
    if (!blockDef) return;
    
    const newBlock: ExposeBlock = {
      id: `block-${Date.now()}`,
      type,
      ...blockDef.defaultData,
    };
    
    const insertIndex = selectedBlockIndex !== null ? selectedBlockIndex + 1 : currentBlocks.length;
    const newBlocks = [...currentBlocks];
    newBlocks.splice(insertIndex, 0, newBlock);
    updateBlocks(newBlocks);
    setSelectedBlockIndex(insertIndex);
    setShowBlockLibrary(false);
  };

  const deleteBlock = (index: number) => {
    const newBlocks = currentBlocks.filter((_, i) => i !== index);
    updateBlocks(newBlocks);
    setSelectedBlockIndex(null);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentBlocks.length) return;
    
    const newBlocks = [...currentBlocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    updateBlocks(newBlocks);
    setSelectedBlockIndex(newIndex);
  };

  const updateBlock = (index: number, updates: Partial<ExposeBlock>) => {
    const newBlocks = [...currentBlocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    updateBlocks(newBlocks);
  };

  const setTheme = (themeId: string) => {
    if (isTemplate && template) {
      setTemplate({ ...template, theme: themeId });
    } else if (expose) {
      setExpose({ ...expose, theme: themeId });
    }
    setShowThemeSelector(false);
  };

  // ============================================
  // RENDER BLOCK PREVIEW
  // ============================================

  const renderBlockPreview = (block: ExposeBlock, index: number) => {
    const isSelected = selectedBlockIndex === index;
    const blockDef = BLOCK_TYPES.find(b => b.type === block.type);
    const Icon = blockDef?.icon || Type;

    return (
      <div
        key={block.id}
        className={`relative group transition-all duration-200 ${
          isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
        }`}
        onClick={() => setSelectedBlockIndex(index)}
        draggable
        onDragStart={() => setDraggedBlockIndex(index)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          if (draggedBlockIndex !== null && draggedBlockIndex !== index) {
            const newBlocks = [...currentBlocks];
            const [removed] = newBlocks.splice(draggedBlockIndex, 1);
            newBlocks.splice(index, 0, removed);
            updateBlocks(newBlocks);
            setSelectedBlockIndex(index);
          }
          setDraggedBlockIndex(null);
        }}
      >
        {/* Block Controls (on hover) */}
        <div className={`absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`}>
          <button
            onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }}
            disabled={index === 0}
            className="p-1 bg-white rounded shadow hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <div className="p-1 bg-white rounded shadow cursor-grab">
            <GripVertical className="w-3 h-3 text-gray-400" />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }}
            disabled={index === currentBlocks.length - 1}
            className="p-1 bg-white rounded shadow hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); deleteBlock(index); }}
          className={`absolute -right-3 -top-3 p-1.5 bg-red-500 text-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 ${isSelected ? 'opacity-100' : ''}`}
        >
          <Trash2 className="w-3 h-3" />
        </button>

        {/* Block Content */}
        {renderBlockContent(block)}
      </div>
    );
  };

  const renderBlockContent = (block: ExposeBlock) => {
    switch (block.type) {
      case 'hero':
        return (
          <div className="relative h-64 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
            {block.imageUrl && (
              <img src={block.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h1 className="text-3xl font-bold mb-2">{block.title || 'Titel eingeben...'}</h1>
              <p className="text-lg opacity-90">{block.subtitle || 'Untertitel eingeben...'}</p>
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
                <div className="text-2xl font-bold" style={{ color: themeColors.primary }}>{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <div className={`p-6 ${block.style === 'highlight' ? 'bg-gray-50 border-l-4' : ''}`} style={block.style === 'highlight' ? { borderColor: themeColors.primary } : {}}>
            {block.title && <h3 className="text-lg font-semibold mb-3" style={{ color: themeColors.secondary }}>{block.title}</h3>}
            <p className="text-gray-600 whitespace-pre-wrap">{block.content || 'Text eingeben...'}</p>
          </div>
        );

      case 'gallery':
        const images = block.images || [];
        return (
          <div className="p-4">
            <div className={`grid gap-2 ${block.columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {images.length > 0 ? images.slice(0, 4).map((img: string, i: number) => (
                <div key={i} className="aspect-video bg-gray-200 rounded overflow-hidden">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              )) : (
                <>
                  <div className="aspect-video bg-gray-200 rounded flex items-center justify-center text-gray-400">
                    <Image className="w-8 h-8" />
                  </div>
                  <div className="aspect-video bg-gray-200 rounded flex items-center justify-center text-gray-400">
                    <Image className="w-8 h-8" />
                  </div>
                </>
              )}
            </div>
          </div>
        );

      case 'features':
      case 'highlights':
        const items = block.items || [];
        return (
          <div className="p-6">
            {block.title && <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>{block.title}</h3>}
            <div className="grid grid-cols-2 gap-3">
              {items.length > 0 ? items.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColors.primary }} />
                  <span className="text-sm text-gray-600">{typeof item === 'string' ? item : item.text}</span>
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
            <h3 className="text-lg font-semibold mb-2" style={{ color: themeColors.secondary }}>{block.title || 'Lage'}</h3>
            <p className="text-gray-600 mb-2">{block.address || '{{property.address}}'}</p>
            {block.description && <p className="text-sm text-gray-500">{block.description}</p>}
          </div>
        );

      case 'contact':
        return (
          <div className="p-6 text-white" style={{ backgroundColor: themeColors.primary }}>
            <h3 className="text-lg font-semibold mb-3">{block.title || 'Ihr Ansprechpartner'}</h3>
            <p>{block.name || '{{user.name}}'}</p>
            <p className="opacity-80">{block.email || '{{user.email}}'}</p>
            {block.phone && <p className="opacity-80">{block.phone}</p>}
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
            {block.title && <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>{block.title}</h3>}
            <div className="space-y-2">
              {priceItems.map((item: any, i: number) => (
                <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'energyCertificate':
        return (
          <div className="p-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>Energieausweis</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: themeColors.primary }}>
                {block.energyClass || 'B'}
              </div>
              <div>
                <p className="text-sm text-gray-500">Energieeffizienzklasse</p>
                <p className="font-medium">{block.consumption || '85 kWh/(m²·a)'}</p>
              </div>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="p-8 text-center bg-gray-50">
            <h3 className="text-xl font-semibold mb-4" style={{ color: themeColors.secondary }}>{block.title || 'Interesse geweckt?'}</h3>
            <button className="px-6 py-3 text-white rounded-lg font-medium" style={{ backgroundColor: themeColors.primary }}>
              {block.buttonText || 'Jetzt Termin vereinbaren'}
            </button>
          </div>
        );

      case 'quote':
        return (
          <div className="p-6 border-l-4" style={{ borderColor: themeColors.accent }}>
            <p className="text-lg italic text-gray-600 mb-2">"{block.text || 'Zitat eingeben...'}"</p>
            {block.author && <p className="text-sm text-gray-500">— {block.author}</p>}
          </div>
        );

      case 'floorplan':
        return (
          <div className="p-6">
            {block.title && <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>{block.title}</h3>}
            {block.imageUrl ? (
              <img src={block.imageUrl} alt="Grundriss" className="w-full" />
            ) : (
              <div className="aspect-video bg-gray-200 rounded flex items-center justify-center text-gray-400">
                <Home className="w-12 h-12" />
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="p-6 bg-gray-100 text-center text-gray-500">
            Block: {block.type}
          </div>
        );
    }
  };

  // ============================================
  // RENDER BLOCK EDITOR (Right Panel)
  // ============================================

  const renderBlockEditor = () => {
    if (selectedBlockIndex === null) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <Type className="w-12 h-12 mb-4" />
          <p className="text-center">Wähle einen Block aus<br />um ihn zu bearbeiten</p>
        </div>
      );
    }

    const block = currentBlocks[selectedBlockIndex];
    if (!block) return null;

    const blockDef = BLOCK_TYPES.find(b => b.type === block.type);

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b">
          {blockDef && <blockDef.icon className="w-5 h-5 text-gray-500" />}
          <span className="font-medium">{blockDef?.label || block.type}</span>
        </div>

        {/* Common fields based on block type */}
        {(block.type === 'hero' || block.type === 'text' || block.type === 'location' || block.type === 'contact' || block.type === 'priceTable' || block.type === 'features' || block.type === 'highlights' || block.type === 'cta' || block.type === 'floorplan') && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Titel</label>
            <input
              type="text"
              value={block.title || ''}
              onChange={(e) => updateBlock(selectedBlockIndex, { title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Titel eingeben..."
            />
          </div>
        )}

        {block.type === 'hero' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Untertitel</label>
              <input
                type="text"
                value={block.subtitle || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Untertitel eingeben..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hero-Bild</label>
              {block.imageUrl ? (
                <div className="relative group">
                  <img src={block.imageUrl} alt="" className="w-full h-24 object-cover rounded-md" />
                  <button
                    onClick={() => updateBlock(selectedBlockIndex, { imageUrl: '' })}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {isTemplate ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
                      <ImageIcon className="w-4 h-4 inline mr-1" />
                      Wird automatisch aus Objektbildern befüllt
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowImagePicker({ blockIndex: selectedBlockIndex, field: 'imageUrl', type: 'image' })}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-md hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex flex-col items-center gap-2"
                    >
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-sm text-gray-500">Bild auswählen</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {block.type === 'text' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Inhalt</label>
              <textarea
                value={block.content || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { content: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                placeholder="Text eingeben..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Stil</label>
              <select
                value={block.style || 'normal'}
                onChange={(e) => updateBlock(selectedBlockIndex, { style: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="normal">Normal</option>
                <option value="highlight">Hervorgehoben</option>
                <option value="quote">Zitat</option>
              </select>
            </div>
          </>
        )}

        {block.type === 'quote' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Zitat</label>
              <textarea
                value={block.text || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { text: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                placeholder="Zitat eingeben..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Autor</label>
              <input
                type="text"
                value={block.author || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { author: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Name des Autors"
              />
            </div>
          </>
        )}

        {block.type === 'location' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Adresse</label>
              <input
                type="text"
                value={block.address || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="{{property.address}}"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Beschreibung</label>
              <textarea
                value={block.description || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                placeholder="Lagebeschreibung..."
              />
            </div>
          </>
        )}

        {block.type === 'contact' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={block.name || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="{{user.name}}"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">E-Mail</label>
              <input
                type="text"
                value={block.email || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="{{user.email}}"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
              <input
                type="text"
                value={block.phone || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="+49..."
              />
            </div>
          </>
        )}

        {block.type === 'cta' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Button Text</label>
              <input
                type="text"
                value={block.buttonText || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { buttonText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Jetzt Termin vereinbaren"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Button URL</label>
              <input
                type="text"
                value={block.buttonUrl || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { buttonUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://..."
              />
            </div>
          </>
        )}

        {block.type === 'energyCertificate' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Energieeffizienzklasse</label>
              <select
                value={block.energyClass || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { energyClass: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Auswählen...</option>
                {['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Verbrauch</label>
              <input
                type="text"
                value={block.consumption || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { consumption: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="z.B. 85 kWh/(m²·a)"
              />
            </div>
          </>
        )}

        {block.type === 'floorplan' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Grundriss</label>
            {block.imageUrl ? (
              <div className="relative group">
                <img src={block.imageUrl} alt="" className="w-full h-32 object-contain rounded-md bg-gray-100" />
                <button
                  onClick={() => updateBlock(selectedBlockIndex, { imageUrl: '' })}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {isTemplate ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
                    <FileImage className="w-4 h-4 inline mr-1" />
                    Wird automatisch aus Grundrissen befüllt
                  </div>
                ) : (
                  <button
                    onClick={() => setShowImagePicker({ blockIndex: selectedBlockIndex, field: 'imageUrl', type: 'floorplan' })}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-md hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex flex-col items-center gap-2"
                  >
                    <Home className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">Grundriss auswählen</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {(block.type === 'video' || block.type === 'virtualTour') && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {block.type === 'video' ? 'Video-URL' : 'Tour-URL'}
            </label>
            <input
              type="text"
              value={block.videoUrl || block.tourUrl || ''}
              onChange={(e) => updateBlock(selectedBlockIndex, { 
                [block.type === 'video' ? 'videoUrl' : 'tourUrl']: e.target.value 
              })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="https://..."
            />
          </div>
        )}

        {block.type === 'gallery' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Spalten</label>
              <select
                value={block.columns || 2}
                onChange={(e) => updateBlock(selectedBlockIndex, { columns: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={2}>2 Spalten</option>
                <option value={3}>3 Spalten</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bilder</label>
              {isTemplate ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
                  <ImageIcon className="w-4 h-4 inline mr-1" />
                  Wird automatisch aus Objektbildern befüllt
                </div>
              ) : (
                <>
                  {/* Current images */}
                  {(block.images || []).length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {(block.images || []).map((img: string, idx: number) => (
                        <div key={idx} className="relative group">
                          <img src={img} alt="" className="w-full h-16 object-cover rounded" />
                          <button
                            onClick={() => {
                              const newImages = [...(block.images || [])];
                              newImages.splice(idx, 1);
                              updateBlock(selectedBlockIndex, { images: newImages });
                            }}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setShowImagePicker({ blockIndex: selectedBlockIndex, field: 'images', type: 'gallery' })}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Bilder hinzufügen</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  // Determine drawer height based on state
  const getDrawerHeight = () => {
    if (minimized) return 'h-12';
    return 'h-[calc(100vh-1rem)]';
  };

  // Base drawer classes with animation
  const drawerBaseClasses = `fixed bottom-0 left-64 right-80 bg-white shadow-[0_-5px_30px_rgba(0,0,0,0.1)] border-t border-x border-gray-200 rounded-t-xl z-40 transition-all duration-300 ease-out`;
  const drawerTransform = isVisible ? 'translateY(0)' : 'translateY(100%)';

  // Template selection view
  if (!loading && templates.length > 0 && !expose) {
    return (
      <div 
        className={`${drawerBaseClasses} ${getDrawerHeight()}`}
        style={{ transform: drawerTransform }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-12 border-b border-gray-100 rounded-t-xl">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <h3 className="text-gray-900 font-semibold text-sm">Vorlage auswählen</h3>
          </div>
          <button onClick={handleClose} className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template Grid */}
        <div className="p-8 overflow-y-auto h-[calc(100%-48px)]">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Wähle eine Vorlage für dein Exposé</h2>
            <div className="grid grid-cols-3 gap-6">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleCreateFromTemplate(t.id)}
                  className="group p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-lg transition-all text-left"
                >
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                    <LayoutGrid className="w-12 h-12 text-gray-300 group-hover:text-indigo-300 transition-colors" />
                  </div>
                  <h3 className="font-medium text-gray-900">{t.name}</h3>
                  <p className="text-sm text-gray-500">{(t.blocks as any[])?.length || 0} Blöcke</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div 
        className={`${drawerBaseClasses} ${getDrawerHeight()}`}
        style={{ transform: drawerTransform }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Main Editor
  return (
    <div 
      className={`${drawerBaseClasses} ${getDrawerHeight()}`}
      style={{ transform: drawerTransform }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 h-12 border-b border-gray-100 rounded-t-xl cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={minimized ? () => setMinimized(false) : undefined}
      >
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          {isTemplate && template ? (
            <input
              type="text"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="text-gray-900 font-semibold text-sm bg-transparent border-0 focus:ring-0 p-0"
              placeholder="Vorlagenname..."
            />
          ) : (
            <h3 className="text-gray-900 font-semibold text-sm">
              {expose?.property?.title || 'Exposé bearbeiten'}
            </h3>
          )}
          {!isTemplate && expose && (
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              expose.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {expose.status === 'PUBLISHED' ? 'Veröffentlicht' : 'Entwurf'}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {!minimized && (
            <>
              {/* Theme Selector */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowThemeSelector(!showThemeSelector); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <div className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: themeColors.primary }} />
                  <span className="hidden sm:inline">{THEMES.find(t => t.id === currentTheme)?.name}</span>
                </button>
                {showThemeSelector && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={(e) => { e.stopPropagation(); setTheme(theme.id); }}
                        className={`flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-gray-50 ${currentTheme === theme.id ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                        <span>{theme.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Regenerate (only for exposes) */}
              {!isTemplate && expose?.templateId && (
                <button
                  onClick={(e) => { e.stopPropagation(); /* TODO: regenerate */ }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                  title="Vom Template neu generieren"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              {/* Download PDF */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDownloadPdf(); }}
                disabled={pdfLoading}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50"
                title="Als PDF herunterladen"
              >
                {pdfLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>

              {/* Save Button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </>
          )}

          {/* Minimize/Maximize */}
          {minimized ? (
            <button onClick={(e) => { e.stopPropagation(); setMinimized(false); }} className="p-1 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50">
              <Maximize2 className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setMinimized(true); }} className="p-1 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50">
              <Minus className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleClose} className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="flex h-[calc(100%-48px)]">
          {/* Left: Block Library */}
          <div className={`${showBlockLibrary ? 'w-64' : 'w-12'} border-r border-gray-100 bg-gray-50 transition-all duration-200 flex flex-col`}>
            <button
              onClick={() => setShowBlockLibrary(!showBlockLibrary)}
              className="p-3 hover:bg-gray-100 flex items-center gap-2"
            >
              <Plus className="w-5 h-5 text-gray-500" />
              {showBlockLibrary && <span className="text-sm font-medium text-gray-700">Blöcke</span>}
            </button>
            
            {showBlockLibrary && (
              <div className="flex-1 overflow-y-auto p-2">
                {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
                  <div key={category} className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">{label}</h4>
                    <div className="space-y-1">
                      {BLOCK_TYPES.filter(b => b.category === category).map((blockType) => (
                        <button
                          key={blockType.type}
                          onClick={() => addBlock(blockType.type)}
                          className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-white hover:shadow-sm rounded-md transition-all"
                        >
                          <blockType.icon className="w-4 h-4 text-gray-400" />
                          <span>{blockType.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Center: Preview Canvas */}
          <div className="flex-1 bg-gray-100 overflow-hidden flex items-start justify-center p-8">
            <div 
              ref={previewRef}
              className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 12rem)' }}
            >
              {currentBlocks.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <LayoutGrid className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Noch keine Blöcke</p>
                  <p className="text-sm">Füge Blöcke hinzu oder lass Jarvis das Exposé erstellen</p>
                  <button
                    onClick={() => setShowBlockLibrary(true)}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Block hinzufügen
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {currentBlocks.map((block, index) => renderBlockPreview(block, index))}
                </div>
              )}

              {/* Add block button at bottom */}
              {currentBlocks.length > 0 && (
                <button
                  onClick={() => setShowBlockLibrary(true)}
                  className="w-full py-4 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Block hinzufügen</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Block Editor */}
          <div className="w-72 border-l border-gray-100 bg-white overflow-y-auto">
            {renderBlockEditor()}
          </div>
        </div>
      )}

      {/* Image Picker Modal */}
      {showImagePicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {showImagePicker.type === 'floorplan' ? 'Grundriss auswählen' : 'Bild auswählen'}
              </h3>
              <button onClick={() => setShowImagePicker(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Property Images Section */}
              {property && (showImagePicker.type === 'image' || showImagePicker.type === 'gallery') && (property.images?.length || 0) > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Objektbilder
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {property.images?.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (showImagePicker.type === 'gallery') {
                            const currentImages = currentBlocks[showImagePicker.blockIndex]?.images || [];
                            updateBlock(showImagePicker.blockIndex, { images: [...currentImages, img] });
                          } else {
                            updateBlock(showImagePicker.blockIndex, { [showImagePicker.field]: img });
                            setShowImagePicker(null);
                          }
                        }}
                        className="aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-colors"
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Floorplans Section */}
              {property && showImagePicker.type === 'floorplan' && (property.floorplans?.length || 0) > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <FileImage className="w-4 h-4" />
                    Grundrisse
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {property.floorplans?.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          updateBlock(showImagePicker.blockIndex, { [showImagePicker.field]: img });
                          setShowImagePicker(null);
                        }}
                        className="aspect-[4/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-colors bg-gray-50"
                      >
                        <img src={img} alt="" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {(!property || 
                (showImagePicker.type === 'floorplan' && !property.floorplans?.length) ||
                (showImagePicker.type !== 'floorplan' && !property.images?.length)
              ) && (
                <div className="text-center py-8 text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    {showImagePicker.type === 'floorplan' 
                      ? 'Keine Grundrisse beim Objekt hinterlegt'
                      : 'Keine Bilder beim Objekt hinterlegt'
                    }
                  </p>
                  <p className="text-xs mt-1 text-gray-400">
                    Lade Bilder beim Objekt hoch oder gib eine URL ein
                  </p>
                </div>
              )}

              {/* URL Input */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Oder URL eingeben</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const url = (e.target as HTMLInputElement).value;
                        if (url) {
                          if (showImagePicker.type === 'gallery') {
                            const currentImages = currentBlocks[showImagePicker.blockIndex]?.images || [];
                            updateBlock(showImagePicker.blockIndex, { images: [...currentImages, url] });
                          } else {
                            updateBlock(showImagePicker.blockIndex, { [showImagePicker.field]: url });
                          }
                          setShowImagePicker(null);
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="https://..."]') as HTMLInputElement;
                      const url = input?.value;
                      if (url) {
                        if (showImagePicker.type === 'gallery') {
                          const currentImages = currentBlocks[showImagePicker.blockIndex]?.images || [];
                          updateBlock(showImagePicker.blockIndex, { images: [...currentImages, url] });
                        } else {
                          updateBlock(showImagePicker.blockIndex, { [showImagePicker.field]: url });
                        }
                        setShowImagePicker(null);
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>

            {/* Footer for Gallery */}
            {showImagePicker.type === 'gallery' && (
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowImagePicker(null)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                >
                  Fertig
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
