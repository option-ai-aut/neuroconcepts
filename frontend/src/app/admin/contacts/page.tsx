'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Mail, Clock, CheckCircle2, AlertCircle, Loader2, MessageSquare, User, CalendarDays, Building2, Video, ExternalLink, Copy } from 'lucide-react';
import { useRuntimeConfig } from '@/components/RuntimeConfigProvider';
import { getAdminDemoBookings, updateAdminDemoBooking, DemoBooking } from '@/lib/adminApi';

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

const CONTACT_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  NEW: { label: 'Neu', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  IN_PROGRESS: { label: 'In Bearbeitung', color: 'bg-amber-100 text-amber-700', icon: Clock },
  RESOLVED: { label: 'Erledigt', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

const DEMO_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Ausstehend', color: 'bg-amber-100 text-amber-700', icon: Clock },
  CONFIRMED: { label: 'Bestätigt', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  COMPLETED: { label: 'Abgeschlossen', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  CANCELLED: { label: 'Abgesagt', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  NO_SHOW: { label: 'Nicht erschienen', color: 'bg-gray-100 text-gray-700', icon: AlertCircle },
};

export default function AdminContactsPage() {
  const config = useRuntimeConfig();
  const [tab, setTab] = useState<'contacts' | 'demos'>('contacts');

  // Contact submissions
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [contactLoading, setContactLoading] = useState(true);
  const [contactError, setContactError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactSubmission | null>(null);
  const [contactFilter, setContactFilter] = useState<string>('ALL');

  // Demo bookings
  const [demos, setDemos] = useState<DemoBooking[]>([]);
  const [demoCounts, setDemoCounts] = useState<Record<string, number>>({});
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<DemoBooking | null>(null);
  const [demoFilter, setDemoFilter] = useState<string>('ALL');

  const apiUrl = (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

  const fetchContacts = async (silent = false) => {
    setContactError(null);
    if (!silent) setContactLoading(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const res = await fetch(`${apiUrl}/admin/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (err: any) {
      if (!silent) setContactError(err.message || 'Fehler beim Laden');
    } finally {
      if (!silent) setContactLoading(false);
    }
  };

  const fetchDemos = async (silent = false) => {
    setDemoError(null);
    if (!silent) setDemoLoading(true);
    try {
      const data = await getAdminDemoBookings();
      setDemos(data.bookings || []);
      setDemoCounts(data.counts || {});
    } catch (err: any) {
      if (!silent) setDemoError(err.message || 'Fehler beim Laden');
    } finally {
      if (!silent) setDemoLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, []);
  useEffect(() => {
    if (tab === 'demos' && demos.length === 0 && !demoLoading) {
      fetchDemos();
    }
  }, [tab]);

  // Silent background refresh every 15s
  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => {
    const handler = () => {
      fetchContacts(true);
      if (tabRef.current === 'demos') fetchDemos(true);
    };
    window.addEventListener('admin-bg-refresh', handler);
    return () => window.removeEventListener('admin-bg-refresh', handler);
  }, []);

  const updateContactStatus = async (id: string, status: string) => {
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

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const updateDemoStatus = async (id: string, status: string) => {
    try {
      if (status === 'CONFIRMED') setConfirmingId(id);
      await updateAdminDemoBooking(id, { status });
      fetchDemos();
    } catch (err) {
      console.error('Failed to update demo:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  const filteredContacts = contactFilter === 'ALL' ? submissions : submissions.filter(s => s.status === contactFilter);
  const filteredDemos = demoFilter === 'ALL' ? demos : demos.filter(d => d.status === demoFilter);

  const contactCounts = {
    ALL: submissions.length,
    NEW: submissions.filter(s => s.status === 'NEW').length,
    IN_PROGRESS: submissions.filter(s => s.status === 'IN_PROGRESS').length,
    RESOLVED: submissions.filter(s => s.status === 'RESOLVED').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Anfragen & Buchungen</h1>
          <p className="text-sm text-gray-500 mt-1">Kontaktanfragen und Demo-Buchungen verwalten</p>
        </div>
        {/* Tab Switch */}
        <div className="flex gap-2">
          <button onClick={() => setTab('contacts')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'contacts' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <MessageSquare className="w-4 h-4 inline mr-1.5" />
            Kontaktanfragen ({submissions.length})
          </button>
          <button onClick={() => setTab('demos')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'demos' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <CalendarDays className="w-4 h-4 inline mr-1.5" />
            Demo Buchungen ({demos.length || '…'})
          </button>
        </div>
      </div>

      {/* ── CONTACT SUBMISSIONS ── */}
      {tab === 'contacts' && (
        <>
          {contactError && (
            <div className="mb-6 bg-red-50 rounded-xl border border-red-200 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600 mb-3">{contactError}</p>
              <button onClick={fetchContacts} className="text-sm text-blue-600 hover:underline">Erneut versuchen</button>
            </div>
          )}

          <div className="flex gap-2 mb-6">
            {(['ALL', 'NEW', 'IN_PROGRESS', 'RESOLVED'] as const).map((key) => (
              <button key={key} onClick={() => setContactFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${contactFilter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {key === 'ALL' ? 'Alle' : CONTACT_STATUS_CONFIG[key]?.label || key} ({contactCounts[key]})
              </button>
            ))}
          </div>

          {contactLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Keine Kontaktanfragen vorhanden</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredContacts.map((sub) => {
                const cfg = CONTACT_STATUS_CONFIG[sub.status] || CONTACT_STATUS_CONFIG.NEW;
                const StatusIcon = cfg.icon;
                return (
                  <div key={sub.id} onClick={() => setSelectedContact(selectedContact?.id === sub.id ? null : sub)}
                    className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedContact?.id === sub.id ? 'border-gray-900 shadow-md' : 'border-gray-200'} ${sub.status === 'NEW' ? 'border-l-4 border-l-blue-500' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900 text-sm">{sub.firstName} {sub.lastName}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" />{cfg.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">{sub.subject}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{sub.email}</span>
                          <span>{new Date(sub.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    {selectedContact?.id === sub.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <p className="text-xs text-gray-500 mb-1">Nachricht:</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.message}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Status:</span>
                          {Object.entries(CONTACT_STATUS_CONFIG).map(([key, val]) => (
                            <button key={key} onClick={(e) => { e.stopPropagation(); updateContactStatus(sub.id, key); }}
                              className={`px-3 py-1 text-xs rounded-lg transition-colors ${sub.status === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                              {val.label}
                            </button>
                          ))}
                          <a href={`mailto:${sub.email}?subject=Re: ${sub.subject}`} onClick={(e) => e.stopPropagation()}
                            className="ml-auto px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
        </>
      )}

      {/* ── DEMO BOOKINGS ── */}
      {tab === 'demos' && (
        <>
          {demoError && (
            <div className="mb-6 bg-red-50 rounded-xl border border-red-200 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600 mb-3">{demoError}</p>
              <button onClick={fetchDemos} className="text-sm text-blue-600 hover:underline">Erneut versuchen</button>
            </div>
          )}

          <div className="flex gap-2 mb-6 flex-wrap">
            {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const).map((key) => {
              const count = key === 'ALL' ? demos.length : (demoCounts[key] || 0);
              return (
                <button key={key} onClick={() => setDemoFilter(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${demoFilter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {key === 'ALL' ? 'Alle' : DEMO_STATUS_CONFIG[key]?.label || key} ({count})
                </button>
              );
            })}
            <button onClick={fetchDemos} disabled={demoLoading}
              className="ml-auto px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1">
              <Loader2 className={`w-3 h-3 ${demoLoading ? 'animate-spin' : 'hidden'}`} />
              Aktualisieren
            </button>
          </div>

          {demoLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : filteredDemos.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
              <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Keine Demo-Buchungen vorhanden</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredDemos.map((demo) => {
                const cfg = DEMO_STATUS_CONFIG[demo.status] || DEMO_STATUS_CONFIG.PENDING;
                const StatusIcon = cfg.icon;
                const startDate = new Date(demo.start);
                const endDate = new Date(demo.end);
                const isPast = startDate < new Date();
                return (
                  <div key={demo.id} onClick={() => setSelectedDemo(selectedDemo?.id === demo.id ? null : demo)}
                    className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedDemo?.id === demo.id ? 'border-gray-900 shadow-md' : 'border-gray-200'} ${demo.status === 'PENDING' && !isPast ? 'border-l-4 border-l-amber-400' : ''} ${demo.status === 'CONFIRMED' ? 'border-l-4 border-l-blue-500' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <User className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="font-semibold text-gray-900 text-sm">{demo.name}</span>
                          {demo.company && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Building2 className="w-3 h-3" />{demo.company}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" />{cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {startDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                            {' '}
                            {startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            {' – '}
                            {endDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{demo.email}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg shrink-0 ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-700'}`}>
                        {isPast ? 'Vergangen' : 'Bevorstehend'}
                      </span>
                    </div>

                    {selectedDemo?.id === demo.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        {demo.message && (
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <p className="text-xs text-gray-500 mb-1">Nachricht:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{demo.message}</p>
                          </div>
                        )}
                        {demo.adminNotes && (
                          <div className="bg-amber-50 rounded-lg p-3 mb-4 border border-amber-100">
                            <p className="text-xs text-amber-600 mb-1">Admin-Notizen:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{demo.adminNotes}</p>
                          </div>
                        )}
                        {/* Meet link display */}
                        {demo.meetLink && (
                          <div className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                            <Video className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-xs text-blue-800 font-medium truncate flex-1">{demo.meetLink}</span>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(demo.meetLink!); }}
                              className="p-1 hover:bg-blue-100 rounded transition-colors shrink-0" title="Kopieren">
                              <Copy className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                            <a href={demo.meetLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                              className="p-1 hover:bg-blue-100 rounded transition-colors shrink-0" title="Öffnen">
                              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            </a>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">Status:</span>
                          {(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const).map((key) => (
                            <button key={key} onClick={(e) => {
                              e.stopPropagation();
                              updateDemoStatus(demo.id, key);
                            }}
                              disabled={confirmingId === demo.id}
                              className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${demo.status === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                              {key === 'CONFIRMED' && confirmingId === demo.id
                                ? <><Loader2 className="w-3 h-3 animate-spin" /> Erstelle Meet...</>
                                : key === 'CONFIRMED' && !demo.meetLink
                                  ? <><Video className="w-3 h-3" /> Bestätigen & Meet erstellen</>
                                  : DEMO_STATUS_CONFIG[key].label
                              }
                            </button>
                          ))}
                          <a href={`mailto:${demo.email}?subject=Demo Call – ${demo.name}`} onClick={(e) => e.stopPropagation()}
                            className="ml-auto px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            E-Mail senden
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
