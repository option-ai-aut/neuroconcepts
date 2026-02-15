'use client';

import { useState, useEffect } from 'react';
import { getAuthHeaders, getApiUrl } from '@/lib/api';
import { useGlobalState } from '@/context/GlobalStateContext';
import { useRealtimeEvents } from '@/components/RealtimeEventProvider';
import { 
  Activity, 
  Filter, 
  User, 
  Users,
  Building2, 
  Mail, 
  Calendar,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  Loader2
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
  metadata?: any;
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
  };
}

interface JarvisAction {
  id: string;
  leadId?: string;
  propertyId?: string;
  type: string;
  question: string;
  options?: Array<{ id: string; label: string }>;
  allowCustom: boolean;
  status: string;
  createdAt: string;
  lead?: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

const activityTypeIcons: Record<string, any> = {
  LEAD_CREATED: User,
  STATUS_CHANGED: Activity,
  FIELD_UPDATED: Activity,
  EMAIL_SENT: Mail,
  EMAIL_RECEIVED: Mail,
  NOTE_ADDED: MessageSquare,
  PROPERTY_ASSIGNED: Building2,
  PORTAL_INQUIRY: Mail,
  EXPOSE_SENT: Mail,
  VIEWING_SCHEDULED: Calendar,
  VIEWING_DONE: CheckCircle,
  JARVIS_QUERY: AlertCircle,
  LINK_CLICK_REQUIRED: AlertCircle,
};

const activityTypeLabels: Record<string, string> = {
  LEAD_CREATED: 'Lead erstellt',
  STATUS_CHANGED: 'Status geändert',
  FIELD_UPDATED: 'Feld aktualisiert',
  EMAIL_SENT: 'Email gesendet',
  EMAIL_RECEIVED: 'Email empfangen',
  NOTE_ADDED: 'Notiz hinzugefügt',
  PROPERTY_ASSIGNED: 'Objekt zugewiesen',
  PORTAL_INQUIRY: 'Portal-Anfrage',
  EXPOSE_SENT: 'Exposé gesendet',
  VIEWING_SCHEDULED: 'Besichtigung geplant',
  VIEWING_DONE: 'Besichtigung durchgeführt',
  JARVIS_QUERY: 'Jarvis-Frage',
  LINK_CLICK_REQUIRED: 'Link-Klick erforderlich',
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [pendingActions, setPendingActions] = useState<JarvisAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'pending'>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const { aiActionPerformed } = useGlobalState();
  const { eventVersion } = useRealtimeEvents();

  const loadData = async () => {
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();

      // Load activities - response includes currentUserId
      const activitiesRes = await fetch(`${apiUrl}/activities?limit=100`, { headers });
      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data.activities || []);
        // Use currentUserId from activities response
        if (data.currentUserId) {
          setCurrentUserId(data.currentUserId);
        }
      }

      // Load pending Jarvis actions
      const actionsRes = await fetch(`${apiUrl}/jarvis/actions?status=PENDING`, { headers });
      if (actionsRes.ok) {
        const data = await actionsRes.json();
        setPendingActions(data.actions || []);
      }

      // Fallback: Get current user ID from /me if not already set
      if (!currentUserId) {
        const meRes = await fetch(`${apiUrl}/me`, { headers });
        if (meRes.ok) {
          const user = await meRes.json();
          setCurrentUserId(user.id);
        }
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (aiActionPerformed) {
      loadData();
    }
  }, [aiActionPerformed]);

  // Re-fetch on SSE event (no polling needed)
  useEffect(() => {
    if (eventVersion > 0) {
      loadData();
    }
  }, [eventVersion]);

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

      if (res.ok) {
        // Reload data
        loadData();
      }
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

    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Gestern';
    } else {
      return date.toLocaleDateString('de-DE', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      });
    }
  };

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const dateKey = new Date(activity.createdAt).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
    return groups;
  }, {} as Record<string, LeadActivity[]>);

  // Filter activities
  const filteredGroups = Object.entries(groupedActivities).reduce((acc, [date, acts]) => {
    let filtered = acts;
    
    if (filter === 'mine' && currentUserId) {
      // Include activities where createdBy matches OR createdBy is null/undefined (legacy activities)
      // This ensures users see their own activities even if createdBy wasn't set
      filtered = acts.filter(a => a.createdBy === currentUserId || !a.createdBy);
    } else if (filter === 'pending') {
      filtered = acts.filter(a => a.jarvisAction?.status === 'PENDING');
    }
    
    if (filtered.length > 0) {
      acc[date] = filtered;
    }
    return acc;
  }, {} as Record<string, LeadActivity[]>);

  const isMyActivity = (activity: LeadActivity) => {
    // Activity is "mine" if createdBy matches OR if createdBy is not set (legacy)
    return currentUserId && (activity.createdBy === currentUserId || !activity.createdBy);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Backfill activities for existing leads
  const handleBackfill = async () => {
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiUrl}/admin/backfill-activities`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        alert(`${data.created} Aktivitäten für bestehende Leads erstellt.`);
        loadData();
      }
    } catch (error) {
      console.error('Backfill error:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Filter Bar */}
      <div className="px-8 py-4 border-b border-gray-100 flex items-center gap-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'all' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'mine' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Meine
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'pending' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Offen ({pendingActions.length})
          </button>
        </div>
      </div>

      {/* Activities List */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {Object.keys(filteredGroups).length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Keine Aktivitäten gefunden</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(filteredGroups)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, dateActivities]) => (
                <div key={date}>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    {formatDate(dateActivities[0].createdAt)}
                  </h2>
                  
                  <div className="space-y-3">
                    {dateActivities
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((activity) => {
                        const Icon = activityTypeIcons[activity.type] || Activity;
                        const isMine = isMyActivity(activity);
                        const isPending = activity.jarvisAction?.status === 'PENDING';
                        const leadName = activity.lead 
                          ? [activity.lead.firstName, activity.lead.lastName].filter(Boolean).join(' ') || activity.lead.email
                          : 'Unbekannt';

                        return (
                          <Link 
                            key={activity.id}
                            href={`/dashboard/crm/leads/${activity.leadId}`}
                            className={`block p-4 rounded-xl border transition-all cursor-pointer ${
                              isMine 
                                ? 'bg-gray-50/50 border-gray-200 hover:border-gray-300' 
                                : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                            } ${isPending ? 'ring-2 ring-amber-200' : ''}`}
                          >
                            <div className="flex items-start gap-4">
                              {/* Icon */}
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isPending 
                                  ? 'bg-amber-100' 
                                  : isMine 
                                    ? 'bg-gray-100' 
                                    : 'bg-gray-100'
                              }`}>
                                <Icon className={`w-5 h-5 ${
                                  isPending 
                                    ? 'text-amber-600' 
                                    : isMine 
                                      ? 'text-blue-600' 
                                      : 'text-gray-600'
                                }`} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {activityTypeLabels[activity.type] || activity.type}
                                  </span>
                                  {isMine && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                                      Meine
                                    </span>
                                  )}
                                  {activity.jarvisActionId && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 rounded-full">
                                      Automatisiert
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                      Offen
                                    </span>
                                  )}
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-2">
                                  {activity.description}
                                </p>

                                {/* Lead & Property Links */}
                                <div className="flex items-center flex-wrap gap-3 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(activity.createdAt)}
                                  </span>
                                  
                                  {activity.createdByName && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-blue-600 rounded-full">
                                      <Users className="w-3 h-3" />
                                      {activity.createdByName}
                                    </span>
                                  )}
                                  
                                  {activity.lead && (
                                    <span className="flex items-center gap-1 text-blue-600">
                                      <User className="w-3 h-3" />
                                      {leadName}
                                    </span>
                                  )}
                                  
                                  {activity.property && (
                                    <span className="flex items-center gap-1 text-blue-600">
                                      <Building2 className="w-3 h-3" />
                                      {activity.property.title}
                                    </span>
                                  )}
                                </div>

                                {/* Jarvis Action Buttons */}
                                {activity.jarvisAction && isPending && (
                                  <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                                    <p className="text-sm font-medium text-gray-900 mb-3">
                                      {activity.jarvisAction.question}
                                    </p>
                                    
                                    <div className="flex flex-wrap gap-2">
                                      {activity.jarvisAction.options?.map((option) => (
                                        <button
                                          key={option.id}
                                          onClick={() => handleRespondToAction(activity.jarvisAction!.id, option.id)}
                                          disabled={respondingTo === activity.jarvisAction!.id}
                                          className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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

                              {/* Arrow */}
                              <div className="p-2">
                                <ChevronRight className="w-5 h-5 text-gray-400" />
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
