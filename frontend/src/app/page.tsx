'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { 
  Bot, TrendingUp, Clock, ArrowRight, CheckCircle2,
  Users, Building2, Mail, Calendar, FileText, Zap, Shield,
  ChevronRight, Star, BarChart3,
  MessageSquare, Brain, Rocket, Target, Award, Globe,
  Wand2, Server
} from 'lucide-react';
import NextImage from 'next/image';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';
import DemoBooking from '@/components/DemoBooking';

// Intersection Observer Hook for scroll animations
function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.1, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
}

// Animated Counter Component
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, isInView } = useInView();

  useEffect(() => {
    if (!isInView) return;
    
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// Floating Animation Component
function FloatingElement({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div 
      className="animate-float"
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

// Before/After Slider Component
function BeforeAfterSlider() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      updatePosition(clientX);
    };
    const handleUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden shadow-2xl cursor-col-resize select-none"
      onMouseDown={(e) => { setIsDragging(true); updatePosition(e.clientX); }}
      onTouchStart={(e) => { setIsDragging(true); updatePosition(e.touches[0].clientX); }}
    >
      <div className="aspect-[4/3] relative">
        {/* After (full background) */}
        <NextImage src="/Neu.jpg" alt="Nachher — Möbliert mit KI" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />
        {/* Before (clipped) */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
          <NextImage src="/Alt.jpg" alt="Vorher — Leerer Raum" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" style={{ minWidth: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%' }} priority />
        </div>
        {/* Labels */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full z-20 pointer-events-none">Vorher</div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-full z-20 pointer-events-none">Nachher</div>
        {/* Slider Handle */}
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

export default function LandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  // Parallax effect on mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: (e.clientX - rect.left - rect.width / 2) / 50,
          y: (e.clientY - rect.top - rect.height / 2) / 50,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Smooth scroll handler for anchor links
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Scroll animations
  const section1 = useInView();
  const section2 = useInView();
  const section3 = useInView();
  const section4 = useInView();
  const section5 = useInView();
  const section6 = useInView();

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden scroll-smooth">
      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 0, 0, 0.2); }
          50% { box-shadow: 0 0 40px rgba(0, 0, 0, 0.3); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-gradient { 
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        .animate-slide-up { animation: slide-up 0.8s ease-out forwards; }
        .animate-slide-in-left { animation: slide-in-left 0.8s ease-out forwards; }
        .animate-slide-in-right { animation: slide-in-right 0.8s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.6s ease-out forwards; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-600 { animation-delay: 0.6s; }
        @keyframes particle-out {
          0% {
            transform: translate(-50%, -50%) rotate(var(--particle-angle)) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--particle-angle)) translateX(var(--particle-distance));
            opacity: 0;
          }
        }
      `}</style>

      {/* Navigation */}
      <PublicNavigation currentPage="home" />

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[85vh] sm:min-h-[80vh] lg:min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          {/* Gradient Mesh */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-gray-50/80 to-gray-100/50" />
          
          {/* Animated Orbs */}
          <div 
            className="absolute top-1/4 left-1/4 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-gray-300/30 rounded-full blur-3xl animate-float-slow"
            style={{ transform: `translate(${mousePosition.x * 2}px, ${mousePosition.y * 2}px)` }}
          />
          <div 
            className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] sm:w-[500px] sm:h-[500px] bg-gray-300/20 rounded-full blur-3xl animate-float"
            style={{ transform: `translate(${-mousePosition.x * 1.5}px, ${-mousePosition.y * 1.5}px)` }}
          />
          <div 
            className="absolute top-1/2 right-1/3 w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] bg-blue-400/10 rounded-full blur-3xl"
            style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)` }}
          />
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 sm:pb-16">

          {/* ===== MOBILE HERO (< lg) ===== */}
          <div className="lg:hidden flex flex-col items-center text-center pt-8 pb-4">
            <NextImage 
              src="/logo-black.png" 
              alt="Immivo" 
              width={200} 
              height={200} 
              className="w-32 sm:w-44 h-auto mb-8"
              priority
            />
            
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-4 leading-[1.08]">
              Dein Büro arbeitet.
              <br />
              <span className="text-gray-400">Du verdienst.</span>
            </h1>
            
            <p className="text-base sm:text-lg text-gray-500 mb-8 leading-relaxed max-w-md">
              Das erste <strong className="text-gray-700">KI-gesteuerte Betriebssystem</strong> für Immobilienmakler.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-6">
              <Link 
                href="/login?mode=register" 
                className="group inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-gray-900 rounded-full shadow-lg"
              >
                Kostenlos testen
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <a 
                href="#demo" 
                onClick={(e) => handleAnchorClick(e, 'demo')}
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-full shadow-sm"
              >
                Demo buchen
              </a>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                Keine Kreditkarte
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                7 Tage gratis
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-gray-400" />
                DSGVO
              </span>
            </div>
          </div>

          {/* ===== DESKTOP HERO (lg+) ===== */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Text Content */}
            <div className="text-left">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-blue-600 text-sm font-medium mb-8 border border-gray-200 backdrop-blur-sm">
                <span className="flex w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Jarvis 1.0
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.05]">
                Dein Büro arbeitet.
                <br />
                <span className="font-extrabold text-gray-900">
                  Du verdienst.
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-xl">
                Immivo ist das erste <strong>vollständig KI-gesteuerte</strong> Betriebssystem für Immobilienmakler. 
                Jarvis übernimmt dein Tagesgeschäft — du konzentrierst dich auf Abschlüsse.
              </p>
              
              <div className="flex flex-row gap-4 mb-12">
                <Link 
                  href="/login?mode=register" 
                  className="group inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-gray-900 rounded-full hover:shadow-xl hover:shadow-gray-500/20 transition-all hover:-translate-y-1"
                >
                  Kostenlos testen
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a 
                  href="#demo" 
                  onClick={(e) => handleAnchorClick(e, 'demo')}
                  className="group inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all hover:-translate-y-1 shadow-sm"
                >
                  <Calendar className="mr-2 w-5 h-5 text-blue-600" />
                  Demo buchen
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Keine Kreditkarte
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  DSGVO-konform
                </div>
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-orange-500" />
                  AWS Hosting EU
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  Sichere Bezahlung via Stripe
                </div>
              </div>
            </div>

            {/* Right: Hero Image / Dashboard Preview */}
            <div className="relative hidden lg:block">
              <FloatingElement delay={0}>
                <div className="relative rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl border border-gray-700/50 p-1 transform perspective-1000 hover:scale-[1.02] transition-transform duration-500">
                  {/* Browser Chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/50">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-gray-700/50 rounded-lg px-4 py-1.5 text-xs text-gray-400 text-center">
                        app.immivo.ai
                      </div>
                    </div>
                  </div>
                  
                  {/* Dashboard Preview */}
                  <div className="p-4 space-y-4">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 mb-1">Neue Leads heute</p>
                        <p className="text-2xl font-bold text-white">12</p>
                        <p className="text-xs text-green-400 mt-1">+23% ↑</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 mb-1">Termine gebucht</p>
                        <p className="text-2xl font-bold text-white">8</p>
                        <p className="text-xs text-green-400 mt-1">von Jarvis</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 mb-1">Exposés gesendet</p>
                        <p className="text-2xl font-bold text-white">15</p>
                        <p className="text-xs text-blue-400 mt-1">automatisch</p>
                      </div>
                    </div>

                    {/* Jarvis Chat Preview */}
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-xl p-4 border border-gray-600/30">
                      <div className="flex items-start gap-3">
                        <NextImage src="/logo-icon.png" alt="Jarvis" width={40} height={40} className="flex-shrink-0 animate-pulse-glow rounded-xl" />
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Jarvis • Gerade eben</p>
                          <p className="text-sm text-white">
                            Ich habe 3 neue Anfragen bearbeitet, Exposés versendet und einen Besichtigungstermin für morgen 14 Uhr eingetragen. Alles erledigt! 🎯
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="space-y-2">
                      {[
                        { icon: Mail, text: 'Lead qualifiziert: Familie Müller', time: 'vor 2 Min', color: 'text-blue-400' },
                        { icon: Calendar, text: 'Besichtigung gebucht: Penthouse Wien', time: 'vor 5 Min', color: 'text-green-400' },
                        { icon: FileText, text: 'Exposé erstellt: 3-Zi-Wohnung Berlin', time: 'vor 8 Min', color: 'text-gray-400' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-800/30 rounded-lg px-3 py-2">
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                          <span className="text-xs text-gray-300 flex-1">{item.text}</span>
                          <span className="text-xs text-gray-500">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </FloatingElement>

              {/* Floating Badges */}
              <div className="absolute -left-8 top-1/4 animate-float" style={{ animationDelay: '1s' }}>
                <div className="bg-white rounded-xl shadow-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Zeitersparnis</p>
                      <p className="text-sm font-bold text-gray-900">15h/Woche</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 bottom-1/4 animate-float" style={{ animationDelay: '2s' }}>
                <div className="bg-white rounded-xl shadow-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Antwortzeit</p>
                      <p className="text-sm font-bold text-gray-900">&lt; 30 Sek</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Problem / Why Section */}
      <section id="warum" className="py-12 sm:py-24 bg-gray-50">
        <div 
          ref={section1.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${section1.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <div className="text-center mb-8 sm:mb-16">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Das Problem</span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mt-3 sm:mt-4 mb-4 sm:mb-6">
              Du bist Makler, kein Sachbearbeiter.
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">
              80% deiner Zeit geht für E-Mails, Terminabsprachen und Papierkram drauf. 
              Nur 20% für das, was wirklich zählt: Kunden treffen und Deals abschließen.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
            {[
              {
                icon: Mail,
                title: 'E-Mail-Flut',
                problem: '50+ E-Mails täglich',
                solution: 'Jarvis antwortet in Sekunden',
                color: 'from-red-500 to-orange-500'
              },
              {
                icon: Calendar,
                title: 'Termin-Chaos',
                problem: '3-5 Mails pro Termin',
                solution: 'Automatische Buchung',
                color: 'from-orange-500 to-amber-500'
              },
              {
                icon: FileText,
                title: 'Exposé-Marathon',
                problem: '2h pro Exposé',
                solution: '2 Minuten mit KI',
                color: 'from-amber-500 to-yellow-500'
              }
            ].map((item, i) => (
              <div 
                key={i} 
                className={`group relative bg-white rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${section1.isInView ? 'animate-slide-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-red-500 text-lg">✗</span>
                    <span className="text-gray-600">{item.problem}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-500 text-lg">✓</span>
                    <span className="text-gray-900 font-medium">{item.solution}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Jarvis AI Section */}
      <section id="jarvis" className="py-12 sm:py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
        <div 
          ref={section2.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${section2.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-16 items-center">
            {/* Left: Jarvis Introduction */}
            <div>
              <div className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full bg-white/10 text-gray-300 text-xs sm:text-sm font-medium mb-4 sm:mb-6 border border-white/10">
                <Brain className="w-4 h-4 mr-2" />
                Powered by OpenAI GPT-5
              </div>
              
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
                Triff <span className="text-gray-200">Jarvis</span>,
                <br />deinen KI-Assistenten.
              </h2>
              
              <p className="text-base sm:text-xl text-gray-300 mb-6 sm:mb-8 leading-relaxed">
                Jarvis ist kein Chatbot. Er ist ein vollwertiger Mitarbeiter, der dein Business versteht. 
                Er liest E-Mails, qualifiziert Leads, erstellt Exposés und bucht Termine — 
                <strong className="text-white"> 24/7, ohne Pause, ohne Fehler.</strong>
              </p>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-10">
                {[
                  'Vollständiger Zugriff auf CRM, E-Mails, Kalender & Objekte',
                  'Erstellt professionelle Exposés in Sekunden',
                  'Bearbeitet Bilder mit KI-Staging (Möbel einbauen)'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-200">{item}</span>
                  </div>
                ))}
              </div>

              <Link 
                href="/login" 
                className="inline-flex items-center px-6 py-3 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 transition-all hover:-translate-y-1 shadow-lg"
              >
                Jarvis kennenlernen
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>

            {/* Right: Jarvis Capabilities Visualization */}
            <div className="relative">
              {/* Mobile: Simple Grid */}
              <div className="grid grid-cols-3 gap-3 lg:hidden">
                {[
                  { icon: Mail, label: 'E-Mails' },
                  { icon: Calendar, label: 'Termine' },
                  { icon: FileText, label: 'Exposés' },
                  { icon: Users, label: 'Leads' },
                  { icon: Building2, label: 'Objekte' },
                  { icon: MessageSquare, label: 'Chat' },
                ].map((item, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex flex-col items-center justify-center border border-white/20">
                    <item.icon className="w-6 h-6 text-white mb-1.5" />
                    <span className="text-xs text-gray-300">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Desktop: Logo with Particles */}
              <div className="hidden lg:flex relative items-center justify-center h-[360px]">
                {/* Particles shooting outward */}
                {Array.from({ length: 20 }).map((_, i) => {
                  const angle = (i / 20) * 360;
                  const delay = i * 0.4;
                  const duration = 3 + (i % 5) * 0.8;
                  const distance = 140 + (i % 4) * 40;
                  const size = 2 + (i % 3);
                  return (
                    <div
                      key={i}
                      className="absolute rounded-full bg-white"
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        left: '50%',
                        top: '50%',
                        opacity: 0,
                        animation: `particle-out ${duration}s ease-out ${delay}s infinite`,
                        ['--particle-angle' as string]: `${angle}deg`,
                        ['--particle-distance' as string]: `${distance}px`,
                      }}
                    />
                  );
                })}

                {/* Main Logo */}
                <NextImage 
                  src="/logo-icon-only.png" 
                  alt="Jarvis" 
                  width={280} 
                  height={280} 
                  className="relative z-10 drop-shadow-[0_0_80px_rgba(255,255,255,0.15)]"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results / ROI Section */}
      <section id="ergebnisse" className="py-12 sm:py-24 bg-white">
        <div 
          ref={section3.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${section3.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <div className="text-center mb-8 sm:mb-16">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Das Ergebnis</span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mt-3 sm:mt-4 mb-4 sm:mb-6">
              Mehr Umsatz. Weniger Stress.
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Immivo automatisiert dein Tagesgeschäft — so kannst du dich auf das konzentrieren, was wirklich zählt.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 mb-8 sm:mb-16">
            {[
              { value: 15, suffix: 'h', label: 'Zeitersparnis pro Woche', icon: Clock },
              { value: 40, suffix: '%', label: 'Mehr qualifizierte Leads', icon: Target },
              { value: 3, suffix: 'x', label: 'Schnellere Reaktionszeit', icon: Zap },
              { value: 25, suffix: '%', label: 'Höhere Abschlussquote', icon: TrendingUp },
            ].map((stat, i) => (
              <div 
                key={i} 
                className="text-center p-4 sm:p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:shadow-lg transition-all"
              >
                <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 mx-auto mb-2 sm:mb-4" />
                <div className="text-3xl sm:text-5xl font-bold text-gray-900 mb-1 sm:mb-2">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-xs sm:text-base text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* 24 Portale Integration */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 border border-gray-700">
            <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-8">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Globe className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
                  24 Immobilienportale — ein Klick.
                </h3>
                <p className="text-sm sm:text-lg text-gray-300 mb-3 sm:mb-4 leading-relaxed">
                  Verbinde deine Portale und pushe Objekte mit einem Klick auf ImmoScout24, Willhaben, 
                  Immowelt, Homegate, Kleinanzeigen und 19 weitere Portale. Keine manuelle Arbeit, keine Fehler.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['ImmoScout24', 'Willhaben', 'Immowelt', 'Homegate', 'Kleinanzeigen', '+19 weitere'].map((portal, i) => (
                    <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium ${i === 5 ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300 border border-white/10'}`}>
                      {portal}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-12 sm:py-24 bg-gray-50">
        <div 
          ref={section4.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${section4.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <div className="text-center mb-8 sm:mb-16">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Alles inklusive</span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mt-3 sm:mt-4 mb-4 sm:mb-6">
              Ein System. Unendliche Möglichkeiten.
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Immivo ersetzt dein CRM, deine E-Mail-Tools und deine Exposé-Software — in einer einzigen, KI-gesteuerten Plattform.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {[
              {
                icon: Bot,
                title: 'Jarvis KI-Assistent',
                description: '24/7 verfügbar, beantwortet Anfragen in Sekunden, qualifiziert Leads automatisch.',
                gradient: 'from-gray-700 to-gray-800'
              },
              {
                icon: Wand2,
                title: 'KI-Bildbearbeitung',
                description: 'Virtual Staging: Möbel einbauen, Räume umgestalten — ultra-realistisch mit KI.',
                gradient: 'from-gray-600 to-gray-700'
              },
              {
                icon: Users,
                title: 'Intelligentes CRM',
                description: 'Leads mit Anrede, Du/Sie-Präferenz, Suchprofilen und automatischer Qualifizierung.',
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Building2,
                title: 'Objektverwaltung',
                description: 'Alle Immobilien an einem Ort mit Energieausweis, Bildern und Portal-Sync.',
                gradient: 'from-emerald-500 to-teal-500'
              },
              {
                icon: FileText,
                title: 'KI-Exposé-Editor',
                description: 'Professionelle Exposés in Minuten. Mit Templates, Variablen und Live-Vorschau.',
                gradient: 'from-orange-500 to-amber-500'
              },
              {
                icon: Calendar,
                title: 'Kalender-Integration',
                description: 'Automatische Terminbuchung direkt in Google Calendar oder Outlook.',
                gradient: 'from-gray-500 to-gray-600'
              },
              {
                icon: Mail,
                title: 'E-Mail-Automatisierung',
                description: 'White-Label-Versand über deine Domain. Jarvis antwortet in deinem Namen.',
                gradient: 'from-gray-600 to-gray-700'
              },
              {
                icon: Globe,
                title: 'Portal-Anbindung',
                description: 'Alle gängigen Portale — ImmoScout, Willhaben, Immowelt und mehr.',
                gradient: 'from-cyan-500 to-blue-500'
              },
              {
                icon: BarChart3,
                title: 'Analytics & Reports',
                description: 'Echtzeit-Dashboards mit Conversion-Rates, Lead-Quellen und Performance.',
                gradient: 'from-amber-500 to-orange-500'
              },
              {
                icon: Shield,
                title: 'AWS Hosting EU',
                description: 'DSGVO-konform auf AWS Frankfurt. Verschlüsselte Daten, höchste Sicherheit.',
                gradient: 'from-slate-500 to-gray-500'
              },
            ].map((feature, i) => (
              <div 
                key={i}
                className="group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${feature.gradient} rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Image Editing / Virtual Staging Section */}
      <section id="bildbearbeitung" className="py-12 sm:py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-16 items-center">
            {/* Left: Image Preview */}
            <div className="relative">
              <BeforeAfterSlider />

              {/* Floating Stats */}
              <div className="absolute -right-2 sm:-right-4 -bottom-2 sm:-bottom-4 bg-white rounded-xl shadow-xl p-3 sm:p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Mehr Aufmerksamkeit</p>
                    <p className="text-lg font-bold text-gray-900">+73%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium mb-6 border border-gray-200">
                <Wand2 className="w-4 h-4 mr-2" />
                KI-Bildbearbeitung
              </div>
              
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                Virtual Staging mit
                <br />
                <span className="text-gray-900">
                  KI-Präzision
                </span>
              </h2>
              
              <p className="text-base sm:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed">
                Verwandle leere Räume in einladende Wohnträume. Unsere KI fügt 
                <strong className="text-gray-900"> ultra-realistische Möbel</strong> ein — 
                in Sekunden, nicht Stunden.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  'Möbel automatisch einbauen — passend zum Raum',
                  'Verschiedene Einrichtungsstile wählbar',
                  'Erhöht die Vorstellungskraft der Interessenten',
                  'Mehr Klicks, mehr Anfragen, schnellere Verkäufe'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>

              <Link 
                href="/login" 
                className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-gray-500/20 transition-all hover:-translate-y-1"
              >
                Jetzt ausprobieren
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-24 bg-gray-50">
        <div 
          ref={section5.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${section5.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <div className="text-center mb-8 sm:mb-16">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">So funktioniert&apos;s</span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mt-3 sm:mt-4 mb-4 sm:mb-6">
              In 3 Schritten zur KI-Automatisierung
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                step: '01',
                title: 'Verbinden',
                description: 'Verknüpfe deine E-Mail, deinen Kalender und deine Portale. Dauert 5 Minuten.',
                icon: Rocket
              },
              {
                step: '02',
                title: 'Einrichten',
                description: 'Lade deine Objekte hoch und erstelle Exposé-Vorlagen — selbst im Editor oder lass Jarvis sie für dich generieren.',
                icon: Brain
              },
              {
                step: '03',
                title: 'Entspannen',
                description: 'Jarvis übernimmt. Du bekommst nur noch Benachrichtigungen bei wichtigen Events.',
                icon: Award
              }
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-gray-200 to-transparent -translate-x-1/2" />
                )}
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                      <item.icon className="w-10 h-10 text-gray-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-12 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-16 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-blue-600 text-sm font-medium mb-6 border border-gray-200">
                <Calendar className="w-4 h-4 mr-2" />
                Persönliche Demo
              </div>
              
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                Erlebe Immivo
                <br />
                <span className="text-gray-900">
                  live in Aktion
                </span>
              </h2>
              
              <p className="text-base sm:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed">
                In einer 30-minütigen Demo zeigen wir dir, wie Jarvis dein Tagesgeschäft 
                revolutioniert. Keine Verpflichtungen, keine Verkaufsgespräche — nur Mehrwert.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  'Individuelle Beratung für dein Business',
                  'Live-Demonstration aller Features',
                  'Antworten auf alle deine Fragen',
                  'Unverbindlich und kostenlos'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Demo Booking Calendar */}
            <DemoBooking />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-24 bg-gray-900 text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-white/10 rounded-full blur-3xl" />
        </div>

        <div 
          ref={section6.ref}
          className={`max-w-4xl mx-auto px-4 text-center relative z-10 ${section6.isInView ? 'animate-scale-in' : 'opacity-0'}`}
        >
          <NextImage src="/logo-white.png" alt="Immivo" width={120} height={120} className="mx-auto mb-6 w-20 sm:w-28 h-auto" />

          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-8 border border-white/20">
            <Star className="w-4 h-4 mr-2 text-yellow-300" />
            7 Tage kostenlos testen • Keine Kreditkarte
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6">
            Bereit, dein Business zu transformieren?
          </h2>
          <p className="text-base sm:text-xl text-white/80 mb-6 sm:mb-10 max-w-2xl mx-auto">
            Starte jetzt mit Immivo — in 5 Minuten bist du live. 
            Mehr Abschlüsse, weniger Büroarbeit, ab dem ersten Tag.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link 
              href="/login?mode=register" 
              className="group inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Jetzt kostenlos starten
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="mailto:office@immivo.ai" 
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white border-2 border-white/30 rounded-full hover:bg-white/10 transition-all"
            >
              Persönliche Demo buchen
            </a>
          </div>

          {/* Trust Logos */}
          <div className="mt-8 sm:mt-16 pt-6 sm:pt-8 border-t border-white/20">
            <p className="text-sm text-white/60 mb-6">Verbunden mit 24+ Portalen und den Tools, die du nutzt</p>
            <div className="flex justify-center items-center gap-4 sm:gap-8 flex-wrap opacity-70">
              {['24 Immobilienportale', 'Google Workspace', 'Microsoft 365'].map((name, i) => (
                <div key={i} className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
