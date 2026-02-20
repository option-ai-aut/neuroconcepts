'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import { 
  X, Minus, Maximize2, Save, Download, RefreshCw, 
  Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Image, Type, LayoutGrid, MapPin, User, List, Zap,
  Home, DollarSign, Thermometer, Phone, Quote, MousePointer,
  Columns, Video, Eye, Upload, ImageIcon, FileImage, BarChart3,
  SeparatorHorizontal, FileText as FilePlus, Palette, Pipette
} from 'lucide-react';
import { useGlobalState } from '@/context/GlobalStateContext';
import { 
  getExpose, updateExpose, regenerateExpose, 
  getExposeTemplates, getExposeTemplate, updateExposeTemplate, 
  createExpose, ExposeBlock, Expose, ExposeTemplate, Property,
  downloadExposePdf, downloadTemplatePdf, getProperty, getProperties,
  getImageUrl
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
  { id: 'energyConsumption', label: 'Energieverbrauch', variable: '{{property.energyConsumption}}', category: 'property', icon: '📊' },
  { id: 'usableArea', label: 'Nutzfläche (m²)', variable: '{{property.usableArea}}', category: 'property', icon: '📏' },
  { id: 'deposit', label: 'Kaution', variable: '{{property.deposit}}', category: 'property', icon: '🔒' },
  { id: 'commission', label: 'Provision', variable: '{{property.commission}}', category: 'property', icon: '🤝' },
  { id: 'description', label: 'Beschreibung', variable: '{{property.description}}', category: 'property', icon: '📝' },
  { id: 'locationDescription', label: 'Lagebeschreibung', variable: '{{property.locationDescription}}', category: 'property', icon: '🗺️' },
  { id: 'equipmentDescription', label: 'Ausstattungstext', variable: '{{property.equipmentDescription}}', category: 'property', icon: '🛋️' },
  { id: 'virtualTour', label: '360° Tour URL', variable: '{{property.virtualTour}}', category: 'property', icon: '🔄' },
  
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
// Realistic block heights based on actual rendered sizes (in px)
// Lower estimates allow blocks to fit better on pages before overflowing
const BLOCK_HEIGHTS: Record<string, number> = {
  hero: 256,       // h-64 = 256px
  stats: 80,       // compact horizontal stats
  text: 110,       // paragraph with title
  gallery: 190,    // 2x2 grid of images
  features: 140,   // list of features
  highlights: 140,  
  location: 100,   // address + short description
  contact: 120,    // contact card
  priceTable: 140, // price rows
  energyCertificate: 110,
  cta: 110,        // call-to-action button
  quote: 80,       // short quote
  floorplan: 240,  // floorplan image
  twoColumn: 140,  // two columns
  video: 90,       // video embed placeholder
  virtualTour: 90, // tour embed placeholder
  leadInfo: 120,   // lead info card
  pageBreak: 0,    // Special block type for manual page breaks
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
  { id: 'default', name: 'Standard', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', headingStyle: 'font-semibold', bodyStyle: 'font-normal' },
  { id: 'modern', name: 'Modern', fontFamily: 'var(--font-inter), system-ui, sans-serif', headingStyle: 'font-bold tracking-tight', bodyStyle: 'font-light' },
  { id: 'elegant', name: 'Elegant', fontFamily: 'var(--font-playfair), Georgia, serif', headingStyle: 'font-normal italic', bodyStyle: 'font-light' },
  { id: 'minimal', name: 'Minimal', fontFamily: 'var(--font-geist-sans), "Helvetica Neue", Arial, sans-serif', headingStyle: 'font-medium uppercase tracking-widest text-sm', bodyStyle: 'font-normal' },
  { id: 'luxury', name: 'Luxus', fontFamily: 'var(--font-cormorant), Georgia, serif', headingStyle: 'font-semibold', bodyStyle: 'font-normal' },
];

// Color Palettes (separate from style)
interface ColorPalette {
  id: string;
  name: string;
  colors: { primary: string; secondary: string; accent: string; background: string };
}

const COLOR_PALETTES: ColorPalette[] = [
  { id: 'indigo', name: 'Grau', colors: { primary: '#111827', secondary: '#1F2937', accent: '#3B82F6', background: '#FFFFFF' } },
  { id: 'slate', name: 'Slate', colors: { primary: '#0F172A', secondary: '#334155', accent: '#3B82F6', background: '#F8FAFC' } },
  { id: 'amber', name: 'Amber', colors: { primary: '#78350F', secondary: '#451A03', accent: '#D97706', background: '#FFFBEB' } },
  { id: 'zinc', name: 'Zink', colors: { primary: '#18181B', secondary: '#3F3F46', accent: '#71717A', background: '#FAFAFA' } },
  { id: 'gold', name: 'Gold', colors: { primary: '#1C1917', secondary: '#44403C', accent: '#B45309', background: '#FAFAF9' } },
  { id: 'emerald', name: 'Smaragd', colors: { primary: '#064E3B', secondary: '#065F46', accent: '#10B981', background: '#ECFDF5' } },
  { id: 'rose', name: 'Rose', colors: { primary: '#9F1239', secondary: '#881337', accent: '#F43F5E', background: '#FFF1F2' } },
  { id: 'sky', name: 'Himmelblau', colors: { primary: '#0369A1', secondary: '#075985', accent: '#0EA5E9', background: '#F0F9FF' } },
];

// Block-specific color palette - full range
const BG_COLORS = [
  { id: 'transparent', name: 'Transparent', value: 'transparent' },
  { id: 'white', name: 'Weiß', value: '#FFFFFF' },
  { id: 'gray-50', name: 'Hellgrau', value: '#F9FAFB' },
  { id: 'gray-100', name: 'Grau', value: '#F3F4F6' },
  { id: 'gray-200', name: 'Mittelgrau', value: '#E5E7EB' },
  { id: 'gray-800', name: 'Dunkelgrau', value: '#1F2937' },
  { id: 'gray-900', name: 'Fast Schwarz', value: '#111827' },
  { id: 'black', name: 'Schwarz', value: '#000000' },
  { id: 'indigo-50', name: 'Grau Hell', value: '#F9FAFB' },
  { id: 'indigo-900', name: 'Grau Dunkel', value: '#1F2937' },
  { id: 'blue-50', name: 'Blau Hell', value: '#EFF6FF' },
  { id: 'blue-900', name: 'Blau Dunkel', value: '#1E3A5F' },
  { id: 'emerald-50', name: 'Grün Hell', value: '#ECFDF5' },
  { id: 'emerald-900', name: 'Grün Dunkel', value: '#064E3B' },
  { id: 'amber-50', name: 'Amber Hell', value: '#FFFBEB' },
  { id: 'amber-900', name: 'Amber Dunkel', value: '#78350F' },
  { id: 'rose-50', name: 'Rose Hell', value: '#FFF1F2' },
  { id: 'rose-900', name: 'Rose Dunkel', value: '#881337' },
];

const TEXT_COLORS = [
  { id: 'white', name: 'Weiß', value: '#FFFFFF' },
  { id: 'gray-100', name: 'Hellgrau', value: '#F3F4F6' },
  { id: 'gray-400', name: 'Grau', value: '#9CA3AF' },
  { id: 'gray-600', name: 'Mittelgrau', value: '#4B5563' },
  { id: 'gray-800', name: 'Dunkelgrau', value: '#1F2937' },
  { id: 'gray-900', name: 'Fast Schwarz', value: '#111827' },
  { id: 'black', name: 'Schwarz', value: '#000000' },
  { id: 'indigo-600', name: 'Blau (Link)', value: '#2563EB' },
  { id: 'blue-600', name: 'Blau', value: '#2563EB' },
  { id: 'emerald-600', name: 'Grün', value: '#059669' },
  { id: 'amber-600', name: 'Amber', value: '#D97706' },
  { id: 'rose-600', name: 'Rose', value: '#E11D48' },
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

// ─── Rich Text Editor Field ─────────────────────────────────────────────
// File-level component to properly handle contentEditable with refs.
// Prevents React reconciliation from resetting contentEditable content
// (the classic controlled-contentEditable problem).

interface RichEditorFieldProps {
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline: boolean;
  className?: string;
  style?: React.CSSProperties;
  valueToHtml?: (val: string) => string;
  htmlToValue?: (el: HTMLElement) => string;
  onFocusChange?: (focused: boolean) => void;
  onEditorInput?: (el: HTMLElement) => void;
  onEditorKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onEditorBlur?: () => void;
}

const RichEditorField: React.FC<RichEditorFieldProps> = ({
  fieldId,
  value,
  onChange,
  placeholder,
  multiline,
  className,
  style,
  valueToHtml,
  htmlToValue,
  onFocusChange,
  onEditorInput,
  onEditorKeyDown,
  onEditorBlur,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>(value);

  // Convert value to HTML for display
  const toHtml = useCallback((val: string): string => {
    if (!val) return '';
    if (valueToHtml) return valueToHtml(val);
    // Non-template: if it has HTML tags, return as-is; otherwise \n → <br>
    if (val.match(/<[a-z]/i)) return val;
    return val.replace(/\n/g, '<br>');
  }, [valueToHtml]);

  // Read value from editor DOM
  const fromHtml = useCallback((): string => {
    if (!editorRef.current) return '';
    if (htmlToValue) return htmlToValue(editorRef.current);
    return editorRef.current.innerHTML;
  }, [htmlToValue]);

  // Set content on mount only
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = DOMPurify.sanitize(toHtml(value || ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync ONLY external value changes (not changes from user input)
  useEffect(() => {
    if (!editorRef.current) return;
    if (value !== lastValueRef.current) {
      editorRef.current.innerHTML = DOMPurify.sanitize(toHtml(value || ''));
      lastValueRef.current = value;
    }
  }, [value, toHtml]);

  // Event delegation for internal tag drag-start (tags inside contentEditable)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target?.getAttribute?.('data-variable')) {
        e.dataTransfer?.setData('application/x-expose-internal-tag', 'true');
        e.dataTransfer?.setData('text/plain', target.getAttribute('data-variable') || '');
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      }
    };
    el.addEventListener('dragstart', handleDragStart, true);
    return () => el.removeEventListener('dragstart', handleDragStart, true);
  }, []);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const newValue = fromHtml();
    lastValueRef.current = newValue;
    onChange(newValue);
    onEditorInput?.(editorRef.current);
  }, [fromHtml, onChange, onEditorInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Format shortcuts
    if (e.key === 'b' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); document.execCommand('bold'); }
    else if (e.key === 'i' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); document.execCommand('italic'); }
    else if (e.key === 'u' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); document.execCommand('underline'); }
    // Prevent Enter in single-line mode
    if (!multiline && e.key === 'Enter') e.preventDefault();
    // Forward to parent for mention handling etc.
    onEditorKeyDown?.(e);
  }, [multiline, onEditorKeyDown]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Internal tag drag - let browser handle natively (moves the span)
    if (e.dataTransfer.types.includes('application/x-expose-internal-tag')) {
      // After browser moves the tag, save the new content
      setTimeout(() => {
        if (editorRef.current) {
          const newValue = fromHtml();
          lastValueRef.current = newValue;
          onChange(newValue);
        }
      }, 0);
      return;
    }

    // External drop (from sidebar fields panel)
    const droppedText = e.dataTransfer.getData('text/plain');
    if (droppedText.startsWith('{{') && valueToHtml) {
      e.preventDefault();
      const el = editorRef.current;
      if (!el) return;

      const tagHtml = valueToHtml(droppedText);
      // Insert at drop position
      const range = (document as any).caretRangeFromPoint?.(e.clientX, e.clientY);
      if (range) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        const temp = document.createElement('span');
        temp.innerHTML = DOMPurify.sanitize(tagHtml + '\u00A0');
        const frag = document.createDocumentFragment();
        while (temp.firstChild) frag.appendChild(temp.firstChild);
        range.insertNode(frag);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      } else {
        el.innerHTML += tagHtml + '\u00A0';
      }

      const newValue = fromHtml();
      lastValueRef.current = newValue;
      onChange(newValue);
    }
  }, [valueToHtml, fromHtml, onChange]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/x-expose-internal-tag') ? 'move' : 'copy';
  }, []);

  return (
    <div
      ref={editorRef}
      data-field-id={fieldId}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={style}
      onInput={handleInput}
      onFocus={() => onFocusChange?.(true)}
      onBlur={() => { onFocusChange?.(false); onEditorBlur?.(); }}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      data-placeholder={placeholder}
    />
  );
};

RichEditorField.displayName = 'RichEditorField';

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
  const [showColorManager, setShowColorManager] = useState(false);
  const [colorPickerValue, setColorPickerValue] = useState('#4F46E5');
  const colorManagerRef = useRef<HTMLDivElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const [colorPopupPos, setColorPopupPos] = useState({ top: 0, left: 0 });
  // Drag & Drop state — supports both reordering existing blocks and inserting new ones from sidebar
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragIndex: number | null;   // Index of existing block being dragged (null if new block from sidebar)
    hoverIndex: number | null;  // Where the block would be inserted
    newBlockType: string | null; // Block type being dragged from sidebar (null if reordering)
  }>({ isDragging: false, dragIndex: null, hoverIndex: null, newBlockType: null });
  // Live preview blocks during drag (reordered in real-time)
  const [dragPreviewBlocks, setDragPreviewBlocks] = useState<ExposeBlock[] | null>(null);
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
  const [showFieldsSidebar, setShowFieldsSidebar] = useState(false);
  const [templateFieldFocused, setTemplateFieldFocused] = useState(false);
  const fieldsButtonRef = useRef<HTMLButtonElement>(null);
  const blockEditorRef = useRef<HTMLDivElement>(null);
  const [editorRect, setEditorRect] = useState<{ top: number; left: number; bottom: number } | null>(null);
  
  // Track block editor position for portal-based fields button
  useEffect(() => {
    const update = () => {
      if (blockEditorRef.current) {
        const rect = blockEditorRef.current.getBoundingClientRect();
        setEditorRect({ top: rect.top, left: rect.left, bottom: rect.bottom });
      }
    };
    update();
    window.addEventListener('resize', update);
    const interval = setInterval(update, 500);
    return () => { window.removeEventListener('resize', update); clearInterval(interval); };
  }, [minimized, isVisible]);

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
  }, [template?.blocks, template?.name, template?.theme, template?.customColors, expose?.blocks, expose?.theme, expose?.customColors]);

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

  // Color manager closing is handled by the portal backdrop's onClick

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
  const styleTheme = STYLE_THEMES.find(t => t.id === currentTheme) || STYLE_THEMES[0];

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

  // Use drag preview blocks during drag for live reordering, otherwise current blocks
  const displayBlocks = dragPreviewBlocks || currentBlocks;
  const pages = calculatePages(displayBlocks);

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
    
    const priceFormatted = previewProperty.salePrice 
      ? `${previewProperty.salePrice.toLocaleString('de-DE')} €`
      : previewProperty.rentCold 
        ? `${previewProperty.rentCold.toLocaleString('de-DE')} €/Monat`
        : '';
    
    const replacements: Record<string, string> = {
      // Property fields - ALL from TEMPLATE_FIELDS
      '{{property.title}}': previewProperty.title || '',
      '{{property.address}}': previewProperty.address || '',
      '{{property.city}}': previewProperty.city || '',
      '{{property.zipCode}}': previewProperty.zipCode || '',
      '{{property.price}}': priceFormatted,
      '{{property.priceFormatted}}': priceFormatted,
      '{{property.rooms}}': previewProperty.rooms?.toString() || '',
      '{{property.area}}': previewProperty.livingArea ? `${previewProperty.livingArea} m²` : '',
      '{{property.plotArea}}': previewProperty.plotArea ? `${previewProperty.plotArea} m²` : '',
      '{{property.bedrooms}}': previewProperty.bedrooms?.toString() || '',
      '{{property.bathrooms}}': previewProperty.bathrooms?.toString() || '',
      '{{property.floor}}': previewProperty.floor?.toString() || '',
      '{{property.totalFloors}}': previewProperty.totalFloors?.toString() || '',
      '{{property.yearBuilt}}': previewProperty.yearBuilt?.toString() || '',
      '{{property.propertyType}}': previewProperty.propertyType || '',
      '{{property.heatingType}}': previewProperty.heatingType || '',
      '{{property.energyClass}}': previewProperty.energyEfficiencyClass || '',
      '{{property.energyConsumption}}': previewProperty.energyConsumption ? `${previewProperty.energyConsumption} kWh/(m²·a)` : '',
      '{{property.usableArea}}': previewProperty.usableArea ? `${previewProperty.usableArea} m²` : '',
      '{{property.deposit}}': previewProperty.deposit || '',
      '{{property.commission}}': previewProperty.commission || '',
      '{{property.description}}': previewProperty.description || '',
      '{{property.locationDescription}}': previewProperty.locationDescription || '',
      '{{property.equipmentDescription}}': previewProperty.equipmentDescription || '',
      '{{property.virtualTour}}': previewProperty.virtualTour || '',
      
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
    // Clean up HTML entities that show as literal text (e.g. &nbsp; from contentEditable)
    result = result.replace(/&nbsp;/g, ' ');
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
          customColors: template.customColors,
        });
      } else if (expose) {
        await updateExpose(expose.id, {
          blocks: expose.blocks,
          theme: expose.theme,
          customColors: expose.customColors,
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

  const addBlock = (type: string, atIndex?: number) => {
    const blockDef = BLOCK_TYPES.find(b => b.type === type);
    if (!blockDef) return;
    
    const newBlock: ExposeBlock = {
      id: `block-${Date.now()}`,
      type,
      ...blockDef.defaultData,
    };
    
    // Always append at the end (unless atIndex is specified, e.g. from drag & drop)
    const insertIndex = atIndex ?? currentBlocks.length;
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

  // Custom colors helpers
  const customColors: string[] = isTemplate
    ? (template?.customColors || [])
    : (expose?.customColors || []);

  const addCustomColor = (color: string) => {
    const hex = color.toUpperCase();
    if (customColors.includes(hex)) return;
    const updated = [...customColors, hex];
    if (isTemplate && template) {
      setTemplate({ ...template, customColors: updated });
    } else if (expose) {
      setExpose({ ...expose, customColors: updated });
    }
  };

  const removeCustomColor = (color: string) => {
    const updated = customColors.filter(c => c !== color);
    if (isTemplate && template) {
      setTemplate({ ...template, customColors: updated });
    } else if (expose) {
      setExpose({ ...expose, customColors: updated });
    }
  };

  // ============================================
  // RENDER BLOCK PREVIEW
  // ============================================

  // ============================================
  // DRAG & DROP HANDLERS (HTML5 DnD with live preview)
  // ============================================

  // Drag start for existing blocks
  const handleBlockDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `block:${index}`);
    // Small delay so the drag image captures current state
    setTimeout(() => {
      setDragState({ isDragging: true, dragIndex: index, hoverIndex: index, newBlockType: null });
      setDragPreviewBlocks([...currentBlocks]);
    }, 0);
  };

  // Drag start for new blocks from sidebar
  const handleNewBlockDragStart = (e: React.DragEvent, blockType: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', `new:${blockType}`);
    const blockDef = BLOCK_TYPES.find(b => b.type === blockType);
    if (!blockDef) return;
    const tempBlock: ExposeBlock = {
      id: `temp-${Date.now()}`,
      type: blockType,
      ...blockDef.defaultData,
    };
    setTimeout(() => {
      setDragState({ isDragging: true, dragIndex: null, hoverIndex: currentBlocks.length, newBlockType: blockType });
      setDragPreviewBlocks([...currentBlocks, tempBlock]);
    }, 0);
  };

  // Calculate insert index from mouse position relative to a block
  const handleBlockDragOver = (e: React.DragEvent, globalIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragState.newBlockType ? 'copy' : 'move';
    
    if (!dragState.isDragging || !dragPreviewBlocks) return;

    // Determine if we're in the top or bottom half of the target
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertBefore = e.clientY < midY;
    
    // Calculate the target index in the ORIGINAL block array
    const targetIndex = insertBefore ? globalIndex : globalIndex + 1;
    
    if (targetIndex === dragState.hoverIndex) return; // No change

    // Rebuild the preview blocks
    if (dragState.newBlockType) {
      // Inserting a new block from sidebar
      const blocksWithoutTemp = currentBlocks.filter(b => !b.id.startsWith('temp-'));
      const blockDef = BLOCK_TYPES.find(b => b.type === dragState.newBlockType!);
      if (!blockDef) return;
      const tempBlock: ExposeBlock = {
        id: `temp-${Date.now()}`,
        type: dragState.newBlockType!,
        ...blockDef.defaultData,
      };
      const newPreview = [...blocksWithoutTemp];
      const clampedTarget = Math.min(targetIndex, newPreview.length);
      newPreview.splice(clampedTarget, 0, tempBlock);
      setDragPreviewBlocks(newPreview);
      setDragState(prev => ({ ...prev, hoverIndex: clampedTarget }));
    } else if (dragState.dragIndex !== null) {
      // Reordering an existing block
      const newPreview = [...currentBlocks];
      const [removed] = newPreview.splice(dragState.dragIndex, 1);
      const adjustedTarget = targetIndex > dragState.dragIndex ? targetIndex - 1 : targetIndex;
      const clampedTarget = Math.max(0, Math.min(adjustedTarget, newPreview.length));
      newPreview.splice(clampedTarget, 0, removed);
      setDragPreviewBlocks(newPreview);
      setDragState(prev => ({ ...prev, hoverIndex: clampedTarget }));
    }
  };

  // Handle drop on the preview area
  const handlePreviewDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragPreviewBlocks) return;

    if (dragState.newBlockType) {
      // Finalize new block insertion — replace temp ID with permanent one
      const finalBlocks = dragPreviewBlocks.map(b => 
        b.id.startsWith('temp-') ? { ...b, id: `block-${Date.now()}` } : b
      );
      updateBlocks(finalBlocks);
      const newIndex = finalBlocks.findIndex(b => b.id.startsWith('block-') && !currentBlocks.find(cb => cb.id === b.id));
      setSelectedBlockIndex(newIndex >= 0 ? newIndex : finalBlocks.length - 1);
    } else {
      // Finalize block reorder
      updateBlocks(dragPreviewBlocks);
      if (dragState.hoverIndex !== null) {
        setSelectedBlockIndex(dragState.hoverIndex);
      }
    }

    setDragState({ isDragging: false, dragIndex: null, hoverIndex: null, newBlockType: null });
    setDragPreviewBlocks(null);
  };

  // Handle drag end (cancel or drop outside)
  const handleDragEnd = () => {
    setDragState({ isDragging: false, dragIndex: null, hoverIndex: null, newBlockType: null });
    setDragPreviewBlocks(null);
  };

  // Handle drag over on empty page / preview container
  const handlePreviewDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragState.newBlockType ? 'copy' : 'move';
  };

  const renderBlockPreview = (block: ExposeBlock, index: number, isFirstOnPage: boolean = false, isLastOnPage: boolean = false) => {
    const isSelected = selectedBlockIndex === index;
    const isBeingDragged = dragState.isDragging && dragState.dragIndex !== null && 
      currentBlocks[dragState.dragIndex]?.id === block.id;
    const isTempBlock = block.id.startsWith('temp-');
    const blockDef = BLOCK_TYPES.find(b => b.type === block.type);

    // Determine border radius based on position on page
    const roundedClasses = `${isFirstOnPage ? 'rounded-t-lg' : ''} ${isLastOnPage ? 'rounded-b-lg' : ''}`;

    return (
      <div
        key={block.id}
        draggable={!isTempBlock}
        onDragStart={(e) => {
          if (isTempBlock) return;
          // Find the real index in currentBlocks for this block
          const realIndex = currentBlocks.findIndex(b => b.id === block.id);
          if (realIndex >= 0) handleBlockDragStart(e, realIndex);
        }}
        onDragOver={(e) => handleBlockDragOver(e, index)}
        onDragEnd={handleDragEnd}
        className={`relative transition-all duration-150 ease-out overflow-hidden ${roundedClasses} ${
          isBeingDragged 
            ? 'opacity-40' 
            : isTempBlock
              ? 'opacity-50 border-2 border-dashed border-gray-400'
              : 'opacity-100'
        }`}
        style={{
          cursor: isBeingDragged ? 'grabbing' : 'default',
        }}
        onClick={(e) => { 
          if (!dragState.isDragging && !isTempBlock) {
            e.stopPropagation(); 
            // Find the real index in currentBlocks
            const realIndex = currentBlocks.findIndex(b => b.id === block.id);
            setSelectedBlockIndex(realIndex >= 0 ? realIndex : null); 
          }
        }}
      >
        {/* Selection indicator - inner border overlay */}
        {isSelected && !dragState.isDragging && !isTempBlock && (
          <div 
            className={`absolute inset-0 pointer-events-none z-20 border-2 border-gray-400 ${roundedClasses}`}
            style={{ boxShadow: 'inset 0 0 12px rgba(156,163,175,0.3)' }}
          />
        )}

        {/* Block wrapper */}
        <div className="relative">
          {/* Block Controls - only visible when selected and not dragging */}
          {!dragState.isDragging && isSelected && !isTempBlock && (
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
              <button
                onClick={(e) => { e.stopPropagation(); moveBlock(currentBlocks.findIndex(b => b.id === block.id), 'up'); }}
                disabled={currentBlocks.findIndex(b => b.id === block.id) === 0}
                className="p-1.5 bg-white rounded-md shadow hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <div className="p-1.5 bg-white rounded-md shadow cursor-grab hover:bg-gray-50 hover:shadow-md transition-all">
                <GripVertical className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); moveBlock(currentBlocks.findIndex(b => b.id === block.id), 'down'); }}
                disabled={currentBlocks.findIndex(b => b.id === block.id) === currentBlocks.length - 1}
                className="p-1.5 bg-white rounded-md shadow hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          )}

          {/* Delete button - only visible when selected */}
          {!dragState.isDragging && isSelected && !isTempBlock && (
            <button
              onClick={(e) => { e.stopPropagation(); deleteBlock(currentBlocks.findIndex(b => b.id === block.id)); }}
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

  // Render value with styled variable chips (for templates without previewProperty)
  const renderPv = (value: string | undefined, fallback: string = ''): React.ReactNode => {
    if (!value) return fallback;
    // If we have a previewProperty or it's not a template, just show the resolved text
    if (!isTemplate || previewProperty) return pv(value, fallback);
    
    // Replace {{...}} patterns with styled chips
    const parts = value.split(/(\{\{[^}]+\}\})/g);
    if (parts.length === 1 && !parts[0].match(/^\{\{/)) return value || fallback;
    
    return parts.map((part, i) => {
      if (part.match(/^\{\{[^}]+\}\}$/)) {
        const field = TEMPLATE_FIELDS.find(f => f.variable === part);
        const label = field?.label || part.replace(/[{}]/g, '');
        return (
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium border border-gray-200">
            {field?.icon && <span className="mr-0.5 text-[9px]">{field.icon}</span>}
            {label}
          </span>
        );
      }
      // Clean up &nbsp; entities from contentEditable
      return part ? part.replace(/&nbsp;/g, '\u00A0') : null;
    });
  };

  // HTML version of renderPv for use inside dangerouslySetInnerHTML (returns string, not ReactNode)
  const pvHtml = (value: string | undefined, fallback: string = ''): string => {
    if (!value) return fallback;
    if (!isTemplate || previewProperty) return pv(value, fallback);
    // Template mode without previewProperty: convert {{...}} to styled HTML chips
    return value.replace(/\{\{([^}]+)\}\}/g, (match) => {
      const field = TEMPLATE_FIELDS.find(f => f.variable === match);
      const label = field?.label || match.replace(/[{}]/g, '');
      const icon = field?.icon ? `<span style="margin-right:2px;font-size:9px">${field.icon}</span>` : '';
      return `<span style="display:inline-flex;align-items:center;padding:1px 6px;margin:0 2px;background:#F3F4F6;color:#4B5563;border-radius:4px;font-size:10px;font-weight:500;border:1px solid #E5E7EB">${icon}${label}</span>`;
    });
  };

  const renderBlockContent = (block: ExposeBlock) => {
    // Per-block color overrides
    const blockBg = block.backgroundColor || undefined;
    const blockTextColor = block.textColor || undefined;
    const blockTitleColor = block.titleColor || undefined;

    // Style theme classes for headings and body text
    const hCls = styleTheme.headingStyle; // e.g. 'font-bold tracking-tight'
    const bCls = styleTheme.bodyStyle;    // e.g. 'font-light'

    // Resolve the effective property for image fallback (property for exposes, previewProperty for templates)
    const effectiveProperty = property || previewProperty;

    switch (block.type) {
      case 'hero': {
        // Use block's own imageUrl, or fall back to property's first image
        const heroImage = block.imageUrl || (effectiveProperty?.images?.[0] ? getImageUrl(effectiveProperty.images[0]) : '');
        return (
          <div className="relative h-64 overflow-hidden" style={{ backgroundColor: blockBg || '#000000' }}>
            {heroImage ? (
              <img src={heroImage.startsWith('http') || heroImage.startsWith('/') ? heroImage : getImageUrl(heroImage)} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/30">
                <ImageIcon className="w-16 h-16" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 via-black/30 to-transparent pt-16">
              <h1 className={`text-3xl mb-2 ${hCls}`} style={{ color: blockTitleColor || '#FFFFFF' }}>{renderPv(block.title, 'Titel eingeben...')}</h1>
              <p className={`text-lg opacity-90 ${bCls}`} style={{ color: blockTextColor || '#FFFFFF' }}>{renderPv(block.subtitle, 'Untertitel eingeben...')}</p>
            </div>
          </div>
        );
      }

      case 'stats':
        const stats = block.items || [
          { label: 'Zimmer', value: '{{property.rooms}}' },
          { label: 'Wohnfläche', value: '{{property.area}}' },
          { label: 'Preis', value: '{{property.price}}' },
        ];
        return (
          <div className="py-6 px-4 flex justify-around" style={{ backgroundColor: blockBg || '#F9FAFB' }}>
            {stats.map((stat: any, i: number) => (
              <div key={i} className="text-center">
                <div className={`text-2xl ${hCls}`} style={{ color: blockTitleColor || themeColors.primary }}>{renderPv(stat.value)}</div>
                <div className={`text-sm ${bCls}`} style={{ color: blockTextColor || '#6B7280' }}>{renderPv(stat.label)}</div>
              </div>
            ))}
          </div>
        );

      case 'text': {
        const textContent = pvHtml(block.content, 'Text eingeben...');
        const isHtml = textContent.includes('<');
        return (
          <div className={`p-6 ${block.style === 'highlight' && !blockBg ? 'border-l-4' : ''}`} style={{ backgroundColor: blockBg || (block.style === 'highlight' ? '#F9FAFB' : undefined), borderColor: block.style === 'highlight' ? themeColors.primary : undefined }}>
            {block.title && <h3 className={`text-lg mb-3 ${hCls}`} style={{ color: blockTitleColor || themeColors.secondary }}>{renderPv(block.title)}</h3>}
            {isHtml ? (
              <div className={`prose prose-sm max-w-none ${bCls}`} style={{ color: blockTextColor || '#4B5563' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(textContent) }} />
            ) : (
              <p className={`whitespace-pre-wrap ${bCls}`} style={{ color: blockTextColor || '#4B5563' }}>{textContent}</p>
            )}
          </div>
        );
      }

      case 'gallery': {
        // Use block's own images, or fall back to property images
        const galleryImages = (block.images && block.images.length > 0) 
          ? block.images 
          : (effectiveProperty?.images || []);
        return (
          <div className="p-4" style={{ backgroundColor: blockBg }}>
            <div className={`grid gap-2 ${block.columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {galleryImages.length > 0 ? galleryImages.slice(0, 4).map((img: string, i: number) => (
                <div key={i} className="aspect-video bg-gray-200 rounded overflow-hidden">
                  <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
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
      }

      case 'features':
      case 'highlights':
        const items = block.items || [];
        return (
          <div className="p-6" style={{ backgroundColor: blockBg }}>
            {block.title && <h3 className={`text-lg mb-4 ${hCls}`} style={{ color: blockTitleColor || themeColors.secondary }}>{renderPv(block.title)}</h3>}
            <div className="grid grid-cols-2 gap-3">
              {items.length > 0 ? items.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: blockTitleColor || themeColors.primary }} />
                  <span className={`text-sm ${bCls}`} style={{ color: blockTextColor || '#4B5563' }}>{renderPv(typeof item === 'string' ? item : item.text)}</span>
                </div>
              )) : (
                <span className="text-gray-400 text-sm">Elemente hinzufügen...</span>
              )}
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="p-6" style={{ backgroundColor: blockBg || '#F9FAFB' }}>
            <h3 className={`text-lg mb-2 ${hCls}`} style={{ color: blockTitleColor || themeColors.secondary }}>{renderPv(block.title, 'Lage')}</h3>
            <p className={`mb-2 ${bCls}`} style={{ color: blockTextColor || '#4B5563' }}>{renderPv(block.address, '{{property.address}}')}</p>
            {block.description && <p className={`text-sm ${bCls}`} style={{ color: blockTextColor || '#6B7280' }}>{renderPv(block.description)}</p>}
          </div>
        );

      case 'contact':
        return (
          <div className="p-6" style={{ backgroundColor: blockBg || themeColors.primary }}>
            <h3 className={`text-lg mb-3 ${hCls}`} style={{ color: blockTitleColor || '#FFFFFF' }}>{renderPv(block.title, 'Ihr Ansprechpartner')}</h3>
            <p className={bCls} style={{ color: blockTextColor || '#FFFFFF' }}>{renderPv(block.name, '{{user.name}}')}</p>
            <p className={bCls} style={{ color: blockTextColor || '#FFFFFF', opacity: 0.8 }}>{renderPv(block.email, '{{user.email}}')}</p>
            {block.phone && <p className={bCls} style={{ color: blockTextColor || '#FFFFFF', opacity: 0.8 }}>{renderPv(block.phone)}</p>}
          </div>
        );

      case 'leadInfo':
        return (
          <div className="p-6" style={{ backgroundColor: blockBg || undefined }}>
            {block.showGreeting !== false && (
              <p className={`text-sm mb-2 ${bCls}`} style={{ color: blockTextColor || '#6B7280' }}>Erstellt für</p>
            )}
            <h3 className={`text-lg mb-2 ${hCls}`} style={{ color: blockTitleColor || themeColors.secondary }}>
              {renderPv(block.leadName, '{{lead.name}}')}
            </h3>
            <div className={`space-y-1 text-sm ${bCls}`} style={{ color: blockTextColor || '#4B5563' }}>
              <p>{renderPv(block.leadEmail, '{{lead.email}}')}</p>
              {block.leadPhone && <p>{renderPv(block.leadPhone)}</p>}
            </div>
          </div>
        );

      case 'priceTable':
        const priceItems = block.items || [
          { label: 'Kaltmiete', value: '{{property.price}}' },
          { label: 'Nebenkosten', value: 'ca. 200 €' },
          { label: 'Kaution', value: '3 Monatsmieten' },
        ];
        return (
          <div className="p-6" style={{ backgroundColor: blockBg }}>
            {block.title && <h3 className={`text-lg mb-4 ${hCls}`} style={{ color: blockTitleColor || themeColors.secondary }}>{renderPv(block.title)}</h3>}
            <div className="space-y-2">
              {priceItems.map((item: any, i: number) => (
                <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                  <span className={bCls} style={{ color: blockTextColor || '#4B5563' }}>{renderPv(item.label)}</span>
                  <span className={hCls} style={{ color: blockTitleColor || undefined }}>{renderPv(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'energyCertificate':
        return (
          <div className="p-6" style={{ backgroundColor: blockBg || '#F9FAFB' }}>
            <h3 className={`text-lg mb-4 ${hCls}`} style={{ color: blockTitleColor || themeColors.secondary }}>Energieausweis</h3>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl ${hCls}`} style={{ backgroundColor: themeColors.primary }}>
                {renderPv(block.energyClass, 'B')}
              </div>
              <div>
                <p className={`text-sm ${bCls}`} style={{ color: blockTextColor || '#6B7280' }}>Energieeffizienzklasse</p>
                <p className={hCls} style={{ color: blockTitleColor || undefined }}>{renderPv(block.consumption, '85 kWh/(m²·a)')}</p>
              </div>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="p-8 text-center" style={{ backgroundColor: blockBg || '#F9FAFB' }}>
            <h3 className={`text-xl mb-4 ${hCls}`} style={{ color: blockTitleColor || themeColors.secondary }}>{renderPv(block.title, 'Interesse geweckt?')}</h3>
            <button className={`px-6 py-3 text-white rounded-lg ${hCls}`} style={{ backgroundColor: themeColors.primary }}>
              {renderPv(block.buttonText, 'Jetzt Termin vereinbaren')}
            </button>
          </div>
        );

      case 'quote':
        return (
          <div className="p-6 border-l-4" style={{ borderColor: themeColors.accent, backgroundColor: blockBg }}>
            <p className={`text-lg italic mb-2 ${bCls}`} style={{ color: blockTextColor || '#4B5563' }}>"{renderPv(block.text, 'Zitat eingeben...')}"</p>
            {block.author && <p className={`text-sm ${bCls}`} style={{ color: blockTextColor || '#6B7280' }}>— {renderPv(block.author)}</p>}
          </div>
        );

      case 'floorplan': {
        // Use block's own imageUrl, or fall back to property's first floorplan
        const floorplanImage = block.imageUrl || (effectiveProperty?.floorplans?.[0] ? getImageUrl(effectiveProperty.floorplans[0]) : '');
        return (
          <div className="p-6" style={{ backgroundColor: blockBg }}>
            {block.title && <h3 className={`text-lg mb-4 ${hCls}`} style={{ color: blockTitleColor || themeColors.secondary }}>{renderPv(block.title)}</h3>}
            {floorplanImage ? (
              <img src={floorplanImage.startsWith('http') || floorplanImage.startsWith('/') ? floorplanImage : getImageUrl(floorplanImage)} alt="Grundriss" className="w-full" />
            ) : (
              <div className="aspect-video bg-gray-200 rounded flex items-center justify-center text-gray-400">
                <Home className="w-12 h-12" />
              </div>
            )}
          </div>
        );
      }

      case 'twoColumn': {
        const leftHtml = pvHtml(block.leftContent, 'Linke Spalte...');
        const rightHtml = pvHtml(block.rightContent, 'Rechte Spalte...');
        return (
          <div className="p-6" style={{ backgroundColor: blockBg }}>
            <div className="grid grid-cols-2 gap-6">
              <div className={`prose prose-sm max-w-none ${bCls}`} style={{ color: blockTextColor || '#4B5563' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(leftHtml) }} />
              <div className={`prose prose-sm max-w-none ${bCls}`} style={{ color: blockTextColor || '#4B5563' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rightHtml) }} />
            </div>
          </div>
        );
      }

      case 'video':
        return (
          <div className="p-6" style={{ backgroundColor: blockBg }}>
            {block.title && <h3 className={`text-lg mb-4 ${hCls}`} style={{ color: blockTitleColor || themeColors.secondary }}>{renderPv(block.title)}</h3>}
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
            {block.title && <h3 className={`text-lg mb-4 ${hCls}`} style={{ color: themeColors.secondary }}>{renderPv(block.title)}</h3>}
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
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded flex flex-col items-center justify-center text-gray-500">
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
      const filtered = searchTerm 
        ? TEMPLATE_FIELDS.filter(f => 
            f.label.toLowerCase().includes(searchTerm) ||
            f.id.toLowerCase().includes(searchTerm) ||
            f.variable.toLowerCase().includes(searchTerm)
          )
        : TEMPLATE_FIELDS; // Show all fields when no search term
      
      setMentionState({
        isOpen: true,
        searchTerm,
        activeField: fieldId,
        cursorPosition: cursorPos,
        filteredFields: filtered // Show all matching fields
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
    
    // Group fields by category
    const groupedFields = mentionState.filteredFields.reduce((acc, field) => {
      if (!acc[field.category]) acc[field.category] = [];
      acc[field.category].push(field);
      return acc;
    }, {} as Record<string, TemplateField[]>);

    const categoryOrder = ['property', 'user', 'lead', 'date'];
    
    return (
      <div 
        ref={mentionRef}
        className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
      >
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-500">Feld einfügen</span>
          {mentionState.searchTerm && (
            <span className="text-xs text-gray-400 ml-2">
              ({mentionState.filteredFields.length} Treffer)
            </span>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {mentionState.filteredFields.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">Keine Felder gefunden</div>
          ) : (
            categoryOrder.map(category => {
              const fields = groupedFields[category];
              if (!fields || fields.length === 0) return null;
              return (
                <div key={category}>
                  <div className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-500 sticky top-0">
                    {FIELD_CATEGORY_LABELS[category]}
                  </div>
                  {fields.map(field => (
                    <button
                      key={field.id}
                      type="button"
                      className="w-full px-3 py-1.5 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                      }}
                      onClick={() => {
                        const el = document.querySelector(`[data-field-id="${fieldId}"]`) as HTMLElement;
                        if (!el) return;

                        if (el.getAttribute('contenteditable') === 'true') {
                          // contentEditable mode: use DOM-based insertion (works with HTML content)
                          insertMentionTag(fieldId, field);
                        } else {
                          // Plain input mode (fallback)
                          const input = el as HTMLInputElement | HTMLTextAreaElement;
                          insertFieldAtCursor(field, input.value, mentionState.cursorPosition, (v) => {
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
                              || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                            nativeInputValueSetter?.call(input, v);
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                          });
                        }
                        setMentionState({ isOpen: false, searchTerm: '', activeField: null, cursorPosition: 0, filteredFields: [] });
                      }}
                    >
                      <span className="text-sm">{field.icon}</span>
                      <span className="text-sm text-gray-700">{field.label}</span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Convert a raw value (HTML with {{variable}} markers) to display HTML with visual tag chips
  const valueToTagHtml = (value: string): string => {
    if (!value) return '';
    let html = value;
    // Backwards compatibility: if value is plain text (no HTML tags), convert \n to <br>
    if (!html.match(/<[a-z]/i)) {
      html = html.replace(/\n/g, '<br>');
    }
    // Replace {{variable}} with styled, draggable tag chips
    return html.replace(/\{\{([^}]+)\}\}/g, (match) => {
      const field = TEMPLATE_FIELDS.find(f => f.variable === match);
      if (!field) return match;
      return `<span contenteditable="false" draggable="true" data-variable="${match}" style="display:inline-flex;align-items:center;gap:2px;padding:1px 6px;background:#EEF2FF;color:#4338CA;border:1px solid #C7D2FE;border-radius:4px;font-size:11px;font-weight:500;cursor:grab;user-select:all;vertical-align:baseline;line-height:1.4;margin:0 1px;">${field.icon} ${field.label}</span>`;
    });
  };

  // Convert HTML from contentEditable back to storable value:
  // Replace tag chip spans with {{variable}} text, preserve ALL other HTML (bold, italic, lists, divs, etc.)
  const tagHtmlToValue = (el: HTMLElement): string => {
    let html = el.innerHTML;
    // Replace all tag chip spans with their {{variable}} markers
    html = html.replace(/<span\s[^>]*?data-variable="([^"]*)"[^>]*?>[\s\S]*?<\/span>/gi, '$1');
    return html;
  };

  // Insert a mention tag at the @ position in the editor using DOM manipulation
  // (works correctly with HTML content, unlike string-based approach)
  const insertMentionTag = (fieldId: string, field: TemplateField) => {
    const el = document.querySelector(`[data-field-id="${fieldId}"]`) as HTMLElement;
    if (!el) return;

    // Walk text nodes to find the last @
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let atNode: Text | null = null;
    let atOffset = -1;

    while (walker.nextNode()) {
      const text = walker.currentNode as Text;
      const content = text.textContent || '';
      const idx = content.lastIndexOf('@');
      if (idx !== -1) {
        atNode = text;
        atOffset = idx;
      }
    }

    if (atNode && atOffset !== -1) {
      const endOffset = Math.min(atOffset + 1 + mentionState.searchTerm.length, atNode.textContent?.length || 0);

      // Create range from @ to end of search term and delete it
      const range = document.createRange();
      range.setStart(atNode, atOffset);
      range.setEnd(atNode, endOffset);
      range.deleteContents();

      // Create and insert the tag span
      const tagHtml = valueToTagHtml(field.variable);
      const temp = document.createElement('span');
      temp.innerHTML = DOMPurify.sanitize(tagHtml);
      const tagSpan = temp.firstChild;

      if (tagSpan) {
        range.insertNode(tagSpan);
        // Add a non-breaking space after the tag
        const space = document.createTextNode('\u00A0');
        tagSpan.parentNode?.insertBefore(space, tagSpan.nextSibling);

        // Move cursor after the space
        const newRange = document.createRange();
        newRange.setStartAfter(space);
        newRange.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(newRange);
      }

      // Trigger input event to save via RichEditorField's onInput handler
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  // Execute formatting command on the currently focused contentEditable
  const execFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  // Formatting toolbar for multiline rich text editors
  const renderFormatToolbar = (fieldId: string) => (
    <div className="flex items-center gap-0.5 border border-gray-200 rounded-t-md bg-gray-50 px-1.5 py-0.5">
      <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat('bold'); }} className="px-1.5 py-0.5 hover:bg-gray-200 rounded text-[11px] font-bold text-gray-600" title="Fett (⌘B)">B</button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat('italic'); }} className="px-1.5 py-0.5 hover:bg-gray-200 rounded text-[11px] italic text-gray-600" title="Kursiv (⌘I)">I</button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat('underline'); }} className="px-1.5 py-0.5 hover:bg-gray-200 rounded text-[11px] underline text-gray-600" title="Unterstrichen (⌘U)">U</button>
      <div className="w-px h-3.5 bg-gray-300 mx-0.5" />
      <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat('insertUnorderedList'); }} className="px-1.5 py-0.5 hover:bg-gray-200 rounded text-[11px] text-gray-600" title="Aufzählung">• Liste</button>
    </div>
  );

  // Render a template-aware input field with @-mention support, visual tags, and rich text
  const renderTemplateInput = (
    fieldId: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    multiline: boolean = false
  ) => {
    // For non-template mode, single-line: use plain input
    if (!isTemplate && !multiline) {
      return <input type="text" value={value || ''} placeholder={placeholder}
        className="w-full px-2.5 py-1.5 2xl:px-3 2xl:py-2 border border-gray-200 rounded-md text-xs 2xl:text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
        onChange={(e) => onChange(e.target.value)}
      />;
    }

    // For non-template mode with multiline: rich text editor (no template tags)
    if (!isTemplate && multiline) {
      return (
        <div className="relative">
          {renderFormatToolbar(fieldId)}
          <RichEditorField
            key={fieldId}
            fieldId={fieldId}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            multiline
            className="w-full px-2.5 py-1.5 2xl:px-3 2xl:py-2 border border-gray-200 border-t-0 rounded-b-md text-xs 2xl:text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 focus:outline-none min-h-[100px] max-h-[250px] overflow-y-auto"
          />
          <style>{`
            [data-field-id="${fieldId}"]:empty::before {
              content: attr(data-placeholder);
              color: #9ca3af;
              pointer-events: none;
            }
            [data-field-id="${fieldId}"] ul { list-style: disc; padding-left: 1.5em; margin: 0.25em 0; }
            [data-field-id="${fieldId}"] ol { list-style: decimal; padding-left: 1.5em; margin: 0.25em 0; }
            [data-field-id="${fieldId}"] b, [data-field-id="${fieldId}"] strong { font-weight: 700; }
            [data-field-id="${fieldId}"] i, [data-field-id="${fieldId}"] em { font-style: italic; }
            [data-field-id="${fieldId}"] u { text-decoration: underline; }
          `}</style>
        </div>
      );
    }

    // ─── Template mode: contentEditable with visual tag chips ───
    // Mention detection: called after every input in the editor
    const handleTemplateMentionInput = (el: HTMLElement) => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const preRange = document.createRange();
        preRange.setStart(el, 0);
        preRange.setEnd(range.startContainer, range.startOffset);
        const textBefore = preRange.toString();
        const atIndex = textBefore.lastIndexOf('@');

        if (atIndex !== -1 && (atIndex === 0 || textBefore[atIndex - 1] === ' ' || textBefore[atIndex - 1] === '\n')) {
          const searchTerm = textBefore.substring(atIndex + 1).toLowerCase();
          const filtered = searchTerm
            ? TEMPLATE_FIELDS.filter(f =>
                f.label.toLowerCase().includes(searchTerm) ||
                f.id.toLowerCase().includes(searchTerm)
              )
            : TEMPLATE_FIELDS;
          setMentionState({
            isOpen: true,
            searchTerm,
            activeField: fieldId,
            cursorPosition: atIndex,
            filteredFields: filtered,
          });
        } else {
          setMentionState(prev => ({ ...prev, isOpen: false }));
        }
      }
    };

    // Mention keyboard handling (Escape / Enter)
    const handleTemplateMentionKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (mentionState.isOpen && mentionState.activeField === fieldId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setMentionState(prev => ({ ...prev, isOpen: false }));
        } else if (e.key === 'Enter' && mentionState.filteredFields.length > 0) {
          e.preventDefault();
          const field = mentionState.filteredFields[0];
          insertMentionTag(fieldId, field);
          setMentionState({ isOpen: false, searchTerm: '', activeField: null, cursorPosition: 0, filteredFields: [] });
        }
      }
    };

    return (
      <div className="relative">
        {multiline && renderFormatToolbar(fieldId)}
        <RichEditorField
          key={fieldId}
          fieldId={fieldId}
          value={value}
          onChange={onChange}
          placeholder={`${placeholder} (tippe @ für Felder)`}
          multiline={multiline}
          className={`w-full px-2.5 border border-gray-200 ${multiline ? 'border-t-0 rounded-b-md' : 'rounded-md'} text-xs 2xl:text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 focus:outline-none ${multiline ? 'min-h-[100px] max-h-[250px] overflow-y-auto py-1.5 2xl:py-2' : 'overflow-hidden whitespace-nowrap'}`}
          style={multiline ? undefined : { lineHeight: '34px', paddingTop: 0, paddingBottom: 0 }}
          valueToHtml={valueToTagHtml}
          htmlToValue={(el) => tagHtmlToValue(el)}
          onFocusChange={(focused) => {
            if (focused) {
              setTemplateFieldFocused(true);
            } else {
              setTemplateFieldFocused(false);
              setTimeout(() => {
                if (mentionState.activeField === fieldId) {
                  setMentionState(prev => ({ ...prev, isOpen: false }));
                }
              }, 200);
            }
          }}
          onEditorInput={handleTemplateMentionInput}
          onEditorKeyDown={handleTemplateMentionKeyDown}
        />
        <style>{`
          [data-field-id="${fieldId}"]:empty::before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
          [data-field-id="${fieldId}"] ul { list-style: disc; padding-left: 1.5em; margin: 0.25em 0; }
          [data-field-id="${fieldId}"] ol { list-style: decimal; padding-left: 1.5em; margin: 0.25em 0; }
          [data-field-id="${fieldId}"] b, [data-field-id="${fieldId}"] strong { font-weight: 700; }
          [data-field-id="${fieldId}"] i, [data-field-id="${fieldId}"] em { font-style: italic; }
          [data-field-id="${fieldId}"] u { text-decoration: underline; }
        `}</style>
        {renderMentionDropdown(fieldId)}
      </div>
    );
  };

  // Render template fields as a floating overlay panel (for drag & drop into block editor)
  const renderFieldsPanel = () => {
    if (!isTemplate || !showFieldsSidebar) return null;
    if (typeof document === 'undefined') return null;

    const groupedFields = TEMPLATE_FIELDS.reduce((acc, field) => {
      if (!acc[field.category]) acc[field.category] = [];
      acc[field.category].push(field);
      return acc;
    }, {} as Record<string, TemplateField[]>);

    // Measure block editor to position the overlay panel to its left
    let pos = editorRect;
    if (!pos && blockEditorRef.current) {
      const rect = blockEditorRef.current.getBoundingClientRect();
      pos = { top: rect.top, left: rect.left, bottom: rect.bottom };
    }
    if (!pos) return null;

    return createPortal(
      <div className="fixed w-48 2xl:w-52 bg-white border border-gray-200 rounded-l-xl shadow-lg flex flex-col overflow-hidden" style={{ zIndex: 99999, top: pos.top, bottom: window.innerHeight - pos.bottom, left: pos.left - 192 }}>
        {/* Header */}
        <div className="px-2.5 py-2 border-b border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-xs font-medium text-gray-700">
            Felder <span className="font-mono text-[10px] bg-gray-100 px-1 rounded">@</span>
          </span>
          <button
            onClick={() => setShowFieldsSidebar(false)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Felder-Panel schließen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="px-2.5 py-1.5 text-[10px] text-gray-400 border-b border-gray-50 shrink-0">
          Felder per Drag & Drop in die Eingabefelder rechts ziehen
        </p>

        {/* Fields list */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-2 scrollbar-thin">
          {Object.entries(groupedFields).map(([category, fields]) => (
            <div key={category}>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-0.5">
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
                    className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded border border-gray-200 cursor-grab hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm transition-colors"
                    title={field.label}
                  >
                    <span className="text-xs flex-shrink-0 leading-none">{field.icon}</span>
                    <span className="text-xs text-gray-700 truncate">{field.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>,
      document.body
    );
  };


  // ============================================
  // RENDER BLOCK EDITOR (Right Panel)
  // ============================================

  const renderBlockEditor = () => {
    // Felder-Button at the top of block editor (only for templates)
    const fieldsButton = isTemplate ? (
      <button
        onClick={() => setShowFieldsSidebar(!showFieldsSidebar)}
        className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium border-b transition-all duration-300 ${
          showFieldsSidebar
            ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
            : `bg-gray-50 text-gray-500 border-gray-100 hover:bg-indigo-50 hover:text-indigo-600 ${templateFieldFocused ? 'fields-btn-spark' : ''}`
        }`}
      >
        <span>@</span>
        <span>{showFieldsSidebar ? 'Felder schließen' : 'Felder'}</span>
      </button>
    ) : null;

    if (selectedBlockIndex === null) {
      return (
        <div className="h-full flex flex-col">
          {fieldsButton}
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Type className="w-12 h-12 mb-4" />
            <p className="text-center">Wähle einen Block aus<br />um ihn zu bearbeiten</p>
          </div>
        </div>
      );
    }

    const block = currentBlocks[selectedBlockIndex];
    if (!block) return null;

    const blockDef = BLOCK_TYPES.find(b => b.type === block.type);

    return (
      <div>
        {fieldsButton}
        <div className="p-3 2xl:p-4 space-y-3 2xl:space-y-4">
        <div className="flex items-center gap-2 pb-2 2xl:pb-3 border-b">
          {blockDef && <blockDef.icon className="w-4 h-4 2xl:w-5 2xl:h-5 text-gray-700" />}
          <span className="font-semibold text-gray-900 text-sm 2xl:text-base">{blockDef?.label || block.type}</span>
        </div>

        {/* Common fields based on block type */}
        {(block.type === 'hero' || block.type === 'text' || block.type === 'location' || block.type === 'contact' || block.type === 'priceTable' || block.type === 'features' || block.type === 'highlights' || block.type === 'cta' || block.type === 'floorplan') && (
          <div>
            <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Titel</label>
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
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Untertitel</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-subtitle`,
                block.subtitle || '',
                (value) => updateBlock(selectedBlockIndex, { subtitle: value }),
                'Untertitel eingeben...'
              )}
            </div>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Hero-Bild</label>
              {block.imageUrl ? (
                <div className="relative group">
                  <img src={getImageUrl(block.imageUrl || '')} alt="" className="w-full h-24 object-cover rounded-md" />
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
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 hover:bg-gray-50 transition-colors flex flex-col items-center gap-2"
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
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Inhalt</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-content`,
                block.content || '',
                (value) => updateBlock(selectedBlockIndex, { content: value }),
                'Text eingeben...',
                true
              )}
            </div>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Stil</label>
              <select
                value={block.style || 'normal'}
                onChange={(e) => updateBlock(selectedBlockIndex, { style: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Zitat</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-text`,
                block.text || '',
                (value) => updateBlock(selectedBlockIndex, { text: value }),
                'Zitat eingeben...',
                true
              )}
            </div>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Autor</label>
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
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Adresse</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-address`,
                block.address || '',
                (value) => updateBlock(selectedBlockIndex, { address: value }),
                'Adresse eingeben...'
              )}
            </div>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Beschreibung</label>
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
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Name</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-name`,
                block.name || '',
                (value) => updateBlock(selectedBlockIndex, { name: value }),
                'Name eingeben...'
              )}
            </div>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">E-Mail</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-email`,
                block.email || '',
                (value) => updateBlock(selectedBlockIndex, { email: value }),
                'E-Mail eingeben...'
              )}
            </div>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Telefon</label>
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
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Lead Name</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-leadName`,
                block.leadName || '',
                (value) => updateBlock(selectedBlockIndex, { leadName: value }),
                'Lead Name...'
              )}
            </div>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Lead E-Mail</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-leadEmail`,
                block.leadEmail || '',
                (value) => updateBlock(selectedBlockIndex, { leadEmail: value }),
                'Lead E-Mail...'
              )}
            </div>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Lead Telefon</label>
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
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Button Text</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-buttonText`,
                block.buttonText || '',
                (value) => updateBlock(selectedBlockIndex, { buttonText: value }),
                'Jetzt Termin vereinbaren'
              )}
            </div>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Button URL</label>
              <input
                type="text"
                value={block.buttonUrl || ''}
                onChange={(e) => updateBlock(selectedBlockIndex, { buttonUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
          </>
        )}

        {block.type === 'energyCertificate' && (
          <>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Energieeffizienzklasse</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-energyClass`,
                block.energyClass || '',
                (value) => updateBlock(selectedBlockIndex, { energyClass: value }),
                'z.B. B oder {{property.energyClass}}'
              )}
            </div>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Verbrauch</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-consumption`,
                block.consumption || '',
                (value) => updateBlock(selectedBlockIndex, { consumption: value }),
                'z.B. 85 kWh/(m²·a)'
              )}
            </div>
          </>
        )}

        {block.type === 'floorplan' && (
          <div>
            <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Grundriss</label>
            {block.imageUrl ? (
              <div className="relative group">
                <img src={getImageUrl(block.imageUrl || '')} alt="" className="w-full h-32 object-contain rounded-md bg-gray-100" />
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
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 hover:bg-gray-50 transition-colors flex flex-col items-center gap-2"
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
            <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Video-URL</label>
            <input
              type="text"
              value={block.videoUrl || ''}
              onChange={(e) => updateBlock(selectedBlockIndex, { videoUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder="YouTube, Vimeo oder direkte Video-URL"
            />
            <p className="mt-1 text-xs text-gray-500">Unterstützt: YouTube, Vimeo, MP4</p>
          </div>
        )}

        {block.type === 'virtualTour' && (
          <div>
            <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">360° Tour URL</label>
            <input
              type="text"
              value={block.tourUrl || ''}
              onChange={(e) => updateBlock(selectedBlockIndex, { tourUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Matterport, 3DVista, etc."
            />
            <p className="mt-1 text-xs text-gray-500">Embed-URL der virtuellen Tour</p>
          </div>
        )}

        {block.type === 'twoColumn' && (
          <>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Linke Spalte</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-leftContent`,
                block.leftContent || '',
                (value) => updateBlock(selectedBlockIndex, { leftContent: value }),
                'Inhalt linke Spalte...',
                true
              )}
            </div>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Rechte Spalte</label>
              {renderTemplateInput(
                `block-${selectedBlockIndex}-rightContent`,
                block.rightContent || '',
                (value) => updateBlock(selectedBlockIndex, { rightContent: value }),
                'Inhalt rechte Spalte...',
                true
              )}
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
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded text-sm text-gray-500 hover:border-gray-400 hover:text-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Hinzufügen
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
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded text-sm text-gray-500 hover:border-gray-400 hover:text-blue-600 transition-colors"
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
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded text-sm text-gray-500 hover:border-gray-400 hover:text-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                {block.type === 'features' ? 'Merkmal hinzufügen' : 'Highlight hinzufügen'}
              </button>
            </div>
          </div>
        )}

        {/* Block Color Settings - available for most blocks */}
        {block.type !== 'pageBreak' && (
          <div className="pt-3 mt-3 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-700 mb-2">Block-Farben</label>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-500">Hintergrund</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {BG_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => updateBlock(selectedBlockIndex, { 
                        backgroundColor: color.value === 'transparent' ? undefined : color.value 
                      })}
                      className={`w-5 h-5 rounded border-2 transition-all ${
                        (block.backgroundColor === color.value || (!block.backgroundColor && color.value === 'transparent'))
                          ? 'border-blue-500 scale-110' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ 
                        backgroundColor: color.value === 'transparent' ? '#FFFFFF' : color.value,
                        backgroundImage: color.value === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' : undefined,
                        backgroundSize: color.value === 'transparent' ? '6px 6px' : undefined,
                        backgroundPosition: color.value === 'transparent' ? '0 0, 3px 3px' : undefined,
                      }}
                      title={color.name}
                    />
                  ))}
                  {/* Custom colors for background */}
                  {customColors.length > 0 && (
                    <>
                      <div className="w-px h-5 bg-gray-200 mx-0.5" />
                      {customColors.map((color) => (
                        <button
                          key={`bg-custom-${color}`}
                          onClick={() => updateBlock(selectedBlockIndex, { backgroundColor: color })}
                          className={`w-5 h-5 rounded border-2 transition-all relative ${
                            block.backgroundColor === color
                              ? 'border-blue-500 scale-110' 
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Eigene: ${color}`}
                        >
                          <Pipette className="w-2 h-2 absolute -top-0.5 -right-0.5 text-blue-500 drop-shadow-sm" />
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Titel</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {TEXT_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => updateBlock(selectedBlockIndex, { 
                        titleColor: color.value 
                      })}
                      className={`w-5 h-5 rounded border-2 transition-all ${
                        block.titleColor === color.value
                          ? 'border-blue-500 scale-110' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  {/* Custom colors for title */}
                  {customColors.length > 0 && (
                    <>
                      <div className="w-px h-5 bg-gray-200 mx-0.5" />
                      {customColors.map((color) => (
                        <button
                          key={`title-custom-${color}`}
                          onClick={() => updateBlock(selectedBlockIndex, { titleColor: color })}
                          className={`w-5 h-5 rounded border-2 transition-all relative ${
                            block.titleColor === color
                              ? 'border-blue-500 scale-110' 
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Eigene: ${color}`}
                        >
                          <Pipette className="w-2 h-2 absolute -top-0.5 -right-0.5 text-blue-500 drop-shadow-sm" />
                        </button>
                      ))}
                    </>
                  )}
                  {block.titleColor && (
                    <button
                      onClick={() => updateBlock(selectedBlockIndex, { titleColor: undefined })}
                      className="w-5 h-5 rounded border-2 border-gray-200 hover:border-red-400 transition-all flex items-center justify-center text-gray-400 hover:text-red-500"
                      title="Zurücksetzen"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Text</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {TEXT_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => updateBlock(selectedBlockIndex, { 
                        textColor: color.value
                      })}
                      className={`w-5 h-5 rounded border-2 transition-all ${
                        block.textColor === color.value
                          ? 'border-blue-500 scale-110' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  {/* Custom colors for text */}
                  {customColors.length > 0 && (
                    <>
                      <div className="w-px h-5 bg-gray-200 mx-0.5" />
                      {customColors.map((color) => (
                        <button
                          key={`text-custom-${color}`}
                          onClick={() => updateBlock(selectedBlockIndex, { textColor: color })}
                          className={`w-5 h-5 rounded border-2 transition-all relative ${
                            block.textColor === color
                              ? 'border-blue-500 scale-110' 
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Eigene: ${color}`}
                        >
                          <Pipette className="w-2 h-2 absolute -top-0.5 -right-0.5 text-blue-500 drop-shadow-sm" />
                        </button>
                      ))}
                    </>
                  )}
                  {block.textColor && (
                    <button
                      onClick={() => updateBlock(selectedBlockIndex, { textColor: undefined })}
                      className="w-5 h-5 rounded border-2 border-gray-200 hover:border-red-400 transition-all flex items-center justify-center text-gray-400 hover:text-red-500"
                      title="Zurücksetzen"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {block.type === 'gallery' && (
          <>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Spalten</label>
              <select
                value={block.columns || 2}
                onChange={(e) => updateBlock(selectedBlockIndex, { columns: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={2}>2 Spalten</option>
                <option value={3}>3 Spalten</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] 2xl:text-xs font-medium text-gray-600 2xl:text-gray-700 mb-0.5 2xl:mb-1">Bilder</label>
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
                          <img src={getImageUrl(img)} alt="" className="w-full h-16 object-cover rounded" />
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
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
            <div className="w-2 h-2 rounded-full bg-gray-800" />
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
                  className="group p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left"
                >
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                    <LayoutGrid className="w-12 h-12 text-gray-300 group-hover:text-gray-400 transition-colors" />
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
          <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
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
      {/* Header — only minimize when clicking the header itself, not buttons inside */}
      <div 
        className="flex items-center justify-between px-4 h-12 border-b border-gray-100 rounded-t-xl cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={(e) => {
          // Only minimize if the click target is the header div or its direct text children, not buttons/inputs inside
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('[role="menu"]')) return;
          setMinimized(!minimized);
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-gray-800" />
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
                          className={`flex flex-col w-full px-3 py-2 text-left hover:bg-gray-50 ${previewProperty?.id === prop.id ? 'bg-gray-50' : ''}`}
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
                        className={`flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 ${currentTheme === style.id ? 'bg-gray-50' : ''}`}
                      >
                        <span style={{ fontFamily: style.fontFamily }} className="text-base">{style.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Colors Manager */}
              <div className="relative" ref={colorManagerRef}>
                <button
                  ref={colorButtonRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (colorButtonRef.current) {
                      const rect = colorButtonRef.current.getBoundingClientRect();
                      setColorPopupPos({
                        top: rect.bottom + 4,
                        left: Math.max(8, rect.right - 280),
                      });
                    }
                    setShowColorManager(!showColorManager);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <Palette className="w-4 h-4" />
                  <span className="hidden sm:inline">Farben</span>
                  {customColors.length > 0 && (
                    <span className="bg-gray-100 text-blue-600 text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                      {customColors.length}
                    </span>
                  )}
                </button>
                {showColorManager && typeof document !== 'undefined' && createPortal(
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setShowColorManager(false); }} />
                    <div
                      className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] w-[260px] overflow-hidden"
                      style={{ top: colorPopupPos.top, left: colorPopupPos.left }}
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-gray-100">
                        <Palette className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-600">Eigene Farben</span>
                      </div>
                      
                      {/* Saved custom colors */}
                      {customColors.length > 0 && (
                        <div className="px-3.5 py-3 border-b border-gray-100">
                          <div className="flex flex-wrap gap-1.5">
                            {customColors.map((color) => (
                              <div key={color} className="relative group">
                                <div
                                  className="w-7 h-7 rounded-md border-2 border-gray-200 cursor-pointer transition-transform hover:scale-110"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                                <button
                                  onClick={() => removeCustomColor(color)}
                                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center"
                                >
                                  <X className="w-2 h-2" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick palette presets */}
                      <div className="px-3.5 py-3 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {[
                            '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
                            '#22C55E', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
                            '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
                            '#F43F5E', '#1C1917', '#44403C', '#78716C', '#A8A29E',
                            '#D6D3D1', '#FAFAF9', '#0F172A', '#1E293B', '#475569',
                          ].map((c) => (
                            <button
                              key={c}
                              onClick={() => setColorPickerValue(c)}
                              onDoubleClick={() => addCustomColor(c)}
                              className={`w-5.5 h-5.5 rounded-md border-2 transition-all ${
                                colorPickerValue === c ? 'border-blue-500 scale-110 shadow-sm' : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                              }`}
                              style={{ backgroundColor: c }}
                              title={`${c} — Doppelklick zum Hinzufügen`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Color input row */}
                      <div className="px-3.5 pb-2 pt-0">
                        <div className="flex items-center gap-2">
                          <label className="relative flex-shrink-0 cursor-pointer" title="Farbpalette öffnen">
                            <input
                              type="color"
                              value={colorPickerValue}
                              onChange={(e) => setColorPickerValue(e.target.value)}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            />
                            <div className="w-8 h-8 rounded-lg border-2 border-gray-200 flex items-center justify-center hover:border-gray-400 transition-colors" style={{ backgroundColor: colorPickerValue }}>
                              <Pipette className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                            </div>
                          </label>
                          <input
                            type="text"
                            value={colorPickerValue}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setColorPickerValue(v);
                            }}
                            className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg font-mono uppercase bg-gray-50 focus:bg-white focus:border-blue-400 focus:outline-none transition-colors"
                            placeholder="#000000"
                            maxLength={7}
                          />
                        </div>
                      </div>

                      {/* Save button - full width at bottom */}
                      <div className="px-3.5 pb-3">
                        <button
                          onClick={() => {
                            if (/^#[0-9A-Fa-f]{6}$/.test(colorPickerValue)) {
                              addCustomColor(colorPickerValue);
                            }
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 active:bg-gray-950 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Farbe speichern</span>
                        </button>
                      </div>

                      {customColors.length > 0 && (
                        <div className="px-3.5 py-2 border-t border-gray-100 bg-gray-50/50">
                          <p className="text-[10px] text-gray-400">Gespeicherte Farben erscheinen bei den Blockoptionen unter Farben.</p>
                        </div>
                      )}
                    </div>
                  </>,
                  document.body
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
                    ? 'bg-gray-800'
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{saveState === 'saved' ? 'Gespeichert' : 'Speichern'}</span>
              </button>
            </>
          )}

          {/* Minimize/Maximize */}
          {minimized ? (
            <button onClick={(e) => { e.stopPropagation(); setMinimized(false); }} className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-50">
              <Maximize2 className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setMinimized(true); }} className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-50">
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
        <div className="flex h-[calc(100%-48px)] relative">
          {/* Left: Block Library */}
          <div className={`${showBlockLibrary ? 'w-36 2xl:w-48' : 'w-12 2xl:w-14'} border-r border-gray-100 bg-gray-50 transition-all duration-300 ease-in-out flex flex-col overflow-hidden`}>
            <button
              onClick={() => setShowBlockLibrary(!showBlockLibrary)}
              className="flex items-center pl-3 pr-2 py-2.5 2xl:pl-[14px] 2xl:pr-3 2xl:py-3 hover:bg-gray-100 shrink-0"
              title={showBlockLibrary ? 'Blöcke ausblenden' : 'Blöcke einblenden'}
            >
              <Plus className="w-4 h-4 2xl:w-5 2xl:h-5 text-gray-500 shrink-0" />
              <span className={`ml-2 2xl:ml-3 text-xs 2xl:text-sm font-medium text-gray-700 whitespace-nowrap transition-opacity duration-300 ${
                showBlockLibrary ? 'opacity-100' : 'opacity-0'
              }`}>
                Blöcke
              </span>
            </button>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 px-1.5 2xl:px-2 pb-2">
              {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
                <div key={category} className="mb-2 2xl:mb-3">
                  <h4 className={`text-[10px] 2xl:text-xs font-semibold text-gray-400 uppercase tracking-wider px-1.5 2xl:px-2 mb-1 2xl:mb-2 whitespace-nowrap transition-opacity duration-300 ${
                    showBlockLibrary ? 'opacity-100' : 'opacity-0'
                  }`}>
                    {label}
                  </h4>
                  <div className="space-y-0.5 2xl:space-y-1">
                    {BLOCK_TYPES.filter(b => b.category === category).map((blockType) => (
                      <button
                        key={blockType.type}
                        draggable
                        onDragStart={(e) => handleNewBlockDragStart(e, blockType.type)}
                        onDragEnd={handleDragEnd}
                        onClick={() => addBlock(blockType.type)}
                        className="w-full flex items-center pl-1.5 pr-2 py-1 2xl:pl-2 2xl:pr-3 2xl:py-1.5 text-xs 2xl:text-sm text-gray-600 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-md transition-colors cursor-grab active:cursor-grabbing"
                        title={`${blockType.label} — Klicken zum Hinzufügen oder auf die Seite ziehen`}
                      >
                        <blockType.icon className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
                        <span className={`ml-1.5 2xl:ml-2 whitespace-nowrap transition-opacity duration-300 ${
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
            onDragOver={handlePreviewDragOver}
            onDrop={handlePreviewDrop}
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
                      fontFamily: styleTheme.fontFamily,
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
                          className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800"
                        >
                          <Plus className="w-4 h-4 inline mr-2" />
                          Block hinzufügen
                        </button>
                      </div>
                    ) : (
                      // Page with blocks
                      <div 
                        className="relative" 
                        style={{ 
                          minHeight: `${A4_HEIGHT_PX}px`
                        }}
                      >
                        {pageBlocks.map((block, blockIndexOnPage) => {
                          // Find the actual global index in displayBlocks (which may be reordered during drag)
                          const globalIndex = displayBlocks.findIndex(b => b.id === block.id);
                          const isFirstOnPage = blockIndexOnPage === 0;
                          const isLastOnPage = blockIndexOnPage === pageBlocks.length - 1;
                          return renderBlockPreview(block, globalIndex, isFirstOnPage, isLastOnPage);
                        })}
                        
                        {/* Add block button directly after last block on this page */}
                        <div className="flex justify-center py-4">
                          <button
                            onClick={() => setShowBlockLibrary(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors text-sm"
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
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              <span className="text-sm">Neue Seite hinzufügen</span>
            </button>
          </div>

          {/* Right: Block Editor */}
          <div ref={blockEditorRef} className="w-60 2xl:w-72 border-l border-gray-100 bg-white overflow-y-auto flex-shrink-0">
            {renderBlockEditor()}
          </div>

          {/* Fields sidebar rendered via portal */}
          {renderFieldsPanel()}
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
                        className="aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors"
                      >
                        <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
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
                        className="aspect-[4/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors bg-gray-50"
                      >
                        <img src={getImageUrl(img)} alt="" className="w-full h-full object-contain" />
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
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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
                    className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800"
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
                  className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800"
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
