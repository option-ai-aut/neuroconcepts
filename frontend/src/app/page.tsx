'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { 
  Bot, TrendingUp, Clock, ArrowRight, CheckCircle2, Sparkles,
  Users, Building2, Mail, Calendar, FileText, Zap, Shield,
  ChevronRight, Star, Quote, BarChart3,
  MessageSquare, Brain, Rocket, Target, Award, Globe, Image,
  Wand2, Server
} from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

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
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.6); }
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
      `}</style>

      {/* Navigation */}
      <PublicNavigation currentPage="home" />

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[80vh] lg:min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          {/* Gradient Mesh */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/50" />
          
          {/* Animated Orbs */}
          <div 
            className="absolute top-1/4 left-1/4 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-indigo-400/20 rounded-full blur-3xl animate-float-slow"
            style={{ transform: `translate(${mousePosition.x * 2}px, ${mousePosition.y * 2}px)` }}
          />
          <div 
            className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] sm:w-[500px] sm:h-[500px] bg-violet-400/20 rounded-full blur-3xl animate-float"
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
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Text Content */}
            <div className="text-left">
              <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-600 text-xs sm:text-sm font-medium mb-5 sm:mb-8 border border-indigo-200/50 backdrop-blur-sm">
                <span className="flex w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Jarvis 1.0
              </div>
              
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-4 sm:mb-6 leading-[1.05]">
                Dein Büro arbeitet.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 animate-gradient">
                  Du verdienst.
                </span>
              </h1>
              
              <p className="text-base sm:text-xl text-gray-600 mb-6 sm:mb-10 leading-relaxed max-w-xl">
                Immivo ist das erste <strong>vollständig KI-gesteuerte</strong> Betriebssystem für Immobilienmakler. 
                Jarvis übernimmt dein Tagesgeschäft — du konzentrierst dich auf Abschlüsse.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12">
                <Link 
                  href="/login" 
                  className="group inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full hover:shadow-xl hover:shadow-indigo-500/30 transition-all hover:-translate-y-1"
                >
                  14 Tage kostenlos testen
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a 
                  href="#demo" 
                  onClick={(e) => handleAnchorClick(e, 'demo')}
                  className="group inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all hover:-translate-y-1 shadow-sm"
                >
                  <Calendar className="mr-2 w-5 h-5 text-indigo-600" />
                  Demo buchen
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-500">
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
                        <p className="text-xs text-indigo-400 mt-1">automatisch</p>
                      </div>
                    </div>

                    {/* Jarvis Chat Preview */}
                    <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 rounded-xl p-4 border border-indigo-500/30">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse-glow">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-indigo-300 mb-1">Jarvis • Gerade eben</p>
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
                        { icon: FileText, text: 'Exposé erstellt: 3-Zi-Wohnung Berlin', time: 'vor 8 Min', color: 'text-violet-400' },
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
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-indigo-600" />
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
            <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">Das Problem</span>
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
      <section id="jarvis" className="py-12 sm:py-24 bg-gradient-to-br from-gray-900 via-indigo-950 to-violet-950 text-white overflow-hidden">
        <div 
          ref={section2.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${section2.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-16 items-center">
            {/* Left: Jarvis Introduction */}
            <div>
              <div className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full bg-white/10 text-indigo-300 text-xs sm:text-sm font-medium mb-4 sm:mb-6 border border-white/10">
                <Brain className="w-4 h-4 mr-2" />
                Powered by OpenAI GPT-5
              </div>
              
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
                Triff <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Jarvis</span>,
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
                  'Bearbeitet Bilder mit KI-Staging (Möbel einbauen)',
                  'Eskaliert automatisch bei komplexen Fällen'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center flex-shrink-0">
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

              {/* Desktop: Orbit Visualization */}
              <div className="hidden lg:flex relative items-center justify-center">
                <div className="w-40 h-40 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center animate-pulse-glow z-10">
                  <Bot className="w-20 h-20 text-white" />
                </div>
                
                {/* Orbiting Capabilities - pre-calculated positions to avoid hydration mismatch */}
                {[
                  { icon: Mail, label: 'E-Mails', x: 140, y: 0 },
                  { icon: Calendar, label: 'Termine', x: 70, y: 121 },
                  { icon: FileText, label: 'Exposés', x: -70, y: 121 },
                  { icon: Users, label: 'Leads', x: -140, y: 0 },
                  { icon: Building2, label: 'Objekte', x: -70, y: -121 },
                  { icon: MessageSquare, label: 'Chat', x: 70, y: -121 },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`absolute w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center border border-white/20 hover:bg-white/20 transition-all cursor-pointer group animate-float`}
                    style={{ 
                      transform: `translate(${item.x}px, ${item.y}px)`,
                      animationDuration: `${3 + i * 0.5}s`,
                      animationDelay: `${i * 0.3}s`,
                    }}
                  >
                    <item.icon className="w-6 h-6 text-white mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] text-gray-300">{item.label}</span>
                  </div>
                ))}

                {/* Connection Lines */}
                <svg className="absolute inset-0 w-full h-full" style={{ transform: 'translate(50%, 50%)' }}>
                  {[
                    { x: 140, y: 0 },
                    { x: 70, y: 121 },
                    { x: -70, y: 121 },
                    { x: -140, y: 0 },
                    { x: -70, y: -121 },
                    { x: 70, y: -121 },
                  ].map((pos, i) => (
                    <line
                      key={i}
                      x1="0"
                      y1="0"
                      x2={pos.x}
                      y2={pos.y}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  ))}
                </svg>
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
            <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">Echte Ergebnisse</span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mt-3 sm:mt-4 mb-4 sm:mb-6">
              Mehr Umsatz. Weniger Stress.
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Unsere Kunden berichten von dramatischen Verbesserungen in Effizienz und Umsatz.
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
                <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 mx-auto mb-2 sm:mb-4" />
                <div className="text-3xl sm:text-5xl font-bold text-gray-900 mb-1 sm:mb-2">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-xs sm:text-base text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 border border-indigo-100">
            <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-8">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-3xl font-bold text-white">MK</span>
              </div>
              <div>
                <Quote className="w-6 h-6 sm:w-10 sm:h-10 text-indigo-300 mb-2 sm:mb-4" />
                <p className="text-sm sm:text-xl text-gray-700 mb-3 sm:mb-4 leading-relaxed">
                  "Seit wir Immivo nutzen, habe ich endlich wieder Zeit für das, was ich liebe: 
                  Kunden beraten und Deals abschließen. Jarvis erledigt den ganzen Papierkram. 
                  <strong> Mein Umsatz ist um 30% gestiegen</strong>, während ich weniger arbeite."
                </p>
                <div>
                  <p className="font-bold text-gray-900">Markus Kellner</p>
                  <p className="text-gray-600">Geschäftsführer, Kellner Immobilien GmbH</p>
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
            <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">Alles inklusive</span>
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
                gradient: 'from-indigo-500 to-violet-500'
              },
              {
                icon: Wand2,
                title: 'KI-Bildbearbeitung',
                description: 'Virtual Staging: Möbel einbauen, Räume umgestalten — ultra-realistisch mit KI.',
                gradient: 'from-fuchsia-500 to-pink-500'
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
                gradient: 'from-pink-500 to-rose-500'
              },
              {
                icon: Mail,
                title: 'E-Mail-Automatisierung',
                description: 'White-Label-Versand über deine Domain. Jarvis antwortet in deinem Namen.',
                gradient: 'from-violet-500 to-purple-500'
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
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                {/* Before/After Slider Simulation */}
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative">
                  {/* Before Side */}
                  <div className="absolute inset-0 w-1/2 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Image className="w-8 h-8 text-gray-600" />
                      </div>
                      <p className="text-gray-600 font-medium">Vorher</p>
                      <p className="text-gray-500 text-sm">Leerer Raum</p>
                    </div>
                  </div>
                  {/* After Side */}
                  <div className="absolute inset-0 left-1/2 w-1/2 bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-indigo-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Wand2 className="w-8 h-8 text-indigo-600" />
                      </div>
                      <p className="text-indigo-600 font-medium">Nachher</p>
                      <p className="text-indigo-500 text-sm">Mit Möbeln</p>
                    </div>
                  </div>
                  {/* Divider */}
                  <div className="absolute inset-y-0 left-1/2 w-1 bg-white shadow-lg transform -translate-x-1/2">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

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
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-fuchsia-50 text-fuchsia-600 text-sm font-medium mb-6 border border-fuchsia-200">
                <Wand2 className="w-4 h-4 mr-2" />
                KI-Bildbearbeitung
              </div>
              
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                Virtual Staging mit
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-pink-500">
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
                    <div className="w-6 h-6 bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>

              <Link 
                href="/login" 
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-fuchsia-500/30 transition-all hover:-translate-y-1"
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
            <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">So funktioniert&apos;s</span>
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
                title: 'Trainieren',
                description: 'Lade deine Objekte hoch und zeig Jarvis deine Vorlagen. Er lernt sofort.',
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
                  <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-indigo-200 to-transparent -translate-x-1/2" />
                )}
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center">
                      <item.icon className="w-10 h-10 text-indigo-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
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
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-6 border border-indigo-200">
                <Calendar className="w-4 h-4 mr-2" />
                Persönliche Demo
              </div>
              
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                Erlebe Immivo
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
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

            {/* Calendar Placeholder */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Wähle einen Termin
              </h3>
              <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
                <Calendar className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                <p className="text-gray-600 mb-6">
                  Unser Kalender wird in Kürze hier eingebunden.
                </p>
                <a 
                  href="mailto:hello@immivo.ai?subject=Demo-Anfrage"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                >
                  Per E-Mail anfragen
                  <ArrowRight className="ml-2 w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-24 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-white/10 rounded-full blur-3xl" />
        </div>

        <div 
          ref={section6.ref}
          className={`max-w-4xl mx-auto px-4 text-center relative z-10 ${section6.isInView ? 'animate-scale-in' : 'opacity-0'}`}
        >
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-8 border border-white/20">
            <Star className="w-4 h-4 mr-2 text-yellow-300" />
            14 Tage kostenlos • Keine Kreditkarte
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6">
            Bereit, dein Business zu transformieren?
          </h2>
          <p className="text-base sm:text-xl text-white/80 mb-6 sm:mb-10 max-w-2xl mx-auto">
            Schließe dich hunderten Maklern an, die mit Immivo mehr verdienen und weniger arbeiten. 
            Starte heute — in 5 Minuten bist du live.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link 
              href="/login" 
              className="group inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold text-indigo-600 bg-white rounded-full hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Jetzt kostenlos starten
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="mailto:hello@immivo.ai" 
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white border-2 border-white/30 rounded-full hover:bg-white/10 transition-all"
            >
              Persönliche Demo buchen
            </a>
          </div>

          {/* Trust Logos */}
          <div className="mt-8 sm:mt-16 pt-6 sm:pt-8 border-t border-white/20">
            <p className="text-sm text-white/60 mb-6">Integriert mit den Tools, die du bereits nutzt</p>
            <div className="flex justify-center items-center gap-8 flex-wrap opacity-70">
              {['Alle gängigen Portale', 'Google Workspace', 'Microsoft 365'].map((name, i) => (
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
