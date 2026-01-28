'use client';

import { useState } from 'react';
import { Property, deleteProperty, fetcher, API_ENDPOINTS } from '@/lib/api';
import { useGlobalState } from '@/context/GlobalStateContext';
import { Trash2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

export default function PropertiesPage() {
  const { data: properties = [], mutate, isValidating } = useSWR<Property[]>(API_ENDPOINTS.PROPERTIES, fetcher, { 
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  });
  const { openDrawer } = useGlobalState();
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const router = useRouter();

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedProperties);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProperties(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProperties.size === properties.length) {
      setSelectedProperties(new Set());
    } else {
      setSelectedProperties(new Set(properties.map(p => p.id)));
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Möchtest du ${selectedProperties.size} Objekte wirklich löschen?`)) return;
    
    try {
      await Promise.all(Array.from(selectedProperties).map(id => deleteProperty(id)));
      setSelectedProperties(new Set());
      mutate();
    } catch (error) {
      alert('Fehler beim Löschen: ' + error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/30">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">{properties.length} Objekte</span>
          <button 
            onClick={() => mutate()}
            disabled={isValidating}
            className={`p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all ${isValidating ? 'animate-spin' : ''}`}
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {selectedProperties.size > 0 && (
            <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-md">
              <span className="text-sm font-medium text-indigo-700">{selectedProperties.size} ausgewählt</span>
              <button 
                onClick={handleDelete}
                className="text-indigo-600 hover:text-red-600 p-1 rounded transition-colors"
                title="Ausgewählte löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={() => openDrawer('PROPERTY')}
          className="bg-indigo-600 text-white px-3 py-1.5 text-sm font-medium rounded-md hover:bg-indigo-700 shadow-sm"
        >
          Neues Objekt
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 border-b border-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={properties.length > 0 && selectedProperties.size === properties.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titel</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adresse</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preis</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zimmer</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {properties.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                  Noch keine Objekte angelegt.
                </td>
              </tr>
            ) : (
              properties.map((prop) => (
                <tr 
                  key={prop.id} 
                  onClick={() => router.push(`/dashboard/crm/properties/${prop.id}`)}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedProperties.has(prop.id) ? 'bg-indigo-50/50' : ''}`}
                >
                  <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedProperties.has(prop.id)}
                      onChange={() => toggleSelect(prop.id)}
                    />
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {prop.title}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{prop.address}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                    {prop.price ? `${prop.price} €` : '-'}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                    {prop.rooms || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
