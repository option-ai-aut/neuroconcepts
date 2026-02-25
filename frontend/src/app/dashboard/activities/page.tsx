'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAuthHeaders, getApiUrl } from '@/lib/api';
import { useGlobalState } from '@/context/GlobalStateContext';
import { useRealtimeEvents } from '@/components/RealtimeEventProvider';
import {
  Activity,
  User,
  Building2,
  Mail,
  Calendar,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Loader2,
  Search,
  Check,
  Bell,
  Send,
  FileText,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

interface LeadActivity {
  id: string;
  leadId: string;
  type: string;
  description: string;
  propertyId?: string;
  jarvisActionId?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  metadata?: {
    portal?: string;
    originalEmail?: { from?: string; subject?: string; body?: string };
    [key: string]: any;
  };
  lead?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  property?: {
    id: string;
    title: string;
    address: string;
  };
  jarvisAction?: {
    id: string;
    status: string;
    question: string;
    options?: Array<{ id: string; label: string }>;
    allowCustom: boolean;
    context?: {
      emailBody?: string;
      emailSubject?: string;
      leadName?: string;
      leadEmail?: string;
      portal?: string;
    };
  };
}

const activityTypeIcons: Record<string, any> = {
  LEAD_CREATED: User,
  STATUS_CHANGED: Activity,
  FIELD_UPDATED: Edit3,
  EMAIL_SENT: Send,
  EMAIL_RECEIVED: Mail,
  NOTE_ADDED: MessageSquare,
  PROPERTY_ASSIGNED: Building2,
  PORTAL_INQUIRY: Mail,
  EXPOSE_SENT: FileText,
  VIEWING_SCHEDULED: Calendar,
  VIEWING_DONE: CheckCircle,
  JARVIS_QUERY: AlertCircle,
  LINK_CLICK_REQUIRED: AlertCircle,
};

const activityTypeLabels: Record<string, string> = {
  LEAD_CREATED: 'Lead erstellt',
  STATUS_CHANGED: 'Status geändert',
  FIELD_UPDATED: 'Feld aktualisiert',
  EMAIL_SENT: 'E-Mail gesendet',
  EMAIL_RECEIVED: 'E-Mail empfangen',
  NOTE_ADDED: 'Notiz hinzugefügt',
  PROPERTY_ASSIGNED: 'Objekt zugewiesen',
  PORTAL_INQUIRY: 'Portal-Anfrage',
  EXPOSE_SENT: 'Exposé gesendet',
  VIEWING_SCHEDULED: 'Besichtigung geplant',
  VIEWING_DONE: 'Besichtigung durchgeführt',
  JARVIS_QUERY: 'Aktion erforderlich',
  LINK_CLICK_REQUIRED: 'Link-Klick erforderlich',
};

// Searchable property selector for Jarvis actions
function PropertySelector({
  options,
  onSelect,
  loading,
}: {
  options: Array<{ id: string; label: string }>;
  onSelect: (id: string, label: string) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const handleSelect = (opt: { id: string; label: string }) => {
    setSelected(opt.id);
    onSelect(opt.id, opt.label);
  };

  return (
    <div className="mt-3">
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Objekt suchen..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={e => e.preventDefault()}
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a]">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-sm text-gray-400">Kein Ergebnis</p>
        ) : (
          filtered.map(opt => (
            <button
              key={opt.id}
              onClick={e => { e.preventDefault(); handleSelect(opt); }}
              disabled={loading}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                selected === opt.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : opt.id === 'none'
                  ? 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 italic'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              {loading && selected === opt.id ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : selected === opt.id ? (
                <Check className="w-4 h-4 shrink-0 text-blue-600" />
              ) : opt.id !== 'none' ? (
                <Building2 className="w-4 h-4 shrink-0 text-gray-400" />
              ) : null}
              {opt.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// Expandable email preview
function EmailPreview({ body, subject, from }: { body?: string; subject?: string; from?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!body && !subject) return null;

  const preview = body ? body.substring(0, 180).replace(/\n+/g, ' ') : '';
  const hasMore = body && body.length > 180;

  return (
    <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        {subject && <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{subject}</span>}
        {from && <span className="text-xs text-gray-400 truncate ml-auto shrink-0">{from}</span>}
      </div>
      <div className="px-3 py-2">
        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
          {expanded ? body : preview}
          {!expanded && hasMore && '...'}
        </p>
        {hasMore && (
          <button
            onClick={e => { e.preventDefault(); setExpanded(!expanded); }}
            className="mt-1 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Weniger anzeigen' : 'Vollständig lesen'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | 'pending'>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const { aiActionPerformed } = useGlobalState();
  const { eventVersion } = useRealtimeEvents();

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();

      const [activitiesRes, meRes] = await Promise.all([
        fetch(`${apiUrl}/activities?limit=150`, { headers }),
        fetch(`${apiUrl}/me`, { headers }),
      ]);

      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data.activities || []);
        if (data.currentUserId) setCurrentUserId(data.currentUserId);
      }
      if (meRes.ok && !currentUserId) {
        const user = await meRes.json();
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (aiActionPerformed) loadData(true); }, [aiActionPerformed]);
  useEffect(() => { if (eventVersion > 0) loadData(true); }, [eventVersion]);

  const handleRespondToAction = async (actionId: string, response: string) => {
    setRespondingTo(actionId);
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiUrl}/jarvis/actions/${actionId}/respond`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      if (res.ok) loadData(true);
    } catch (error) {
      console.error('Error responding to action:', error);
    } finally {
      setRespondingTo(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Heute';
    if (date.toDateString() === yesterday.toDateString()) return 'Gestern';
    return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const isMyActivity = (a: LeadActivity) =>
    currentUserId && (a.createdBy === currentUserId || !a.createdBy);

  // Split pending actions from regular activities
  const pendingActivities = activities.filter(
    a => a.jarvisAction?.status === 'PENDING'
  );

  const filteredActivities = activities.filter(a => {
    if (filter === 'pending') return a.jarvisAction?.status === 'PENDING';
    if (filter === 'mine') return isMyActivity(a);
    return true;
  });

  // Group non-pending activities by date (for all/mine filter, exclude pending ones already shown above)
  const regularActivities = filter === 'pending'
    ? filteredActivities
    : filteredActivities.filter(a => a.jarvisAction?.status !== 'PENDING');

  const groupedActivities = regularActivities.reduce((groups, activity) => {
    const dateKey = new Date(activity.createdAt).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(activity);
    return groups;
  }, {} as Record<string, LeadActivity[]>);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-[#111111]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#111111] transition-colors">
      {/* Filter Bar */}
      <div className="px-4 sm:px-8 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 shrink-0">
          {([
            { key: 'all', label: 'Alle' },
            { key: 'mine', label: 'Meine' },
            { key: 'pending', label: `Offen${pendingActivities.length > 0 ? ` (${pendingActivities.length})` : ''}` },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === tab.key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              } ${tab.key === 'pending' && pendingActivities.length > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => loadData(true)}
          className="ml-auto p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Aktualisieren"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 sm:px-8 py-4 sm:py-6 pb-20 lg:pb-6">

        {/* Pending Actions Section (shown when filter=all or filter=pending) */}
        {(filter === 'all' || filter === 'pending') && pendingActivities.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Ausstehende Aktionen ({pendingActivities.length})
              </h2>
            </div>

            <div className="space-y-4">
              {pendingActivities.map(activity => {
                const leadName = activity.lead
                  ? [activity.lead.firstName, activity.lead.lastName].filter(Boolean).join(' ') || activity.lead.email
                  : activity.jarvisAction?.context?.leadName || 'Unbekannt';
                const emailBody =
                  activity.metadata?.originalEmail?.body ||
                  activity.jarvisAction?.context?.emailBody || '';
                const emailSubject =
                  activity.metadata?.originalEmail?.subject ||
                  activity.jarvisAction?.context?.emailSubject || '';
                const emailFrom =
                  activity.metadata?.originalEmail?.from ||
                  activity.jarvisAction?.context?.leadEmail || '';
                const portal = activity.metadata?.portal || activity.jarvisAction?.context?.portal || '';

                return (
                  <div
                    key={activity.id}
                    className="rounded-xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 p-4 sm:p-5"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full">
                            Aktion erforderlich
                          </span>
                          {portal && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                              {portal}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Link
                            href={`/dashboard/crm/leads/${activity.leadId}`}
                            className="text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            {leadName}
                          </Link>
                          {emailFrom && emailFrom !== leadName && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">&lt;{emailFrom}&gt;</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {formatTime(activity.createdAt)}
                      </span>
                    </div>

                    {/* Email Content */}
                    <EmailPreview body={emailBody} subject={emailSubject} from={emailFrom} />

                    {/* Jarvis Question + Property Selector */}
                    {activity.jarvisAction && (
                      <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-700/30">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {activity.jarvisAction.question}
                          </p>
                        </div>

                        <PropertySelector
                          options={activity.jarvisAction.options || []}
                          onSelect={(id) => handleRespondToAction(activity.jarvisAction!.id, id)}
                          loading={respondingTo === activity.jarvisAction.id}
                        />
                      </div>
                    )}

                    {/* Non-property Jarvis Actions (buttons) */}
                    {activity.jarvisAction && activity.jarvisAction.type !== 'ASSIGN_PROPERTY' && (
                      <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-700/30">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
                          {activity.jarvisAction.question}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {activity.jarvisAction.options?.map(option => (
                            <button
                              key={option.id}
                              onClick={() => handleRespondToAction(activity.jarvisAction!.id, option.id)}
                              disabled={respondingTo === activity.jarvisAction!.id}
                              className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {respondingTo === activity.jarvisAction!.id && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              )}
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Regular Activities Feed */}
        {Object.keys(groupedActivities).length === 0 && pendingActivities.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-600">Keine Aktivitäten gefunden</p>
          </div>
        ) : Object.keys(groupedActivities).length === 0 ? null : (
          <div className="space-y-8">
            {Object.entries(groupedActivities)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, dateActivities]) => (
                <div key={date}>
                  <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                    {formatDate(dateActivities[0].createdAt)}
                  </h2>

                  <div className="space-y-2">
                    {dateActivities
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(activity => {
                        const Icon = activityTypeIcons[activity.type] || Activity;
                        const isMine = isMyActivity(activity);
                        const leadName = activity.lead
                          ? [activity.lead.firstName, activity.lead.lastName].filter(Boolean).join(' ') || activity.lead.email
                          : null;
                        const emailBody = activity.metadata?.originalEmail?.body || '';
                        const emailSubject = activity.metadata?.originalEmail?.subject || '';
                        const emailFrom = activity.metadata?.originalEmail?.from || '';

                        return (
                          <Link
                            key={activity.id}
                            href={`/dashboard/crm/leads/${activity.leadId}`}
                            className="block p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                activity.type === 'PORTAL_INQUIRY' || activity.type === 'EMAIL_RECEIVED'
                                  ? 'bg-blue-50 dark:bg-blue-900/20'
                                  : activity.type === 'LEAD_CREATED'
                                  ? 'bg-green-50 dark:bg-green-900/20'
                                  : 'bg-gray-100 dark:bg-gray-800'
                              }`}>
                                <Icon className={`w-4 h-4 ${
                                  activity.type === 'PORTAL_INQUIRY' || activity.type === 'EMAIL_RECEIVED'
                                    ? 'text-blue-500 dark:text-blue-400'
                                    : activity.type === 'LEAD_CREATED'
                                    ? 'text-green-500 dark:text-green-400'
                                    : isMine
                                    ? 'text-blue-500 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {activityTypeLabels[activity.type] || activity.type}
                                  </span>
                                  {activity.metadata?.portal && (
                                    <span className="px-1.5 py-0.5 text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
                                      {activity.metadata.portal}
                                    </span>
                                  )}
                                </div>

                                {/* Lead name & description */}
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                  {leadName && (
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{leadName}</span>
                                  )}
                                  {leadName && <span>·</span>}
                                  <span>{activity.description}</span>
                                </div>

                                {/* Email preview (inline, short) */}
                                {emailBody && (
                                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">
                                    {emailSubject && <span className="font-medium not-italic text-gray-600 dark:text-gray-400">{emailSubject}: </span>}
                                    {emailBody.substring(0, 120)}
                                    {emailBody.length > 120 && '...'}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {formatTime(activity.createdAt)}
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
