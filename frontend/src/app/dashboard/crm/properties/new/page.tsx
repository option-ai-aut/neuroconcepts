'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProperty } from '@/lib/api';

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    price: '',
    rooms: '',
    area: '',
    description: '',
    aiFacts: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createProperty({
        ...formData,
        price: Number(formData.price),
        rooms: Number(formData.rooms),
        area: Number(formData.area),
        tenantId: 'default-tenant' // TODO: Get from Auth
      });
      router.push('/dashboard/crm/properties');
    } catch (error) {
      alert('Fehler beim Erstellen des Objekts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Neues Objekt anlegen</h1>
      
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700">Titel (Intern)</label>
          <input 
            name="title" 
            required 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Adresse</label>
          <input 
            name="address" 
            required 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Preis (€)</label>
            <input 
              name="price" 
              type="number" 
              required 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Zimmer</label>
            <input 
              name="rooms" 
              type="number" 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Fläche (m²)</label>
          <input 
            name="area" 
            type="number" 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
          <textarea 
            name="description" 
            rows={4} 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Jarvis-Fakten (Intern)</label>
          <p className="text-xs text-gray-500 mb-1">Infos, die Jarvis wissen muss (z.B. "Keine Haustiere", "Südbalkon").</p>
          <textarea 
            name="aiFacts" 
            rows={2} 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
            onChange={handleChange}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button 
            type="button"
            onClick={() => router.back()}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Speichern...' : 'Objekt anlegen'}
          </button>
        </div>
      </form>
    </div>
  );
}
