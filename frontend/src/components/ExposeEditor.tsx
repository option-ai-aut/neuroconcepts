'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Minus, Maximize2, Save, Download, RefreshCw, 
  Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Image, Type, LayoutGrid, MapPin, User, List, Zap,
  Home, DollarSign, Thermometer, Phone, Quote, MousePointer,
  Columns, Video, Eye, Upload, ImageIcon, FileImage, BarChart3,
  SeparatorHorizontal, FileText as FilePlus
} from 'lucide-react';
import { useGlobalState } from '@/context/GlobalStateContext';
import { 
  getExpose, updateExpose, regenerateExpose, 
  getExposeTemplates, getExposeTemplate, updateExposeTemplate, 
  createExpose, ExposeBlock, Expose, ExposeTemplate, Property,
  downloadExposePdf, downloadTemplatePdf, getProperty, getProperties
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
  { type: 'features', label: 'Ausstattung', icon: List, category: 'content', defaultData: { title: 'Ausstattung', items: ['Einbauküche', 'Balkon', 'Fußbodenheizung'] } },
  { type: 'highlights', label: 'Highlights', icon: Zap, category: 'content', defaultData: { title: 'Highlights', items: ['Sonnige Südlage', 'Ruhige Wohnlage', 'Moderne Ausstattung'] } },
  { type: 'twoColumn', label: 'Zwei Spalten', icon: Columns, category: 'content', defaultData: { leftContent: '', rightContent: '' } },
  { type: 'quote', label: 'Zitat', icon: Quote, category: 'content', defaultData: { text: '', author: '' } },
  
  // Media
  { type: 'gallery', label: 'Bildergalerie', icon: LayoutGrid, category: 'media', defaultData: { images: [], columns: 2 } },
  { type: 'floorplan', label: 'Grundriss', icon: Home, category: 'media', defaultData: { title: 'Grundriss', imageUrl: '' } },
  { type: 'video', label: 'Video', icon: Video, category: 'media', defaultData: { title: 'Objektvideo', videoUrl: '' } },
  { type: 'virtualTour', label: '360° Tour', icon: Eye, category: 'media', defaultData: { title: 'Virtuelle Besichtigung', tourUrl: '' } },
  
  // Data
  { type: 'stats', label: 'Eckdaten', icon: BarChart3, category: 'data', defaultData: { items: [
    { label: 'Zimmer', value: '{{property.rooms}}' },
    { label: 'Wohnfläche', value: '{{property.area}} m²' },
    { label: 'Preis', value: '{{property.price}} €' }
  ] } },
  { type: 'priceTable', label: 'Preistabelle', icon: DollarSign, category: 'data', defaultData: { title: 'Kosten', items: [
    { label: 'Kaufpreis', value: '{{property.price}} €' },
    { label: 'Provision', value: '3,57% inkl. MwSt.' },
    { label: 'Notarkosten', value: 'ca. 1,5%' }
  ] } },
  { type: 'energyCertificate', label: 'Energieausweis', icon: Thermometer, category: 'data', defaultData: { energyClass: 'B', consumption: '85 kWh/(m²·a)' } },
  { type: 'location', label: 'Lage', icon: MapPin, category: 'data', defaultData: { title: 'Lage & Umgebung', address: '{{property.address}}', description: '' } },
  { type: 'contact', label: 'Makler-Kontakt', icon: User, category: 'data', defaultData: { title: 'Ihr Ansprechpartner', name: '{{user.name}}', email: '{{user.email}}', phone: '{{user.phone}}' } },
  { type: 'leadInfo', label: 'Lead-Daten', icon: User, category: 'data', defaultData: { title: 'Erstellt für', leadName: '{{lead.name}}', leadEmail: '{{lead.email}}', leadPhone: '{{lead.phone}}', showGreeting: true } },
  
  // CTA
  { type: 'cta', label: 'Call-to-Action', icon: MousePointer, category: 'cta', defaultData: { title: 'Interesse geweckt?', buttonText: 'Jetzt Termin vereinbaren', buttonUrl: '' } },
  { type: 'pageBreak', label: 'Seitenumbruch', icon: SeparatorHorizontal, category: 'cta', defaultData: {} },
];

const CATEGORY_LABELS: Record<string, string> = {
  header: 'Header',
  content: 'Inhalt',
  media: 'Medien',
  data: 'Daten',
  cta: 'Aktionen',
};

// ============================================
// TEMPLATE FIELDS (for @-mentions and drag & drop)
// ============================================

interface TemplateField {
  id: string;
  label: string;        // German display name
  variable: string;     // Technical variable {{...}}
  category: 'property' | 'user' | 'lead' | 'date';
  icon: string;         // Emoji for visual
}

const TEMPLATE_FIELDS: TemplateField[] = [
  // Property fields
  { id: 'title', label: 'Objekttitel', variable: '{{property.title}}', category: 'property', icon: '🏠' },
  { id: 'address', label: 'Adresse', variable: '{{property.address}}', category: 'property', icon: '📍' },
  { id: 'city', label: 'Stadt', variable: '{{property.city}}', category: 'property', icon: '🏙️' },
  { id: 'zipCode', label: 'PLZ', variable: '{{property.zipCode}}', category: 'property', icon: '📮' },
  { id: 'price', label: 'Preis', variable: '{{property.price}}', category: 'property', icon: '💰' },
  { id: 'priceFormatted', label: 'Preis (formatiert)', variable: '{{property.priceFormatted}}', category: 'property', icon: '💶' },
  { id: 'rooms', label: 'Zimmer', variable: '{{property.rooms}}', category: 'property', icon: '🚪' },
  { id: 'area', label: 'Wohnfläche (m²)', variable: '{{property.area}}', category: 'property', icon: '📐' },
  { id: 'plotArea', label: 'Grundstück (m²)', variable: '{{property.plotArea}}', category: 'property', icon: '🌳' },
  { id: 'bedrooms', label: 'Schlafzimmer', variable: '{{property.bedrooms}}', category: 'property', icon: '🛏️' },
  { id: 'bathrooms', label: 'Badezimmer', variable: '{{property.bathrooms}}', category: 'property', icon: '🚿' },
  { id: 'floor', label: 'Etage', variable: '{{property.floor}}', category: 'property', icon: '🔢' },
  { id: 'totalFloors', label: 'Gesamtetagen', variable: '{{property.totalFloors}}', category: 'property', icon: '🏢' },
  { id: 'yearBuilt', label: 'Baujahr', variable: '{{property.yearBuilt}}', category: 'property', icon: '📅' },
  { id: 'propertyType', label: 'Objektart', variable: '{{property.propertyType}}', category: 'property', icon: '🏘️' },
  { id: 'heatingType', label: 'Heizungsart', variable: '{{property.heatingType}}', category: 'property', icon: '🔥' },
  { id: 'energyClass', label: 'Energieklasse', variable: '{{property.energyClass}}', category: 'property', icon: '⚡' },
  { id: 'description', label: 'Beschreibung', variable: '{{property.description}}', category: 'property', icon: '📝' },
  
  // User/Agent fields
  { id: 'userName', label: 'Makler Name', variable: '{{user.name}}', category: 'user', icon: '👤' },
  { id: 'userEmail', label: 'Makler E-Mail', variable: '{{user.email}}', category: 'user', icon: '✉️' },
  { id: 'userPhone', label: 'Makler Telefon', variable: '{{user.phone}}', category: 'user', icon: '📞' },
  { id: 'companyName', label: 'Firmenname', variable: '{{company.name}}', category: 'user', icon: '🏢' },
  
  // Lead fields (for personalized exposes)
  { id: 'leadName', label: 'Lead Name', variable: '{{lead.name}}', category: 'lead', icon: '🙋' },
  { id: 'leadFirstName', label: 'Lead Vorname', variable: '{{lead.firstName}}', category: 'lead', icon: '🙋' },
  { id: 'leadLastName', label: 'Lead Nachname', variable: '{{lead.lastName}}', category: 'lead', icon: '🙋' },
  { id: 'leadEmail', label: 'Lead E-Mail', variable: '{{lead.email}}', category: 'lead', icon: '📧' },
  { id: 'leadPhone', label: 'Lead Telefon', variable: '{{lead.phone}}', category: 'lead', icon: '📱' },
  { id: 'leadGreeting', label: 'Anrede', variable: '{{lead.greeting}}', category: 'lead', icon: '👋' },
  
  // Date fields
  { id: 'today', label: 'Heutiges Datum', variable: '{{date.today}}', category: 'date', icon: '📆' },
  { id: 'year', label: 'Aktuelles Jahr', variable: '{{date.year}}', category: 'date', icon: '🗓️' },
];

const FIELD_CATEGORY_LABELS: Record<string, string> = {
  property: 'Objektdaten',
  user: 'Makler/Firma',
  lead: 'Lead/Interessent',
  date: 'Datum',
};

// A4 dimensions in pixels (at 96 DPI for screen display)
// A4 = 210mm x 297mm, scaled for preview
const A4_WIDTH_PX = 595; // ~210mm at 72dpi, scaled for screen
const A4_HEIGHT_PX = 842; // ~297mm at 72dpi, scaled for screen
const A4_PADDING_PX = 40; // Page margins
const A4_CONTENT_HEIGHT = A4_HEIGHT_PX - (A4_PADDING_PX * 2);

// Estimated block heights in pixels (for page break calculation)
const BLOCK_HEIGHTS: Record<string, number> = {
  hero: 280,
  stats: 100,
  text: 150,
  gallery: 220,
  features: 180,
  highlights: 180,
  location: 140,
  contact: 160,
  priceTable: 180,
  energyCertificate: 140,
  cta: 140,
  quote: 100,
  floorplan: 300,
  twoColumn: 180,
  video: 120,
  virtualTour: 120,
  pageBreak: 0, // Special block type for manual page breaks
};

// ============================================
// THEME DEFINITIONS
// ============================================

interface ThemeDefinition {
  id: string;
  name: string;
  colors: { primary: string; secondary: string; accent: string; background: string };
}

// Font/Style Themes
interface StyleTheme {
  id: string;
  name: string;
  fontFamily: string;
  headingStyle: string; // CSS class for headings
  bodyStyle: string;    // CSS class for body text
}

const STYLE_THEMES: StyleTheme[] = [
  { id: 'default', name: 'Standard', fontFamily: 'system-ui, sans-serif', headingStyle: 'font-semibold', bodyStyle: 'font-normal' },
  { id: 'modern', name: 'Modern', fontFamily: '"Inter", system-ui, sans-serif', headingStyle: 'font-bold tracking-tight', bodyStyle: 'font-light' },
  { id: 'elegant', name: 'Elegant', fontFamily: '"Playfair Display", Georgia, serif', headingStyle: 'font-normal italic', bodyStyle: 'font-light' },
  { id: 'minimal', name: 'Minimal', fontFamily: '"Helvetica Neue", Arial, sans-serif', headingStyle: 'font-medium uppercase tracking-widest text-sm', bodyStyle: 'font-normal' },
  { id: 'luxury', name: 'Luxus', fontFamily: '"Cormorant Garamond", Georgia, serif', headingStyle: 'font-semibold', bodyStyle: 'font-normal' },
];

// Color Palettes (separate from style)
interface ColorPalette {
  id: string;
  name: string;
  colors: { primary: string; secondary: string; accent: string; background: string };
}

const COLOR_PALETTES: ColorPalette[] = [
  { id: 'indigo', name: 'Indigo', colors: { primary: '#4F46E5', secondary: '#1F2937', accent: '#6366F1', background: '#FFFFFF' } },
  { id: 'slate', name: 'Slate', colors: { primary: '#0F172A', secondary: '#334155', accent: '#3B82F6', background: '#F8FAFC' } },
  { id: 'amber', name: 'Amber', colors: { primary: '#78350F', secondary: '#451A03', accent: '#D97706', background: '#FFFBEB' } },
  { id: 'zinc', name: 'Zink', colors: { primary: '#18181B', secondary: '#3F3F46', accent: '#71717A', background: '#FAFAFA' } },
  { id: 'gold', name: 'Gold', colors: { primary: '#1C1917', secondary: '#44403C', accent: '#B45309', background: '#FAFAF9' } },
  { id: 'emerald', name: 'Smaragd', colors: { primary: '#064E3B', secondary: '#065F46', accent: '#10B981', background: '#ECFDF5' } },
  { id: 'rose', name: 'Rose', colors: { primary: '#9F1239', secondary: '#881337', accent: '#F43F5E', background: '#FFF1F2' } },
  { id: 'sky', name: 'Himmelblau', colors: { primary: '#0369A1', secondary: '#075985', accent: '#0EA5E9', background: '#F0F9FF' } },
];

// Block-specific color options
const BLOCK_COLORS = [
  { id: 'theme', name: 'Theme-Farbe', value: 'theme' },
  { id: 'white', name: 'Weiß', value: '#FFFFFF' },
  { id: 'gray-50', name: 'Hellgrau', value: '#F9FAFB' },
  { id: 'gray-100', name: 'Grau', value: '#F3F4F6' },
  { id: 'gray-800', name: 'Dunkelgrau', value: '#1F2937' },
  { id: 'black', name: 'Schwarz', value: '#000000' },
  { id: 'custom', name: 'Eigene...', value: 'custom' },
];

// Legacy THEMES for backward compatibility
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
  const { setActiveExposeContext, activeExposeContext, sidebarExpanded } = useGlobalState();
  
  // State
  const [expose, setExpose] = useState<Expose | null>(null);
  const [template, setTemplate] = useState<ExposeTemplate | null>(null);
  const [templates, setTemplates] = useState<ExposeTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [showBlockLibrary, setShowBlockLibrary] = useState(true);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragIndex: number | null;
    hoverIndex: number | null;
  }>({ isDragging: false, dragIndex: null, hoverIndex: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const themeSelectorRef = useRef<HTMLDivElement>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [showImagePicker, setShowImagePicker] = useState<{ blockIndex: number; field: string; type: 'image' | 'floorplan' | 'gallery' } | null>(null);
  
  // Preview property for templates (shows real data instead of {{variables}})
  const [previewProperty, setPreviewProperty] = useState<Property | null>(null);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const propertySelectorRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showFieldsSidebar, setShowFieldsSidebar] = useState(true);
  
  // @-Mention state
  const [mentionState, setMentionState] = useState<{
    isOpen: boolean;
    searchTerm: string;
    activeField: string | null;
    cursorPosition: number;
    filteredFields: TemplateField[];
  }>({ isOpen: false, searchTerm: '', activeField: null, cursorPosition: 0, filteredFields: [] });
  const mentionRef = useRef<HTMLDivElement>(null);
  
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

  // Auto-save when template or expose changes (but not on initial load)
  const isInitialMount = useRef(true);
  const lastBlocksRef = useRef<string>('');
  
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastBlocksRef.current = JSON.stringify(template?.blocks || expose?.blocks || []);
      return;
    }
    
    // Check if blocks actually changed
    const currentBlocks = JSON.stringify(template?.blocks || expose?.blocks || []);
    if (currentBlocks === lastBlocksRef.current) {
      return;
    }
    lastBlocksRef.current = currentBlocks;
    
    // Don't trigger if already saving or just saved
    if (saveState !== 'idle') return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSave(true);
    }, 2000);
    
    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [template?.blocks, template?.name, template?.theme, expose?.blocks, expose?.theme]);

  // Close theme selector on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeSelectorRef.current && !themeSelectorRef.current.contains(event.target as Node)) {
        setShowThemeSelector(false);
      }
    };

    if (showThemeSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showThemeSelector]);

  // Close property selector on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (propertySelectorRef.current && !propertySelectorRef.current.contains(event.target as Node)) {
        setShowPropertySelector(false);
      }
    };

    if (showPropertySelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPropertySelector]);

  // Global mouse up handler to end dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState.isDragging) {
        handleDragEnd();
      }
    };

    if (dragState.isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [dragState.isDragging]);

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

  // Listen for refresh triggers from AI via the callback
  useEffect(() => {
    // The onBlocksUpdated callback is set in the context and called by triggerExposeRefresh
    // We need to increment refreshKey when it's called
    const context = activeExposeContext;
    if (context?.onBlocksUpdated) {
      // The callback is already set to reloadData, so this effect just ensures we're listening
    }
  }, [activeExposeContext]);

  // Get current blocks and theme
  const currentBlocks = isTemplate ? (template?.blocks as ExposeBlock[] || []) : (expose?.blocks as ExposeBlock[] || []);
  const currentTheme = isTemplate ? (template?.theme || 'default') : (expose?.theme || 'default');
  const themeColors = THEMES.find(t => t.id === currentTheme)?.colors || THEMES[0].colors;

  // Calculate pages from blocks
  const calculatePages = useCallback((blocks: ExposeBlock[]): ExposeBlock[][] => {
    const pages: ExposeBlock[][] = [];
    let currentPage: ExposeBlock[] = [];
    let currentHeight = 0;

    blocks.forEach((block, index) => {
      // Manual page break
      if (block.type === 'pageBreak') {
        // Always push current page (even if empty) and start new one
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
        return;
      }

      const blockHeight = BLOCK_HEIGHTS[block.type] || 150;
      
      // Check if block fits on current page
      if (currentHeight + blockHeight > A4_CONTENT_HEIGHT && currentPage.length > 0) {
        // Start new page
        pages.push(currentPage);
        currentPage = [block];
        currentHeight = blockHeight;
      } else {
        currentPage.push(block);
        currentHeight += blockHeight;
      }
    });

    // Don't forget the last page (always add it, even if empty after a pageBreak)
    pages.push(currentPage);

    // Always have at least one page
    if (pages.length === 0) {
      pages.push([]);
    }

    return pages;
  }, []);

  const pages = calculatePages(currentBlocks);

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
        
        // For templates, load available properties for preview selection
        if (isTemplate) {
          try {
            const propertiesData = await getProperties();
            setAvailableProperties(propertiesData);
            // Auto-select first property as preview
            if (propertiesData.length > 0) {
              setPreviewProperty(propertiesData[0]);
            }
          } catch (err) {
            console.error('Error loading properties for preview:', err);
          }
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
  // TEMPLATE VARIABLE REPLACEMENT FOR PREVIEW
  // ============================================

  // Replace template variables with actual preview data
  const replaceTemplateVariables = useCallback((text: string | undefined): string => {
    if (!text || !isTemplate) return text || '';
    if (!previewProperty) return text; // Keep variables if no preview property selected
    
    const replacements: Record<string, string> = {
      // Property fields
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
      '{{property.bedrooms}}': previewProperty.bedrooms?.toString() || '',
      '{{property.bathrooms}}': previewProperty.bathrooms?.toString() || '',
      '{{property.yearBuilt}}': previewProperty.yearBuilt?.toString() || '',
      '{{property.propertyType}}': previewProperty.propertyType || '',
      '{{property.energyClass}}': previewProperty.energyEfficiencyClass || '',
      '{{property.description}}': previewProperty.description || '',
      
      // User/Agent fields (mock data for preview)
      '{{user.name}}': 'Max Mustermann',
      '{{user.email}}': 'max@immobilien.de',
      '{{user.phone}}': '+49 123 456789',
      '{{company.name}}': 'Mustermann Immobilien',
      
      // Lead fields (mock data for preview)
      '{{lead.name}}': 'Anna Beispiel',
      '{{lead.firstName}}': 'Anna',
      '{{lead.lastName}}': 'Beispiel',
      '{{lead.email}}': 'anna@beispiel.de',
      '{{lead.phone}}': '+49 987 654321',
      '{{lead.greeting}}': 'Sehr geehrte Frau Beispiel',
      
      // Date fields
      '{{date.today}}': new Date().toLocaleDateString('de-DE'),
      '{{date.year}}': new Date().getFullYear().toString(),
    };
    
    let result = text;
    for (const [variable, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
    }
    return result;
  }, [isTemplate, previewProperty]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSave = async (isAutoSave = false) => {
    // Clear any pending state timeout
    if (saveStateTimeoutRef.current) {
      clearTimeout(saveStateTimeoutRef.current);
    }
    
    setSaveState('saving');
    
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
      
      // Show "Gespeichert" state
      setSaveState('saved');
      
      // Return to idle after 3 seconds
      saveStateTimeoutRef.current = setTimeout(() => {
        setSaveState('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Error saving:', error);
      setSaveState('idle');
      if (!isAutoSave) {
        alert('Fehler beim Speichern');
      }
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

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDragState({ isDragging: true, dragIndex: index, hoverIndex: null });
  };

  // Handle drag over
  const handleDragHover = (index: number) => {
    if (dragState.dragIndex !== null && dragState.dragIndex !== index) {
      setDragState(prev => ({ ...prev, hoverIndex: index }));
    }
  };

  // Handle drop
  const handleDrop = (targetIndex: number) => {
    if (dragState.dragIndex !== null && dragState.dragIndex !== targetIndex) {
      const newBlocks = [...currentBlocks];
      const [removed] = newBlocks.splice(dragState.dragIndex, 1);
      const adjustedTarget = targetIndex > dragState.dragIndex ? targetIndex : targetIndex;
      newBlocks.splice(adjustedTarget, 0, removed);
      updateBlocks(newBlocks);
      setSelectedBlockIndex(adjustedTarget);
    }
    setDragState({ isDragging: false, dragIndex: null, hoverIndex: null });
  };

  // Handle drag end (cancel)
  const handleDragEnd = () => {
    setDragState({ isDragging: false, dragIndex: null, hoverIndex: null });
  };

  const renderBlockPreview = (block: ExposeBlock, index: number) => {
    const isSelected = selectedBlockIndex === index;
    const isDragging = dragState.dragIndex === index;
    const isHoverTarget = dragState.hoverIndex === index && dragState.dragIndex !== index;
    const blockDef = BLOCK_TYPES.find(b => b.type === block.type);

    // Calculate visual offset for smooth reordering preview
    let translateY = '';
    if (dragState.isDragging && dragState.dragIndex !== null && dragState.hoverIndex !== null) {
      if (index === dragState.dragIndex) {
        // Don't move the dragged item visually here
      } else if (dragState.dragIndex < dragState.hoverIndex) {
        // Dragging down: items between drag and hover move up
        if (index > dragState.dragIndex && index <= dragState.hoverIndex) {
          translateY = '-translate-y-full';
        }
      } else {
        // Dragging up: items between hover and drag move down
        if (index >= dragState.hoverIndex && index < dragState.dragIndex) {
          translateY = 'translate-y-full';
        }
      }
    }

    return (
      <div
        key={block.id}
        className={`relative transition-all duration-200 ease-out ${
          isDragging 
            ? 'z-50 shadow-2xl scale-[1.02] opacity-90' 
            : 'z-0'
        } ${
          isSelected && !isDragging ? 'ring-1 ring-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]' : ''
        }`}
        style={{
          cursor: isDragging ? 'grabbing' : 'default',
        }}
        onClick={(e) => { 
          if (!dragState.isDragging) {
            e.stopPropagation(); 
            setSelectedBlockIndex(index); 
          }
        }}
        onMouseEnter={() => {
          if (dragState.isDragging) {
            handleDragHover(index);
          }
        }}
        onMouseUp={() => {
          if (dragState.isDragging && dragState.dragIndex !== index) {
            handleDrop(index);
          }
        }}
      >
        {/* Drop indicator line */}
        {isHoverTarget && (
          <div className="absolute inset-x-0 -top-0.5 z-30 pointer-events-none">
            <div className="h-1 bg-indigo-500 rounded-full mx-2" />
          </div>
        )}

        {/* Block wrapper */}
        <div className="relative">
          {/* Block Controls - only visible when selected */}
          {!dragState.isDragging && isSelected && (
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
              <button
                onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }}
                disabled={index === 0}
                className="p-1.5 bg-white rounded-md shadow hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <div 
                className="p-1.5 bg-white rounded-md shadow cursor-grab hover:bg-indigo-50 hover:shadow-md transition-all"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDragStart(index);
                }}
              >
                <GripVertical className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }}
                disabled={index === currentBlocks.length - 1}
                className="p-1.5 bg-white rounded-md shadow hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          )}

          {/* Delete button - only visible when selected */}
          {!dragState.isDragging && isSelected && (
            <button
              onClick={(e) => { e.stopPropagation(); deleteBlock(index); }}
              className="absolute right-2 top-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 z-10 animate-in fade-in zoom-in-50 duration-200"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          {/* Block Content */}
          {renderBlockContent(block)}
        </div>
      </div>
    );
  };

  // Helper to get preview value - replaces variables for templates
  const pv = (value: string | undefined, fallback: string = ''): string => {
    if (!value) return fallback;
    return isTemplate ? replaceTemplateVariables(value) : value;
  };

  const renderBlockContent = (block: ExposeBlock) => {
    switch (block.type) {
      case 'hero':
        return (
          <div className="relative h-64 bg-indigo-900 overflow-hidden">
            {block.imageUrl ? (
              <img src={block.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/30">
                <ImageIcon className="w-16 h-16" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white bg-gradient-to-t from-black/60 via-black/30 to-transparent pt-16">
              <h1 className="text-3xl font-bold mb-2">{pv(block.title, 'Titel eingeben...')}</h1>
              <p className="text-lg opacity-90">{pv(block.subtitle, 'Untertitel eingeben...')}</p>
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
                <div className="text-2xl font-bold" style={{ color: themeColors.primary }}>{pv(stat.value)}</div>
                <div className="text-sm text-gray-500">{pv(stat.label)}</div>
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <div className={`p-6 ${block.style === 'highlight' ? 'bg-gray-50 border-l-4' : ''}`} style={block.style === 'highlight' ? { borderColor: themeColors.primary } : {}}>
            {block.title && <h3 className="text-lg font-semibold mb-3" style={{ color: themeColors.secondary }}>{pv(block.title)}</h3>}
            <p className="text-gray-600 whitespace-pre-wrap">{pv(block.content, 'Text eingeben...')}</p>
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
            {block.title && <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>{pv(block.title)}</h3>}
            <div className="grid grid-cols-2 gap-3">
              {items.length > 0 ? items.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColors.primary }} />
                  <span className="text-sm text-gray-600">{pv(typeof item === 'string' ? item : item.text)}</span>
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
            <h3 className="text-lg font-semibold mb-2" style={{ color: themeColors.secondary }}>{pv(block.title, 'Lage')}</h3>
            <p className="text-gray-600 mb-2">{pv(block.address, '{{property.address}}')}</p>
            {block.description && <p className="text-sm text-gray-500">{pv(block.description)}</p>}
          </div>
        );

      case 'contact':
        return (
          <div className="p-6 text-white" style={{ backgroundColor: themeColors.primary }}>
            <h3 className="text-lg font-semibold mb-3">{pv(block.title, 'Ihr Ansprechpartner')}</h3>
            <p>{pv(block.name, '{{user.name}}')}</p>
            <p className="opacity-80">{pv(block.email, '{{user.email}}')}</p>
            {block.phone && <p className="opacity-80">{pv(block.phone)}</p>}
          </div>
        );

      case 'leadInfo':
        return (
          <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4" style={{ borderColor: themeColors.accent }}>
            {block.showGreeting !== false && (
              <p className="text-sm text-gray-500 mb-2">Erstellt für</p>
            )}
            <h3 className="text-lg font-semibold mb-2" style={{ color: themeColors.secondary }}>
              {pv(block.leadName, '{{lead.name}}')}
            </h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>{pv(block.leadEmail, '{{lead.email}}')}</p>
              {block.leadPhone && <p>{pv(block.leadPhone)}</p>}
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
            {block.title && <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>{pv(block.title)}</h3>}
            <div className="space-y-2">
              {priceItems.map((item: any, i: number) => (
                <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{pv(item.label)}</span>
                  <span className="font-medium">{pv(item.value)}</span>
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
                {pv(block.energyClass, 'B')}
              </div>
              <div>
                <p className="text-sm text-gray-500">Energieeffizienzklasse</p>
                <p className="font-medium">{pv(block.consumption, '85 kWh/(m²·a)')}</p>
              </div>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="p-8 text-center bg-gray-50">
            <h3 className="text-xl font-semibold mb-4" style={{ color: themeColors.secondary }}>{pv(block.title, 'Interesse geweckt?')}</h3>
            <button className="px-6 py-3 text-white rounded-lg font-medium" style={{ backgroundColor: themeColors.primary }}>
              {pv(block.buttonText, 'Jetzt Termin vereinbaren')}
            </button>
          </div>
        );

      case 'quote':
        return (
          <div className="p-6 border-l-4" style={{ borderColor: themeColors.accent }}>
            <p className="text-lg italic text-gray-600 mb-2">"{pv(block.text, 'Zitat eingeben...')}"</p>
            {block.author && <p className="text-sm text-gray-500">— {pv(block.author)}</p>}
          </div>
        );

      case 'floorplan':
        return (
          <div className="p-6">
            {block.title && <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>{pv(block.title)}</h3>}
            {block.imageUrl ? (
              <img src={block.imageUrl} alt="Grundriss" className="w-full" />
            ) : (
              <div className="aspect-video bg-gray-200 rounded flex items-center justify-center text-gray-400">
                <Home className="w-12 h-12" />
              </div>
            )}
          </div>
        );

      case 'twoColumn':
        return (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="prose prose-sm">
                <p className="text-gray-600 whitespace-pre-wrap">{pv(block.leftContent, 'Linke Spalte...')}</p>
              </div>
              <div className="prose prose-sm">
                <p className="text-gray-600 whitespace-pre-wrap">{pv(block.rightContent, 'Rechte Spalte...')}</p>
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="p-6">
            {block.title && <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>{pv(block.title)}</h3>}
            {block.videoUrl ? (
              <div className="aspect-video bg-black rounded overflow-hidden">
                {block.videoUrl.includes('youtube') || block.videoUrl.includes('youtu.be') ? (
                  <iframe
                    src={block.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : block.videoUrl.includes('vimeo') ? (
                  <iframe
                    src={block.videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/')}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={block.videoUrl} controls className="w-full h-full" />
                )}
              </div>
            ) : (
              <div className="aspect-video bg-gray-200 rounded flex items-center justify-center text-gray-400">
                <Video className="w-12 h-12" />
              </div>
            )}
          </div>
        );

      case 'virtualTour':
        return (
          <div className="p-6">
            {block.title && <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.secondary }}>{pv(block.title)}</h3>}
            {block.tourUrl ? (
              <div className="aspect-video rounded overflow-hidden border border-gray-200">
                <iframe
                  src={block.tourUrl}
                  className="w-full h-full"
                  allow="xr-spatial-tracking; gyroscope; accelerometer"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 rounded flex flex-col items-center justify-center text-gray-500">
                <Eye className="w-12 h-12 mb-2" />
                <span className="text-sm">360° Tour URL eingeben</span>
              </div>
            )}
          </div>
        );

      case 'pageBreak':
        // Page breaks are handled at the page level, not rendered as content
        return null;

      default:
        return (
          <div className="p-6 bg-gray-100 text-center text-gray-500">
            Block: {block.type}
          </div>
        );
    }
  };

  // ============================================
  // @-MENTION HELPERS
  // ============================================

  // Handle text input with @-mention detection
  const handleMentionInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    fieldId: string,
    currentValue: string,
    onChange: (value: string) => void
  ) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    // Check if @ was just typed
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ' || textBeforeCursor[atIndex - 1] === '\n')) {
      const searchTerm = textBeforeCursor.substring(atIndex + 1).toLowerCase();
      const filtered = TEMPLATE_FIELDS.filter(f => 
        f.label.toLowerCase().includes(searchTerm) ||
        f.id.toLowerCase().includes(searchTerm)
      );
      
      setMentionState({
        isOpen: true,
        searchTerm,
        activeField: fieldId,
        cursorPosition: cursorPos,
        filteredFields: filtered.slice(0, 8) // Max 8 suggestions
      });
    } else {
      setMentionState(prev => ({ ...prev, isOpen: false }));
    }
    
    onChange(value);
  };

  // Insert field at cursor position
  const insertFieldAtCursor = (
    field: TemplateField,
    currentValue: string,
    cursorPos: number,
    onChange: (value: string) => void
  ) => {
    // Find the @ symbol position
    const textBeforeCursor = currentValue.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const before = currentValue.substring(0, atIndex);
      const after = currentValue.substring(cursorPos);
      const newValue = before + field.variable + after;
      onChange(newValue);
    }
    
    setMentionState({ isOpen: false, searchTerm: '', activeField: null, cursorPosition: 0, filteredFields: [] });
  };

  // Handle keyboard navigation in mention dropdown
  const handleMentionKeyDown = (
    e: React.KeyboardEvent,
    currentValue: string,
    onChange: (value: string) => void
  ) => {
    if (!mentionState.isOpen) return;
    
    if (e.key === 'Escape') {
      e.preventDefault();
      setMentionState(prev => ({ ...prev, isOpen: false }));
    } else if (e.key === 'Enter' && mentionState.filteredFields.length > 0) {
      e.preventDefault();
      insertFieldAtCursor(mentionState.filteredFields[0], currentValue, mentionState.cursorPosition, onChange);
    }
  };

  // Render @-mention dropdown
  const renderMentionDropdown = (fieldId: string) => {
    if (!mentionState.isOpen || mentionState.activeField !== fieldId) return null;
    
    return (
      <div 
        ref={mentionRef}
        className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
      >
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-500">Feld einfügen</span>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {mentionState.filteredFields.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">Keine Felder gefunden</div>
          ) : (
            mentionState.filteredFields.map(field => (
              <button
                key={field.id}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur
                }}
                onClick={() => {
                  const input = document.querySelector(`[data-field-id="${fieldId}"]`) as HTMLInputElement | HTMLTextAreaElement;
                  if (input) {
                    insertFieldAtCursor(field, input.value, mentionState.cursorPosition, (v) => {
                      // Trigger change event
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set 
                        || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                      nativeInputValueSetter?.call(input, v);
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                    });
                  }
                }}
              >
                <span className="text-base">{field.icon}</span>
                <span className="text-sm text-gray-700">{field.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  // Convert variable syntax to visual chip display
  const renderFieldChip = (variable: string) => {
    const field = TEMPLATE_FIELDS.find(f => f.variable === variable);
    if (!field) return variable;
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
        {field.icon} {field.label}
      </span>
    );
  };

  // Render a template-aware input field with @-mention support
  const renderTemplateInput = (
    fieldId: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    multiline: boolean = false
  ) => {
    const commonProps = {
      'data-field-id': fieldId,
      value: value || '',
      placeholder: isTemplate ? `${placeholder} (tippe @ für Felder)` : placeholder,
      className: "w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500" + (multiline ? " resize-none" : ""),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (isTemplate) {
          handleMentionInput(e, fieldId, value, onChange);
        } else {
          onChange(e.target.value);
        }
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (isTemplate) {
          handleMentionKeyDown(e, value, onChange);
        }
      },
      onBlur: () => {
        // Delay to allow click on dropdown
        setTimeout(() => {
          if (mentionState.activeField === fieldId) {
            setMentionState(prev => ({ ...prev, isOpen: false }));
          }
        }, 200);
      },
      onDrop: isTemplate ? (e: React.DragEvent) => {
        e.preventDefault();
        const droppedText = e.dataTransfer.getData('text/plain');
        if (droppedText.startsWith('{{')) {
          const target = e.target as HTMLInputElement | HTMLTextAreaElement;
          const start = target.selectionStart || value.length;
          const newValue = value.substring(0, start) + droppedText + value.substring(start);
          onChange(newValue);
        }
      } : undefined,
      onDragOver: isTemplate ? (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      } : undefined,
    };

    return (
      <div className="relative">
        {multiline ? (
          <textarea {...commonProps} rows={6} />
        ) : (
          <input type="text" {...commonProps} />
        )}
        {isTemplate && renderMentionDropdown(fieldId)}
      </div>
    );
  };

  // Render template fields sidebar (collapsible - icons stay fixed, only text disappears)
  const renderFieldsSidebar = () => {
    if (!isTemplate) return null;

    const groupedFields = TEMPLATE_FIELDS.reduce((acc, field) => {
      if (!acc[field.category]) acc[field.category] = [];
      acc[field.category].push(field);
      return acc;
    }, {} as Record<string, TemplateField[]>);

    return (
      <div className={`${showFieldsSidebar ? 'w-44' : 'w-12'} border-l border-gray-100 bg-gray-50 flex flex-col transition-all duration-200 overflow-hidden`}>
        {/* Header - Tip text or just toggle */}
        <div className="px-2 py-2 border-b border-gray-100 flex items-center gap-2 shrink-0 h-10">
          <button
            onClick={() => setShowFieldsSidebar(!showFieldsSidebar)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors shrink-0"
            title={showFieldsSidebar ? 'Einklappen' : 'Ausklappen'}
          >
            {showFieldsSidebar ? (
              <ChevronDown className="w-4 h-4 rotate-90" />
            ) : (
              <ChevronUp className="w-4 h-4 -rotate-90" />
            )}
          </button>
          <span className={`text-xs text-gray-500 whitespace-nowrap transition-opacity duration-200 ${showFieldsSidebar ? 'opacity-100' : 'opacity-0'}`}>
            Tippe <span className="font-mono bg-gray-200 px-0.5 rounded">@</span>
          </span>
        </div>

        {/* Fields list - icons always visible, text fades */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-2 scrollbar-thin">
          {Object.entries(groupedFields).map(([category, fields]) => (
            <div key={category}>
              <div className={`text-xs font-medium text-gray-400 mb-1 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${showFieldsSidebar ? 'opacity-100 px-1' : 'opacity-0 h-0'}`}>
                {FIELD_CATEGORY_LABELS[category]}
              </div>
              <div className="space-y-0.5">
                {fields.map(field => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', field.variable);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="flex items-center gap-2 px-1.5 py-1.5 bg-white rounded border border-gray-200 cursor-grab hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    title={field.label}
                  >
                    <span className="shrink-0 text-sm w-5 text-center">{field.icon}</span>
                    <span className={`text-xs text-gray-700 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${showFieldsSidebar ? 'opacity-100' : 'opacity-0 w-0'}`}>
                      {field.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
          {blockDef && <blockDef.icon className="w-5 h-5 text-gray-700" />}
          <span className="font-semibold text-gray-900">{blockDef?.label || block.type}</span>
        </div>

        {/* Common fields based on block type */}
        {(block.type === 'hero' || block.type === 'text' || block.type === 'location' || block.type === 'contact' || block.type === 'priceTable' || block.type === 'features' || block.type === 'highlights' || block.type === 'cta' || block.type === 'floorplan') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Titel</label>
            {renderTemplateInput(
              `block-${selectedBlockIndex}-title`,
              block.title || '',
              (value) => updateBlock(selectedBlockIndex, { title: value }),
              'Titel eingeben...'
            )}
          </div>
        )}

        {block.type === 'hero' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Untertitel</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-subtitle`,
                block.subtitle || '',
                (value) => updateBlock(selectedBlockIndex, { subtitle: value }),
                'Untertitel eingeben...'
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hero-Bild</label>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Inhalt</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-content`,
                block.content || '',
                (value) => updateBlock(selectedBlockIndex, { content: value }),
                'Text eingeben...',
                true
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Stil</label>
              <select
                value={block.style || 'normal'}
                onChange={(e) => updateBlock(selectedBlockIndex, { style: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500"
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Zitat</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-text`,
                block.text || '',
                (value) => updateBlock(selectedBlockIndex, { text: value }),
                'Zitat eingeben...',
                true
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Autor</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-author`,
                block.author || '',
                (value) => updateBlock(selectedBlockIndex, { author: value }),
                'Name des Autors'
              )}
            </div>
          </>
        )}

        {block.type === 'location' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Adresse</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-address`,
                block.address || '',
                (value) => updateBlock(selectedBlockIndex, { address: value }),
                'Adresse eingeben...'
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Beschreibung</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-description`,
                block.description || '',
                (value) => updateBlock(selectedBlockIndex, { description: value }),
                'Lagebeschreibung...',
                true
              )}
            </div>
          </>
        )}

        {block.type === 'contact' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-name`,
                block.name || '',
                (value) => updateBlock(selectedBlockIndex, { name: value }),
                'Name eingeben...'
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-email`,
                block.email || '',
                (value) => updateBlock(selectedBlockIndex, { email: value }),
                'E-Mail eingeben...'
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-phone`,
                block.phone || '',
                (value) => updateBlock(selectedBlockIndex, { phone: value }),
                'Telefon eingeben...'
              )}
            </div>
          </>
        )}

        {block.type === 'leadInfo' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Lead Name</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-leadName`,
                block.leadName || '',
                (value) => updateBlock(selectedBlockIndex, { leadName: value }),
                'Lead Name...'
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Lead E-Mail</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-leadEmail`,
                block.leadEmail || '',
                (value) => updateBlock(selectedBlockIndex, { leadEmail: value }),
                'Lead E-Mail...'
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Lead Telefon</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-leadPhone`,
                block.leadPhone || '',
                (value) => updateBlock(selectedBlockIndex, { leadPhone: value }),
                'Lead Telefon...'
              )}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="showGreeting"
                checked={block.showGreeting !== false}
                onChange={(e) => updateBlock(selectedBlockIndex, { showGreeting: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="showGreeting" className="text-xs text-gray-700">
                Persönliche Anrede anzeigen
              </label>
            </div>
          </>
        )}

        {block.type === 'cta' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Button Text</label>
              <input
                type="text"
                value={block.buttonText || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { buttonText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Jetzt Termin vereinbaren"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Button URL</label>
              <input
                type="text"
                value={block.buttonUrl || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { buttonUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://..."
              />
            </div>
          </>
        )}

        {block.type === 'energyCertificate' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Energieeffizienzklasse</label>
              <select
                value={block.energyClass || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { energyClass: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Auswählen...</option>
                {['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Verbrauch</label>
              <input
                type="text"
                value={block.consumption || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { consumption: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="z.B. 85 kWh/(m²·a)"
              />
            </div>
          </>
        )}

        {block.type === 'floorplan' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Grundriss</label>
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

        {block.type === 'video' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Video-URL</label>
            <input
              type="text"
              value={block.videoUrl || ''}
              onChange={(e) => updateBlock(selectedBlockIndex, { videoUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="YouTube, Vimeo oder direkte Video-URL"
            />
            <p className="mt-1 text-xs text-gray-500">Unterstützt: YouTube, Vimeo, MP4</p>
          </div>
        )}

        {block.type === 'virtualTour' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">360° Tour URL</label>
            <input
              type="text"
              value={block.tourUrl || ''}
              onChange={(e) => updateBlock(selectedBlockIndex, { tourUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Matterport, 3DVista, etc."
            />
            <p className="mt-1 text-xs text-gray-500">Embed-URL der virtuellen Tour</p>
          </div>
        )}

        {block.type === 'twoColumn' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Linke Spalte</label>
              <textarea
                value={block.leftContent || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { leftContent: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                placeholder="Inhalt linke Spalte..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rechte Spalte</label>
              <textarea
                value={block.rightContent || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { rightContent: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                placeholder="Inhalt rechte Spalte..."
              />
            </div>
          </>
        )}

        {block.type === 'stats' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Eckdaten</label>
            <div className="space-y-3">
              {(block.items || []).map((item: any, idx: number) => (
                <div key={idx} className="p-2 bg-gray-50 rounded-md space-y-2 relative group">
                  <button
                    onClick={() => {
                      const newItems = (block.items || []).filter((_: any, i: number) => i !== idx);
                      updateBlock(selectedBlockIndex, { items: newItems });
                    }}
                    className="absolute top-1 right-1 p-1 text-red-500 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <div>
                    <span className="text-xs text-gray-500">Bezeichnung</span>
                    <input
                      type="text"
                      value={item.label || ''}
                      onChange={(e) => {
                        const newItems = [...(block.items || [])];
                        newItems[idx] = { ...newItems[idx], label: e.target.value };
                        updateBlock(selectedBlockIndex, { items: newItems });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-900 placeholder-gray-400"
                      placeholder="z.B. Zimmer"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Wert</span>
                    <input
                      type="text"
                      value={item.value || ''}
                      onChange={(e) => {
                        const newItems = [...(block.items || [])];
                        newItems[idx] = { ...newItems[idx], value: e.target.value };
                        updateBlock(selectedBlockIndex, { items: newItems });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-900 placeholder-gray-400"
                      placeholder="z.B. {{property.rooms}}"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const newItems = [...(block.items || []), { label: '', value: '' }];
                  updateBlock(selectedBlockIndex, { items: newItems });
                }}
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Eckdatum hinzufügen
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Tipp: Nutze {"{{property.rooms}}"}, {"{{property.area}}"}, {"{{property.price}}"} für automatische Werte
            </p>
          </div>
        )}

        {block.type === 'priceTable' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Preispositionen</label>
            <div className="space-y-3">
              {(block.items || []).map((item: any, idx: number) => (
                <div key={idx} className="p-2 bg-gray-50 rounded-md space-y-2 relative group">
                  <button
                    onClick={() => {
                      const newItems = (block.items || []).filter((_: any, i: number) => i !== idx);
                      updateBlock(selectedBlockIndex, { items: newItems });
                    }}
                    className="absolute top-1 right-1 p-1 text-red-500 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <div>
                    <span className="text-xs text-gray-500">Bezeichnung</span>
                    <input
                      type="text"
                      value={item.label || ''}
                      onChange={(e) => {
                        const newItems = [...(block.items || [])];
                        newItems[idx] = { ...newItems[idx], label: e.target.value };
                        updateBlock(selectedBlockIndex, { items: newItems });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-900 placeholder-gray-400"
                      placeholder="z.B. Kaufpreis"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Betrag</span>
                    <input
                      type="text"
                      value={item.value || ''}
                      onChange={(e) => {
                        const newItems = [...(block.items || [])];
                        newItems[idx] = { ...newItems[idx], value: e.target.value };
                        updateBlock(selectedBlockIndex, { items: newItems });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-900 placeholder-gray-400"
                      placeholder="z.B. {{property.price}} €"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const newItems = [...(block.items || []), { label: '', value: '' }];
                  updateBlock(selectedBlockIndex, { items: newItems });
                }}
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Position hinzufügen
              </button>
            </div>
          </div>
        )}

        {(block.type === 'features' || block.type === 'highlights') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              {block.type === 'features' ? 'Ausstattungsmerkmale' : 'Highlight-Punkte'}
            </label>
            <div className="space-y-2">
              {(block.items || []).map((item: any, idx: number) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={typeof item === 'string' ? item : item.text || ''}
                    onChange={(e) => {
                      const newItems = [...(block.items || [])];
                      newItems[idx] = e.target.value;
                      updateBlock(selectedBlockIndex, { items: newItems });
                    }}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-900 placeholder-gray-400"
                    placeholder={block.type === 'features' ? 'z.B. Einbauküche' : 'z.B. Sonnige Südlage'}
                  />
                  <button
                    onClick={() => {
                      const newItems = (block.items || []).filter((_: any, i: number) => i !== idx);
                      updateBlock(selectedBlockIndex, { items: newItems });
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newItems = [...(block.items || []), ''];
                  updateBlock(selectedBlockIndex, { items: newItems });
                }}
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                {block.type === 'features' ? 'Merkmal hinzufügen' : 'Highlight hinzufügen'}
              </button>
            </div>
          </div>
        )}

        {/* Block Color Settings - available for most blocks */}
        {block.type !== 'pageBreak' && block.type !== 'gallery' && (
          <div className="pt-3 mt-3 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-700 mb-2">Block-Farben</label>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500">Hintergrund</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {BLOCK_COLORS.filter(c => c.id !== 'custom').map((color) => (
                    <button
                      key={color.id}
                      onClick={() => updateBlock(selectedBlockIndex, { 
                        backgroundColor: color.value === 'theme' ? undefined : color.value 
                      })}
                      className={`w-6 h-6 rounded border-2 transition-all ${
                        (block.backgroundColor === color.value || (!block.backgroundColor && color.value === 'theme'))
                          ? 'border-indigo-500 scale-110' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ 
                        backgroundColor: color.value === 'theme' ? themeColors.background : color.value 
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Text</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {[
                    { id: 'theme', name: 'Theme', value: 'theme' },
                    { id: 'white', name: 'Weiß', value: '#FFFFFF' },
                    { id: 'gray-600', name: 'Grau', value: '#4B5563' },
                    { id: 'gray-900', name: 'Dunkel', value: '#111827' },
                    { id: 'black', name: 'Schwarz', value: '#000000' },
                  ].map((color) => (
                    <button
                      key={color.id}
                      onClick={() => updateBlock(selectedBlockIndex, { 
                        textColor: color.value === 'theme' ? undefined : color.value 
                      })}
                      className={`w-6 h-6 rounded border-2 transition-all ${
                        (block.textColor === color.value || (!block.textColor && color.value === 'theme'))
                          ? 'border-indigo-500 scale-110' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ 
                        backgroundColor: color.value === 'theme' ? themeColors.secondary : color.value 
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {block.type === 'gallery' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Spalten</label>
              <select
                value={block.columns || 2}
                onChange={(e) => updateBlock(selectedBlockIndex, { columns: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={2}>2 Spalten</option>
                <option value={3}>3 Spalten</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bilder</label>
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
    return 'h-[calc(100vh-88px)]'; // Align with dashboard icon top (64px header + 24px sidebar padding)
  };

  // Base drawer classes with animation
  const drawerBaseClasses = `fixed bottom-0 right-80 bg-white shadow-[0_-5px_30px_rgba(0,0,0,0.1)] border-t border-x border-gray-200 rounded-t-xl z-40`;
  const drawerTransform = isVisible ? 'translateY(0)' : 'translateY(100%)';
  const drawerLeft = sidebarExpanded ? '256px' : '80px';

  // Template selection view
  if (!loading && templates.length > 0 && !expose) {
    return (
      <div 
        className={`${drawerBaseClasses} ${getDrawerHeight()}`}
        style={{ 
          transform: drawerTransform,
          left: drawerLeft,
          transition: 'all 0.3s ease-in-out'
        }}
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
        style={{ 
          transform: drawerTransform,
          left: drawerLeft,
          transition: 'all 0.3s ease-in-out'
        }}
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
      style={{ 
        transform: drawerTransform,
        left: drawerLeft,
        transition: 'all 0.3s ease-in-out'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 h-12 border-b border-gray-100 rounded-t-xl cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setMinimized(!minimized)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          {isTemplate && template ? (
            <input
              type="text"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="text-gray-900 font-semibold text-sm bg-transparent border-0 focus:ring-0 focus:outline-none p-0"
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
              {/* Preview Property Selector (only for templates) */}
              {isTemplate && availableProperties.length > 0 && (
                <div className="relative" ref={propertySelectorRef}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowPropertySelector(!showPropertySelector); }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md border border-gray-200"
                    title="Beispiel-Objekt für Vorschau wählen"
                  >
                    <Home className="w-4 h-4" />
                    <span className="max-w-[150px] truncate">
                      {previewProperty?.title || 'Objekt wählen'}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showPropertySelector && (
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[250px] max-h-[300px] overflow-y-auto">
                      <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100 sticky top-0 bg-white">
                        Beispiel-Objekt für Vorschau
                      </div>
                      {availableProperties.map((prop) => (
                        <button
                          key={prop.id}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setPreviewProperty(prop); 
                            setShowPropertySelector(false); 
                          }}
                          className={`flex flex-col w-full px-3 py-2 text-left hover:bg-gray-50 ${previewProperty?.id === prop.id ? 'bg-indigo-50' : ''}`}
                        >
                          <span className="text-sm text-gray-900 font-medium truncate">{prop.title}</span>
                          <span className="text-xs text-gray-500">{prop.city} • {prop.rooms} Zimmer • {prop.livingArea} m²</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Style Selector (Font/Typography) */}
              <div className="relative" ref={themeSelectorRef}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowThemeSelector(!showThemeSelector); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <Type className="w-4 h-4" />
                  <span className="hidden sm:inline">{STYLE_THEMES.find(t => t.id === currentTheme)?.name || 'Standard'}</span>
                </button>
                {showThemeSelector && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]">
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100">Schriftstil</div>
                    {STYLE_THEMES.map((style) => (
                      <button
                        key={style.id}
                        onClick={(e) => { e.stopPropagation(); setTheme(style.id); setShowThemeSelector(false); }}
                        className={`flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 ${currentTheme === style.id ? 'bg-indigo-50' : ''}`}
                      >
                        <span style={{ fontFamily: style.fontFamily }} className="text-base">{style.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Color Palette Selector */}
              <div className="relative">
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    // Toggle color selector (reuse theme selector state with different content)
                    const colorSelector = document.getElementById('color-palette-dropdown');
                    if (colorSelector) colorSelector.classList.toggle('hidden');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <div className="flex -space-x-1">
                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: themeColors.primary }} />
                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: themeColors.accent }} />
                  </div>
                  <span className="hidden sm:inline">Farben</span>
                </button>
                <div id="color-palette-dropdown" className="hidden absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[180px]">
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100">Farbpalette</div>
                  {COLOR_PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        // Update the theme colors (we'll store colorPalette separately in the future)
                        // For now, find matching THEMES entry or use first one
                        const matchingTheme = THEMES.find(t => t.colors.primary === palette.colors.primary);
                        if (matchingTheme) setTheme(matchingTheme.id);
                        document.getElementById('color-palette-dropdown')?.classList.add('hidden');
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
                    >
                      <div className="flex -space-x-1">
                        <div className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: palette.colors.primary }} />
                        <div className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: palette.colors.accent }} />
                      </div>
                      <span>{palette.name}</span>
                    </button>
                  ))}
                </div>
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

              {/* Download PDF - only for actual exposes, not templates */}
              {!isTemplate && expose && (
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
              )}

              {/* Save Button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleSave(false); }}
                disabled={saveState === 'saving'}
                className={`flex items-center gap-2 pl-4 pr-5 py-1.5 text-white text-sm rounded-md w-[145px] transition-colors duration-500 ease-in-out ${
                  saveState === 'saved' 
                    ? 'bg-green-500' 
                    : saveState === 'saving'
                    ? 'bg-indigo-500'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{saveState === 'saved' ? 'Gespeichert' : 'Speichern'}</span>
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
          <div className={`${showBlockLibrary ? 'w-48' : 'w-14'} border-r border-gray-100 bg-gray-50 transition-all duration-300 ease-in-out flex flex-col overflow-hidden`}>
            <button
              onClick={() => setShowBlockLibrary(!showBlockLibrary)}
              className="flex items-center pl-[14px] pr-3 py-3 hover:bg-gray-100 shrink-0"
              title={showBlockLibrary ? 'Blöcke ausblenden' : 'Blöcke einblenden'}
            >
              <Plus className="w-5 h-5 text-gray-500 shrink-0" />
              <span className={`ml-3 text-sm font-medium text-gray-700 whitespace-nowrap transition-opacity duration-300 ${
                showBlockLibrary ? 'opacity-100' : 'opacity-0'
              }`}>
                Blöcke
              </span>
            </button>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 px-2 pb-2">
              {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
                <div key={category} className="mb-3">
                  <h4 className={`text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 whitespace-nowrap transition-opacity duration-300 ${
                    showBlockLibrary ? 'opacity-100' : 'opacity-0'
                  }`}>
                    {label}
                  </h4>
                  <div className="space-y-1">
                    {BLOCK_TYPES.filter(b => b.category === category).map((blockType) => (
                      <button
                        key={blockType.type}
                        onClick={() => addBlock(blockType.type)}
                        className="w-full flex items-center pl-2 pr-3 py-1.5 text-sm text-gray-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-md transition-colors"
                        title={blockType.label}
                      >
                        <blockType.icon className="w-4 h-4 shrink-0" />
                        <span className={`ml-2 whitespace-nowrap transition-opacity duration-300 ${
                          showBlockLibrary ? 'opacity-100' : 'opacity-0'
                        }`}>
                          {blockType.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Preview Canvas - A4 Pages */}
          <div 
            className="flex-1 bg-gray-200 overflow-y-auto flex flex-col items-center py-8 px-4 gap-8"
            onClick={() => setSelectedBlockIndex(null)}
          >
            {pages.map((pageBlocks, pageIndex) => {
              // Calculate the global block index offset for this page
              let blockOffset = 0;
              for (let i = 0; i < pageIndex; i++) {
                blockOffset += pages[i].length;
                // Account for page breaks
                if (pageIndex > 0) blockOffset += 1;
              }

              // Find the pageBreak that created this page (if any)
              const findPageBreakBeforePage = (targetPageIndex: number): number => {
                if (targetPageIndex === 0) return -1;
                let pageBreakCount = 0;
                for (let i = 0; i < currentBlocks.length; i++) {
                  if (currentBlocks[i].type === 'pageBreak') {
                    pageBreakCount++;
                    if (pageBreakCount === targetPageIndex) {
                      return i;
                    }
                  }
                }
                return -1;
              };

              const handleDeletePage = () => {
                const pageBreakIndex = findPageBreakBeforePage(pageIndex);
                if (pageBreakIndex >= 0) {
                  // Remove the pageBreak - blocks will merge with previous page
                  const newBlocks = currentBlocks.filter((_, i) => i !== pageBreakIndex);
                  updateBlocks(newBlocks);
                }
              };

              const canDeletePage = pageIndex > 0;

              return (
                <div key={pageIndex} className="relative">
                  {/* Page number and delete button */}
                  <div className="absolute -top-6 left-0 right-0 flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium">
                      Seite {pageIndex + 1} von {pages.length}
                    </span>
                    {canDeletePage && (
                      <button
                        onClick={handleDeletePage}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Seite löschen
                      </button>
                    )}
                  </div>
                  
                  {/* A4 Page */}
                  <div 
                    ref={pageIndex === 0 ? previewRef : undefined}
                    className="bg-white shadow-xl relative rounded-lg overflow-hidden"
                    style={{ 
                      width: `${A4_WIDTH_PX}px`, 
                      minHeight: `${A4_HEIGHT_PX}px`,
                      padding: pageBlocks.length === 0 ? `${A4_PADDING_PX}px` : 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {pageBlocks.length === 0 ? (
                      // Empty page - show centered add block button
                      <div className="h-full min-h-[700px] flex flex-col items-center justify-center text-gray-400">
                        {pageIndex === 0 ? (
                          // First page empty state with more info
                          <>
                            <LayoutGrid className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">Noch keine Blöcke</p>
                            <p className="text-sm mb-4">Füge Blöcke hinzu oder lass Jarvis das Exposé erstellen</p>
                          </>
                        ) : (
                          // Other empty pages - simpler state
                          <>
                            <Plus className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm mb-4">Leere Seite</p>
                          </>
                        )}
                        <button
                          onClick={() => setShowBlockLibrary(true)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                        >
                          <Plus className="w-4 h-4 inline mr-2" />
                          Block hinzufügen
                        </button>
                      </div>
                    ) : (
                      // Page with blocks - no padding needed, blocks go edge to edge
                      <div 
                        className="relative" 
                        style={{ 
                          minHeight: `${A4_HEIGHT_PX}px`
                        }}
                      >
                        {pageBlocks.map((block) => {
                          // Find the actual global index of this block
                          const globalIndex = currentBlocks.findIndex(b => b.id === block.id);
                          return renderBlockPreview(block, globalIndex);
                        })}
                        
                        {/* Add block button directly after last block on this page */}
                        <div className="flex justify-center py-4">
                          <button
                            onClick={() => setShowBlockLibrary(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors text-sm"
                          >
                            <Plus className="w-3 h-3" />
                            Block hinzufügen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Add page break button between pages */}
                  {pageIndex < pages.length - 1 && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10">
                      <div className="h-px w-32 bg-gray-300" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add new page button */}
            <button
              onClick={() => {
                const newBlock: ExposeBlock = {
                  id: `pageBreak-${Date.now()}`,
                  type: 'pageBreak',
                };
                updateBlocks([...currentBlocks, newBlock]);
              }}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              <span className="text-sm">Neue Seite hinzufügen</span>
            </button>
          </div>

          {/* Right: Block Editor */}
          <div className="w-72 border-l border-gray-100 bg-white overflow-y-auto">
            {renderBlockEditor()}
          </div>

          {/* Right: Template Fields Sidebar (only for templates) */}
          {renderFieldsSidebar()}
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
