'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, Video, X } from 'lucide-react';

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  member: string;
  color: string;
  type: 'meeting' | 'call' | 'focus' | 'personal';
  location?: string;
}

const TEAM = [
  { name: 'Dennis Kral', initials: 'DK', color: 'bg-gray-900', role: 'Super Admin' },
  { name: 'Max Huber', initials: 'MH', color: 'bg-gray-700', role: 'Developer' },
  { name: 'Tom Fischer', initials: 'TF', color: 'bg-gray-600', role: 'Developer' },
  { name: 'Sarah Weber', initials: 'SW', color: 'bg-gray-600', role: 'Support' },
  { name: 'Lisa Müller', initials: 'LM', color: 'bg-gray-500', role: 'Sales' },
];

const MOCK_EVENTS: CalEvent[] = [
  { id: '1', title: 'Daily Standup', start: '09:00', end: '09:15', member: 'Alle', color: 'bg-gray-100 text-gray-800 border-gray-200', type: 'meeting' },
  { id: '2', title: 'Sprint Planning', start: '10:00', end: '11:00', member: 'Dennis Kral', color: 'bg-red-100 text-red-700 border-red-200', type: 'meeting' },
  { id: '3', title: 'Code Review: Email Parser', start: '11:00', end: '12:00', member: 'Max Huber', color: 'bg-gray-100 text-gray-800 border-gray-200', type: 'focus' },
  { id: '4', title: 'Kundenanruf: Kellner Immo', start: '14:00', end: '14:30', member: 'Sarah Weber', color: 'bg-gray-100 text-gray-800 border-gray-200', type: 'call' },
  { id: '5', title: 'Demo Call: Remax Wien', start: '15:00', end: '15:45', member: 'Lisa Müller', color: 'bg-gray-100 text-gray-800 border-gray-200', type: 'call' },
  { id: '6', title: 'Deploy Review', start: '16:00', end: '16:30', member: 'Tom Fischer', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', type: 'meeting' },
  { id: '7', title: '1:1 mit Dennis', start: '13:00', end: '13:30', member: 'Max Huber', color: 'bg-gray-100 text-gray-800 border-gray-200', type: 'meeting' },
  { id: '8', title: 'Finance Review Q1', start: '11:00', end: '12:00', member: 'Dennis Kral', color: 'bg-red-100 text-red-700 border-red-200', type: 'meeting' },
];

const HOURS = Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

export default function AdminCalendar() {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [currentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  const filteredEvents = selectedMember
    ? MOCK_EVENTS.filter(e => e.member === selectedMember || e.member === 'Alle')
    : MOCK_EVENTS;

  const dayName = currentDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex h-[calc(100vh-48px)]">
      {/* Team Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Team Kalender</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Alle Mitarbeiter</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2">
          <button
            onClick={() => setSelectedMember(null)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors mb-1 ${
              !selectedMember ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="w-7 h-7 bg-gray-800 rounded-full flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium">Alle anzeigen</p>
              <p className="text-[10px] text-gray-400">{MOCK_EVENTS.length} Termine heute</p>
            </div>
          </button>

          <div className="border-t border-gray-100 mt-2 pt-2 space-y-0.5">
            {TEAM.map((member) => {
              const memberEvents = MOCK_EVENTS.filter(e => e.member === member.name || e.member === 'Alle');
              return (
                <button
                  key={member.name}
                  onClick={() => setSelectedMember(member.name)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedMember === member.name ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-7 h-7 ${member.color} rounded-full flex items-center justify-center text-white text-[10px] font-bold`}>
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{member.name}</p>
                    <p className="text-[10px] text-gray-400">{memberEvents.length} Termine · {member.role}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-gray-100 rounded-md"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
              <button className="p-1 hover:bg-gray-100 rounded-md"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {selectedMember ? `${selectedMember}` : 'Alle Mitarbeiter'}
              </h3>
              <p className="text-[10px] text-gray-400">{dayName}</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Neuer Termin
          </button>
        </div>

        {/* Time Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full p-4">
            <div className="grid grid-cols-[60px_1fr] gap-2">
              {HOURS.map((time) => {
                const hour = parseInt(time);
                const hourEvents = filteredEvents.filter(e => parseInt(e.start) === hour);
                
                return (
                  <div key={time} className="contents">
                    <div className="h-16 text-[10px] text-gray-400 text-right pr-3 pt-0.5">{time}</div>
                    <div className="h-16 border-t border-gray-50 relative">
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`absolute inset-x-0 top-0 mx-1 p-2 rounded-md border text-left cursor-pointer hover:shadow-sm transition-shadow ${event.color}`}
                          style={{ 
                            height: `${(parseInt(event.end) - parseInt(event.start)) * 64 + (parseInt(event.end.split(':')[1] || '0') - parseInt(event.start.split(':')[1] || '0')) * 64 / 60}px`,
                            minHeight: '28px'
                          }}
                        >
                          <p className="text-[11px] font-medium truncate">{event.title}</p>
                          <p className="text-[10px] opacity-70">{event.start} - {event.end} · {event.member}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Event Detail Sidebar */}
      {selectedEvent && (
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Termindetails</h3>
            <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-gray-100 rounded-md">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-base font-semibold text-gray-900">{selectedEvent.title}</h4>
              <span className={`inline-flex items-center mt-2 px-2 py-0.5 text-[10px] font-medium rounded ${selectedEvent.color}`}>
                {selectedEvent.type === 'meeting' ? 'Meeting' : selectedEvent.type === 'call' ? 'Anruf' : selectedEvent.type === 'focus' ? 'Fokuszeit' : 'Persönlich'}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-600">{selectedEvent.start} - {selectedEvent.end}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-600">{selectedEvent.member}</span>
              </div>
              {selectedEvent.type === 'call' && (
                <div className="flex items-center gap-2.5">
                  <Video className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-blue-600 cursor-pointer hover:underline">Video-Call beitreten</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
