'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Clock, MapPin, User } from 'lucide-react';
import { getRuntimeConfig } from '@/components/EnvProvider';
import { fetchAuthSession } from 'aws-amplify/auth';

const TEAM_EMAILS = [
  { email: 'dennis.kral@immivo.ai', name: 'Dennis Kral', color: 'bg-blue-500' },
  { email: 'josef.leutgeb@immivo.ai', name: 'Josef Leutgeb', color: 'bg-emerald-500' },
  { email: 'office@immivo.ai', name: 'Office', color: 'bg-amber-500' },
  { email: 'support@immivo.ai', name: 'Support', color: 'bg-purple-500' },
];

interface CalEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  location?: string;
  isAllDay?: boolean;
  organizer?: string;
}

function getApiUrl(): string {
  const config = getRuntimeConfig();
  return (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
}

async function adminFetch(path: string) {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  const res = await fetch(`${getApiUrl()}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendars, setCalendars] = useState<Record<string, CalEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [visibleEmails, setVisibleEmails] = useState<Set<string>>(new Set(TEAM_EMAILS.map(t => t.email)));

  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const fetchCalendars = useCallback(async () => {
    setLoading(true);
    try {
      const emails = TEAM_EMAILS.map(t => t.email).join(',');
      const data = await adminFetch(
        `/admin/platform/calendars?emails=${emails}&start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
      );
      setCalendars(data.calendars || {});
    } catch (err) {
      console.error('Failed to load calendars:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const toggleEmail = (email: string) => {
    setVisibleEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00

  const getEventsForDay = (day: Date) => {
    const dayStr = day.toISOString().split('T')[0];
    const allEvents: (CalEvent & { ownerEmail: string })[] = [];
    for (const [email, events] of Object.entries(calendars)) {
      if (!visibleEmails.has(email)) continue;
      for (const ev of events) {
        const evDay = new Date(ev.start).toISOString().split('T')[0];
        if (evDay === dayStr) {
          allEvents.push({ ...ev, ownerEmail: email });
        }
      }
    }
    return allEvents;
  };

  const getEventPosition = (ev: CalEvent) => {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const top = ((startMinutes - 7 * 60) / 60) * 56; // 56px per hour
    const height = Math.max(((endMinutes - startMinutes) / 60) * 56, 20);
    return { top, height };
  };

  const getTeamColor = (email: string) => {
    return TEAM_EMAILS.find(t => t.email === email)?.color || 'bg-gray-400';
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team Kalender</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })} – {weekEnd.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Heute
          </button>
          <button onClick={() => navigate(-1)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={fetchCalendars} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all" title="Aktualisieren">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Team Filter */}
      <div className="flex items-center gap-2 mb-4">
        {TEAM_EMAILS.map(({ email, name, color }) => (
          <button
            key={email}
            onClick={() => toggleEmail(email)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              visibleEmails.has(email) ? 'bg-white border-gray-300 text-gray-800' : 'bg-gray-50 border-gray-100 text-gray-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${visibleEmails.has(email) ? color : 'bg-gray-300'}`} />
            {name.split(' ')[0]}
          </button>
        ))}
      </div>

      {loading && Object.keys(calendars).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Lade Kalender...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100">
            <div className="p-2" />
            {days.map((d, i) => (
              <div key={i} className={`p-2 text-center border-l border-gray-100 ${isToday(d) ? 'bg-blue-50' : ''}`}>
                <p className="text-[10px] font-medium text-gray-400 uppercase">
                  {d.toLocaleDateString('de-DE', { weekday: 'short' })}
                </p>
                <p className={`text-sm font-bold ${isToday(d) ? 'text-blue-600' : 'text-gray-900'}`}>
                  {d.getDate()}
                </p>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[600px] overflow-y-auto">
            {/* Hour rows */}
            {hours.map((hour) => (
              <div key={hour} className="contents">
                <div className="h-14 flex items-start justify-end pr-2 pt-0.5 text-[10px] text-gray-400 font-medium border-t border-gray-50">
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
                {days.map((day, dayIdx) => {
                  // Only render events in the first hour cell for the day
                  const events = hour === hours[0] ? getEventsForDay(day) : [];
                  return (
                    <div key={dayIdx} className={`h-14 border-l border-t border-gray-50 relative ${isToday(day) ? 'bg-blue-50/30' : ''}`}>
                      {hour === hours[0] && events.map((ev, evIdx) => {
                        const { top, height } = getEventPosition(ev);
                        const color = getTeamColor(ev.ownerEmail);
                        return (
                          <div
                            key={ev.id || evIdx}
                            className={`absolute left-0.5 right-0.5 ${color} bg-opacity-90 text-white rounded px-1 py-0.5 text-[10px] leading-tight overflow-hidden cursor-default z-10 hover:z-20 hover:shadow-md transition-shadow`}
                            style={{ top: `${top}px`, height: `${Math.max(height, 18)}px` }}
                            title={`${ev.subject}\n${new Date(ev.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - ${new Date(ev.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}\n${ev.location || ''}`}
                          >
                            <span className="font-medium truncate block">{ev.subject}</span>
                            {height > 25 && (
                              <span className="truncate block opacity-80">
                                {new Date(ev.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
