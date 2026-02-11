'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Building2, 
  Clock,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Plus,
  Calendar,
  Mail,
  Phone,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { getAuthHeaders } from '@/lib/api';
import { getRuntimeConfig } from '@/components/EnvProvider';
import { useGlobalState } from '@/context/GlobalStateContext';

interface DashboardStats {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    tenantName: string;
  };
  leads: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    byStatus: {
      NEW: number;
      CONTACTED: number;
      CONVERSATION: number;
      BOOKED: number;
      LOST: number;
    };
    needingAttention: Array<{
      id: string;
      name: string;
      email: string;
      propertyTitle: string | null;
      createdAt: string;
      daysSinceCreated: number;
    }>;
    recent: Array<{
      id: string;
      name: string;
      email: string;
      status: string;
      propertyTitle: string | null;
      createdAt: string;
    }>;
  };
  properties: {
    total: number;
    active: number;
    reserved: number;
    sold: number;
  };
  activities: Array<{
    id: string;
    type: string;
    description: string;
    leadName: string;
    createdAt: string;
  }>;
}

const statusLabels: Record<string, string> = {
  NEW: 'Neu',
  CONTACTED: 'Kontaktiert',
  CONVERSATION: 'In Gespräch',
  BOOKED: 'Gebucht',
  LOST: 'Verloren'
};

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-yellow-100 text-yellow-700',
  CONVERSATION: 'bg-purple-100 text-purple-700',
  BOOKED: 'bg-green-100 text-green-700',
  LOST: 'bg-gray-100 text-gray-500'
};

const activityIcons: Record<string, any> = {
  STATUS_CHANGE: TrendingUp,
  EMAIL_SENT: Mail,
  EMAIL_RECEIVED: Mail,
  CALL: Phone,
  VIEWING: Eye,
  NOTE: Clock,
  CREATED: Plus
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { openDrawer } = useGlobalState();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const headers = await getAuthHeaders();
        const config = getRuntimeConfig();
        const res = await fetch(`${config.apiUrl}/dashboard/stats`, { headers });
        
        if (!res.ok) throw new Error('Failed to fetch dashboard stats');
        
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Dashboard error:', err);
        setError('Fehler beim Laden der Dashboard-Daten');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Keine Daten verfügbar'}</p>
        </div>
      </div>
    );
  }

  const activeLeads = stats.leads.total - stats.leads.byStatus.BOOKED - stats.leads.byStatus.LOST;
  const conversionRate = stats.leads.total > 0 
    ? Math.round((stats.leads.byStatus.BOOKED / stats.leads.total) * 100) 
    : 0;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="pt-4 md:pt-6 px-4 md:px-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Guten {new Date().getHours() < 12 ? 'Morgen' : new Date().getHours() < 18 ? 'Tag' : 'Abend'}, {stats.user.firstName}
            </h2>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5">
              {stats.leads.newToday > 0 
                ? `${stats.leads.newToday} neue${stats.leads.newToday === 1 ? 'r' : ''} Lead${stats.leads.newToday === 1 ? '' : 's'} heute`
                : 'Keine neuen Leads heute'}
              {stats.leads.byStatus.NEW > 0 && ` · ${stats.leads.byStatus.NEW} warten auf Kontakt`}
            </p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={() => openDrawer('LEAD')}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs md:text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Neuer</span> Lead
            </button>
            <button
              onClick={() => openDrawer('PROPERTY')}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs md:text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Neues</span> Objekt
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 md:px-8 pb-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          {/* Active Leads */}
          <Link 
            href="/dashboard/crm/leads"
            className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="p-2 md:p-3 bg-indigo-50 rounded-lg">
                <Users className="w-4 md:w-5 h-4 md:h-5 text-indigo-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">{activeLeads}</div>
            <div className="text-xs md:text-sm text-gray-500 mt-1">Aktive Leads</div>
            {stats.leads.newThisWeek > 0 && (
              <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +{stats.leads.newThisWeek} diese Woche
              </div>
            )}
          </Link>

          {/* Properties */}
          <Link 
            href="/dashboard/crm/properties"
            className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="p-2 md:p-3 bg-purple-50 rounded-lg">
                <Building2 className="w-4 md:w-5 h-4 md:h-5 text-purple-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">{stats.properties.active}</div>
            <div className="text-xs md:text-sm text-gray-500 mt-1">Aktive Objekte</div>
            {stats.properties.reserved > 0 && (
              <div className="text-xs text-orange-600 mt-2">
                {stats.properties.reserved} reserviert
              </div>
            )}
          </Link>

          {/* Conversion Rate */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="p-2 md:p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 text-green-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">{conversionRate}%</div>
            <div className="text-xs md:text-sm text-gray-500 mt-1">Abschlussrate</div>
            <div className="text-xs text-gray-400 mt-2">
              {stats.leads.byStatus.BOOKED} von {stats.leads.total} Leads
            </div>
          </div>

          {/* Needs Attention */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className={`p-2 md:p-3 rounded-lg ${stats.leads.byStatus.NEW > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                <AlertCircle className={`w-4 md:w-5 h-4 md:h-5 ${stats.leads.byStatus.NEW > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">{stats.leads.byStatus.NEW}</div>
            <div className="text-xs md:text-sm text-gray-500 mt-1">Warten auf Kontakt</div>
            {stats.leads.needingAttention.length > 0 && stats.leads.needingAttention[0].daysSinceCreated > 0 && (
              <div className="text-xs text-amber-600 mt-2">
                Ältester: {stats.leads.needingAttention[0].daysSinceCreated} Tag{stats.leads.needingAttention[0].daysSinceCreated !== 1 ? 'e' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Leads needing attention */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-4 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Leads - Handlungsbedarf</h2>
              <Link 
                href="/dashboard/crm/leads?status=NEW" 
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Alle anzeigen
              </Link>
            </div>

            {stats.leads.needingAttention.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-500">Alle Leads wurden kontaktiert</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.leads.needingAttention.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/dashboard/crm/leads/${lead.id}`}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{lead.name}</div>
                        <div className="text-sm text-gray-500">
                          {lead.propertyTitle || lead.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {lead.daysSinceCreated > 2 && (
                        <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                          {lead.daysSinceCreated} Tage
                        </span>
                      )}
                      <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                        Neu
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Letzte Aktivitäten</h2>
            
            {stats.activities.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Noch keine Aktivitäten</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.activities.slice(0, 6).map((activity) => {
                  const Icon = activityIcons[activity.type] || Clock;
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="p-1.5 bg-gray-100 rounded-lg mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {activity.leadName} · {formatTimeAgo(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Overview */}
        <div className="mt-4 md:mt-6 bg-white rounded-xl border border-gray-100 p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Lead-Pipeline</h2>
            <Link 
              href="/dashboard/crm/leads" 
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              CRM öffnen
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            {Object.entries(stats.leads.byStatus).map(([status, count]) => {
              if (status === 'LOST') return null;
              const percentage = stats.leads.total > 0 ? (count / stats.leads.total) * 100 : 0;
              if (percentage === 0) return null;
              
              return (
                <div 
                  key={status}
                  className="relative group"
                  style={{ flex: Math.max(percentage, 5) }}
                >
                  <div 
                    className={`h-8 rounded-lg ${statusColors[status]?.replace('text-', 'bg-').replace('-700', '-200').replace('-500', '-200')} flex items-center justify-center transition-all hover:opacity-80`}
                  >
                    {percentage >= 10 && (
                      <span className={`text-xs font-medium ${statusColors[status]?.split(' ')[1]}`}>
                        {count}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <span className="text-xs text-gray-500">{statusLabels[status]}: {count}</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 mt-8 pt-4 border-t border-gray-100">
            {Object.entries(statusLabels).map(([status, label]) => {
              if (status === 'LOST') return null;
              return (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status]?.replace('text-', 'bg-').replace('-700', '-500').replace('-500', '-400')}`} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-4 md:mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.leads.newThisMonth}</div>
            <div className="text-xs text-gray-500 mt-1">Leads diesen Monat</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.leads.byStatus.CONTACTED}</div>
            <div className="text-xs text-gray-500 mt-1">Kontaktiert</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.leads.byStatus.CONVERSATION}</div>
            <div className="text-xs text-gray-500 mt-1">In Gespräch</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-5 h-5" />
              {stats.leads.byStatus.BOOKED}
            </div>
            <div className="text-xs text-gray-500 mt-1">Gebucht</div>
          </div>
        </div>
      </div>
    </div>
  );
}
