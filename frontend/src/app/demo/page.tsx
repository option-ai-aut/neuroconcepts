'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Calendar, Clock, User, Mail, Building2, ArrowRight, Sparkles, Zap, Shield } from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';
import { getRuntimeConfig } from '@/components/EnvProvider';

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsInView(true);
    }, { threshold: 0.08 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, isInView };
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon=0
}

const STEPS = [
  {
    icon: Calendar,
    number: '01',
    title: 'Termin wählen',
    desc: 'Wähle einen freien Slot direkt im Kalender — kein Hin-und-Her per E-Mail.',
  },
  {
    icon: User,
    number: '02',
    title: 'Kurze Vorstellung',
    desc: "Teile uns in zwei Sätzen mit, wie dein Büro aktuell arbeitet. Das war's.",
  },
  {
    icon: Sparkles,
    number: '03',
    title: 'Live-Demo erleben',
    desc: '30 Minuten, in denen du siehst, wie Immivo deinen Alltag konkret verändert.',
  },
];

const TRUST_POINTS = [
  { icon: Clock, label: '30 Minuten', sub: 'Kein unnötiger Overhead' },
  { icon: Zap, label: 'Live & Interaktiv', sub: 'Keine Slideshow' },
  { icon: Shield, label: 'Kein Commitment', sub: '100% kostenlos' },
];

export default function DemoPage() {
  const heroRef = useInView();
  const stepsRef = useInView();
  const calendarRef = useInView();
  const trustRef = useInView();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<'calendar' | 'form' | 'success'>('calendar');

  const [form, setForm] = useState({ name: '', email: '', company: '' });
  const [submitting, setSubmitting] = useState(false);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const dow = d.getDay(); // 0=Sun, 6=Sat
    d.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return dow === 0 || dow === 6 || d < t;
  };

  const isSelected = (day: number) =>
    selectedDate?.getFullYear() === viewYear &&
    selectedDate?.getMonth() === viewMonth &&
    selectedDate?.getDate() === day;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const canGoPrev = () => {
    const now = new Date();
    return viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth());
  };

  const handleDayClick = (day: number) => {
    if (isDisabled(day)) return;
    setSelectedDate(new Date(viewYear, viewMonth, day));
    setSelectedTime(null);
  };

  const handleContinue = () => {
    if (selectedDate && selectedTime) setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !form.name || !form.email) return;
    setSubmitting(true);
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30);

      const config = getRuntimeConfig();
      const apiUrl = (config.apiUrl || '').replace(/\/+$/, '');

      const res = await fetch(`${apiUrl}/calendar/book-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.company || undefined,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }),
      });

      if (res.ok) {
        setStep('success');
      } else {
        console.error('Demo booking failed:', res.status);
      }
    } catch (err) {
      console.error('Demo booking error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: Date) =>
    `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="demo" />

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 bg-black overflow-hidden">
        {/* subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #3b82f6 0%, transparent 70%)', filter: 'blur(60px)' }} />

        <div
          ref={heroRef.ref}
          className="relative max-w-4xl mx-auto px-5 sm:px-6 text-center"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium mb-6"
            style={{
              opacity: heroRef.isInView ? 1 : 0,
              transform: heroRef.isInView ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Kostenlose Live-Demo
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6"
            style={{
              opacity: heroRef.isInView ? 1 : 0,
              transform: heroRef.isInView ? 'translateY(0)' : 'translateY(30px)',
              transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
            }}
          >
            Sieh Immivo in Aktion —<br />
            <span className="text-blue-400">live & persönlich.</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
            style={{
              opacity: heroRef.isInView ? 1 : 0,
              transform: heroRef.isInView ? 'translateY(0)' : 'translateY(30px)',
              transition: 'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s',
            }}
          >
            In 30 Minuten zeigen wir dir, wie Makler mit Immivo 80% ihrer Routinearbeit automatisieren — abgestimmt auf dein Büro.
          </p>
          {/* trust row */}
          <div
            ref={trustRef.ref}
            className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-10"
          >
            {TRUST_POINTS.map((tp, i) => (
              <div
                key={tp.label}
                className="flex items-center gap-3"
                style={{
                  opacity: trustRef.isInView ? 1 : 0,
                  transform: trustRef.isInView ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.5s ease ${0.3 + i * 0.1}s, transform 0.5s ease ${0.3 + i * 0.1}s`,
                }}
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center">
                  <tp.icon className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-semibold leading-tight">{tp.label}</p>
                  <p className="text-gray-500 text-xs">{tp.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <div
            ref={stepsRef.ref}
            className="text-center mb-14"
            style={{
              opacity: stepsRef.isInView ? 1 : 0,
              transform: stepsRef.isInView ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">So einfach geht's</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">In 3 Schritten zur Demo</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {STEPS.map((s, i) => (
              <div
                key={s.number}
                className="relative group"
                style={{
                  opacity: stepsRef.isInView ? 1 : 0,
                  transform: stepsRef.isInView ? 'translateY(0)' : 'translateY(32px)',
                  transition: `opacity 0.6s ease ${i * 0.12}s, transform 0.6s ease ${i * 0.12}s`,
                }}
              >
                {/* connector line */}
                {i < 2 && (
                  <div className="hidden sm:block absolute top-10 left-[calc(50%+48px)] right-[-calc(50%-48px)] h-px bg-gray-200 z-0" />
                )}
                <div className="relative z-10 bg-[#f7f7f7] rounded-2xl p-7 h-full" style={{ borderRadius: '20px' }}>
                  <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center mb-5">
                    <s.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-300 tracking-widest">{s.number}</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-1 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Booking Widget ── */}
      <section className="py-20 sm:py-28 bg-[#f7f7f7]">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <div
            ref={calendarRef.ref}
            className="text-center mb-12"
            style={{
              opacity: calendarRef.isInView ? 1 : 0,
              transform: calendarRef.isInView ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Termin buchen</h2>
            <p className="text-gray-500 mt-3">Wähle einen Wunschtermin — wir bestätigen per E-Mail.</p>
          </div>

          <div
            className="bg-white rounded-3xl shadow-sm overflow-hidden"
            style={{
              opacity: calendarRef.isInView ? 1 : 0,
              transform: calendarRef.isInView ? 'translateY(0)' : 'translateY(32px)',
              transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
            }}
          >
            {step === 'success' ? (
              /* ── Success ── */
              <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center mb-6"
                  style={{ animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                  <Check className="w-9 h-9 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Demo bestätigt!</h3>
                <p className="text-gray-500 text-lg max-w-md mb-2">
                  Wir haben eine Bestätigung an <strong className="text-gray-700">{form.email}</strong> gesendet.
                </p>
                {selectedDate && selectedTime && (
                  <div className="mt-4 px-5 py-3 rounded-xl bg-[#f7f7f7] text-gray-700 font-medium text-sm">
                    {formatDate(selectedDate)} · {selectedTime} Uhr
                  </div>
                )}
                <p className="text-gray-400 text-sm mt-6">Wir freuen uns auf das Gespräch — bis bald!</p>
                <style>{`@keyframes scaleIn { from { transform: scale(0); opacity:0; } to { transform: scale(1); opacity:1; } }`}</style>
              </div>
            ) : step === 'form' ? (
              /* ── Contact Form ── */
              <div className="grid lg:grid-cols-[1fr_1.4fr]">
                {/* summary */}
                <div className="bg-black text-white p-8 sm:p-10 flex flex-col justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-6">Deine Buchung</p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <span className="text-white font-medium">{selectedDate ? formatDate(selectedDate) : ''}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <span className="text-white font-medium">{selectedTime} Uhr</span>
                      </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-white/10">
                      <p className="text-gray-400 text-sm leading-relaxed">30 Minuten · Videokonferenz · Kostenlos</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep('calendar')}
                    className="text-gray-500 text-sm hover:text-gray-300 transition-colors flex items-center gap-1 mt-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Termin ändern
                  </button>
                </div>
                {/* form */}
                <form onSubmit={handleSubmit} className="p-8 sm:p-10">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Deine Kontaktdaten</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          required
                          type="text"
                          placeholder="Vor- und Nachname"
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors bg-[#f9f9f9] focus:bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail *</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          required
                          type="email"
                          placeholder="name@maklerbüro.at"
                          value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors bg-[#f9f9f9] focus:bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Unternehmen</label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Name deines Maklerbüros"
                          value={form.company}
                          onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors bg-[#f9f9f9] focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !form.name || !form.email}
                    className="mt-7 w-full py-3.5 rounded-xl bg-gray-900 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Wird gebucht…
                      </span>
                    ) : (
                      <>Demo bestätigen <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Deine Daten werden ausschließlich für die Demo-Buchung verwendet.
                  </p>
                </form>
              </div>
            ) : (
              /* ── Calendar + Time ── */
              <div className="grid lg:grid-cols-[1fr_auto]">
                {/* Calendar */}
                <div className="p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">
                      {MONTHS[viewMonth]} {viewYear}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={prevMonth}
                        disabled={!canGoPrev()}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={nextMonth}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 mb-2">
                    {WEEKDAYS.map(d => (
                      <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-y-1">
                    {Array.from({ length: firstDay }, (_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const disabled = isDisabled(day);
                      const selected = isSelected(day);
                      return (
                        <button
                          key={day}
                          onClick={() => handleDayClick(day)}
                          disabled={disabled}
                          className={`
                            h-9 w-full rounded-lg text-sm font-medium transition-all
                            ${disabled ? 'text-gray-300 cursor-not-allowed' : ''}
                            ${selected ? 'bg-gray-900 text-white' : ''}
                            ${!disabled && !selected ? 'text-gray-700 hover:bg-gray-100' : ''}
                          `}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                <div className="p-6 sm:p-8 min-w-[200px]">
                  {selectedDate ? (
                    <>
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        {selectedDate.getDate()}. {MONTHS[selectedDate.getMonth()]}
                      </p>
                      <p className="text-xs text-gray-400 mb-5">Verfügbare Zeiten</p>
                      <div className="space-y-2">
                        {TIME_SLOTS.map(time => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`
                              w-full py-2.5 px-4 rounded-xl text-sm font-medium border transition-all
                              ${selectedTime === time
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}
                            `}
                          >
                            {time} Uhr
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleContinue}
                        disabled={!selectedTime}
                        className="mt-5 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Weiter <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <Calendar className="w-8 h-8 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-400">Wähle zuerst<br />einen Tag aus.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
