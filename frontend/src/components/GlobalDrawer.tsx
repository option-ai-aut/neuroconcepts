'use client';

import { useGlobalState } from '@/context/GlobalStateContext';
import { X, Minus, Maximize2, Send, Paperclip } from 'lucide-react';
import { createLead, createProperty, sendManualEmail, API_ENDPOINTS } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';

export default function GlobalDrawer() {
  const router = useRouter();
  const {
    drawerOpen,
    drawerMinimized,
    drawerType,
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

  const handleCreateLead = async () => {
    console.log('Creating lead with data:', leadFormData);
    try {
      const payload = {
        ...leadFormData,
        tenantId: 'default-tenant', // TODO: Get from Auth
      };
      console.log('Sending payload:', payload);
      
      const result = await createLead(payload);
      console.log('Create lead result:', result);
      
      closeDrawer();
      mutate(API_ENDPOINTS.LEADS); // Trigger revalidation
      router.refresh(); // Refresh list
    } catch (error) {
      console.error('Error creating lead:', error);
      alert('Fehler beim Erstellen des Leads: ' + error);
    }
  };

  const handleCreateProperty = async () => {
    try {
      await createProperty({
        ...propertyFormData,
        tenantId: 'default-tenant', // TODO: Get from Auth
      });
      closeDrawer();
      mutate(API_ENDPOINTS.PROPERTIES); // Trigger revalidation
      router.refresh(); // Refresh list
    } catch (error) {
      alert('Fehler beim Erstellen des Objekts: ' + error);
    }
  };

  const handleSendEmail = async () => {
    if (!emailFormData.subject || !emailFormData.body || !emailFormData.leadId) return;
    try {
      await sendManualEmail(emailFormData.leadId, emailFormData.subject, emailFormData.body);
      closeDrawer();
      router.refresh();
      // Reset form
      updateEmailForm({ subject: '', body: '' });
    } catch (error) {
      alert('Fehler beim Senden: ' + error);
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
      case 'LEAD': return 'bg-blue-500';
      case 'PROPERTY': return 'bg-purple-500';
      case 'EMAIL': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-64 right-80 bg-white shadow-[0_-5px_30px_rgba(0,0,0,0.1)] border-t border-x border-gray-200 rounded-t-xl transition-all duration-300 ease-in-out z-40 ${
        drawerMinimized ? 'h-12' : 'h-[450px]'
      }`}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 h-12 bg-white border-b border-gray-100 rounded-t-xl cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={drawerMinimized ? maximizeDrawer : undefined}
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
          <button onClick={closeDrawer} className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!drawerMinimized && (
        <div className="p-8 overflow-y-auto h-[calc(450px-48px)] bg-gray-50/50">
          {drawerType === 'EMAIL' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={emailFormData.subject || ''}
                      onChange={(e) => updateEmailForm({ subject: e.target.value })}
                      className="block w-full border-0 border-b border-gray-200 focus:border-indigo-500 focus:ring-0 text-lg font-medium placeholder-gray-400 px-0 py-2"
                      placeholder="Betreff"
                    />
                  </div>
                  <div>
                    <textarea
                      rows={8}
                      value={emailFormData.body || ''}
                      onChange={(e) => updateEmailForm({ body: e.target.value })}
                      className="block w-full border-0 focus:ring-0 text-sm text-gray-700 placeholder-gray-400 px-0 resize-none"
                      placeholder="Schreiben Sie Ihre Nachricht..."
                    />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                  <button className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <div className="flex space-x-3">
                    <button 
                      onClick={closeDrawer}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none"
                    >
                      Verwerfen
                    </button>
                    <button 
                      onClick={handleSendEmail}
                      className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none shadow-sm flex items-center"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Senden
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {drawerType === 'LEAD' && (
            <div className="grid grid-cols-12 gap-8 max-w-5xl mx-auto">
              {/* Left Column: Personal Info */}
              <div className="col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-1 h-4 bg-indigo-500 rounded-full mr-2"></span>
                    Kontaktinformationen
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Vorname</label>
                        <input
                          type="text"
                          value={leadFormData.firstName || ''}
                          onChange={(e) => updateLeadForm({ firstName: e.target.value })}
                          className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 transition-colors"
                          placeholder="Max"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nachname</label>
                        <input
                          type="text"
                          value={leadFormData.lastName || ''}
                          onChange={(e) => updateLeadForm({ lastName: e.target.value })}
                          className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 transition-colors"
                          placeholder="Mustermann"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">E-Mail Adresse</label>
                      <input
                        type="email"
                        value={leadFormData.email || ''}
                        onChange={(e) => updateLeadForm({ email: e.target.value })}
                        className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 transition-colors"
                        placeholder="max.mustermann@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Telefon (Optional)</label>
                      <input
                        type="tel"
                        className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 transition-colors"
                        placeholder="+49 123 456789"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Context & Actions */}
              <div className="col-span-7 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-1 h-4 bg-indigo-500 rounded-full mr-2"></span>
                    Anfrage Details
                  </h4>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Interesse an Objekt</label>
                      <select className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 transition-colors">
                        <option>Bitte wählen...</option>
                        <option>Penthouse Berlin Mitte</option>
                        <option>Loft Kreuzberg</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Notiz / Nachricht</label>
                      <textarea
                        rows={6}
                        className="block w-full h-32 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 transition-colors resize-none"
                        placeholder="Interessiert sich besonders für..."
                      />
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-50 flex justify-end space-x-3">
                    <button 
                      onClick={closeDrawer}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Abbrechen
                    </button>
                    <button 
                      onClick={handleCreateLead}
                      className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
                    >
                      Lead anlegen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {drawerType === 'PROPERTY' && (
            <div className="grid grid-cols-12 gap-8 max-w-5xl mx-auto">
              <div className="col-span-6 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-1 h-4 bg-purple-500 rounded-full mr-2"></span>
                    Stammdaten
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Interner Titel</label>
                      <input
                        type="text"
                        value={propertyFormData.title || ''}
                        onChange={(e) => updatePropertyForm({ title: e.target.value })}
                        className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 transition-colors"
                        placeholder="z.B. Penthouse Berlin Mitte"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Adresse</label>
                      <input
                        type="text"
                        value={propertyFormData.address || ''}
                        onChange={(e) => updatePropertyForm({ address: e.target.value })}
                        className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 transition-colors"
                        placeholder="Straße, PLZ Stadt"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-6 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-1 h-4 bg-purple-500 rounded-full mr-2"></span>
                    Eckdaten
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Kaltmiete</label>
                      <div className="relative rounded-md shadow-sm">
                        <input
                          type="number"
                          value={propertyFormData.price || ''}
                          onChange={(e) => updatePropertyForm({ price: parseFloat(e.target.value) })}
                          className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 pl-3 pr-8 transition-colors"
                          placeholder="0"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Zimmer</label>
                      <input
                        type="number"
                        value={propertyFormData.rooms || ''}
                        onChange={(e) => updatePropertyForm({ rooms: parseFloat(e.target.value) })}
                        className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 transition-colors"
                        placeholder="z.B. 3.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Wohnfläche</label>
                      <div className="relative rounded-md shadow-sm">
                        <input
                          type="number"
                          value={propertyFormData.area || ''}
                          onChange={(e) => updatePropertyForm({ area: parseFloat(e.target.value) })}
                          className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 pl-3 pr-8 transition-colors"
                          placeholder="0"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">m²</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-6 border-t border-gray-50 flex justify-end space-x-3">
                    <button 
                      onClick={closeDrawer}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Abbrechen
                    </button>
                    <button 
                      onClick={handleCreateProperty}
                      className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
                    >
                      Objekt anlegen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
