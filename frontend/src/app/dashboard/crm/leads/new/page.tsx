'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLead } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    salutation: 'NONE',
    formalAddress: true, // true = "Sie" (default), false = "Du"
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'WEBSITE',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newLead = await createLead(formData);
      // Navigate to the new lead's detail page
      router.push(`/dashboard/crm/leads/${newLead.id}`);
    } catch (error) {
      alert('Fehler beim Erstellen des Leads');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/dashboard/crm/leads"
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Neuen Lead anlegen</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Anrede & Name */}
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anrede</label>
              <select
                name="salutation"
                value={formData.salutation}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                {SALUTATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ansprache</label>
              <div className="flex h-[38px]">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, formalAddress: true })}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-l-md border transition-colors ${
                    formData.formalAddress
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Sie
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, formalAddress: false })}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b transition-colors ${
                    !formData.formalAddress
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Du
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
              <input 
                name="firstName" 
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
              <input 
                name="lastName" 
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
          </div>

          {/* Kontakt */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
              <input 
                name="email" 
                type="email"
                required 
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input 
                name="phone" 
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
          </div>

          {/* Quelle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quelle</label>
            <select
              name="source"
              value={formData.source}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {SOURCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Notizen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
            <textarea 
              name="notes" 
              rows={3} 
              value={formData.notes}
              onChange={handleChange}
              placeholder="Erste Informationen zum Lead..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500" 
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button 
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Speichern...' : 'Lead anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
