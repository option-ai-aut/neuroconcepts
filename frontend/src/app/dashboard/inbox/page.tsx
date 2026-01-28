'use client';

import { useState } from 'react';
import { Lead, fetcher, API_ENDPOINTS } from '@/lib/api';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';

export default function InboxPage() {
  const { data: leads = [], mutate, isValidating } = useSWR<Lead[]>(API_ENDPOINTS.LEADS, fetcher, { 
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  });
  const router = useRouter();
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLeads(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-6 shadow-sm z-10">
        <h1 className="text-2xl font-bold text-gray-900">Posteingang</h1>
      </div>

      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/30">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">{leads.length} Nachrichten</span>
          <button 
            onClick={() => mutate()}
            disabled={isValidating}
            className={`p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all ${isValidating ? 'animate-spin' : ''}`}
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {selectedLeads.size > 0 && (
            <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-md">
              <span className="text-sm font-medium text-indigo-700">{selectedLeads.size} ausgewählt</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 border-b border-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={leads.length > 0 && selectedLeads.size === leads.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                  Keine neuen Nachrichten.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr 
                  key={lead.id}
                  onClick={() => router.push(`/dashboard/crm/leads/${lead.id}`)}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedLeads.has(lead.id) ? 'bg-indigo-50/50' : ''}`}
                >
                  <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                    />
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {lead.firstName} {lead.lastName}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{lead.email}</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      lead.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                      lead.status === 'CONTACTED' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {lead.status}
                    </span>
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
