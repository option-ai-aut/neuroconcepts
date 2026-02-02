'use client';

import { useState, useEffect } from 'react';
import { Property, deleteProperty, fetcher, API_ENDPOINTS } from '@/lib/api';
import { useGlobalState } from '@/context/GlobalStateContext';
import { Trash2, RefreshCw, Globe, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

export default function PropertiesPage() {
  const { data: properties = [], mutate, isValidating } = useSWR<Property[]>(API_ENDPOINTS.PROPERTIES, fetcher, { 
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  });
  const { openDrawer, aiActionPerformed } = useGlobalState();
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Refresh when AI performs an action
  useEffect(() => {
    if (aiActionPerformed) {
      mutate();
    }
  }, [aiActionPerformed, mutate]);

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
          className="bg-indigo-600 text-white px-3 py-1.5 text-sm font-medium rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ort</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preis</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fläche</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Online</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {properties.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                  Noch keine Objekte angelegt.
                </td>
              </tr>
            ) : (
              properties.map((prop) => {
                const isOnline = prop.publishedPortals && prop.publishedPortals.length > 0;
                const displayPrice = prop.marketingType === 'RENT' 
                  ? (prop.rentCold ? `${prop.rentCold}€ kalt` : '-')
                  : (prop.salePrice ? `${prop.salePrice}€` : (prop.price ? `${prop.price}€` : '-'));
                
                return (
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
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      <div className="max-w-xs truncate">{prop.title}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {prop.city || prop.address?.split(',')[1]?.trim() || '-'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {prop.propertyType === 'APARTMENT' ? 'Wohnung' : 
                         prop.propertyType === 'HOUSE' ? 'Haus' : 
                         prop.propertyType === 'COMMERCIAL' ? 'Gewerbe' : 
                         prop.propertyType || 'Sonstige'}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {displayPrice}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {prop.livingArea ? `${prop.livingArea} m²` : (prop.area ? `${prop.area} m²` : '-')}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        prop.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        prop.status === 'RESERVED' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {prop.status === 'ACTIVE' ? 'Aktiv' :
                         prop.status === 'RESERVED' ? 'Reserviert' :
                         prop.status === 'SOLD' ? 'Verkauft' :
                         prop.status || 'Aktiv'}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm">
                      {isOnline ? (
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded text-xs font-medium text-green-700">
                            <Globe className="w-3 h-3" />
                            {prop.publishedPortals?.length || 0}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Offline</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
