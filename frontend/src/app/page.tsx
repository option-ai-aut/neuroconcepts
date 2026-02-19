'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bot, TrendingUp, Clock, ArrowRight, CheckCircle2,
  Users, Building2, Mail, Calendar, FileText, Zap, Shield,
  BarChart3, MessageSquare, Brain, Rocket, Target, Award, Globe,
  Wand2, Server, ChevronDown
} from 'lucide-react';
import NextImage from 'next/image';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';
import DemoBooking from '@/components/DemoBooking';
import { useTranslations } from 'next-intl';

/* ═══════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════ */
function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !triggered.current) {
        triggered.current = true;
        let start: number;
        const dur = 1600;
        const step = (ts: number) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setCount(Math.round(eased * end));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ═══════════════════════════════════════════════
   BEFORE / AFTER — auto-animated, no manual slider
   ═══════════════════════════════════════════════ */
function BeforeAfterSlider({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [containerWidth, setContainerWidth] = useState(0);
  const autoRaf = useRef<number>(0);
  const autoStartTime = useRef(0);
  const t = useTranslations('landing');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el); setContainerWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!active) { cancelAnimationFrame(autoRaf.current); setSliderPos(50); return; }
    autoStartTime.current = performance.now();
    const HALF = 3500;
    const CYCLE = HALF * 2;
    const tick = (now: number) => {
      const elapsed = now - autoStartTime.current;
      let pos: number;
      if (elapsed < HALF) {
        const t = elapsed / HALF;
        const ease = 0.5 - 0.5 * Math.cos(t * Math.PI);
        pos = 50 - ease * 50;
      } else {
        const loopElapsed = (elapsed - HALF) % CYCLE;
        const progress = loopElapsed / CYCLE;
        const ease = 0.5 - 0.5 * Math.cos(progress * 2 * Math.PI);
        pos = ease * 100;
      }
      setSliderPos(pos);
      autoRaf.current = requestAnimationFrame(tick);
    };
    autoRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(autoRaf.current);
  }, [active]);

  return (
    <div ref={containerRef} className="relative h-full overflow-hidden select-none">
      <div className="h-full relative">
        <NextImage src="/Neu.jpg" alt={t('beforeAfter.afterAlt')} fill className="object-cover" sizes="100vw" quality={95} style={{ objectPosition: 'center calc(70% - 4px)' }} priority />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
          <NextImage src="/Alt.jpg" alt={t('beforeAfter.beforeAlt')} fill className="object-cover" sizes="100vw" style={{ minWidth: containerWidth > 0 ? `${containerWidth}px` : '100%', objectPosition: 'center 70%' }} priority />
        </div>
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full z-20 pointer-events-none">{t('beforeAfter.before')}</div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-full z-20 pointer-events-none">{t('beforeAfter.after')}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SPLASH SCREEN
   ═══════════════════════════════════════════════ */
let splashShownThisSession = false;

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'reveal' | 'text-exit' | 'exit'>('reveal');
  const phrase = 'Close More. Stress Less.';
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text-exit'), 2100);
    const t2 = setTimeout(() => setPhase('exit'), 2400);
    const t3 = setTimeout(onComplete, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);
  return (
    <div className={`fixed inset-0 z-[100] bg-black flex items-center justify-center px-6 transition-transform duration-[800ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${phase === 'exit' ? '-translate-y-full' : 'translate-y-0'}`}>
      <p className={`flex flex-wrap justify-center transition-all duration-[800ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${phase === 'text-exit' || phase === 'exit' ? '-translate-y-[50vh] opacity-0' : ''}`} aria-label={phrase}>
        {phrase.split('').map((char, i) => (
          <span key={i} className="splash-char" style={{ opacity: 0, animationDelay: `${300 + i * 55}ms` } as React.CSSProperties}>{char === ' ' ? '\u00A0' : char}</span>
        ))}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   STYLE CONSTANTS
   ═══════════════════════════════════════════════ */
const S_DARK = 'bg-black';
const S_ALT = 'bg-[#0d1117]';

/* ═══════════════════════════════════════════════
   SECTION WRAPPER — each slide is 100vh
   ═══════════════════════════════════════════════ */
function Slide({ children, className = '', active: _active, idx }: { children: React.ReactNode; className?: string; active: boolean; idx: number }) {
  return (
    <section
      className={`snap-slide h-screen w-full flex-shrink-0 relative overflow-hidden ${className}`}
      data-idx={idx}
    >
      <div className="h-full">
        {children}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   STAGGER CHILDREN — animate children in on active
   ═══════════════════════════════════════════════ */
function Stagger({ children, active, className = '', delay = 0 }: { children: React.ReactNode; active: boolean; className?: string; delay?: number }) {
  // Track whether this element has ever been made visible.
  // Before first activation → hidden (will animate in).
  // After first activation → stay fully visible on exit so the slide block slides away cleanly.
  const hasShown = useRef(false);
  if (active) hasShown.current = true;

  const shown = hasShown.current;
  return (
    <div
      className={className}
      style={{
        opacity: active || shown ? 1 : 0,
        transform: active || shown ? 'translateY(0)' : 'translateY(32px)',
        transition: active
          ? `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`
          : 'none',
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════ */
export default function LandingPage() {
  const t = useTranslations('landing');
  const [splashDone, setSplashDone] = useState(splashShownThisSession);
  const handleSplashComplete = useCallback(() => { splashShownThisSession = true; setSplashDone(true); }, []);

  /* ── Scroll Controller ── */
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);
  const isAnimating = useRef(false);
  const SECTION_COUNT = 10;
  const TRANSITION_MS = 800;

  const [orbitalPhase, setOrbitalPhase] = useState<'orbital' | 'shrinking' | 'expanding' | 'results'>('orbital');
  const orbitalPhaseRef = useRef(orbitalPhase);
  useEffect(() => { orbitalPhaseRef.current = orbitalPhase; }, [orbitalPhase]);

  useEffect(() => {
    document.body.style.overflow = splashDone ? '' : 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [splashDone]);

  // Jump to section based on URL hash (e.g. /#demo, /#features)
  useEffect(() => {
    if (!splashDone) return;
    const hash = window.location.hash;
    const hashMap: Record<string, number> = {
      '#demo': 7,
      '#features': 4,
      '#jarvis': 2,
      '#bildbearbeitung': 5,
    };
    const target = hashMap[hash];
    if (target !== undefined) {
      // Clear hash without page reload
      window.history.replaceState(null, '', window.location.pathname);
      setTimeout(() => {
        setActiveIdx(target);
        if (target === 3) setOrbitalPhase('results');
      }, 100);
    }
  }, [splashDone]);

  const isLightSection = (activeIdx >= 1 && activeIdx <= 2) || (activeIdx === 3 && (orbitalPhase === 'orbital' || orbitalPhase === 'shrinking')) || activeIdx === 4 || activeIdx === 5 || activeIdx === 7 || activeIdx === 9;
  useEffect(() => {
    document.documentElement.dataset.navTheme = isLightSection ? 'light' : 'dark';
    return () => { delete document.documentElement.dataset.navTheme; };
  }, [isLightSection]);

  const handleAnchorClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, targetIdx: number) => {
    e.preventDefault();
    setActiveIdx(targetIdx);
  }, []);

  /* ── Data ── */
  const problemCards = [
    { icon: Mail, title: t('problem.emailFlood'), problem: t('problem.emailProblem'), solution: t('problem.emailSolution') },
    { icon: Calendar, title: t('problem.appointmentChaos'), problem: t('problem.appointmentProblem'), solution: t('problem.appointmentSolution') },
    { icon: FileText, title: t('problem.exposeMarathon'), problem: t('problem.exposeProblem'), solution: t('problem.exposeSolution') },
  ];

  const featureItems = [
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
  ];

  const statItems = [
    { value: 15, suffix: 'h', label: t('results.timeSaving'), icon: Clock },
    { value: 40, suffix: '%', label: t('results.moreLeads'), icon: Target },
    { value: 3, suffix: 'x', label: t('results.fasterResponse'), icon: Zap },
    { value: 25, suffix: '%', label: t('results.higherConversion'), icon: TrendingUp },
  ];

  const jarvisTitleText = String(t.raw('jarvis.title')).replace(/<[^>]*>/g, '');
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [heroPhase, setHeroPhase] = useState<'idle' | 'revealing' | 'rewinding'>('idle');
  const heroRaf = useRef<number>(0);
  const PLAYBACK_SPEED = 3;

  const triggerHeroReveal = useCallback(() => {
    if (heroPhase !== 'idle') return;
    isAnimating.current = true;
    setHeroPhase('revealing');
    const vid = heroVideoRef.current;
    if (!vid) return;
    vid.pause();
    if (vid.currentTime > 0.1) vid.currentTime = 0;

    let lastTs = 0;
    const step = (ts: number) => {
      if (!lastTs) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      vid.currentTime = Math.min(vid.duration, vid.currentTime + dt * PLAYBACK_SPEED);
      if (vid.currentTime >= vid.duration - 0.05) {
        vid.currentTime = vid.duration;
        setTimeout(() => { isAnimating.current = false; }, TRANSITION_MS + 100);
        setActiveIdx(1);
        return;
      }
      heroRaf.current = requestAnimationFrame(step);
    };
    heroRaf.current = requestAnimationFrame(step);
  }, [heroPhase, TRANSITION_MS]);

  const triggerHeroRewind = useCallback(() => {
    isAnimating.current = true;
    setHeroPhase('rewinding');
    setActiveIdx(0);
    const vid = heroVideoRef.current;
    if (!vid) { setHeroPhase('idle'); isAnimating.current = false; return; }
    vid.pause();

    let lastTs = 0;
    const step = (ts: number) => {
      if (!lastTs) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      vid.currentTime = Math.max(0, vid.currentTime - dt * PLAYBACK_SPEED);
      if (vid.currentTime <= 0.05) {
        vid.currentTime = 0;
        setHeroPhase('idle');
        setTimeout(() => { isAnimating.current = false; }, 300);
        return;
      }
      heroRaf.current = requestAnimationFrame(step);
    };
    heroRaf.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    return () => { if (heroRaf.current) cancelAnimationFrame(heroRaf.current); };
  }, []);

  useEffect(() => {
    const vid = heroVideoRef.current;
    if (!vid) return;
    const warmUp = () => { vid.currentTime = 0.001; };
    if (vid.readyState >= 2) {
      warmUp();
    } else {
      vid.addEventListener('loadeddata', warmUp, { once: true });
    }
  }, []);

  const [featureStep, setFeatureStep] = useState(0);
  const featureStepRef = useRef(0);
  useEffect(() => { featureStepRef.current = featureStep; }, [featureStep]);
  const FEATURE_MAX_STEP = 2;

  useEffect(() => {
    if (activeIdx !== 4) {
      // Wait well after the slide transition (800ms) before resetting to avoid a visible flash
      const t = setTimeout(() => setFeatureStep(0), 1600);
      return () => clearTimeout(t);
    }
  }, [activeIdx]);

  const expandOrbital = useCallback(() => {
    if (orbitalPhase !== 'orbital') return;
    isAnimating.current = true;
    setOrbitalPhase('shrinking');
    setTimeout(() => {
      setOrbitalPhase('expanding');
      setTimeout(() => {
        setOrbitalPhase('results');
        setTimeout(() => { isAnimating.current = false; }, 500);
      }, 650);
    }, 450);
  }, [orbitalPhase]);

  const collapseOrbital = useCallback(() => {
    if (orbitalPhase !== 'results') return;
    isAnimating.current = true;
    setOrbitalPhase('expanding');
    setTimeout(() => {
      setOrbitalPhase('shrinking');
      setTimeout(() => {
        setOrbitalPhase('orbital');
        setTimeout(() => { isAnimating.current = false; }, 400);
      }, 500);
    }, 500);
  }, [orbitalPhase]);

  useEffect(() => {
    if (activeIdx !== 3) {
      if (activeIdx > 3 && orbitalPhase !== 'results') setOrbitalPhase('results');
      else if (activeIdx < 3 && orbitalPhase !== 'orbital') setOrbitalPhase('orbital');
    }
  }, [activeIdx, orbitalPhase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const COOLDOWN = TRANSITION_MS + 500;

    const lock = () => {
      isAnimating.current = true;
      setTimeout(() => { isAnimating.current = false; }, COOLDOWN);
    };

    const navigateDown = () => {
      if (activeIdxRef.current === 0) { triggerHeroReveal(); return; }
      if (activeIdxRef.current === 3 && orbitalPhaseRef.current === 'orbital') { expandOrbital(); return; }
      if (activeIdxRef.current === 4 && featureStepRef.current < FEATURE_MAX_STEP) { lock(); setFeatureStep(prev => prev + 1); return; }
      lock();
      setActiveIdx(prev => Math.min(SECTION_COUNT - 1, prev + 1));
    };

    const navigateUp = () => {
      if (activeIdxRef.current === 1) { triggerHeroRewind(); return; }
      if (activeIdxRef.current === 3 && orbitalPhaseRef.current === 'results') { collapseOrbital(); return; }
      if (activeIdxRef.current === 4 && featureStepRef.current > 0) { lock(); setFeatureStep(prev => prev - 1); return; }
      lock();
      setActiveIdx(prev => Math.max(0, prev - 1));
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isAnimating.current) return;
      if (Math.abs(e.deltaY) < 5) return;
      if (e.deltaY > 0) navigateDown(); else navigateUp();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isAnimating.current) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); navigateDown(); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); navigateUp(); }
    };

    // Touch swipe
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      if (isAnimating.current) return;
      const delta = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(delta) < 50) return;
      if (delta > 0) navigateDown(); else navigateUp();
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [SECTION_COUNT, TRANSITION_MS, triggerHeroReveal, triggerHeroRewind, expandOrbital, collapseOrbital]);

  return (
    <div className={`${S_DARK} font-sans text-white`}>
      {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}
      <PublicNavigation currentPage="home" />

      {/* ═══ GLOBAL STYLES ═══ */}
      <style jsx global>{`
        @keyframes splash-blur-in {
          0%   { filter: blur(12px); opacity: 0; transform: translateY(4px); }
          100% { filter: blur(0); opacity: 1; transform: translateY(0); }
        }
        .splash-char {
          display: inline-block; opacity: 0; filter: blur(12px);
          animation: splash-blur-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          font-size: clamp(1.4rem, 4vw, 2.8rem); font-weight: 300; color: white; letter-spacing: 0.12em;
        }
        @keyframes hero-in {
          from { opacity: 0; transform: translateY(32px); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .hero-el { opacity: 0; }
        .hero-go .hero-el { animation: hero-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%      { transform: translateY(8px); opacity: 1; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .orbital-ring {
          animation: spin-slow 30s linear infinite;
          will-change: transform;
        }
        .orbital-ring-reverse {
          animation: spin-slow 20s linear infinite reverse;
          will-change: transform;
        }
        .orbital-icons {
          animation: spin-slow 25s linear infinite;
          will-change: transform;
        }
        .orbital-icon-inner {
          animation: spin-slow 25s linear infinite reverse;
          will-change: transform;
        }
        /* Feature cards — Fixa style */
        .feat-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          aspect-ratio: 1 / 1;
          padding: 28px;
          border-radius: 20px;
          background: #f2f2f2;
          border: none;
          transition: background 200ms ease;
        }
        .feat-card:hover {
          background: #ebebeb;
        }
        @media (max-width: 640px) {
          .feat-card { aspect-ratio: auto; min-height: 180px; padding: 22px; border-radius: 16px; }
        }

        /* Snap system — same on all screen sizes */
        .snap-outer {
          height: 100dvh; overflow: hidden; position: relative;
        }
        .snap-track {
          transition: transform ${TRANSITION_MS}ms cubic-bezier(0.65, 0, 0.35, 1);
          will-change: transform;
        }
        .snap-slide {
          height: 100dvh !important;
        }

        /* Mobile tweaks */
        @media (max-width: 768px) {
          .feat-card { aspect-ratio: auto; min-height: 0; }
        }

        .glass-card-hover { transition: transform 0.3s, box-shadow 0.3s; }
        .glass-card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 60px -15px rgba(0,0,0,0.4), inset 0 1px 0 0 rgba(255,255,255,0.06);
        }
      `}</style>

      {/* ═══ SNAP CONTAINER ═══ */}
      <div className="snap-outer">
        <div
          className="snap-track"
          style={{ transform: `translateY(calc(-${activeIdx} * 100dvh))` }}
        >

          {/* ══════════════════════════════════════════
              0. HERO
              ══════════════════════════════════════════ */}
          <Slide idx={0} active={activeIdx === 0} className={S_DARK}>
            <div className="h-full flex items-center justify-center relative">
              {/* Video background — poster visible initially, plays on scroll */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <video
                  ref={heroVideoRef}
                  src={`${process.env.NEXT_PUBLIC_MEDIA_CDN_URL || ''}/public/Hyperlapse-scroll.mp4`}
                  poster="/Hyperlapse-poster.jpg"
                  muted
                  playsInline
                  preload="auto"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#07070f]/40 via-[#07070f]/15 to-[#07070f]/50" />
              </div>

              {/* Blur overlay — visible in idle, fades during reveal/rewind */}
              <div
                className="absolute inset-0 z-[1] pointer-events-none transition-all ease-out"
                style={{
                  backdropFilter: heroPhase === 'idle' ? 'blur(10px)' : 'blur(0px)',
                  background: heroPhase === 'idle' ? 'rgba(7,7,15,0.45)' : 'rgba(7,7,15,0)',
                  transitionDuration: heroPhase === 'idle' ? '800ms' : '1200ms',
                }}
              />

              {/* Hero content — hidden during reveal & rewind, visible in idle */}
              <div
                className={`relative z-10 max-w-4xl mx-auto px-5 sm:px-6 text-center transition-all duration-[800ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${splashDone ? 'hero-go' : ''}`}
                style={{
                  opacity: heroPhase !== 'idle' ? 0 : undefined,
                  transform: heroPhase !== 'idle' ? 'translateY(-120px)' : undefined,
                }}
              >
                <div className="hero-el opacity-0" style={{ animationDelay: '0.2s' }}>
                  <h1 className="font-extrabold tracking-tight leading-[1.05]">
                    <span className="block text-sm sm:text-xl lg:text-2xl text-gray-400 uppercase tracking-[0.2em] mb-3 sm:mb-4">
                      {t('hero.title1')}
                    </span>
                    <span className="block text-[2.5rem] sm:text-7xl lg:text-[6.5rem] bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                      {t('hero.title2')}
                    </span>
                  </h1>
                </div>
                <div className="hero-el opacity-0" style={{ animationDelay: '0.45s' }}>
                  <p className="mt-5 sm:mt-8 text-sm sm:text-lg lg:text-xl text-gray-400 max-w-xl mx-auto leading-relaxed">
                    {t.rich('hero.subtitle', { bold: (chunks) => <span className="text-white font-medium">{chunks}</span> })}
                  </p>
                </div>
                <div className="hero-el opacity-0 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-8 sm:mt-12" style={{ animationDelay: '0.65s' }}>
                  <Link href="/login?mode=register" className="group w-full sm:w-auto inline-flex items-center justify-center px-7 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white backdrop-blur-xl bg-white/[0.12] border border-white/[0.2] rounded-full hover:bg-white/[0.2] transition-all duration-300 hover:-translate-y-0.5 shadow-[0_0_30px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.1)]">
                    {t('hero.ctaPrimary')}<ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                  <a href="#demo" onClick={(e) => handleAnchorClick(e, 7)} className="group w-full sm:w-auto inline-flex items-center justify-center px-7 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-gray-300 backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-full hover:bg-white/[0.1] hover:text-white transition-all duration-300">
                    <Calendar className="mr-2 w-4 h-4 sm:w-5 sm:h-5 opacity-60" />{t('hero.ctaSecondary')}
                  </a>
                </div>
                <div className="hero-el opacity-0 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 mt-8 sm:mt-14 text-[11px] sm:text-sm text-gray-500" style={{ animationDelay: '0.85s' }}>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500/60" />{t('hero.trustNoCard')}</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500/60" />{t('hero.trust7Days')}</span>
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{t('hero.trustGdpr')}</span>
                  <span className="flex items-center gap-1"><Server className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{t('hero.awsHosting')}</span>
                </div>
              </div>

              {/* Logo — visible during reveal & rewind, hidden in idle */}
              <div
                className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none transition-all ease-out"
                style={{
                  opacity: heroPhase === 'idle' ? 0 : 1,
                  filter: heroPhase === 'idle' ? 'blur(16px)' : 'blur(0px)',
                  transform: heroPhase === 'idle' ? 'scale(0.85)' : 'scale(1)',
                  transitionDuration: heroPhase === 'idle' ? '600ms' : '1400ms',
                }}
              >
                <NextImage src="/logo-white.png" alt="Immivo" width={480} height={480} className="w-64 sm:w-80 lg:w-[28rem] h-auto" priority />
              </div>

              {/* Scroll hint */}
              <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden sm:flex flex-col items-center gap-2 transition-opacity duration-500 ${heroPhase === 'idle' ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-xs text-gray-500 tracking-widest uppercase">Scroll</span>
                <ChevronDown className="w-4 h-4 text-gray-500" style={{ animation: 'scroll-bounce 2.5s ease-in-out infinite' }} />
              </div>
            </div>
          </Slide>

          {/* ══════════════════════════════════════════
              1. PROBLEM
              ══════════════════════════════════════════ */}
          <Slide idx={1} active={activeIdx === 1} className="bg-white text-gray-900">
            <div className="h-full flex flex-col items-center justify-center px-5 sm:px-10">
              <Stagger active={activeIdx === 1} delay={0}>
                <p className="text-blue-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-3 sm:mb-4 text-center">{t('problem.sectionLabel')}</p>
              </Stagger>
              <Stagger active={activeIdx === 1} delay={80}>
                <h2 className="text-2xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 text-center">{t('problem.title')}</h2>
              </Stagger>
              <Stagger active={activeIdx === 1} delay={160}>
                <p className="text-sm sm:text-xl text-gray-500 mt-3 sm:mt-5 max-w-2xl text-center">{t('problem.subtitle')}</p>
              </Stagger>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-10 sm:mt-14 max-w-5xl w-full">
                {problemCards.map((card, i) => (
                  <Stagger key={i} active={activeIdx === 1} delay={280 + i * 100} className="flex-1">
                    <div className="bg-gray-50 rounded-2xl border border-gray-200/60 p-5 sm:p-6 h-full">
                      <card.icon className="w-5 h-5 text-gray-400 mb-3" />
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">{card.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed line-through decoration-gray-300 mb-2">{card.problem}</p>
                      <p className="text-xs sm:text-sm text-gray-900 font-medium leading-relaxed">{card.solution}</p>
                    </div>
                  </Stagger>
                ))}
              </div>
            </div>
          </Slide>

          {/* ══════════════════════════════════════════
              2. JARVIS
              ══════════════════════════════════════════ */}
          <Slide idx={2} active={activeIdx === 2} className="bg-white text-gray-900">
            <div className="h-full flex flex-col items-center justify-center px-5 sm:px-10 relative overflow-hidden">
              <Stagger active={activeIdx === 2} delay={0}>
                <h2 className="font-extrabold tracking-tight text-gray-900 text-center px-2" style={{ fontSize: 'clamp(1.3rem, 5vw, 4.5rem)', lineHeight: 1.1 }}>
                  {jarvisTitleText}
                </h2>
              </Stagger>
              <Stagger active={activeIdx === 2} delay={120}>
                <p className="text-xs sm:text-lg text-gray-500 max-w-xl text-center leading-relaxed mt-4 sm:mt-8 px-2">
                  {t.rich('jarvis.subtitle', { bold: (chunks) => <span className="text-gray-900 font-medium">{chunks}</span> })}
                </p>
              </Stagger>
              <div className="mt-5 sm:mt-10 space-y-2.5 sm:space-y-3">
                {[String(t('jarvis.feature1')), String(t('jarvis.feature2')), String(t('jarvis.feature3'))].map((item, i) => (
                  <Stagger key={i} active={activeIdx === 2} delay={260 + i * 100}>
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <span className="text-gray-600 text-xs sm:text-base">{item}</span>
                    </div>
                  </Stagger>
                ))}
              </div>
            </div>
          </Slide>

          {/* ══════════════════════════════════════════
              3. ORBITAL → RESULTS (internal phases)
              ══════════════════════════════════════════ */}
          <Slide idx={3} active={activeIdx === 3} className={orbitalPhase === 'results' ? 'bg-black' : 'bg-white text-gray-900'}>
            <div
              className="h-full flex items-center justify-center relative overflow-hidden"
              style={{ cursor: orbitalPhase === 'orbital' ? 'pointer' : 'default' }}
              onClick={() => { if (orbitalPhase === 'orbital' && !isAnimating.current) expandOrbital(); }}
            >

              {/* Orbital icons — visible in 'orbital', shrinks in 'shrinking' */}
              <div
                className="z-10 flex items-center justify-center pointer-events-none"
                style={{
                  opacity: orbitalPhase === 'orbital' ? 1 : 0,
                  transform: orbitalPhase === 'orbital' ? 'scale(1)' : 'scale(0)',
                  transition: 'opacity 400ms cubic-bezier(0.65,0,0.35,1), transform 400ms cubic-bezier(0.65,0,0.35,1)',
                }}
              >
                <div className="relative w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] lg:w-[420px] lg:h-[420px]">
                  <div className="orbital-ring absolute inset-0 rounded-full border border-gray-200/60" />
                  <div className="orbital-ring-reverse absolute inset-[15%] rounded-full border border-gray-200/40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <NextImage src="/logo-icon-only.png" alt="Jarvis" width={80} height={80} className="w-14 sm:w-20" />
                  </div>
                  <div className="orbital-icons absolute inset-0">
                    {[Mail, Calendar, FileText, Users, Building2, MessageSquare].map((Icon, i) => {
                      const angle = (i / 6) * 360 - 90;
                      const rad = (angle * Math.PI) / 180;
                      return (
                        <div
                          key={i}
                          className="absolute left-1/2 top-1/2 w-10 h-10 sm:w-12 sm:h-12"
                          style={{
                            marginLeft: `${Math.cos(rad) * 46}%`,
                            marginTop: `${Math.sin(rad) * 46}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <div className="orbital-icon-inner w-full h-full rounded-xl flex items-center justify-center bg-white border border-gray-200 shadow-md">
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Black rectangle — scales up from center */}
              <div
                className="absolute z-20 bg-black pointer-events-none"
                style={{
                  inset: orbitalPhase === 'results' ? '0px' : '20px',
                  transform: orbitalPhase === 'expanding' || orbitalPhase === 'results' ? 'scale(1)' : 'scale(0)',
                  borderRadius: orbitalPhase === 'results' ? '0px' : '2.5rem',
                  opacity: 1,
                  transition: 'transform 700ms cubic-bezier(0.65,0,0.35,1), border-radius 500ms cubic-bezier(0.65,0,0.35,1), inset 500ms cubic-bezier(0.65,0,0.35,1)',
                }}
              />

              {/* Results content */}
              <div
                className="absolute inset-0 z-30 flex flex-col justify-center px-5 sm:px-10 lg:px-[100px] text-white"
                style={{
                  opacity: orbitalPhase === 'expanding' || orbitalPhase === 'results' ? 1 : 0,
                  transition: 'opacity 600ms cubic-bezier(0.16,1,0.3,1)',
                  transitionDelay: orbitalPhase === 'expanding' ? '500ms' : '0ms',
                  pointerEvents: orbitalPhase === 'results' || orbitalPhase === 'expanding' ? 'auto' : 'none',
                }}
              >
                <div className="relative z-10 text-center max-w-4xl mx-auto">
                  <Stagger active={orbitalPhase === 'expanding' || orbitalPhase === 'results'} delay={0}>
                    <p className="text-blue-400 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-3 sm:mb-4">{t('results.sectionLabel')}</p>
                  </Stagger>
                  <Stagger active={orbitalPhase === 'expanding' || orbitalPhase === 'results'} delay={80}>
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight">{t('results.title')}</h2>
                  </Stagger>
                  <Stagger active={orbitalPhase === 'expanding' || orbitalPhase === 'results'} delay={160}>
                    <p className="text-sm sm:text-lg text-gray-400 mt-3 sm:mt-5 max-w-xl mx-auto">{t('results.subtitle')}</p>
                  </Stagger>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-8 sm:mt-12 mb-8 sm:mb-12">
                    {statItems.map((stat, i) => (
                      <Stagger key={i} active={orbitalPhase === 'expanding' || orbitalPhase === 'results'} delay={250 + i * 100} className="p-4 sm:p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                        <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mx-auto mb-2 sm:mb-3" />
                        <div className="text-2xl sm:text-4xl font-bold mb-1"><AnimatedCounter end={stat.value} suffix={stat.suffix} /></div>
                        <p className="text-[11px] sm:text-sm text-gray-500">{stat.label}</p>
                      </Stagger>
                    ))}
                  </div>
                  <Stagger active={orbitalPhase === 'expanding' || orbitalPhase === 'results'} delay={650}>
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                      {['ImmoScout24', 'Willhaben', 'Immowelt', 'Homegate', 'Kleinanzeigen', t('results.morePortals')].map((portal, i) => (
                        <span key={i} className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium ${i === 5 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.06] text-gray-400 border border-white/[0.08]'}`}>{portal}</span>
                      ))}
                    </div>
                  </Stagger>
                </div>
              </div>
            </div>
          </Slide>

          {/* ══════════════════════════════════════════
              4. FEATURES — horizontal slider
              ══════════════════════════════════════════ */}
          <Slide idx={4} active={activeIdx === 4} className="bg-white text-gray-900">
            <div className="h-full flex flex-col justify-center relative">

              {/* Header — centered */}
              <div className="px-5 sm:px-10 text-center mb-8 sm:mb-12">
                <Stagger active={activeIdx === 4} delay={0}>
                  <p className="text-blue-600 font-semibold text-[10px] sm:text-xs tracking-widest uppercase mb-2 sm:mb-3">{t('features.sectionLabel')}</p>
                </Stagger>
                <Stagger active={activeIdx === 4} delay={80}>
                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">{t('features.title')}</h2>
                </Stagger>
                <Stagger active={activeIdx === 4} delay={160}>
                  <p className="text-xs sm:text-base text-gray-500 mt-2 sm:mt-3 max-w-xl mx-auto">{t('features.subtitle')}</p>
                </Stagger>
              </div>

              {/* Horizontal card track */}
              <div className="overflow-hidden">
                <div
                  className="flex"
                  style={{
                    transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: `translateX(-${featureStep * 100}%)`,
                  }}
                >
                  {[0, 1, 2].map(groupIdx => {
                    const groupItems = featureItems.slice(groupIdx * 4, groupIdx * 4 + 4);
                    const isCentered = groupItems.length < 4;
                    return (
                      <div key={groupIdx} className="w-full flex-shrink-0 px-6 sm:px-12 lg:px-20">
                        <div className={`grid gap-3 sm:gap-4 ${isCentered ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-6xl mx-auto'}`}>
                          {groupItems.map((f, i) => (
                            <Stagger key={i} active={activeIdx === 4} delay={300 + i * 80}>
                            <div
                              className="feat-card"
                            >
                              <f.icon className="w-7 h-7 sm:w-8 sm:h-8 text-gray-800" strokeWidth={1.5} />
                              <div>
                                <h3 className="text-[15px] sm:text-base font-semibold text-gray-900 mb-1.5">{f.title}</h3>
                                <p className="text-xs sm:text-[13px] text-gray-500 leading-relaxed line-clamp-2">{f.desc}</p>
                              </div>
                            </div>
                            </Stagger>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile dots */}
              <div className="sm:hidden flex items-center justify-center gap-2 mt-6">
                {Array.from({ length: FEATURE_MAX_STEP + 1 }).map((_, i) => (
                  <button
                    key={i}
                    className="h-1 rounded-full transition-all duration-500"
                    style={{
                      width: featureStep === i ? '20px' : '6px',
                      background: featureStep === i ? '#111827' : 'rgba(0,0,0,0.1)',
                    }}
                    onClick={() => setFeatureStep(i)}
                  />
                ))}
              </div>
            </div>
          </Slide>

          {/* ══════════════════════════════════════════
              5. VIRTUAL STAGING — Fixa-style image + stat bars
              ══════════════════════════════════════════ */}
          <Slide idx={5} active={activeIdx === 5} className="bg-white text-gray-900">
            <div className="h-full flex flex-col items-center justify-center py-4 sm:py-6">
              {/* Title */}
              <div className="text-center mb-3 sm:mb-5 lg:mb-7 px-4 flex-shrink-0">
                <Stagger active={activeIdx === 5} delay={0}>
                  <p className="text-blue-600 font-semibold text-[10px] sm:text-xs tracking-widest uppercase mb-1 sm:mb-2">{t('staging.badge')}</p>
                </Stagger>
                <Stagger active={activeIdx === 5} delay={80}>
                  <h2 className="text-xl sm:text-3xl lg:text-5xl font-bold tracking-tight leading-tight max-w-3xl">
                    {t.rich('staging.title', { bold: (chunks) => <strong>{chunks}</strong> })}
                  </h2>
                </Stagger>
                <Stagger active={activeIdx === 5} delay={160}>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-500 mt-1 sm:mt-2 max-w-xl mx-auto">
                    {t.rich('staging.subtitle', { bold: (chunks) => <span className="text-gray-900 font-medium">{chunks}</span> })}
                  </p>
                </Stagger>
              </div>

              {/* Image — edge to edge with 10px padding on each side */}
              <Stagger active={activeIdx === 5} delay={250} className="w-full px-[10px]">
                <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden" style={{ height: 'clamp(200px, calc(100dvh - 200px), 560px)' }}>
                  <BeforeAfterSlider active={activeIdx === 5} />
                  {/* Stat tag */}
                  <div
                    className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 h-8 sm:h-9 rounded-full bg-black/45 backdrop-blur-md px-3 sm:px-4"
                    style={{
                      opacity: activeIdx === 5 ? 1 : 0,
                      transform: activeIdx === 5 ? 'translateY(0)' : 'translateY(8px)',
                      transition: 'opacity 500ms ease, transform 500ms ease',
                      transitionDelay: '700ms',
                    }}
                  >
                    <span className="text-white/70 text-[11px] sm:text-xs font-medium">Attention</span>
                    <span className="text-white text-xs sm:text-sm font-semibold tabular-nums">+73%</span>
                  </div>
                </div>
              </Stagger>
            </div>
          </Slide>

          {/* ══════════════════════════════════════════
              6. HOW IT WORKS
              ══════════════════════════════════════════ */}
          <Slide idx={6} active={activeIdx === 6} className={S_DARK}>
            <div className="h-full flex flex-col items-center justify-center px-5 sm:px-10">
              <div className="text-center max-w-4xl mx-auto">
                <Stagger active={activeIdx === 6} delay={0}>
                  <p className="text-blue-400 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-3 sm:mb-4">{t('howItWorks.sectionLabel')}</p>
                </Stagger>
                <Stagger active={activeIdx === 6} delay={80}>
                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight">{t('howItWorks.title')}</h2>
                </Stagger>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12">
                  {[
                    { step: '01', title: t('howItWorks.step1Title'), desc: t('howItWorks.step1Desc'), icon: Rocket },
                    { step: '02', title: t('howItWorks.step2Title'), desc: t('howItWorks.step2Desc'), icon: Brain },
                    { step: '03', title: t('howItWorks.step3Title'), desc: t('howItWorks.step3Desc'), icon: Award },
                  ].map((item, i) => (
                    <Stagger key={i} active={activeIdx === 6} delay={250 + i * 100} className="p-4 sm:p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-center">
                      <div className="relative inline-flex mb-3 sm:mb-4">
                        <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                        <span className="absolute -top-2 -right-4 text-[10px] font-bold text-gray-500">{item.step}</span>
                      </div>
                      <h3 className="text-sm sm:text-lg font-bold mb-1.5 sm:mb-2">{item.title}</h3>
                      <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                    </Stagger>
                  ))}
                </div>
              </div>
            </div>
          </Slide>

          {/* ══════════════════════════════════════════
              7. DEMO
              ══════════════════════════════════════════ */}
          <Slide idx={7} active={activeIdx === 7} className="bg-white text-gray-900">
            <div className="h-full flex items-center justify-center px-5 sm:px-8 lg:px-12 py-6">
              {/* Mobile: compact text + CTA only (DemoBooking is too tall) */}
              <div className="lg:hidden w-full max-w-lg mx-auto flex flex-col items-center text-center gap-5">
                <Stagger active={activeIdx === 7} delay={0}>
                  <p className="text-blue-600 font-semibold text-[10px] tracking-widest uppercase">{t('demo.badge')}</p>
                </Stagger>
                <Stagger active={activeIdx === 7} delay={80}>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                    {t.rich('demo.title', { bold: (chunks) => <strong>{chunks}</strong> })}
                  </h2>
                </Stagger>
                <Stagger active={activeIdx === 7} delay={160}>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-sm">{t('demo.subtitle')}</p>
                </Stagger>
                <Stagger active={activeIdx === 7} delay={240}>
                  <Link href="/demo" className="inline-flex items-center gap-2 px-7 py-3.5 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-700 transition-colors">
                    {t('demo.cta')}<ArrowRight className="w-4 h-4" />
                  </Link>
                </Stagger>
              </div>

              {/* Desktop: two-column with booking widget */}
              <div className="hidden lg:grid w-full max-w-6xl mx-auto grid-cols-2 gap-14 items-center">
                <div className="flex flex-col items-start text-left">
                  <Stagger active={activeIdx === 7} delay={0}>
                    <p className="text-blue-600 font-semibold text-xs tracking-widest uppercase mb-2">{t('demo.badge')}</p>
                  </Stagger>
                  <Stagger active={activeIdx === 7} delay={80}>
                    <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight mb-3">
                      {t.rich('demo.title', { bold: (chunks) => <strong>{chunks}</strong> })}
                    </h2>
                  </Stagger>
                  <Stagger active={activeIdx === 7} delay={160}>
                    <p className="text-base text-gray-500 leading-relaxed mb-5 max-w-md">{t('demo.subtitle')}</p>
                  </Stagger>
                  <div className="flex flex-wrap items-center justify-start gap-2">
                    {[t('demo.feature1'), t('demo.feature2'), t('demo.feature3'), t('demo.feature4')].map((item, i) => (
                      <Stagger key={i} active={activeIdx === 7} delay={240 + i * 60}>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200/60">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-gray-600 text-sm">{item}</span>
                        </div>
                      </Stagger>
                    ))}
                  </div>
                </div>
                <Stagger active={activeIdx === 7} delay={300} className="w-full">
                  <DemoBooking />
                </Stagger>
              </div>
            </div>
          </Slide>

          {/* ══════════════════════════════════════════
              8. FINAL CTA
              ══════════════════════════════════════════ */}
          <Slide idx={8} active={activeIdx === 8} className={S_DARK}>
            <div className="h-full flex flex-col items-center justify-center px-5 sm:px-10">
              <div className="text-center max-w-2xl mx-auto">
                <Stagger active={activeIdx === 8} delay={0}>
                  <NextImage src="/logo-white.png" alt="Immivo" width={480} height={480} className="mx-auto mb-6 sm:mb-8 w-32 sm:w-40 lg:w-48 h-auto" />
                </Stagger>
                <Stagger active={activeIdx === 8} delay={100}>
                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3 sm:mb-4">{t('cta.title')}</h2>
                </Stagger>
                <Stagger active={activeIdx === 8} delay={200}>
                  <p className="text-xs sm:text-base text-gray-400 mb-8 sm:mb-10 max-w-lg mx-auto">{t('cta.subtitle')}</p>
                </Stagger>
                <Stagger active={activeIdx === 8} delay={300}>
                  <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8 sm:mb-10">
                    <Link href="/login?mode=register" className="group w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 shadow-[0_0_40px_rgba(255,255,255,0.08)]">
                      {t('cta.primary')}<ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                    <a href="mailto:office@immivo.ai" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold text-gray-300 border border-white/15 rounded-full hover:bg-white/5 transition-all duration-300">
                      {t('cta.secondary')}
                    </a>
                  </div>
                </Stagger>
                <Stagger active={activeIdx === 8} delay={400}>
                  <div className="flex justify-center items-center gap-2 flex-wrap">
                    {[t('cta.google'), t('cta.microsoft')].map((name, i) => (
                      <div key={i} className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-xs font-medium text-gray-500">{name}</div>
                    ))}
                  </div>
                </Stagger>
              </div>
            </div>
          </Slide>

          {/* ══════════════════════════════════════════
              9. FOOTER
              ══════════════════════════════════════════ */}
          <Slide idx={9} active={activeIdx === 9} className="bg-white">
            <div className="h-full relative overflow-hidden">
              {/* Large text — overlaps with footer top edge */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '28vh' }}>
                <h2
                  className="text-[20vw] sm:text-[16vw] lg:text-[13vw] font-bold tracking-tighter leading-[0.85] text-center select-none"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.07) 60%, transparent 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    opacity: activeIdx === 9 ? 1 : 0,
                    transform: activeIdx === 9 ? 'translateY(0)' : 'translateY(60px)',
                    transition: 'opacity 1.8s cubic-bezier(0.16, 1, 0.3, 1), transform 2s cubic-bezier(0.16, 1, 0.3, 1)',
                    transitionDelay: activeIdx === 9 ? '400ms' : '0ms',
                  }}
                >
                  Stress Less
                </h2>
              </div>

              {/* Footer pinned to bottom with padding + rounded top */}
              <div
                className="absolute inset-x-0 bottom-0"
                style={{
                  opacity: activeIdx === 9 ? 1 : 0,
                  transform: activeIdx === 9 ? 'translateY(0)' : 'translateY(40px)',
                  transition: 'opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
                  transitionDelay: '300ms',
                }}
              >
                <div className="overflow-hidden mx-auto mb-[10px]" style={{ maxWidth: 'calc(100vw - 20px)' }}>
                  <PublicFooter bare />
                </div>
              </div>
            </div>
          </Slide>

        </div>
      </div>
    </div>
  );
}
