'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGlobalState } from '@/context/GlobalStateContext';
import { X, Minus, Maximize2, Send, Paperclip, ChevronDown, ChevronUp, Bold, Italic, Underline, List, ListOrdered, Link2, Image, Trash2, FileText, Plus, User } from 'lucide-react';
import { createLead, createProperty, sendManualEmail, API_ENDPOINTS, fetchWithAuth, getApiUrl } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { useEnv } from '@/components/EnvProvider';

const SALUTATION_OPTIONS = [
  { value: 'NONE', label: 'Keine Anrede' },
  { value: 'MR', label: 'Herr' },
  { value: 'MS', label: 'Frau' },
  { value: 'DIVERSE', label: 'Divers' },
];

const SOURCE_OPTIONS = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'PORTAL', label: 'Immobilienportal' },
  { value: 'REFERRAL', label: 'Empfehlung' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'COLD_CALL', label: 'Kaltakquise' },
  { value: 'EVENT', label: 'Veranstaltung' },
  { value: 'OTHER', label: 'Sonstiges' },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: 'APARTMENT', label: 'Wohnung' },
  { value: 'HOUSE', label: 'Haus' },
  { value: 'COMMERCIAL', label: 'Gewerbe' },
  { value: 'LAND', label: 'Grundstück' },
  { value: 'GARAGE', label: 'Garage/Stellplatz' },
  { value: 'OTHER', label: 'Sonstiges' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'RESERVED', label: 'Reserviert' },
  { value: 'SOLD', label: 'Verkauft' },
  { value: 'RENTED', label: 'Vermietet' },
  { value: 'INACTIVE', label: 'Inaktiv' },
];

const CONDITION_OPTIONS = [
  { value: '', label: 'Bitte wählen' },
  { value: 'FIRST_OCCUPANCY', label: 'Erstbezug' },
  { value: 'NEW', label: 'Neuwertig' },
  { value: 'RENOVATED', label: 'Renoviert' },
  { value: 'REFURBISHED', label: 'Saniert' },
  { value: 'WELL_MAINTAINED', label: 'Gepflegt' },
  { value: 'MODERNIZED', label: 'Modernisiert' },
  { value: 'NEEDS_RENOVATION', label: 'Renovierungsbedürftig' },
];

const ENERGY_CERT_TYPE_OPTIONS = [
  { value: '', label: 'Bitte wählen' },
  { value: 'DEMAND', label: 'Bedarfsausweis' },
  { value: 'CONSUMPTION', label: 'Verbrauchsausweis' },
];

const ENERGY_CLASS_OPTIONS = [
  { value: '', label: 'Bitte wählen' },
  { value: 'A_PLUS', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'G', label: 'G' },
  { value: 'H', label: 'H' },
];

const COUNTRY_OPTIONS = [
  { value: 'Deutschland', label: 'Deutschland' },
  { value: 'Österreich', label: 'Österreich' },
  { value: 'Schweiz', label: 'Schweiz' },
  { value: 'Liechtenstein', label: 'Liechtenstein' },
  { value: 'Luxemburg', label: 'Luxemburg' },
  { value: 'Belgien', label: 'Belgien' },
  { value: 'Niederlande', label: 'Niederlande' },
  { value: 'Frankreich', label: 'Frankreich' },
  { value: 'Italien', label: 'Italien' },
  { value: 'Spanien', label: 'Spanien' },
  { value: 'Portugal', label: 'Portugal' },
];

// Consistent input styles
const inputClass = "block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 sm:text-sm py-2.5 px-3 transition-all outline-none";
const selectClass = "block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 sm:text-sm py-2.5 px-3 transition-all outline-none";
const labelClass = "block text-xs font-medium text-gray-600 mb-1.5";
const textareaClass = "block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 sm:text-sm py-2.5 px-3 transition-all outline-none resize-none";
const sectionTitleClass = "text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2";

// Email Composer Component
interface EmailComposerProps {
  emailFormData: any;
  updateEmailForm: (data: any) => void;
  onSend: () => void;
  onSaveDraft: () => void;
  onDiscard: () => void;
  loading: boolean;
}

function EmailComposer({ emailFormData, updateEmailForm, onSend, onSaveDraft, onDiscard, loading }: EmailComposerProps) {
  const { apiUrl } = useEnv();
  const [showCc, setShowCc] = useState(!!emailFormData.cc);
  const [showBcc, setShowBcc] = useState(!!emailFormData.bcc);
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureLoaded, setSignatureLoaded] = useState(false);

  // Load user signature
  useEffect(() => {
    const loadSignature = async () => {
      if (!apiUrl || signatureLoaded) return;
      try {
        const response = await fetchWithAuth(`${apiUrl}/me/settings`);
        if (response?.emailSignature) {
          setSignature(response.emailSignature);
        }
        setSignatureLoaded(true);
      } catch (error) {
        console.warn('Could not load signature:', error);
        setSignatureLoaded(true);
      }
    };
    loadSignature();
  }, [apiUrl, signatureLoaded]);

  // Apply formatting
  const applyFormat = (format: string) => {
    const textarea = document.getElementById('email-body') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = emailFormData.body?.substring(start, end) || '';
    
    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        break;
      case 'list':
        formattedText = selectedText.split('\n').map((line: string) => `• ${line}`).join('\n');
        break;
      case 'numbered':
        formattedText = selectedText.split('\n').map((line: string, i: number) => `${i + 1}. ${line}`).join('\n');
        break;
      case 'link':
        const url = prompt('URL eingeben:', 'https://');
        if (url) {
          formattedText = `[${selectedText || 'Link'}](${url})`;
        } else {
          return;
        }
        break;
      default:
        return;
    }

    const newBody = (emailFormData.body || '').substring(0, start) + formattedText + (emailFormData.body || '').substring(end);
    updateEmailForm({ body: newBody });
  };

  // Insert signature
  const insertSignature = () => {
    if (signature) {
      const currentBody = emailFormData.body || '';
      const newBody = currentBody + '\n\n' + signature;
      updateEmailForm({ body: newBody });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Recipients */}
      <div className="space-y-3 mb-4">
        {/* To */}
        <div className="flex items-center gap-2">
          <label className="w-12 text-sm font-medium text-gray-500 shrink-0">An:</label>
          <input
            type="email"
            value={emailFormData.to || ''}
            onChange={(e) => updateEmailForm({ to: e.target.value })}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white text-sm py-2 px-3 transition-all outline-none"
            placeholder="empfaenger@email.de"
          />
          <div className="flex gap-1 shrink-0">
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-gray-50 rounded transition-colors"
              >
                CC
              </button>
            )}
            {!showBcc && (
              <button
                type="button"
                onClick={() => setShowBcc(true)}
                className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-gray-50 rounded transition-colors"
              >
                BCC
              </button>
            )}
          </div>
        </div>

        {/* CC */}
        {showCc && (
          <div className="flex items-center gap-2">
            <label className="w-12 text-sm font-medium text-gray-500 shrink-0">CC:</label>
            <input
              type="email"
              value={emailFormData.cc || ''}
              onChange={(e) => updateEmailForm({ cc: e.target.value })}
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white text-sm py-2 px-3 transition-all outline-none"
              placeholder="cc@email.de"
            />
            <button
              type="button"
              onClick={() => { setShowCc(false); updateEmailForm({ cc: '' }); }}
              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* BCC */}
        {showBcc && (
          <div className="flex items-center gap-2">
            <label className="w-12 text-sm font-medium text-gray-500 shrink-0">BCC:</label>
            <input
              type="email"
              value={emailFormData.bcc || ''}
              onChange={(e) => updateEmailForm({ bcc: e.target.value })}
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white text-sm py-2 px-3 transition-all outline-none"
              placeholder="bcc@email.de"
            />
            <button
              type="button"
              onClick={() => { setShowBcc(false); updateEmailForm({ bcc: '' }); }}
              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center gap-2">
          <label className="w-12 text-sm font-medium text-gray-500 shrink-0">Betreff:</label>
          <input
            type="text"
            value={emailFormData.subject || ''}
            onChange={(e) => updateEmailForm({ subject: e.target.value })}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white text-sm py-2 px-3 transition-all outline-none font-medium"
            placeholder="Betreff eingeben..."
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mb-3" />

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 mb-3 pb-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Fett"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('italic')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Kursiv"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('underline')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Unterstrichen"
        >
          <Underline className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          type="button"
          onClick={() => applyFormat('list')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Aufzählung"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('numbered')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Nummerierte Liste"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          type="button"
          onClick={() => applyFormat('link')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Link einfügen"
        >
          <Link2 className="w-4 h-4" />
        </button>
        
        <div className="flex-1" />
        
        {signature && (
          <button
            type="button"
            onClick={insertSignature}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Signatur einfügen"
          >
            <User className="w-3.5 h-3.5" />
            Signatur
          </button>
        )}
      </div>

      {/* Email Body */}
      <div className="flex-1 min-h-0">
        <textarea
          id="email-body"
          value={emailFormData.body || ''}
          onChange={(e) => updateEmailForm({ body: e.target.value })}
          className="w-full h-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 transition-all outline-none resize-none leading-relaxed"
          placeholder="Schreiben Sie Ihre Nachricht..."
          style={{ minHeight: '280px' }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Anhang hinzufügen"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Verwerfen
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Entwurf
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={loading || !emailFormData.to}
            className="px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Senden...' : 'Senden'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GlobalDrawer() {
  const router = useRouter();
  const {
    drawerOpen,
    drawerMinimized,
    drawerType,
    sidebarExpanded,
    closeDrawer,
    minimizeDrawer,
    maximizeDrawer,
    leadFormData,
    updateLeadForm,
    propertyFormData,
    updatePropertyForm,
    emailFormData,
    updateEmailForm
  } = useGlobalState();

  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Collapsible sections for Property form
  const [expandedSections, setExpandedSections] = useState({
    address: true,
    details: true,
    price: true,
    energy: false,
    description: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Animate in when drawer opens
  useEffect(() => {
    if (drawerOpen) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [drawerOpen]);

  // Animated close function
  const handleAnimatedClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      closeDrawer();
    }, 300);
  };

  const handleCreateLead = async () => {
    setLoading(true);
    try {
      const result = await createLead(leadFormData);
      handleAnimatedClose();
      mutate(API_ENDPOINTS.LEADS);
      router.push(`/dashboard/crm/leads/${result.id}`);
    } catch (error) {
      console.error('Error creating lead:', error);
      alert('Fehler beim Erstellen des Leads: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProperty = async () => {
    setLoading(true);
    try {
      // Build full address from components
      const addressParts = [
        propertyFormData.street,
        propertyFormData.houseNumber,
      ].filter(Boolean).join(' ');
      
      const fullAddress = [
        addressParts,
        propertyFormData.zipCode,
        propertyFormData.city,
      ].filter(Boolean).join(', ');

      const result = await createProperty({
        ...propertyFormData,
        address: fullAddress || propertyFormData.address,
        salePrice: propertyFormData.marketingType === 'RENT' ? undefined : Number(propertyFormData.salePrice) || undefined,
        rentCold: propertyFormData.marketingType === 'RENT' ? Number(propertyFormData.rentCold) || undefined : undefined,
        rentWarm: propertyFormData.marketingType === 'RENT' ? Number(propertyFormData.rentWarm) || undefined : undefined,
        additionalCosts: propertyFormData.marketingType === 'RENT' ? Number(propertyFormData.additionalCosts) || undefined : undefined,
        livingArea: Number(propertyFormData.livingArea) || undefined,
        rooms: Number(propertyFormData.rooms) || undefined,
        bedrooms: Number(propertyFormData.bedrooms) || undefined,
        bathrooms: Number(propertyFormData.bathrooms) || undefined,
        floor: Number(propertyFormData.floor) || undefined,
        totalFloors: Number(propertyFormData.totalFloors) || undefined,
        yearBuilt: Number(propertyFormData.yearBuilt) || undefined,
        energyConsumption: Number(propertyFormData.energyConsumption) || undefined,
      });
      handleAnimatedClose();
      mutate(API_ENDPOINTS.PROPERTIES);
      router.push(`/dashboard/crm/properties/${result.id}`);
    } catch (error) {
      alert('Fehler beim Erstellen des Objekts: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (asDraft: boolean = false) => {
    if (!emailFormData.to || !emailFormData.subject) {
      alert('Bitte Empfänger und Betreff eingeben');
      return;
    }
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${getApiUrl()}/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailFormData.to,
          cc: emailFormData.cc || undefined,
          bcc: emailFormData.bcc || undefined,
          subject: emailFormData.subject,
          body: emailFormData.body || '',
          bodyHtml: emailFormData.bodyHtml || undefined,
          leadId: emailFormData.leadId || undefined,
          replyToEmailId: emailFormData.replyTo || undefined,
          draftId: emailFormData.draftId || undefined, // Delete draft after sending
          asDraft,
        }),
      });
      
      handleAnimatedClose();
      router.refresh();
      updateEmailForm({ to: '', cc: '', bcc: '', subject: '', body: '', bodyHtml: '', leadId: '', replyTo: '', draftId: '' });
      
      // Refresh inbox
      mutate((key: string) => typeof key === 'string' && key.includes('/emails'));
    } catch (error) {
      alert('Fehler beim Senden: ' + error);
    } finally {
      setLoading(false);
    }
  };

  if (!drawerOpen) return null;

  const getDrawerTitle = () => {
    switch (drawerType) {
      case 'LEAD': return 'Neuen Lead erfassen';
      case 'PROPERTY': return 'Neues Objekt anlegen';
      case 'EMAIL': return 'E-Mail verfassen';
      default: return '';
    }
  };

  const getHeaderColor = () => {
    switch (drawerType) {
      case 'LEAD': return 'bg-gray-800';
      case 'PROPERTY': return 'bg-gray-800';
      case 'EMAIL': return 'bg-gray-800';
      default: return 'bg-gray-500';
    }
  };

  const SectionHeader = ({ title, section, expanded }: { title: string; section: keyof typeof expandedSections; expanded: boolean }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-2 text-left"
    >
      <span className={sectionTitleClass}>{title}</span>
      {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
    </button>
  );

  return (
    <div
      className={`fixed bottom-0 right-80 bg-white shadow-[0_-5px_30px_rgba(0,0,0,0.15)] border-t border-x border-gray-200 rounded-t-xl z-40 ${
        drawerMinimized ? 'h-12' : 'h-[720px]'
      }`}
      style={{ 
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        left: sidebarExpanded ? '256px' : '80px',
        transition: 'all 0.3s ease-in-out'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 h-12 bg-white border-b border-gray-100 rounded-t-xl cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={drawerMinimized ? maximizeDrawer : minimizeDrawer}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getHeaderColor()}`} />
          <h3 className="text-gray-900 font-semibold text-sm">
            {getDrawerTitle()}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {drawerMinimized ? (
            <button onClick={(e) => { e.stopPropagation(); maximizeDrawer(); }} className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-50">
              <Maximize2 className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={minimizeDrawer} className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-50">
              <Minus className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleAnimatedClose} className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!drawerMinimized && (
        <div className="p-6 overflow-y-auto h-[calc(720px-48px)]">
          {drawerType === 'EMAIL' && (
            <EmailComposer
              emailFormData={emailFormData}
              updateEmailForm={updateEmailForm}
              onSend={() => handleSendEmail(false)}
              onSaveDraft={() => handleSendEmail(true)}
              onDiscard={handleAnimatedClose}
              loading={loading}
            />
          )}

          {drawerType === 'LEAD' && (
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Anrede & Name */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Anrede</label>
                  <select
                    value={leadFormData.salutation || 'NONE'}
                    onChange={(e) => updateLeadForm({ salutation: e.target.value })}
                    className={selectClass}
                  >
                    {SALUTATION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Ansprache</label>
                  <div className="flex h-[42px]">
                    <button
                      type="button"
                      onClick={() => updateLeadForm({ formalAddress: true })}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-l-lg border transition-colors ${
                        leadFormData.formalAddress !== false
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Sie
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLeadForm({ formalAddress: false })}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b transition-colors ${
                        leadFormData.formalAddress === false
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Du
                    </button>
                  </div>
                </div>
                <div className="col-span-4">
                  <label className={labelClass}>Vorname</label>
                  <input
                    type="text"
                    value={leadFormData.firstName || ''}
                    onChange={(e) => updateLeadForm({ firstName: e.target.value })}
                    className={inputClass}
                    placeholder="Max"
                  />
                </div>
                <div className="col-span-4">
                  <label className={labelClass}>Nachname</label>
                  <input
                    type="text"
                    value={leadFormData.lastName || ''}
                    onChange={(e) => updateLeadForm({ lastName: e.target.value })}
                    className={inputClass}
                    placeholder="Mustermann"
                  />
                </div>
              </div>

              {/* Kontakt */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>E-Mail *</label>
                  <input
                    type="email"
                    value={leadFormData.email || ''}
                    onChange={(e) => updateLeadForm({ email: e.target.value })}
                    className={inputClass}
                    placeholder="max.mustermann@example.com"
                  />
                </div>
                <div>
                  <label className={labelClass}>Telefon</label>
                  <input
                    type="tel"
                    value={leadFormData.phone || ''}
                    onChange={(e) => updateLeadForm({ phone: e.target.value })}
                    className={inputClass}
                    placeholder="+49 123 456789"
                  />
                </div>
              </div>

              {/* Quelle */}
              <div>
                <label className={labelClass}>Quelle</label>
                <select
                  value={leadFormData.source || 'WEBSITE'}
                  onChange={(e) => updateLeadForm({ source: e.target.value })}
                  className={selectClass}
                >
                  {SOURCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Notizen */}
              <div>
                <label className={labelClass}>Notizen</label>
                <textarea
                  rows={3}
                  value={leadFormData.notes || ''}
                  onChange={(e) => updateLeadForm({ notes: e.target.value })}
                  className={textareaClass}
                  placeholder="Erste Informationen zum Lead..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  onClick={handleAnimatedClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={handleCreateLead}
                  disabled={loading || !leadFormData.email}
                  className="px-6 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Speichern...' : 'Lead anlegen'}
                </button>
              </div>
            </div>
          )}

          {drawerType === 'PROPERTY' && (
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Grunddaten */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Titel (Intern) *</label>
                  <input
                    type="text"
                    value={propertyFormData.title || ''}
                    onChange={(e) => updatePropertyForm({ title: e.target.value })}
                    className={inputClass}
                    placeholder="z.B. Altbauwohnung Mariahilf"
                  />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={propertyFormData.status || 'ACTIVE'}
                    onChange={(e) => updatePropertyForm({ status: e.target.value })}
                    className={selectClass}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Typ & Vermarktung */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Objekttyp</label>
                  <select
                    value={propertyFormData.propertyType || 'APARTMENT'}
                    onChange={(e) => updatePropertyForm({ propertyType: e.target.value })}
                    className={selectClass}
                  >
                    {PROPERTY_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Vermarktungsart</label>
                  <div className="flex h-[42px]">
                    <button
                      type="button"
                      onClick={() => updatePropertyForm({ marketingType: 'SALE' })}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-lg border transition-colors ${
                        (propertyFormData.marketingType || 'SALE') === 'SALE'
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Kauf
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePropertyForm({ marketingType: 'RENT' })}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b transition-colors ${
                        propertyFormData.marketingType === 'RENT'
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Miete
                    </button>
                  </div>
                </div>
              </div>

              {/* Adresse Section */}
              <div className="border-t border-gray-100 pt-4">
                <SectionHeader title="📍 Adresse" section="address" expanded={expandedSections.address} />
                {expandedSections.address && (
                  <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-6 gap-4">
                      <div className="col-span-3">
                        <label className={labelClass}>Straße *</label>
                        <input
                          type="text"
                          value={propertyFormData.street || ''}
                          onChange={(e) => updatePropertyForm({ street: e.target.value })}
                          className={inputClass}
                          placeholder="Musterstraße"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Hausnr.</label>
                        <input
                          type="text"
                          value={propertyFormData.houseNumber || ''}
                          onChange={(e) => updatePropertyForm({ houseNumber: e.target.value })}
                          className={inputClass}
                          placeholder="12a"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Stiege</label>
                        <input
                          type="text"
                          value={propertyFormData.staircase || ''}
                          onChange={(e) => updatePropertyForm({ staircase: e.target.value })}
                          className={inputClass}
                          placeholder="2"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Tür</label>
                        <input
                          type="text"
                          value={propertyFormData.apartmentNumber || ''}
                          onChange={(e) => updatePropertyForm({ apartmentNumber: e.target.value })}
                          className={inputClass}
                          placeholder="15"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-6 gap-4">
                      <div>
                        <label className={labelClass}>Etage</label>
                        <input
                          type="number"
                          value={propertyFormData.floor || ''}
                          onChange={(e) => updatePropertyForm({ floor: e.target.value })}
                          className={inputClass}
                          placeholder="3"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Block</label>
                        <input
                          type="text"
                          value={propertyFormData.block || ''}
                          onChange={(e) => updatePropertyForm({ block: e.target.value })}
                          className={inputClass}
                          placeholder="A"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>PLZ *</label>
                        <input
                          type="text"
                          value={propertyFormData.zipCode || ''}
                          onChange={(e) => updatePropertyForm({ zipCode: e.target.value })}
                          className={inputClass}
                          placeholder="1060"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className={labelClass}>Stadt *</label>
                        <input
                          type="text"
                          value={propertyFormData.city || ''}
                          onChange={(e) => updatePropertyForm({ city: e.target.value })}
                          className={inputClass}
                          placeholder="Wien"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Bezirk</label>
                        <input
                          type="text"
                          value={propertyFormData.district || ''}
                          onChange={(e) => updatePropertyForm({ district: e.target.value })}
                          className={inputClass}
                          placeholder="Mariahilf"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Bundesland/Provinz</label>
                        <input
                          type="text"
                          value={propertyFormData.state || ''}
                          onChange={(e) => updatePropertyForm({ state: e.target.value })}
                          className={inputClass}
                          placeholder="Wien"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Land</label>
                        <select
                          value={propertyFormData.country || 'Österreich'}
                          onChange={(e) => updatePropertyForm({ country: e.target.value })}
                          className={selectClass}
                        >
                          {COUNTRY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preis Section */}
              <div className="border-t border-gray-100 pt-4">
                <SectionHeader title="💰 Preis" section="price" expanded={expandedSections.price} />
                {expandedSections.price && (
                  <div className="space-y-4 mt-2">
                    {(propertyFormData.marketingType || 'SALE') === 'SALE' ? (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className={labelClass}>Kaufpreis (€) *</label>
                          <input
                            type="number"
                            value={propertyFormData.salePrice || ''}
                            onChange={(e) => updatePropertyForm({ salePrice: e.target.value })}
                            className={inputClass}
                            placeholder="350000"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Provision</label>
                          <input
                            type="text"
                            value={propertyFormData.commission || ''}
                            onChange={(e) => updatePropertyForm({ commission: e.target.value })}
                            className={inputClass}
                            placeholder="3% + MwSt."
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className={labelClass}>Kaltmiete (€) *</label>
                          <input
                            type="number"
                            value={propertyFormData.rentCold || ''}
                            onChange={(e) => updatePropertyForm({ rentCold: e.target.value })}
                            className={inputClass}
                            placeholder="850"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Nebenkosten (€)</label>
                          <input
                            type="number"
                            value={propertyFormData.additionalCosts || ''}
                            onChange={(e) => updatePropertyForm({ additionalCosts: e.target.value })}
                            className={inputClass}
                            placeholder="150"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Warmmiete (€)</label>
                          <input
                            type="number"
                            value={propertyFormData.rentWarm || ''}
                            onChange={(e) => updatePropertyForm({ rentWarm: e.target.value })}
                            className={inputClass}
                            placeholder="1000"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Kaution</label>
                          <input
                            type="text"
                            value={propertyFormData.deposit || ''}
                            onChange={(e) => updatePropertyForm({ deposit: e.target.value })}
                            className={inputClass}
                            placeholder="3 MM"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div className="border-t border-gray-100 pt-4">
                <SectionHeader title="📐 Details" section="details" expanded={expandedSections.details} />
                {expandedSections.details && (
                  <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-5 gap-4">
                      <div>
                        <label className={labelClass}>Wohnfläche (m²)</label>
                        <input
                          type="number"
                          value={propertyFormData.livingArea || ''}
                          onChange={(e) => updatePropertyForm({ livingArea: e.target.value })}
                          className={inputClass}
                          placeholder="85"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Zimmer</label>
                        <input
                          type="number"
                          step="0.5"
                          value={propertyFormData.rooms || ''}
                          onChange={(e) => updatePropertyForm({ rooms: e.target.value })}
                          className={inputClass}
                          placeholder="3"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Schlafzimmer</label>
                        <input
                          type="number"
                          value={propertyFormData.bedrooms || ''}
                          onChange={(e) => updatePropertyForm({ bedrooms: e.target.value })}
                          className={inputClass}
                          placeholder="2"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Badezimmer</label>
                        <input
                          type="number"
                          value={propertyFormData.bathrooms || ''}
                          onChange={(e) => updatePropertyForm({ bathrooms: e.target.value })}
                          className={inputClass}
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Etagen ges.</label>
                        <input
                          type="number"
                          value={propertyFormData.totalFloors || ''}
                          onChange={(e) => updatePropertyForm({ totalFloors: e.target.value })}
                          className={inputClass}
                          placeholder="5"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Baujahr</label>
                        <input
                          type="number"
                          value={propertyFormData.yearBuilt || ''}
                          onChange={(e) => updatePropertyForm({ yearBuilt: e.target.value })}
                          className={inputClass}
                          placeholder="1920"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Zustand</label>
                        <select
                          value={propertyFormData.condition || ''}
                          onChange={(e) => updatePropertyForm({ condition: e.target.value })}
                          className={selectClass}
                        >
                          {CONDITION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Energieausweis Section */}
              <div className="border-t border-gray-100 pt-4">
                <SectionHeader title="⚡ Energieausweis" section="energy" expanded={expandedSections.energy} />
                {expandedSections.energy && (
                  <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className={labelClass}>Art</label>
                        <select
                          value={propertyFormData.energyCertificateType || ''}
                          onChange={(e) => updatePropertyForm({ energyCertificateType: e.target.value })}
                          className={selectClass}
                        >
                          {ENERGY_CERT_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Effizienzklasse</label>
                        <select
                          value={propertyFormData.energyEfficiencyClass || ''}
                          onChange={(e) => updatePropertyForm({ energyEfficiencyClass: e.target.value })}
                          className={selectClass}
                        >
                          {ENERGY_CLASS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Verbrauch (kWh/m²·a)</label>
                        <input
                          type="number"
                          value={propertyFormData.energyConsumption || ''}
                          onChange={(e) => updatePropertyForm({ energyConsumption: e.target.value })}
                          className={inputClass}
                          placeholder="75"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Energieträger</label>
                        <input
                          type="text"
                          value={propertyFormData.primaryEnergySource || ''}
                          onChange={(e) => updatePropertyForm({ primaryEnergySource: e.target.value })}
                          className={inputClass}
                          placeholder="Gas"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Beschreibung Section */}
              <div className="border-t border-gray-100 pt-4">
                <SectionHeader title="📝 Beschreibung" section="description" expanded={expandedSections.description} />
                {expandedSections.description && (
                  <div className="space-y-4 mt-2">
                    <div>
                      <label className={labelClass}>Exposé-Text</label>
                      <textarea
                        rows={3}
                        value={propertyFormData.description || ''}
                        onChange={(e) => updatePropertyForm({ description: e.target.value })}
                        className={textareaClass}
                        placeholder="Öffentliche Beschreibung des Objekts..."
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Jarvis-Fakten (Intern)</label>
                      <textarea
                        rows={2}
                        value={propertyFormData.aiFacts || ''}
                        onChange={(e) => updatePropertyForm({ aiFacts: e.target.value })}
                        className={textareaClass}
                        placeholder="z.B. Keine Haustiere, Südbalkon, ruhige Lage..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                <button 
                  onClick={handleAnimatedClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={handleCreateProperty}
                  disabled={loading || !propertyFormData.title || !propertyFormData.street || !propertyFormData.city}
                  className="px-6 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Speichern...' : 'Objekt anlegen'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
