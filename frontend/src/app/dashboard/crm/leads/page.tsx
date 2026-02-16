'use client';

import { useState, useEffect } from 'react';
import { Lead, deleteLead, fetcher, API_ENDPOINTS } from '@/lib/api';
import { useGlobalState } from '@/context/GlobalStateContext';
import { useRouter } from 'next/navigation';
import { Trash2, RefreshCw } from 'lucide-react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';

export default function LeadsPage() {
  const { data: leads = [], mutate, isValidating } = useSWR<Lead[]>(API_ENDPOINTS.LEADS, fetcher, { 
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  });
  const { openDrawer, aiActionPerformed } = useGlobalState();
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const router = useRouter();
  const t = useTranslations('crm.leads');
  const ts = useTranslations('dashboard.status');
  const tSrc = useTranslations('crm.sources');
  const tc = useTranslations('common');

  // Refresh when AI performs an action
  useEffect(() => {
    if (aiActionPerformed) {
      mutate();
    }
  }, [aiActionPerformed, mutate]);

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

  const handleDelete = async () => {
    if (!confirm(t('confirmDelete', { count: selectedLeads.size }))) return;
    
    try {
      await Promise.all(Array.from(selectedLeads).map(id => deleteLead(id)));
      setSelectedLeads(new Set());
      mutate();
    } catch (error) {
      alert(t('deleteError') + error);
    }
  };

  const sourceLabels: Record<string, string> = {
    WEBSITE: tSrc('website'),
    EMAIL: tSrc('email'),
    PHONE: tSrc('phone'),
    REFERRAL: tSrc('referral'),
  };

  const statusLabels: Record<string, string> = {
    NEW: ts('new'),
    CONTACTED: ts('contacted'),
    QUALIFIED: ts('qualified'),
    CONVERTED: ts('converted'),
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/30">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">{t('title', { count: leads.length })}</span>
          <button 
            onClick={() => mutate()}
            disabled={isValidating}
            className={`p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all ${isValidating ? 'animate-spin' : ''}`}
            title={tc('refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {selectedLeads.size > 0 && (
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-md">
              <span className="text-sm font-medium text-gray-700">{t('selected', { count: selectedLeads.size })}</span>
              <button 
                onClick={handleDelete}
                className="text-blue-600 hover:text-red-600 p-1 rounded transition-colors"
                title={t('deleteSelected')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={() => openDrawer('LEAD')}
          className="bg-gray-900 text-white px-3 py-1.5 text-sm font-medium rounded-md hover:bg-gray-800 shadow-sm transition-colors"
        >
          {t('newLead')}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 border-b border-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={leads.length > 0 && selectedLeads.size === leads.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('columns.name')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('columns.email')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('columns.phone')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('columns.source')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('columns.status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('columns.created')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                  {t('noLeads')}
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const createdDate = new Date(lead.createdAt);
                const formattedDate = createdDate.toLocaleDateString('de-DE', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                });
                
                return (
                  <tr 
                    key={lead.id} 
                    onClick={() => router.push(`/dashboard/crm/leads/${lead.id}`)}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedLeads.has(lead.id) ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedLeads.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                      />
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {lead.firstName} {lead.lastName}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {lead.email || '-'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {lead.phone || '-'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {(lead.source && sourceLabels[lead.source]) || lead.source || tSrc('unknown')}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        lead.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                        lead.status === 'CONTACTED' ? 'bg-yellow-100 text-yellow-700' :
                        lead.status === 'QUALIFIED' ? 'bg-green-100 text-green-700' :
                        lead.status === 'CONVERTED' ? 'bg-gray-100 text-gray-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {(lead.status && statusLabels[lead.status]) || lead.status || ts('new')}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formattedDate}
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
