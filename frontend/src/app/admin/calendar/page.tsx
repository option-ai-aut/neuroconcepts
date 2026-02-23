'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Clock, User, Plus, X, Loader2 } from 'lucide-react';
import { getRuntimeConfig } from '@/components/EnvProvider';
import { fetchAuthSession } from 'aws-amplify/auth';

const TEAM_MEMBERS = [
  { email: 'dennis.kral@immivo.ai', name: 'Dennis Kral', color: 'bg-blue-500', textColor: 'text-blue-600' },
  { email: 'josef.leutgeb@immivo.ai', name: 'Josef Leutgeb', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
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
  return (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

async function adminFetch(path: string, options?: RequestInit) {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

type ViewMode = 'mine' | 'member' | 'office';

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendars, setCalendars] = useState<Record<string, CalEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // View mode: 'mine' (mein Kalender), 'member' (einzelner Mitarbeiter), 'office' (alle = Office)
  const [viewMode, setViewMode] = useState<ViewMode>('mine');
  const [selectedMember, setSelectedMember] = useState<string>(TEAM_MEMBERS[0].email);

  // New event modal
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventSubject, setNewEventSubject] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('09:00');
  const [newEventEndTime, setNewEventEndTime] = useState('10:00');
  const [newEventSaving, setNewEventSaving] = useState(false);

  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const fetchCalendars = useCallback(async () => {
    setLoading(true);
    try {
      // Always fetch all calendars including office@
      const allEmails = [...TEAM_MEMBERS.map(t => t.email), 'office@immivo.ai'];
      const emails = allEmails.join(',');
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

  useEffect(() => { fetchCalendars(); }, [fetchCalendars]);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (isMobile ? dir : dir * 7));
    setCurrentDate(d);
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i); // 00:00 - 23:00

  // Determine which events to show based on view mode
  const getVisibleEvents = (): Record<string, CalEvent[]> => {
    switch (viewMode) {
      case 'mine':
        // Show my calendar + office@ calendar
        return {
          [TEAM_MEMBERS[0].email]: calendars[TEAM_MEMBERS[0].email] || [],
          'office@immivo.ai': calendars['office@immivo.ai'] || [],
        };
      case 'member':
        return {
          [selectedMember]: calendars[selectedMember] || [],
          'office@immivo.ai': calendars['office@immivo.ai'] || [],
        };
      case 'office':
        // Show all calendars — office@ has everything
        return {
          'office@immivo.ai': calendars['office@immivo.ai'] || [],
          ...TEAM_MEMBERS.reduce((acc, m) => ({ ...acc, [m.email]: calendars[m.email] || [] }), {}),
        };
    }
  };

  const visibleCalendars = getVisibleEvents();

  const getEventsForDay = (day: Date) => {
    const dayStr = day.toISOString().split('T')[0];
    const allEvents: (CalEvent & { ownerEmail: string })[] = [];
    const seenIds = new Set<string>();

    for (const [email, events] of Object.entries(visibleCalendars)) {
      for (const ev of events) {
        const evDay = new Date(ev.start).toISOString().split('T')[0];
        if (evDay === dayStr && !seenIds.has(ev.id)) {
          seenIds.add(ev.id);
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
    const top = (startMinutes / 60) * 56;
    const height = Math.max(((endMinutes - startMinutes) / 60) * 56, 20);
    return { top, height };
  };

  const getTeamColor = (email: string) => {
    const member = TEAM_MEMBERS.find(t => t.email === email);
    if (member) return member.color;
    if (email === 'office@immivo.ai') return 'bg-amber-500';
    return 'bg-gray-400';
  };

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isToday = (d: Date) => {
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const getNowLineTop = () => {
    return (now.getHours() * 60 + now.getMinutes()) / 60 * 56;
  };

  const handleCreateEvent = async () => {
    if (!newEventSubject || !newEventDate) return;
    setNewEventSaving(true);
    try {
      const start = new Date(`${newEventDate}T${newEventStartTime}:00`);
      const end = new Date(`${newEventDate}T${newEventEndTime}:00`);

      // Create in personal calendar
      await adminFetch('/calendar/events', {
        method: 'POST',
        body: JSON.stringify({ subject: newEventSubject, start: start.toISOString(), end: end.toISOString() }),
      });

      // Also sync to office@ calendar
      try {
        await adminFetch('/calendar/events/sync-to-office', {
          method: 'POST',
          body: JSON.stringify({ subject: newEventSubject, start: start.toISOString(), end: end.toISOString() }),
        });
      } catch (syncErr) {
        console.error('Office sync failed:', syncErr);
      }

      setShowNewEvent(false);
      setNewEventSubject('');
      setNewEventDate('');
      fetchCalendars();
    } catch (err) {
      console.error('Failed to create event:', err);
    } finally {
      setNewEventSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kalender</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isMobile
              ? currentDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
              : `${weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })} – ${weekEnd.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNewEvent(true)}
            className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Neuer Termin
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Heute
          </button>
          <button onClick={() => navigate(-1)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={fetchCalendars} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="Aktualisieren">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('mine')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'mine' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mein Kalender
          </button>
          <button
            onClick={() => setViewMode('office')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'office' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Office (Alle)
          </button>
        </div>

        {/* Individual member toggles */}
        <div className="flex items-center gap-1.5 ml-2">
          {TEAM_MEMBERS.map((member) => (
            <button
              key={member.email}
              onClick={() => { setViewMode('member'); setSelectedMember(member.email); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                viewMode === 'member' && selectedMember === member.email
                  ? 'bg-white border-gray-300 text-gray-800 shadow-sm'
                  : 'bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${member.color}`} />
              {member.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {loading && Object.keys(calendars).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Lade Kalender...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto overflow-y-hidden">
          {isMobile ? (
            /* Mobile: Day View */
            <>
              <div className="grid grid-cols-[60px_1fr] border-b border-gray-100">
                <div className="p-2" />
                <div className={`p-2 text-center border-l border-gray-100 ${isToday(currentDate) ? 'bg-blue-50' : ''}`}>
                  <p className="text-[10px] font-medium text-gray-400 uppercase">
                    {currentDate.toLocaleDateString('de-DE', { weekday: 'short' })}
                  </p>
                  <p className={`text-sm font-bold ${isToday(currentDate) ? 'text-blue-600' : 'text-gray-900'}`}>
                    {currentDate.getDate()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-[60px_1fr] max-h-[500px] md:max-h-[700px] overflow-y-auto relative">
                {hours.map((hour) => {
                  const events = hour === hours[0] ? getEventsForDay(currentDate) : [];
                  return (
                    <div key={hour} className="contents">
                      <div className="h-14 flex items-start justify-end pr-2 pt-0.5 text-[10px] text-gray-400 font-medium border-t border-gray-50">
                        {`${hour.toString().padStart(2, '0')}:00`}
                      </div>
                      <div className={`h-14 border-l border-t border-gray-50 relative ${isToday(currentDate) ? 'bg-blue-50/30' : ''}`}>
                        {hour === hours[0] && isToday(currentDate) && (
                          <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${getNowLineTop()}px` }}>
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
                              <div className="flex-1 h-[2px] bg-red-500" />
                            </div>
                          </div>
                        )}
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
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Tablet/Desktop: Week Grid */
            <>
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
              <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[500px] md:max-h-[700px] overflow-y-auto relative" ref={(el) => {
            // Auto-scroll to ~07:00 on mount
            if (el && !el.dataset.scrolled) {
              el.scrollTop = 7 * 56;
              el.dataset.scrolled = 'true';
            }
          }}>
            {hours.map((hour) => (
              <div key={hour} className="contents">
                <div className="h-14 flex items-start justify-end pr-2 pt-0.5 text-[10px] text-gray-400 font-medium border-t border-gray-50">
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
                {days.map((day, dayIdx) => {
                  const events = hour === hours[0] ? getEventsForDay(day) : [];
                  return (
                    <div key={dayIdx} className={`h-14 border-l border-t border-gray-50 relative ${isToday(day) ? 'bg-blue-50/30' : ''}`}>
                      {/* Now line */}
                      {hour === hours[0] && isToday(day) && (
                        <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${getNowLineTop()}px` }}>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
                            <div className="flex-1 h-[2px] bg-red-500" />
                          </div>
                        </div>
                      )}
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
            </>
          )}
        </div>
      )}

      {/* New Event Modal */}
      {showNewEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Neuer Termin</h3>
              <button onClick={() => setShowNewEvent(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Betreff</label>
                <input type="text" value={newEventSubject} onChange={(e) => setNewEventSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="z.B. Besichtigung Sterngasse 3" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Datum</label>
                <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Von</label>
                  <input type="time" value={newEventStartTime} onChange={(e) => setNewEventStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bis</label>
                  <input type="time" value={newEventEndTime} onChange={(e) => setNewEventEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Wird automatisch in deinem und im Office-Kalender eingetragen
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowNewEvent(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">Abbrechen</button>
              <button onClick={handleCreateEvent} disabled={newEventSaving || !newEventSubject || !newEventDate}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
                {newEventSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
