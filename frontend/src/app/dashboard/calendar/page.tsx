'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Users, Clock, MapPin, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { getAuthHeaders, getApiUrl } from '@/lib/api';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
  description?: string;
}

type ViewType = 'day' | 'week' | 'month';

export default function CalendarPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [view, setView] = useState<ViewType>('week');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    description: ''
  });
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editEvent, setEditEvent] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    description: ''
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const apiUrl = getApiUrl();
        const headers = await getAuthHeaders();
        const response = await fetch(`${apiUrl}/calendar/status`, { headers });
        
        if (response.ok) {
          const data = await response.json();
          const googleConnected = data.google?.connected;
          const outlookConnected = data.outlook?.connected;
          
          setIsConnected(googleConnected || outlookConnected);
          
          if (googleConnected) {
            setConnectedEmail(data.google.email);
          } else if (outlookConnected) {
            setConnectedEmail(data.outlook.email);
          }
          
          // Load events if connected
          if (googleConnected || outlookConnected) {
            loadEvents();
          }
        }
      } catch (error) {
        console.error('Error checking calendar connection:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkConnection();
  }, []);

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      
      let startDate: Date;
      let endDate: Date;
      
      if (view === 'day') {
        startDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (view === 'week') {
        startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Monday
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
      } else {
        // Month view
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
      }
      
      const response = await fetch(
        `${apiUrl}/calendar/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        { headers }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.needsReconnect) {
          console.warn('Calendar needs reconnection:', data.needsReconnect);
          setNeedsReconnect(true);
          setEvents([]);
          return;
        }
        
        setNeedsReconnect(false);
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Reload events when date or view changes
  useEffect(() => {
    if (isConnected) {
      loadEvents();
    }
  }, [currentDate, view, isConnected]);

  // Scroll to 9:00 when calendar loads or view changes
  useEffect(() => {
    if (scrollContainerRef.current && (view === 'day' || view === 'week') && !loading) {
      // 9 hours * 64px per hour = 576px
      const scrollTo = 9 * 64;
      scrollContainerRef.current.scrollTop = scrollTo;
    }
  }, [view, loading, isConnected]);

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: (Date | null)[] = [];
    
    // Add empty slots for days before the first day of month
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart.toDateString() === date.toDateString();
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const getHeaderTitle = () => {
    if (view === 'day') {
      return currentDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } else if (view === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.getDate()}. - ${endOfWeek.getDate()}. ${startOfWeek.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`;
      } else {
        return `${startOfWeek.getDate()}. ${startOfWeek.toLocaleDateString('de-DE', { month: 'short' })} - ${endOfWeek.getDate()}. ${endOfWeek.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}`;
      }
    } else {
      return currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    
    setCreatingEvent(true);
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      
      const startDateTime = new Date(`${newEvent.date}T${newEvent.startTime}:00`);
      const endDateTime = new Date(`${newEvent.date}T${newEvent.endTime}:00`);
      
      const response = await fetch(`${apiUrl}/calendar/events`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newEvent.title,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          location: newEvent.location || undefined,
          description: newEvent.description || undefined
        })
      });
      
      if (response.ok) {
        setShowNewEventModal(false);
        setNewEvent({
          title: '',
          date: '',
          startTime: '09:00',
          endTime: '10:00',
          location: '',
          description: ''
        });
        loadEvents();
      }
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setCreatingEvent(false);
    }
  };

  const startEditEvent = () => {
    if (!selectedEvent) return;
    
    const startDate = new Date(selectedEvent.start);
    const endDate = new Date(selectedEvent.end);
    
    setEditEvent({
      title: selectedEvent.title,
      date: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: endDate.toTimeString().slice(0, 5),
      location: selectedEvent.location || '',
      description: selectedEvent.description || ''
    });
    setIsEditing(true);
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent || !editEvent.title || !editEvent.date) return;
    
    setSavingEvent(true);
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      
      const startDateTime = new Date(`${editEvent.date}T${editEvent.startTime}:00`);
      const endDateTime = new Date(`${editEvent.date}T${editEvent.endTime}:00`);
      
      const response = await fetch(`${apiUrl}/calendar/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editEvent.title,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          location: editEvent.location || undefined,
          description: editEvent.description || undefined
        })
      });
      
      if (response.ok) {
        setSelectedEvent(null);
        setIsEditing(false);
        loadEvents();
      }
    } catch (error) {
      console.error('Error updating event:', error);
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    if (!confirm('Möchtest du diesen Termin wirklich löschen?')) return;
    
    setDeletingEvent(true);
    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${apiUrl}/calendar/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers
      });
      
      if (response.ok) {
        setSelectedEvent(null);
        setIsEditing(false);
        loadEvents();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    } finally {
      setDeletingEvent(false);
    }
  };

  // Time slots for day/week view (0:00 - 24:00)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    return `${i.toString().padStart(2, '0')}:00`;
  });

  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const today = new Date();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col">
        <div className="pt-2" />
        
        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
              <CalendarIcon className="w-10 h-10 text-indigo-600" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Kein Kalender verbunden</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Verbinden Sie Ihren Google oder Outlook Kalender, um Termine zu verwalten und Jarvis die automatische Buchung zu ermöglichen.
              </p>
            </div>
            
            <div className="space-y-3 pt-4">
              <div className="flex items-start gap-3 text-left">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-3 h-3 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Automatische Terminbuchung</div>
                  <div className="text-xs text-gray-500">Jarvis bucht Besichtigungen direkt in deinen Kalender</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-left">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="w-3 h-3 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Team-Synchronisation</div>
                  <div className="text-xs text-gray-500">Alle Termine werden mit deinem Team geteilt</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-left">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-3 h-3 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Standort-Integration</div>
                  <div className="text-xs text-gray-500">Adressen werden automatisch hinzugefügt</div>
                </div>
              </div>
            </div>
            
            <div className="pt-6">
              <Link 
                href="/dashboard/settings/integrations"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors w-full"
              >
                Kalender verbinden
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Reconnect Warning */}
      {needsReconnect && (
        <div className="bg-amber-50 border-b border-amber-200 px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">Kalender-Verbindung abgelaufen</p>
                <p className="text-xs text-amber-600">Bitte verbinde deinen Kalender erneut, um Termine zu sehen.</p>
              </div>
            </div>
            <Link 
              href="/dashboard/settings/integrations"
              className="px-4 py-2 text-sm font-medium rounded-lg text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors"
            >
              Neu verbinden
            </Link>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="px-8 py-3 border-b border-gray-100 flex justify-between items-center">
        <div>
          {connectedEmail && !needsReconnect && (
            <p className="text-sm text-gray-500">Verbunden mit {connectedEmail}</p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setNewEvent(prev => ({
                ...prev,
                date: currentDate.toISOString().split('T')[0]
              }));
              setShowNewEventModal(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Neuer Termin
          </button>
        </div>
      </div>
      
      {/* Calendar Navigation */}
      <div className="px-8 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="px-4 text-base font-semibold text-gray-900 min-w-[280px] text-center">
            {getHeaderTitle()}
          </span>
          <button 
            onClick={() => navigate(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="ml-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Heute
          </button>
        </div>
        
        {/* View Switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button 
            onClick={() => setView('day')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'day' ? 'text-gray-900 bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Tag
          </button>
          <button 
            onClick={() => setView('week')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'week' ? 'text-gray-900 bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Woche
          </button>
          <button 
            onClick={() => setView('month')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'month' ? 'text-gray-900 bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Monat
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        {/* Day View */}
        {view === 'day' && (
          <div className="min-h-full p-6">
            <div className="grid grid-cols-[80px_1fr] gap-4">
              {/* Time Column */}
              <div className="space-y-0">
                {timeSlots.map((time) => (
                  <div key={time} className="h-16 text-xs text-gray-400 text-right pr-4 relative">
                    <span className="absolute -top-2 right-4">{time}</span>
                  </div>
                ))}
              </div>

              {/* Day Column */}
              <div className="relative border-l border-gray-100">
                {/* Hour Grid Lines */}
                {timeSlots.map((_, i) => (
                  <div key={i} className="h-16 border-b border-gray-50"></div>
                ))}

                {/* Events */}
                {getEventsForDay(currentDate).map((event) => {
                  const startTime = new Date(event.start);
                  const endTime = new Date(event.end);
                  const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                  const endHour = endTime.getHours() + endTime.getMinutes() / 60;
                  const duration = endHour - startHour;
                  
                  const top = startHour * 64;
                  const height = Math.max(duration * 64, 40);
                  
                  return (
                    <div 
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="absolute left-2 right-2 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all"
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="pl-3">
                        <div className="text-sm font-semibold text-indigo-900">{event.title}</div>
                        <div className="text-xs text-indigo-600 mt-1">
                          {formatTime(event.start)} - {formatTime(event.end)}
                        </div>
                        {event.location && (
                          <div className="text-xs text-indigo-500 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Week View */}
        {view === 'week' && (
          <div className="min-h-full p-6">
            <div className="grid grid-cols-8 gap-0">
              {/* Time Column */}
              <div className="col-span-1 pt-14">
                {timeSlots.map((time) => (
                  <div key={time} className="h-16 text-xs text-gray-400 text-right pr-4 relative">
                    <span className="absolute -top-2 right-4">{time}</span>
                  </div>
                ))}
              </div>

              {/* Days Columns */}
              {getWeekDays().map((day, i) => {
                const dayEvents = getEventsForDay(day);
                const isToday = day.toDateString() === today.toDateString();
                
                return (
                  <div key={i} className="col-span-1 relative border-l border-gray-100">
                    {/* Day Header */}
                    <div className="text-center py-2 border-b border-gray-100 sticky top-0 bg-white z-10 h-14">
                      <div className="text-xs font-medium text-gray-500">{dayNames[i]}</div>
                      <div className={`text-lg font-semibold mt-1 ${isToday ? 'text-white bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto' : 'text-gray-900'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                    
                    {/* Hour Grid Lines */}
                    {timeSlots.map((_, j) => (
                      <div key={j} className="h-16 border-b border-gray-50"></div>
                    ))}

                    {/* Events */}
                    {dayEvents.map((event) => {
                      const startTime = new Date(event.start);
                      const endTime = new Date(event.end);
                      const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                      const endHour = endTime.getHours() + endTime.getMinutes() / 60;
                      const duration = endHour - startHour;
                      
                      const top = startHour * 64 + 56; // +56 for header
                      const height = Math.max(duration * 64, 40);
                      
                      return (
                        <div 
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="absolute left-1 right-1 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-2 cursor-pointer hover:shadow-md transition-all overflow-hidden"
                          style={{ top: `${top}px`, height: `${height}px` }}
                          title={event.title}
                        >
                          <div className="pl-2 h-full overflow-hidden">
                            <div className="text-xs font-semibold text-indigo-900 truncate">{event.title}</div>
                            <div className="text-[10px] text-indigo-600 mt-0.5">
                              {formatTime(event.start)}
                            </div>
                            {event.location && height > 60 && (
                              <div className="text-[10px] text-indigo-500 mt-1 flex items-center gap-1 truncate">
                                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Month View */}
        {view === 'month' && (
          <div className="p-6">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map((name) => (
                <div key={name} className="text-center text-xs font-medium text-gray-500 py-2">
                  {name}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {getMonthDays().map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="min-h-[120px]"></div>;
                }
                
                const dayEvents = getEventsForDay(day);
                const isToday = day.toDateString() === today.toDateString();
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`min-h-[120px] border border-gray-100 rounded-lg p-2 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <div className={`text-sm font-medium mb-2 ${isToday ? 'text-white bg-indigo-600 rounded-full w-7 h-7 flex items-center justify-center' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div 
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded truncate cursor-pointer hover:bg-indigo-100"
                          title={event.title}
                        >
                          {formatTime(event.start)} {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 px-2">
                          +{dayEvents.length - 3} weitere
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* New Event Modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Neuer Termin</h2>
              <button 
                onClick={() => setShowNewEventModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="z.B. Besichtigung Musterstraße 1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Von</label>
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bis</label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="z.B. Musterstraße 1, 1010 Wien"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Optionale Notizen..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowNewEventModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={!newEvent.title || !newEvent.date || creatingEvent}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creatingEvent && <Loader2 className="w-4 h-4 animate-spin" />}
                Termin erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail/Edit Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setSelectedEvent(null); setIsEditing(false); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Termin bearbeiten' : 'Termindetails'}
              </h2>
              <button 
                onClick={() => { setSelectedEvent(null); setIsEditing(false); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {isEditing ? (
              /* Edit Mode */
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                  <input
                    type="text"
                    value={editEvent.title}
                    onChange={(e) => setEditEvent(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                  <input
                    type="date"
                    value={editEvent.date}
                    onChange={(e) => setEditEvent(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Von</label>
                    <input
                      type="time"
                      value={editEvent.startTime}
                      onChange={(e) => setEditEvent(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bis</label>
                    <input
                      type="time"
                      value={editEvent.endTime}
                      onChange={(e) => setEditEvent(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                  <input
                    type="text"
                    value={editEvent.location}
                    onChange={(e) => setEditEvent(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <textarea
                    value={editEvent.description}
                    onChange={(e) => setEditEvent(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CalendarIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{selectedEvent.title}</h3>
                    </div>
                  </div>
                </div>
                
                {/* Date & Time */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(selectedEvent.start).toLocaleDateString('de-DE', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {formatTime(selectedEvent.start)} - {formatTime(selectedEvent.end)} Uhr
                    </div>
                  </div>
                </div>
                
                {/* Location */}
                {selectedEvent.location && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Ort</div>
                      <div className="text-sm text-gray-500 mt-0.5">{selectedEvent.location}</div>
                    </div>
                  </div>
                )}
                
                {/* Attendees */}
                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Teilnehmer</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {selectedEvent.attendees.join(', ')}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Description */}
                {selectedEvent.description && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="text-sm font-medium text-gray-900 mb-2">Beschreibung</div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">{selectedEvent.description}</div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleUpdateEvent}
                    disabled={!editEvent.title || !editEvent.date || savingEvent}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {savingEvent && <Loader2 className="w-4 h-4 animate-spin" />}
                    Speichern
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleDeleteEvent}
                    disabled={deletingEvent}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deletingEvent && <Loader2 className="w-4 h-4 animate-spin" />}
                    Löschen
                  </button>
                  <button
                    onClick={startEditEvent}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Bearbeiten
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
