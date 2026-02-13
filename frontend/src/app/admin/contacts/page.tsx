'use client';

import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Mail, Clock, CheckCircle2, AlertCircle, Loader2, MessageSquare, User, Building2 } from 'lucide-react';
import { useRuntimeConfig } from '@/components/RuntimeConfigProvider';

interface ContactSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  notes?: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  NEW: { label: 'Neu', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  IN_PROGRESS: { label: 'In Bearbeitung', color: 'bg-amber-100 text-amber-700', icon: Clock },
  RESOLVED: { label: 'Erledigt', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

export default function AdminContactsPage() {
  const config = useRuntimeConfig();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  const apiUrl = (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

  const fetchContacts = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const res = await fetch(`${apiUrl}/admin/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      await fetch(`${apiUrl}/admin/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      fetchContacts();
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  const filtered = filter === 'ALL' ? submissions : submissions.filter(s => s.status === filter);
  const counts = {
    ALL: submissions.length,
    NEW: submissions.filter(s => s.status === 'NEW').length,
    IN_PROGRESS: submissions.filter(s => s.status === 'IN_PROGRESS').length,
    RESOLVED: submissions.filter(s => s.status === 'RESOLVED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Kontaktanfragen</h1>
        <p className="text-sm text-gray-500 mt-1">Anfragen über das Kontaktformular auf immivo.ai</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['ALL', 'NEW', 'IN_PROGRESS', 'RESOLVED'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {key === 'ALL' ? 'Alle' : STATUS_CONFIG[key]?.label || key} ({counts[key]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Keine Kontaktanfragen vorhanden</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((sub) => {
            const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.NEW;
            const StatusIcon = cfg.icon;
            return (
              <div
                key={sub.id}
                onClick={() => setSelected(selected?.id === sub.id ? null : sub)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                  selected?.id === sub.id ? 'border-gray-900 shadow-md' : 'border-gray-200'
                } ${sub.status === 'NEW' ? 'border-l-4 border-l-blue-500' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900 text-sm">{sub.firstName} {sub.lastName}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">{sub.subject}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{sub.email}</span>
                      <span>{new Date(sub.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded View */}
                {selected?.id === sub.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-xs text-gray-500 mb-1">Nachricht:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Status ändern:</span>
                      {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                        <button
                          key={key}
                          onClick={(e) => { e.stopPropagation(); updateStatus(sub.id, key); }}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                            sub.status === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {val.label}
                        </button>
                      ))}
                      <a
                        href={`mailto:${sub.email}?subject=Re: ${sub.subject}`}
                        onClick={(e) => e.stopPropagation()}
                        className="ml-auto px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Antworten
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
