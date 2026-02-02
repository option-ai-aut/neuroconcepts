'use client';

import { useState, useEffect } from 'react';
import { useGlobalState } from '@/context/GlobalStateContext';
import { X, Minus, Maximize2, Send, Paperclip } from 'lucide-react';
import { createLead, createProperty, sendManualEmail, API_ENDPOINTS } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';

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
  { value: 'LAND', label: 'Grundstück' },
  { value: 'COMMERCIAL', label: 'Gewerbe' },
  { value: 'OTHER', label: 'Sonstiges' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'RESERVED', label: 'Reserviert' },
  { value: 'SOLD', label: 'Verkauft' },
  { value: 'RENTED', label: 'Vermietet' },
  { value: 'INACTIVE', label: 'Inaktiv' },
];

// Consistent input styles
const inputClass = "block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 sm:text-sm py-2.5 px-3 transition-all outline-none";
const selectClass = "block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 sm:text-sm py-2.5 px-3 transition-all outline-none";
const labelClass = "block text-xs font-medium text-gray-600 mb-1.5";
const textareaClass = "block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 sm:text-sm py-2.5 px-3 transition-all outline-none resize-none";

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
      const result = await createProperty({
        ...propertyFormData,
        price: Number(propertyFormData.price),
        rooms: Number(propertyFormData.rooms),
        area: Number(propertyFormData.area),
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

  const handleSendEmail = async () => {
    if (!emailFormData.subject || !emailFormData.body || !emailFormData.leadId) return;
    setLoading(true);
    try {
      await sendManualEmail(emailFormData.leadId, emailFormData.subject, emailFormData.body);
      handleAnimatedClose();
      router.refresh();
      updateEmailForm({ subject: '', body: '' });
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
      case 'LEAD': return 'bg-indigo-500';
      case 'PROPERTY': return 'bg-indigo-500';
      case 'EMAIL': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`fixed bottom-0 right-80 bg-white shadow-[0_-5px_30px_rgba(0,0,0,0.15)] border-t border-x border-gray-200 rounded-t-xl z-40 ${
        drawerMinimized ? 'h-12' : 'h-[520px]'
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
            <button onClick={(e) => { e.stopPropagation(); maximizeDrawer(); }} className="p-1 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50">
              <Maximize2 className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={minimizeDrawer} className="p-1 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50">
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
        <div className="p-6 overflow-y-auto h-[calc(520px-48px)]">
          {drawerType === 'EMAIL' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div>
                <input
                  type="text"
                  value={emailFormData.subject || ''}
                  onChange={(e) => updateEmailForm({ subject: e.target.value })}
                  className={inputClass}
                  placeholder="Betreff"
                />
              </div>
              <div>
                <textarea
                  rows={10}
                  value={emailFormData.body || ''}
                  onChange={(e) => updateEmailForm({ body: e.target.value })}
                  className={textareaClass}
                  placeholder="Schreiben Sie Ihre Nachricht..."
                />
              </div>
              <div className="flex justify-between items-center pt-4">
                <button className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex space-x-3">
                  <button 
                    onClick={handleAnimatedClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Verwerfen
                  </button>
                  <button 
                    onClick={handleSendEmail}
                    disabled={loading}
                    className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? 'Senden...' : 'Senden'}
                  </button>
                </div>
              </div>
            </div>
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
                          ? 'bg-indigo-600 text-white border-indigo-600'
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
                          ? 'bg-indigo-600 text-white border-indigo-600'
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
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Speichern...' : 'Lead anlegen'}
                </button>
              </div>
            </div>
          )}

          {drawerType === 'PROPERTY' && (
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Titel & Typ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
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
              </div>

              {/* Adresse */}
              <div>
                <label className={labelClass}>Adresse *</label>
                <input
                  type="text"
                  value={propertyFormData.address || ''}
                  onChange={(e) => updatePropertyForm({ address: e.target.value })}
                  className={inputClass}
                  placeholder="Straße, PLZ Ort"
                />
              </div>

              {/* Preis, Zimmer, Fläche, Status */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Preis (€) *</label>
                  <input
                    type="number"
                    value={propertyFormData.price || ''}
                    onChange={(e) => updatePropertyForm({ price: e.target.value })}
                    className={inputClass}
                    placeholder="350000"
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
                  <label className={labelClass}>Fläche (m²)</label>
                  <input
                    type="number"
                    value={propertyFormData.area || ''}
                    onChange={(e) => updatePropertyForm({ area: e.target.value })}
                    className={inputClass}
                    placeholder="85"
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

              {/* Beschreibung */}
              <div>
                <label className={labelClass}>Beschreibung</label>
                <textarea
                  rows={2}
                  value={propertyFormData.description || ''}
                  onChange={(e) => updatePropertyForm({ description: e.target.value })}
                  className={textareaClass}
                  placeholder="Öffentliche Beschreibung des Objekts..."
                />
              </div>

              {/* Jarvis-Fakten */}
              <div>
                <label className={labelClass}>Jarvis-Fakten (Intern)</label>
                <textarea
                  rows={2}
                  value={propertyFormData.aiFacts || ''}
                  onChange={(e) => updatePropertyForm({ aiFacts: e.target.value })}
                  className={textareaClass}
                  placeholder="z.B. Keine Haustiere, Südbalkon..."
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
                  onClick={handleCreateProperty}
                  disabled={loading || !propertyFormData.title || !propertyFormData.address}
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
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
