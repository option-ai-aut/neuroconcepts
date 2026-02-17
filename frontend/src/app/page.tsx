'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bot, TrendingUp, Clock, ArrowRight, CheckCircle2,
  Users, Building2, Mail, Calendar, FileText, Zap, Shield,
  Star, BarChart3, MessageSquare, Brain, Rocket, Target, Award, Globe,
  Wand2, Server, ChevronDown
} from 'lucide-react';
import NextImage from 'next/image';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';
import DemoBooking from '@/components/DemoBooking';
import { useTranslations } from 'next-intl';

/* ─────────────────────────────────────────────
   Scroll-Reveal System (single IntersectionObserver)
   Elements with class "rv" start hidden and transition
   to visible when they enter the viewport.
   Stagger via inline style --d (delay in ms).
   ───────────────────────────────────────────── */
function useScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const elements = root.querySelectorAll('.rv');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('revealed');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return containerRef;
}

/* ─────────────────────────────────────────────
   Animated Counter
   ───────────────────────────────────────────── */
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          let start: number;
          const step = (ts: number) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            setCount(Math.floor(p * end));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─────────────────────────────────────────────
   Before / After Slider
   ───────────────────────────────────────────── */
function BeforeAfterSlider() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const t = useTranslations('landing');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const move = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
      updatePosition(cx);
    };
    const up = () => setIsDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, [isDragging, updatePosition]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden shadow-2xl cursor-col-resize select-none"
      onMouseDown={(e) => { setIsDragging(true); updatePosition(e.clientX); }}
      onTouchStart={(e) => { setIsDragging(true); updatePosition(e.touches[0].clientX); }}
    >
      <div className="aspect-[4/3] relative">
        <NextImage src="/Neu.jpg" alt={t('beforeAfter.afterAlt')} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
          <NextImage src="/Alt.jpg" alt={t('beforeAfter.beforeAlt')} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" style={{ minWidth: containerWidth > 0 ? `${containerWidth}px` : '100%' }} priority />
        </div>
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full z-20 pointer-events-none">{t('beforeAfter.before')}</div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-full z-20 pointer-events-none">{t('beforeAfter.after')}</div>
        <div className="absolute inset-y-0 z-30 pointer-events-none" style={{ left: `${sliderPos}%` }}>
          <div className="absolute inset-y-0 w-0.5 bg-white shadow-lg -translate-x-1/2" />
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-auto cursor-col-resize">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 3L2 8L5 13M11 3L14 8L11 13" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Splash Screen — 3-second blur-reveal intro
   ───────────────────────────────────────────── */
function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'reveal' | 'text-exit' | 'exit'>('reveal');
  const phrase = 'Close More. Stress Less.';
  const chars = phrase.split('');

  useEffect(() => {
    const textExit = setTimeout(() => setPhase('text-exit'), 2100);
    const slideExit = setTimeout(() => setPhase('exit'), 2400);
    const doneTimer = setTimeout(onComplete, 3200);
    return () => { clearTimeout(textExit); clearTimeout(slideExit); clearTimeout(doneTimer); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-gray-950 flex items-center justify-center px-6 transition-transform duration-[800ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
        phase === 'exit' ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <p
        className={`flex flex-wrap justify-center transition-all duration-[800ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
          phase === 'text-exit' || phase === 'exit' ? '-translate-y-[50vh] opacity-0' : ''
        }`}
        aria-label={phrase}
      >
        {chars.map((char, i) => (
          <span
            key={i}
            className="splash-char"
            style={{ animationDelay: `${300 + i * 55}ms` } as React.CSSProperties}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════ */
let splashShownThisSession = false;

export default function LandingPage() {
  const t = useTranslations('landing');
  const scrollRef = useScrollReveal();

  const [splashDone, setSplashDone] = useState(splashShownThisSession);
  const heroRef = useRef<HTMLElement>(null);
  const [heroScroll, setHeroScroll] = useState(0);

  const handleSplashComplete = useCallback(() => {
    splashShownThisSession = true;
    setSplashDone(true);
  }, []);

  useEffect(() => {
    if (!splashDone) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [splashDone]);

  useEffect(() => {
    const onScroll = () => {
      const el = heroRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const h = el.offsetHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / (h * 0.7)));
      setHeroScroll(progress);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={scrollRef} className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden scroll-smooth">

      {/* ── Splash Screen ── */}
      {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}

      {/* ── Global reveal styles ── */}
      <style jsx global>{`
        /* ── Splash blur-reveal ── */
        @keyframes splash-blur-in {
          0%   { filter: blur(12px); opacity: 0; transform: translateY(4px); }
          100% { filter: blur(0px); opacity: 1; transform: translateY(0); }
        }
        .splash-char {
          display: inline-block;
          opacity: 0;
          filter: blur(12px);
          animation: splash-blur-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          font-size: clamp(1.4rem, 4vw, 2.8rem);
          font-weight: 300;
          color: white;
          letter-spacing: 0.12em;
        }

        /* Base reveal class — hidden state */
        .rv {
          opacity: 0;
          transform: translateY(50px);
          transition:
            opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
          transition-delay: var(--d, 0ms);
          will-change: opacity, transform;
        }
        .rv.revealed {
          opacity: 1;
          transform: translateY(0);
        }

        /* Hero entry — only runs when splash is done (parent has .hero-go) */
        @keyframes hero-enter {
          from { opacity: 0; transform: translateY(36px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-el {
          opacity: 0;
          transform: translateY(36px);
        }
        .hero-go .hero-el {
          animation: hero-enter 1s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Scroll indicator bounce */
        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%      { transform: translateY(8px); opacity: 1; }
        }

        /* Subtle scale variant */
        .rv-scale {
          opacity: 0;
          transform: scale(0.95);
          transition:
            opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
          transition-delay: var(--d, 0ms);
          will-change: opacity, transform;
        }
        .rv-scale.revealed {
          opacity: 1;
          transform: scale(1);
        }
      `}</style>

      {/* ── Navigation ── */}
      <PublicNavigation currentPage="home" />

      {/* ══════════════════════════════════════════
          HERO — Clean, centered, massive typography
          ══════════════════════════════════════════ */}
      <section ref={heroRef} className={`relative min-h-screen flex items-center justify-center bg-gray-950 overflow-hidden ${splashDone ? 'hero-go' : ''}`}>
        {/* Diorama background image with scroll parallax */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            opacity: 1 - heroScroll * 1.2,
            transform: `scale(${1 + heroScroll * 0.15}) translateY(${heroScroll * -60}px)`,
          }}
        >
          <NextImage
            src="/diorama-1.jpg"
            alt=""
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority
            quality={85}
          />
        </div>
        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-gray-950/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(3,7,18,0.6)_100%)]" />

        <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 text-center pt-24 sm:pt-28 pb-12 sm:pb-16">
          {/* Logo */}
          <div className="hero-el" style={{ animationDelay: '0.1s' }}>
            <NextImage
              src="/logo-white.png"
              alt="Immivo"
              width={600}
              height={600}
              className="w-24 sm:w-36 lg:w-[32rem] h-auto mx-auto mb-8 sm:mb-14"
              priority
            />
          </div>

          {/* Headline */}
          <div className="hero-el" style={{ animationDelay: '0.3s' }}>
            <h1 className="font-extrabold tracking-tight leading-[1.05]">
              <span className="block text-base sm:text-2xl lg:text-3xl text-gray-500 mb-1.5 sm:mb-2">
                {t('hero.title1')}
              </span>
              <span className="block text-[2.5rem] sm:text-7xl lg:text-[6.5rem] bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                {t('hero.title2')}
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <div className="hero-el" style={{ animationDelay: '0.55s' }}>
            <p className="mt-5 sm:mt-8 text-sm sm:text-lg lg:text-xl text-gray-400 max-w-xl mx-auto leading-relaxed">
              {t.rich('hero.subtitle', { bold: (chunks) => <span className="text-white font-medium">{chunks}</span> })}
            </p>
          </div>

          {/* CTAs */}
          <div className="hero-el flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-8 sm:mt-12" style={{ animationDelay: '0.75s' }}>
            <Link
              href="/login?mode=register"
              className="group w-full sm:w-auto inline-flex items-center justify-center px-7 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 shadow-[0_0_40px_rgba(255,255,255,0.08)]"
            >
              {t('hero.ctaPrimary')}
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <a
              href="#demo"
              onClick={(e) => handleAnchorClick(e, 'demo')}
              className="group w-full sm:w-auto inline-flex items-center justify-center px-7 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-gray-400 border border-white/15 rounded-full hover:bg-white/5 hover:border-white/30 hover:text-gray-200 transition-all duration-300"
            >
              <Calendar className="mr-2 w-4 h-4 sm:w-5 sm:h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
              {t('hero.ctaSecondary')}
            </a>
          </div>

          {/* Trust */}
          <div className="hero-el flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 mt-8 sm:mt-16 text-[11px] sm:text-sm text-gray-600" style={{ animationDelay: '0.95s' }}>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500/60" />
              {t('hero.trustNoCard')}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500/60" />
              {t('hero.trust7Days')}
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600" />
              {t('hero.trustGdpr')}
            </span>
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600" />
              {t('hero.awsHosting')}
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hero-el" style={{ animationDelay: '1.3s' }}>
          <ChevronDown className="w-5 h-5 text-gray-600" style={{ animation: 'scroll-bounce 2.5s ease-in-out infinite' }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PROBLEM / WHY
          ══════════════════════════════════════════ */}
      <section id="warum" className="py-16 sm:py-32 lg:py-40">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          {/* Heading */}
          <div className="text-center mb-12 sm:mb-20">
            <p className="rv text-blue-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-3 sm:mb-4">{t('problem.sectionLabel')}</p>
            <h2 className="rv text-2xl sm:text-5xl lg:text-6xl font-bold tracking-tight" style={{ '--d': '100ms' } as React.CSSProperties}>
              {t('problem.title')}
            </h2>
            <p className="rv text-sm sm:text-xl text-gray-500 mt-3 sm:mt-5 max-w-2xl mx-auto leading-relaxed" style={{ '--d': '200ms' } as React.CSSProperties}>
              {t('problem.subtitle')}
            </p>
          </div>

          {/* Cards */}
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Mail, title: t('problem.emailFlood'), problem: t('problem.emailProblem'), solution: t('problem.emailSolution') },
              { icon: Calendar, title: t('problem.appointmentChaos'), problem: t('problem.appointmentProblem'), solution: t('problem.appointmentSolution') },
              { icon: FileText, title: t('problem.exposeMarathon'), problem: t('problem.exposeProblem'), solution: t('problem.exposeSolution') },
            ].map((item, i) => (
              <div
                key={i}
                className="rv group bg-gray-50 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-500 border border-transparent hover:border-gray-100"
                style={{ '--d': `${200 + i * 120}ms` } as React.CSSProperties}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-900 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-105 transition-transform duration-500">
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">{item.title}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <span className="text-red-400 mt-0.5">✗</span>
                    <span className="text-gray-500">{item.problem}</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span className="text-gray-900 font-medium">{item.solution}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          JARVIS AI
          ══════════════════════════════════════════ */}
      <section id="jarvis" className="py-16 sm:py-32 lg:py-40 bg-gray-950 text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text */}
            <div>
              <p className="rv inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/8 text-gray-400 text-xs font-medium mb-6 border border-white/10">
                <Brain className="w-3.5 h-3.5 mr-1.5" />
                {t('jarvis.badge')}
              </p>

              <h2 className="rv text-2xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-4 sm:mb-6" style={{ '--d': '100ms' } as React.CSSProperties}>
                {t.rich('jarvis.title', { bold: (chunks) => <span className="text-gray-300">{chunks}</span> })}
              </h2>

              <p className="rv text-sm sm:text-lg text-gray-400 leading-relaxed mb-6 sm:mb-8" style={{ '--d': '200ms' } as React.CSSProperties}>
                {t.rich('jarvis.subtitle', { bold: (chunks) => <span className="text-white font-medium">{chunks}</span> })}
              </p>

              <div className="space-y-3 mb-10">
                {[t('jarvis.feature1'), t('jarvis.feature2'), t('jarvis.feature3')].map((item, i) => (
                  <div key={i} className="rv flex items-center gap-3" style={{ '--d': `${300 + i * 100}ms` } as React.CSSProperties}>
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <div className="rv" style={{ '--d': '600ms' } as React.CSSProperties}>
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 bg-white text-gray-900 rounded-full font-semibold text-sm hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5"
                >
                  {t('jarvis.cta')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Visual */}
            <div className="rv-scale rv flex items-center justify-center" style={{ '--d': '300ms' } as React.CSSProperties}>
              {/* Mobile: Grid */}
              <div className="grid grid-cols-3 gap-3 lg:hidden w-full">
                {[
                  { icon: Mail, label: t('jarvis.emails') },
                  { icon: Calendar, label: t('jarvis.appointments') },
                  { icon: FileText, label: t('jarvis.exposesLabel') },
                  { icon: Users, label: t('jarvis.leads') },
                  { icon: Building2, label: t('jarvis.properties') },
                  { icon: MessageSquare, label: t('jarvis.chat') },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-3.5 flex flex-col items-center justify-center border border-white/10">
                    <item.icon className="w-5 h-5 text-gray-400 mb-1.5" />
                    <span className="text-[11px] text-gray-500">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Desktop: Logo */}
              <div className="hidden lg:flex relative items-center justify-center h-[380px] w-full">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[300px] h-[300px] rounded-full bg-white/[0.02] border border-white/[0.05]" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[200px] h-[200px] rounded-full bg-white/[0.03] border border-white/[0.06]" />
                </div>
                <NextImage
                  src="/logo-icon-only.png"
                  alt="Jarvis"
                  width={140}
                  height={140}
                  className="relative z-10 drop-shadow-[0_0_60px_rgba(255,255,255,0.06)]"
                  priority
                />
                {/* Orbiting dots */}
                {[Mail, Calendar, FileText, Users, Building2, MessageSquare].map((Icon, i) => {
                  const angle = (i / 6) * 360 - 90;
                  const radius = 150;
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;
                  return (
                    <div
                      key={i}
                      className="absolute w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm"
                      style={{ left: `calc(50% + ${x}px - 20px)`, top: `calc(50% + ${y}px - 20px)` }}
                    >
                      <Icon className="w-4 h-4 text-gray-500" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          RESULTS / ROI
          ══════════════════════════════════════════ */}
      <section id="ergebnisse" className="py-16 sm:py-32 lg:py-40">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          {/* Heading */}
          <div className="text-center mb-12 sm:mb-20">
            <p className="rv text-blue-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-3 sm:mb-4">{t('results.sectionLabel')}</p>
            <h2 className="rv text-2xl sm:text-5xl lg:text-6xl font-bold tracking-tight" style={{ '--d': '100ms' } as React.CSSProperties}>
              {t('results.title')}
            </h2>
            <p className="rv text-sm sm:text-xl text-gray-500 mt-3 sm:mt-5 max-w-2xl mx-auto leading-relaxed" style={{ '--d': '200ms' } as React.CSSProperties}>
              {t('results.subtitle')}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-16">
            {[
              { value: 15, suffix: 'h', label: t('results.timeSaving'), icon: Clock },
              { value: 40, suffix: '%', label: t('results.moreLeads'), icon: Target },
              { value: 3, suffix: 'x', label: t('results.fasterResponse'), icon: Zap },
              { value: 25, suffix: '%', label: t('results.higherConversion'), icon: TrendingUp },
            ].map((stat, i) => (
              <div
                key={i}
                className="rv text-center p-4 sm:p-8 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-lg transition-all duration-500 border border-transparent hover:border-gray-100"
                style={{ '--d': `${200 + i * 100}ms` } as React.CSSProperties}
              >
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-2 sm:mb-3" />
                <div className="text-2xl sm:text-5xl font-bold text-gray-900 mb-1">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-[11px] sm:text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Portals */}
          <div className="rv bg-gray-950 rounded-2xl sm:rounded-3xl p-5 sm:p-12" style={{ '--d': '300ms' } as React.CSSProperties}>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10">
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                <Globe className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-3">{t('results.portalsTitle')}</h3>
                <p className="text-xs sm:text-base text-gray-400 mb-3 sm:mb-4 leading-relaxed">{t('results.portalsSubtitle')}</p>
                <div className="flex flex-wrap gap-2">
                  {['ImmoScout24', 'Willhaben', 'Immowelt', 'Homegate', 'Kleinanzeigen', t('results.morePortals')].map((portal, i) => (
                    <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium ${i === 5 ? 'bg-white/15 text-white' : 'bg-white/8 text-gray-400 border border-white/10'}`}>
                      {portal}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES GRID
          ══════════════════════════════════════════ */}
      <section id="features" className="py-16 sm:py-32 lg:py-40 bg-gray-50/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          {/* Heading */}
          <div className="text-center mb-12 sm:mb-20">
            <p className="rv text-blue-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-3 sm:mb-4">{t('features.sectionLabel')}</p>
            <h2 className="rv text-2xl sm:text-5xl lg:text-6xl font-bold tracking-tight" style={{ '--d': '100ms' } as React.CSSProperties}>
              {t('features.title')}
            </h2>
            <p className="rv text-sm sm:text-xl text-gray-500 mt-3 sm:mt-5 max-w-2xl mx-auto leading-relaxed" style={{ '--d': '200ms' } as React.CSSProperties}>
              {t('features.subtitle')}
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {[
              { icon: Bot, title: t('features.jarvisTitle'), desc: t('features.jarvisDesc') },
              { icon: Wand2, title: t('features.imageTitle'), desc: t('features.imageDesc') },
              { icon: Users, title: t('features.crmTitle'), desc: t('features.crmDesc') },
              { icon: Building2, title: t('features.propertiesTitle'), desc: t('features.propertiesDesc') },
              { icon: FileText, title: t('features.exposeTitle'), desc: t('features.exposeDesc') },
              { icon: Calendar, title: t('features.calendarTitle'), desc: t('features.calendarDesc') },
              { icon: Mail, title: t('features.emailTitle'), desc: t('features.emailDesc') },
              { icon: Globe, title: t('features.portalsTitle'), desc: t('features.portalsDesc') },
              { icon: BarChart3, title: t('features.analyticsTitle'), desc: t('features.analyticsDesc') },
              { icon: Shield, title: t('features.hostingTitle'), desc: t('features.hostingDesc') },
            ].map((f, i) => (
              <div
                key={i}
                className="rv group bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500"
                style={{ '--d': `${150 + i * 80}ms` } as React.CSSProperties}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-900 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform duration-500">
                  <f.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h3 className="text-xs sm:text-base font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-gray-500 text-[11px] sm:text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          VIRTUAL STAGING
          ══════════════════════════════════════════ */}
      <section id="bildbearbeitung" className="py-16 sm:py-32 lg:py-40 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Image */}
            <div className="rv relative" style={{ '--d': '100ms' } as React.CSSProperties}>
              <BeforeAfterSlider />
              <div className="absolute -right-1 sm:-right-4 -bottom-1 sm:-bottom-4 bg-white rounded-lg sm:rounded-xl shadow-xl p-2.5 sm:p-4 border border-gray-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-md sm:rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-500">{t('staging.moreAttention')}</p>
                    <p className="text-sm sm:text-lg font-bold text-gray-900">{t('staging.moreAttentionValue')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              <p className="rv inline-flex items-center px-3.5 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium mb-6 border border-gray-200">
                <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                {t('staging.badge')}
              </p>

              <h2 className="rv text-2xl sm:text-5xl font-bold tracking-tight leading-tight mb-4 sm:mb-5" style={{ '--d': '100ms' } as React.CSSProperties}>
                {t.rich('staging.title', { bold: (chunks) => <strong>{chunks}</strong> })}
              </h2>

              <p className="rv text-sm sm:text-lg text-gray-500 leading-relaxed mb-6 sm:mb-8" style={{ '--d': '200ms' } as React.CSSProperties}>
                {t.rich('staging.subtitle', { bold: (chunks) => <span className="text-gray-900 font-medium">{chunks}</span> })}
              </p>

              <div className="space-y-3 mb-8">
                {[t('staging.feature1'), t('staging.feature2'), t('staging.feature3'), t('staging.feature4')].map((item, i) => (
                  <div key={i} className="rv flex items-center gap-3" style={{ '--d': `${300 + i * 100}ms` } as React.CSSProperties}>
                    <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-gray-600 text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <div className="rv" style={{ '--d': '700ms' } as React.CSSProperties}>
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 bg-gray-900 text-white rounded-full font-semibold text-sm hover:shadow-lg hover:shadow-gray-400/20 transition-all duration-300 hover:-translate-y-0.5"
                >
                  {t('staging.cta')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
          ══════════════════════════════════════════ */}
      <section className="py-16 sm:py-32 lg:py-40 bg-gray-50/60">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-12 sm:mb-20">
            <p className="rv text-blue-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-3 sm:mb-4">{t('howItWorks.sectionLabel')}</p>
            <h2 className="rv text-2xl sm:text-5xl lg:text-6xl font-bold tracking-tight" style={{ '--d': '100ms' } as React.CSSProperties}>
              {t('howItWorks.title')}
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              { step: '01', title: t('howItWorks.step1Title'), desc: t('howItWorks.step1Desc'), icon: Rocket },
              { step: '02', title: t('howItWorks.step2Title'), desc: t('howItWorks.step2Desc'), icon: Brain },
              { step: '03', title: t('howItWorks.step3Title'), desc: t('howItWorks.step3Desc'), icon: Award },
            ].map((item, i) => (
              <div key={i} className="rv text-center" style={{ '--d': `${200 + i * 150}ms` } as React.CSSProperties}>
                <div className="relative inline-block mb-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl border border-gray-200 flex items-center justify-center shadow-sm">
                    <item.icon className="w-7 h-7 sm:w-8 sm:h-8 text-gray-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          DEMO BOOKING
          ══════════════════════════════════════════ */}
      <section id="demo" className="py-16 sm:py-32 lg:py-40">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text */}
            <div>
              <p className="rv inline-flex items-center px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium mb-6 border border-blue-100">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                {t('demo.badge')}
              </p>

              <h2 className="rv text-2xl sm:text-5xl font-bold tracking-tight leading-tight mb-4 sm:mb-5" style={{ '--d': '100ms' } as React.CSSProperties}>
                {t.rich('demo.title', { bold: (chunks) => <strong>{chunks}</strong> })}
              </h2>

              <p className="rv text-sm sm:text-lg text-gray-500 leading-relaxed mb-6 sm:mb-8" style={{ '--d': '200ms' } as React.CSSProperties}>
                {t('demo.subtitle')}
              </p>

              <div className="space-y-3">
                {[t('demo.feature1'), t('demo.feature2'), t('demo.feature3'), t('demo.feature4')].map((item, i) => (
                  <div key={i} className="rv flex items-center gap-3" style={{ '--d': `${300 + i * 100}ms` } as React.CSSProperties}>
                    <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <span className="text-gray-600 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="rv" style={{ '--d': '200ms' } as React.CSSProperties}>
              <DemoBooking />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FINAL CTA
          ══════════════════════════════════════════ */}
      <section className="py-16 sm:py-32 lg:py-40 bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-white/[0.03] rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-500/[0.04] rounded-full blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto px-5 sm:px-6 text-center relative z-10">
          <div className="rv">
            <NextImage src="/logo-white.png" alt="Immivo" width={480} height={480} className="mx-auto mb-6 sm:mb-8 w-48 sm:w-80 lg:w-96 h-auto" />
          </div>

          <div className="rv" style={{ '--d': '100ms' } as React.CSSProperties}>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/10 text-gray-300 text-xs font-medium mb-8 border border-white/10">
              <Star className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              {t('cta.badge')}
            </span>
          </div>

          <h2 className="rv text-2xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-5" style={{ '--d': '200ms' } as React.CSSProperties}>
            {t('cta.title')}
          </h2>

          <p className="rv text-sm sm:text-lg text-gray-400 mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed" style={{ '--d': '300ms' } as React.CSSProperties}>
            {t('cta.subtitle')}
          </p>

          <div className="rv flex flex-col sm:flex-row justify-center gap-3 sm:gap-4" style={{ '--d': '400ms' } as React.CSSProperties}>
            <Link
              href="/login?mode=register"
              className="group w-full sm:w-auto inline-flex items-center justify-center px-7 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 shadow-[0_0_40px_rgba(255,255,255,0.06)]"
            >
              {t('cta.primary')}
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <a
              href="mailto:office@immivo.ai"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-gray-300 border border-white/15 rounded-full hover:bg-white/5 hover:border-white/30 transition-all duration-300"
            >
              {t('cta.secondary')}
            </a>
          </div>

          {/* Partners */}
          <div className="rv mt-16 pt-8 border-t border-white/10" style={{ '--d': '500ms' } as React.CSSProperties}>
            <p className="text-xs text-gray-600 mb-5">{t('cta.connectedWith')}</p>
            <div className="flex justify-center items-center gap-4 flex-wrap">
              {[t('cta.portals'), t('cta.google'), t('cta.microsoft')].map((name, i) => (
                <div key={i} className="px-4 py-2 bg-white/5 border border-white/8 rounded-lg text-xs font-medium text-gray-500">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <PublicFooter />
    </div>
  );
}
