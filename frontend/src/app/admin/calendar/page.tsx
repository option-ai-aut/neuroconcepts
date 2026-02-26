'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Clock, User, Plus, X, Loader2, Video } from 'lucide-react';
import { getRuntimeConfig } from '@/components/EnvProvider';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getAdminDemoBookings, DemoBooking } from '@/lib/adminApi';

// Fixed colors per well-known mailbox; others get cycled from the palette
const KNOWN_COLORS: Record<string, string> = {
  'office@immivo.ai':       'bg-amber-500',
  'dennis.kral@immivo.ai':  'bg-blue-500',
  'josef.leutgeb@immivo.ai':'bg-emerald-500',
};
const COLOR_PALETTE = ['bg-violet-500','bg-rose-500','bg-cyan-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500'];

// Ordered list of "priority" emails that always appear before others
const PRIORITY_ORDER = ['office@immivo.ai','dennis.kral@immivo.ai','josef.leutgeb@immivo.ai'];

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

interface StaffTag {
  email: string;
  name: string;
  color: string; // bg-* class
  isOwn: boolean;
}

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendars, setCalendars] = useState<Record<string, CalEvent[]>>({});
  const [demoBookings, setDemoBookings] = useState<DemoBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Multi-select tag state
  const [myEmail, setMyEmail] = useState<string>('');
  const [staffTags, setStaffTags] = useState<StaffTag[]>([]);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  // New event modal
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventSubject, setNewEventSubject] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('09:00');
  const [newEventEndTime, setNewEventEndTime] = useState('10:00');
  const [newEventEndManual, setNewEventEndManual] = useState(false);
  const [newEventSaving, setNewEventSaving] = useState(false);
  const [newEventAddCall, setNewEventAddCall] = useState(false);
  const [attendeeTags, setAttendeeTags] = useState<string[]>([]);
  const [attendeeInput, setAttendeeInput] = useState('');

  // Time validation
  const timeToMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const addOneHour = (t: string) => { const mins = timeToMinutes(t) + 60; const h = Math.floor(mins / 60) % 24; const m = mins % 60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; };
  const isTimeInvalid = timeToMinutes(newEventEndTime) <= timeToMinutes(newEventStartTime);

  const handleStartTimeChange = (val: string) => {
    setNewEventStartTime(val);
    if (!newEventEndManual) setNewEventEndTime(addOneHour(val));
  };

  // Tag input helpers
  const addAttendeeTag = (raw: string) => {
    const email = raw.trim().toLowerCase();
    if (email && email.includes('@') && !attendeeTags.includes(email)) {
      setAttendeeTags(prev => [...prev, email]);
    }
    setAttendeeInput('');
  };

  const handleAttendeeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      addAttendeeTag(attendeeInput);
    } else if (e.key === 'Backspace' && attendeeInput === '' && attendeeTags.length > 0) {
      setAttendeeTags(prev => prev.slice(0, -1));
    }
  };

  const closeModal = () => {
    setShowNewEvent(false);
    setNewEventSubject('');
    setNewEventDate('');
    setNewEventStartTime('09:00');
    setNewEventEndTime('10:00');
    setNewEventEndManual(false);
    setNewEventAddCall(false);
    setAttendeeTags([]);
    setAttendeeInput('');
  };

  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Load staff tags + set own email + pre-select own tag
  useEffect(() => {
    const load = async () => {
      try {
        const session = await fetchAuthSession();
        const email = (session.tokens?.idToken?.payload?.email as string || '').toLowerCase();
        setMyEmail(email);

        const members: { email: string; firstName?: string; lastName?: string; createdAt?: string }[] =
          await adminFetch('/admin/team/members');

        // Build color map: palette index for non-known emails
        let paletteIdx = 0;
        const colorOf = (e: string) => KNOWN_COLORS[e.toLowerCase()] || COLOR_PALETTE[paletteIdx++ % COLOR_PALETTE.length];

        // Ordered: own first, then priority list (office, dennis, josef), then others by createdAt
        const own = members.find(m => m.email.toLowerCase() === email);
        const priority = PRIORITY_ORDER.filter(p => p !== email && members.some(m => m.email.toLowerCase() === p));
        const others = members
          .filter(m => m.email.toLowerCase() !== email && !PRIORITY_ORDER.includes(m.email.toLowerCase()))
          .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

        const orderedEmails = [
          ...(own ? [own.email.toLowerCase()] : [email]),
          ...priority,
          ...others.map(m => m.email.toLowerCase()),
        ];

        // Add office@ if not already a staff member
        const officeEmail = 'office@immivo.ai';
        if (!orderedEmails.includes(officeEmail)) {
          orderedEmails.splice(1, 0, officeEmail); // right after own
        }

        const nameOf = (e: string) => {
          const m = members.find(x => x.email.toLowerCase() === e);
          if (m?.firstName || m?.lastName) return `${m.firstName || ''} ${m.lastName || ''}`.trim();
          if (e === officeEmail) return 'Office';
          return e.split('@')[0];
        };

        const tags: StaffTag[] = orderedEmails.map(e => ({
          email: e,
          name: e === email ? `${nameOf(e)} (Ich)` : nameOf(e),
          color: colorOf(e),
          isOwn: e === email,
        }));

        setStaffTags(tags);
        // Pre-select own calendar only
        setActiveTags(new Set([email]));
      } catch (err) {
        console.error('Failed to load staff tags:', err);
      }
    };
    load();
  }, []);

  const fetchCalendars = useCallback(async () => {
    setLoading(true);
    try {
      // Always fetch all staff + office calendars at once
      const allEmails = [...new Set([...staffTags.map(t => t.email), 'office@immivo.ai'])];
      const emails = allEmails.join(',');

      const [calData, demoData] = await Promise.allSettled([
        adminFetch(`/admin/platform/calendars?emails=${emails}&start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`),
        getAdminDemoBookings(),
      ]);

      if (calData.status === 'fulfilled') setCalendars((calData.value as any).calendars || {});
      if (demoData.status === 'fulfilled') setDemoBookings((demoData.value as any).bookings || []);
    } catch (err) {
      console.error('Failed to load calendars:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, staffTags]);

  useEffect(() => {
    if (staffTags.length > 0) fetchCalendars();
  }, [fetchCalendars]);

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

  // Convert demo bookings to CalEvent format
  const demoCalEvents: CalEvent[] = demoBookings
    .filter(d => d.status !== 'CANCELLED')
    .map(d => ({
      id: `demo-${d.id}`,
      subject: `📞 Demo: ${d.name}${d.company ? ` (${d.company})` : ''}`,
      start: d.start,
      end: d.end,
      location: 'Google Meet',
      organizer: d.email,
    }));

  // Toggle a tag on/off; own tag cannot be fully deselected if it's the only one active
  const toggleTag = (email: string) => {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(email)) {
        if (next.size === 1) return prev; // keep at least one active
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  // Determine which events to show based on active tags
  const getVisibleEvents = (): Record<string, CalEvent[]> => {
    const result: Record<string, CalEvent[]> = {};
    for (const email of activeTags) {
      result[email] = calendars[email] || [];
    }
    result['demo-bookings'] = demoCalEvents;
    return result;
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
    if (email === 'demo-bookings') return 'bg-purple-600';
    const tag = staffTags.find(t => t.email === email);
    if (tag) return tag.color;
    return KNOWN_COLORS[email.toLowerCase()] || 'bg-gray-400';
  };

  const isDemoEvent = (id: string) => id.startsWith('demo-');

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
    if (!newEventSubject || !newEventDate || isTimeInvalid) return;
    setNewEventSaving(true);
    try {
      const start = new Date(`${newEventDate}T${newEventStartTime}:00`);
      const end = new Date(`${newEventDate}T${newEventEndTime}:00`);

      // Flush any uncommitted attendee input
      const pendingEmail = attendeeInput.trim().toLowerCase();
      const attendeeList = [...attendeeTags, ...(pendingEmail.includes('@') ? [pendingEmail] : [])];

      // Optionally create a LiveKit video call room
      let meetLink: string | undefined;
      if (newEventAddCall) {
        try {
          const roomData = await adminFetch('/meet/rooms', { method: 'POST' });
          meetLink = roomData.url;
        } catch (roomErr) {
          console.error('Failed to create meet room:', roomErr);
        }
      }

      const eventBody = {
        subject: newEventSubject,
        start: start.toISOString(),
        end: end.toISOString(),
        ...(meetLink && { meetLink, location: meetLink }),
        ...(attendeeList.length > 0 && { attendees: attendeeList }),
      };

      // Create in personal calendar
      await adminFetch('/admin/calendar/events', {
        method: 'POST',
        body: JSON.stringify(eventBody),
      });

      // Also sync to office@ calendar
      try {
        await adminFetch('/admin/calendar/events/sync-to-office', {
          method: 'POST',
          body: JSON.stringify(eventBody),
        });
      } catch (syncErr) {
        console.error('Office sync failed:', syncErr);
      }

      // Send email invitations to external attendees
      if (attendeeList.length > 0) {
        try {
          await adminFetch('/admin/calendar/events/send-invites', {
            method: 'POST',
            body: JSON.stringify({ subject: newEventSubject, start: start.toISOString(), end: end.toISOString(), attendees: attendeeList, meetLink }),
          });
        } catch (inviteErr) {
          console.error('Invite emails failed:', inviteErr);
        }
      }

      closeModal();
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
          <button onClick={() => {
            setShowNewEvent(true);
            const today = new Date();
            setNewEventDate(today.toISOString().split('T')[0]);
            const h = String(today.getHours()).padStart(2,'0');
            const m = today.getMinutes() < 30 ? '00' : '30';
            const startT = `${h}:${m}`;
            setNewEventStartTime(startT);
            setNewEventEndTime(addOneHour(startT));
            setNewEventEndManual(false);
          }}
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

      {/* Calendar Tag Filter */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {staffTags.map((tag) => {
          const active = activeTags.has(tag.email);
          return (
            <button
              key={tag.email}
              onClick={() => toggleTag(tag.email)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                active
                  ? 'bg-white border-gray-300 text-gray-800 shadow-sm ring-1 ring-gray-200'
                  : 'bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-600 hover:border-gray-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${active ? tag.color : 'bg-gray-300'}`} />
              {tag.name}
            </button>
          );
        })}
        {demoBookings.filter(d => d.status !== 'CANCELLED').length > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-purple-50 border-purple-200 text-purple-700">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <Video className="w-3 h-3" />
            Demo Calls ({demoBookings.filter(d => d.status !== 'CANCELLED').length})
          </span>
        )}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-semibold text-gray-900">Neuer Termin</h3>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Betreff</label>
                <input type="text" value={newEventSubject} onChange={(e) => setNewEventSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="z.B. Besichtigung Sterngasse 3" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Datum</label>
                <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Von</label>
                  <input type="time" value={newEventStartTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bis</label>
                  <input type="time" value={newEventEndTime}
                    onChange={(e) => { setNewEventEndTime(e.target.value); setNewEventEndManual(true); }}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                      isTimeInvalid
                        ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-300'
                        : 'border-gray-200 focus:ring-blue-500'
                    }`} />
                  {isTimeInvalid && (
                    <p className="text-xs text-red-500 mt-1">Endzeit muss nach Startzeit liegen</p>
                  )}
                </div>
              </div>

              {/* Video Call Option */}
              <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700 font-medium">Video-Call hinzufügen</span>
                </div>
                <div
                  role="switch"
                  aria-checked={newEventAddCall}
                  onClick={() => setNewEventAddCall(v => !v)}
                  className={`w-10 h-6 rounded-full transition-colors duration-200 flex items-center cursor-pointer shrink-0 px-0.5 ${newEventAddCall ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${newEventAddCall ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Attendees tag input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Eingeladene (optional)</label>
                <div
                  className="min-h-[40px] w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent flex flex-wrap gap-1.5 cursor-text"
                  onClick={() => (document.getElementById('attendee-input') as HTMLInputElement)?.focus()}
                >
                  {attendeeTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md px-2 py-0.5 text-xs font-medium">
                      {tag}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAttendeeTags(prev => prev.filter(t => t !== tag)); }}
                        className="text-blue-400 hover:text-blue-700 leading-none"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="attendee-input"
                    type="text"
                    value={attendeeInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.endsWith(',')) { addAttendeeTag(val.slice(0, -1)); }
                      else setAttendeeInput(val);
                    }}
                    onKeyDown={handleAttendeeKeyDown}
                    onBlur={() => { if (attendeeInput.trim()) addAttendeeTag(attendeeInput); }}
                    placeholder={attendeeTags.length === 0 ? 'E-Mail eingeben, mit Beistrich bestätigen…' : ''}
                    className="flex-1 min-w-[140px] outline-none text-sm bg-transparent py-0.5"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Eingeladene erhalten eine E-Mail mit Kalender-Einladung (.ics)</p>
              </div>

              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Wird automatisch in deinem und im Office-Kalender eingetragen
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">Abbrechen</button>
              <button onClick={handleCreateEvent} disabled={newEventSaving || !newEventSubject || !newEventDate || isTimeInvalid}
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
