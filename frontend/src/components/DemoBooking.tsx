'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Loader2, CheckCircle2, User, Mail, Building2, Video } from 'lucide-react';
import { getRuntimeConfig } from '@/components/EnvProvider';

interface BusySlot {
  start: string;
  end: string;
}

interface TimeSlot {
  time: string;
  label: string;
  available: boolean;
}

function getApiUrl(): string {
  const config = getRuntimeConfig();
  return (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

export default function DemoBooking() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });

  // Generate next 14 weekdays
  const availableDays = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    let d = new Date(today);
    d.setDate(d.getDate() + 1); // Start from tomorrow
    while (days.length < 14) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) { // Skip weekends
        days.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, []);

  // Group days by week for display
  const [weekOffset, setWeekOffset] = useState(0);
  const visibleDays = availableDays.slice(weekOffset * 5, (weekOffset + 1) * 5);

  // Fetch busy slots when date changes
  useEffect(() => {
    if (!selectedDate) return;
    setSelectedSlot(null);
    const fetchBusy = async () => {
      setLoading(true);
      try {
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
        const res = await fetch(`${getApiUrl()}/calendar/busy?start=${start.toISOString()}&end=${end.toISOString()}`);
        if (res.ok) {
          const data = await res.json();
          setBusySlots(data.slots || []);
        }
      } catch (err) {
        console.error('Failed to fetch busy slots:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBusy();
  }, [selectedDate]);

  // Generate time slots (09:00 - 17:00, 30min intervals)
  const timeSlots: TimeSlot[] = useMemo(() => {
    if (!selectedDate) return [];
    const slots: TimeSlot[] = [];
    for (let h = 9; h < 17; h++) {
      for (const m of [0, 30]) {
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const slotStart = new Date(selectedDate);
        slotStart.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30);

        // Check if slot overlaps any busy period
        const isBusy = busySlots.some(busy => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        // Check if slot is in the past
        const isPast = slotStart < new Date();

        slots.push({
          time: timeStr,
          label: `${timeStr} Uhr`,
          available: !isBusy && !isPast,
        });
      }
    }
    return slots;
  }, [selectedDate, busySlots]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot || !formData.name || !formData.email) return;

    setSubmitting(true);
    try {
      const [hours, minutes] = selectedSlot.split(':').map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30);

      // Use the public booking endpoint (or a dedicated one)
      // For now, we'll submit the booking request
      const res = await fetch(`${getApiUrl()}/calendar/book-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          message: formData.message,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }),
      });

      if (res.ok) {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Booking failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Demo gebucht!</h3>
        <p className="text-gray-600 mb-1">
          {selectedDate?.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
        <p className="text-gray-900 font-semibold mb-4">{selectedSlot} Uhr (30 Min)</p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Video className="w-4 h-4" />
          <span>Google Meet Link folgt per E-Mail</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
        Wähle einen Termin
      </h3>

      {/* Step 1: Date Selection */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-400" />
            Tag wählen
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
              disabled={weekOffset === 0}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekOffset(Math.min(2, weekOffset + 1))}
              disabled={weekOffset >= 2}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {visibleDays.map((day) => {
            const isSelected = selectedDate?.toDateString() === day.toDateString();
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`p-2 sm:p-3 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-gray-900 text-white shadow-lg scale-105'
                    : 'bg-white border border-gray-100 hover:border-gray-300 hover:shadow-sm text-gray-700'
                }`}
              >
                <p className={`text-[11px] sm:text-xs font-medium uppercase ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                  {day.toLocaleDateString('de-DE', { weekday: 'short' })}
                </p>
                <p className={`text-base sm:text-xl font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  {day.getDate()}
                </p>
                <p className={`text-[11px] sm:text-xs ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                  {day.toLocaleDateString('de-DE', { month: 'short' })}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Time Selection */}
      {selectedDate && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-400" />
            Uhrzeit wählen
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Verfügbarkeit wird geprüft...</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {timeSlots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && setSelectedSlot(slot.time)}
                  disabled={!slot.available}
                  className={`px-2 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    selectedSlot === slot.time
                      ? 'bg-gray-900 text-white shadow-md'
                      : slot.available
                      ? 'bg-white border border-gray-100 text-gray-700 hover:border-gray-300 hover:shadow-sm'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Contact Form */}
      {selectedSlot && (
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
            <User className="w-4 h-4 text-gray-400" />
            Deine Daten
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
              />
            </div>
            <div className="relative">
              <input
                type="email"
                placeholder="E-Mail *"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Unternehmen (optional)"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
          />
          <textarea
            placeholder="Nachricht (optional)"
            rows={2}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all resize-none"
          />

          {/* Summary */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Demo Call — 30 Min</p>
                <p className="text-gray-500">
                  {selectedDate?.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })} um {selectedSlot} Uhr
                </p>
                <p className="text-gray-400 text-xs">Google Meet — Link folgt per E-Mail</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!formData.name || !formData.email || submitting}
            className="w-full py-3 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            {submitting ? 'Wird gebucht...' : 'Demo buchen'}
          </button>
        </div>
      )}

      {!selectedDate && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">Wähle zuerst einen Tag aus</p>
        </div>
      )}
    </div>
  );
}
