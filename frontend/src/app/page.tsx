'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { 
  Bot, TrendingUp, Clock, ArrowRight, CheckCircle2, Sparkles,
  Users, Building2, Mail, Calendar, FileText, Zap, Shield,
  ChevronRight, Play, Star, Quote, MousePointer, BarChart3,
  MessageSquare, Brain, Rocket, Target, Award, Globe
} from 'lucide-react';

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

  // Scroll animations
  const section1 = useInView();
  const section2 = useInView();
  const section3 = useInView();
  const section4 = useInView();
  const section5 = useInView();
  const section6 = useInView();

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
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
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">NeuroConcepts</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#warum" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Warum wir</a>
              <a href="#jarvis" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Jarvis KI</a>
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#ergebnisse" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Ergebnisse</a>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Anmelden
              </Link>
              <Link 
                href="/login" 
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/30 transition-all hover:-translate-y-0.5"
              >
                Kostenlos starten
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Full Screen with Video/Image Background */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          {/* Gradient Mesh */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/50" />
          
          {/* Animated Orbs */}
          <div 
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-400/20 rounded-full blur-3xl animate-float-slow"
            style={{ transform: `translate(${mousePosition.x * 2}px, ${mousePosition.y * 2}px)` }}
          />
          <div 
            className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-400/20 rounded-full blur-3xl animate-float"
            style={{ transform: `translate(${-mousePosition.x * 1.5}px, ${-mousePosition.y * 1.5}px)` }}
          />
          <div 
            className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-3xl"
            style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)` }}
          />
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="text-left">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-600 text-sm font-medium mb-8 border border-indigo-200/50 backdrop-blur-sm">
                <span className="flex w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Jarvis 2.0 ist live — Jetzt mit 50+ KI-Tools
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.05]">
                Dein Büro arbeitet.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 animate-gradient">
                  Du verdienst.
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-xl">
                NeuroConcepts ist das erste <strong>vollständig KI-gesteuerte</strong> Betriebssystem für Immobilienmakler. 
                Jarvis übernimmt dein Tagesgeschäft — du konzentrierst dich auf Abschlüsse.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link 
                  href="/login" 
                  className="group inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full hover:shadow-xl hover:shadow-indigo-500/30 transition-all hover:-translate-y-1"
                >
                  14 Tage kostenlos testen
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a 
                  href="#demo" 
                  className="group inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all hover:-translate-y-1 shadow-sm"
                >
                  <Play className="mr-2 w-5 h-5 text-indigo-600" />
                  Demo ansehen
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Keine Kreditkarte
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  DSGVO-konform
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Deutscher Support
                </div>
              </div>
            </div>

            {/* Right: Hero Image / Dashboard Preview */}
            <div className="relative">
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
                        app.neuroconcepts.ai
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

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 rounded-full border-2 border-gray-300 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-gray-400 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Problem / Why Section */}
      <section id="warum" className="py-24 bg-gray-50">
        <div 
          ref={section1.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${section1.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <div className="text-center mb-16">
            <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">Das Problem</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4 mb-6">
              Du bist Makler, kein Sachbearbeiter.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              80% deiner Zeit geht für E-Mails, Terminabsprachen und Papierkram drauf. 
              Nur 20% für das, was wirklich zählt: Kunden treffen und Deals abschließen.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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
                className={`group relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${section1.isInView ? 'animate-slide-up' : 'opacity-0'}`}
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
      <section id="jarvis" className="py-24 bg-gradient-to-br from-gray-900 via-indigo-950 to-violet-950 text-white overflow-hidden">
        <div 
          ref={section2.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${section2.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Jarvis Introduction */}
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 text-indigo-300 text-sm font-medium mb-6 border border-white/10">
                <Brain className="w-4 h-4 mr-2" />
                Powered by Google Gemini 2.0
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Triff <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Jarvis</span>,
                <br />deinen KI-Assistenten.
              </h2>
              
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Jarvis ist kein Chatbot. Er ist ein vollwertiger Mitarbeiter, der dein Business versteht. 
                Er liest E-Mails, qualifiziert Leads, erstellt Exposés und bucht Termine — 
                <strong className="text-white"> 24/7, ohne Pause, ohne Fehler.</strong>
              </p>

              <div className="space-y-4 mb-10">
                {[
                  'Versteht Kontext und antwortet natürlich',
                  'Lernt deine Objekte und Präferenzen',
                  'Spricht Deutsch, Englisch, Französisch, Spanisch',
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
              {/* Central Jarvis Node */}
              <div className="relative flex items-center justify-center">
                <div className="w-40 h-40 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center animate-pulse-glow z-10">
                  <Bot className="w-20 h-20 text-white" />
                </div>
                
                {/* Orbiting Capabilities */}
                {[
                  { icon: Mail, label: 'E-Mails', angle: 0 },
                  { icon: Calendar, label: 'Termine', angle: 60 },
                  { icon: FileText, label: 'Exposés', angle: 120 },
                  { icon: Users, label: 'Leads', angle: 180 },
                  { icon: Building2, label: 'Objekte', angle: 240 },
                  { icon: MessageSquare, label: 'Chat', angle: 300 },
                ].map((item, i) => {
                  const radius = 140;
                  const x = Math.cos((item.angle * Math.PI) / 180) * radius;
                  const y = Math.sin((item.angle * Math.PI) / 180) * radius;
                  return (
                    <div
                      key={i}
                      className="absolute w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center border border-white/20 hover:bg-white/20 transition-all cursor-pointer group"
                      style={{ 
                        transform: `translate(${x}px, ${y}px)`,
                        animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                        animationDelay: `${i * 0.3}s`
                      }}
                    >
                      <item.icon className="w-6 h-6 text-white mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] text-gray-300">{item.label}</span>
                    </div>
                  );
                })}

                {/* Connection Lines */}
                <svg className="absolute inset-0 w-full h-full" style={{ transform: 'translate(50%, 50%)' }}>
                  {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                    const radius = 140;
                    const x = Math.cos((angle * Math.PI) / 180) * radius;
                    const y = Math.sin((angle * Math.PI) / 180) * radius;
                    return (
                      <line
                        key={i}
                        x1="0"
                        y1="0"
                        x2={x}
                        y2={y}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results / ROI Section */}
      <section id="ergebnisse" className="py-24 bg-white">
        <div 
          ref={section3.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${section3.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <div className="text-center mb-16">
            <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">Echte Ergebnisse</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4 mb-6">
              Mehr Umsatz. Weniger Stress.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Unsere Kunden berichten von dramatischen Verbesserungen in Effizienz und Umsatz.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-8 mb-16">
            {[
              { value: 15, suffix: 'h', label: 'Zeitersparnis pro Woche', icon: Clock },
              { value: 40, suffix: '%', label: 'Mehr qualifizierte Leads', icon: Target },
              { value: 3, suffix: 'x', label: 'Schnellere Reaktionszeit', icon: Zap },
              { value: 25, suffix: '%', label: 'Höhere Abschlussquote', icon: TrendingUp },
            ].map((stat, i) => (
              <div 
                key={i} 
                className="text-center p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:shadow-lg transition-all"
              >
                <stat.icon className="w-8 h-8 text-indigo-600 mx-auto mb-4" />
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl p-8 md:p-12 border border-indigo-100">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-bold text-white">MK</span>
              </div>
              <div>
                <Quote className="w-10 h-10 text-indigo-300 mb-4" />
                <p className="text-xl text-gray-700 mb-4 leading-relaxed">
                  "Seit wir NeuroConcepts nutzen, habe ich endlich wieder Zeit für das, was ich liebe: 
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
      <section id="features" className="py-24 bg-gray-50">
        <div 
          ref={section4.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${section4.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <div className="text-center mb-16">
            <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">Alles inklusive</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4 mb-6">
              Ein System. Unendliche Möglichkeiten.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              NeuroConcepts ersetzt dein CRM, deine E-Mail-Tools und deine Exposé-Software — in einer einzigen, KI-gesteuerten Plattform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Bot,
                title: 'Jarvis KI-Assistent',
                description: '24/7 verfügbar, beantwortet Anfragen in Sekunden, qualifiziert Leads automatisch.',
                gradient: 'from-indigo-500 to-violet-500'
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
                description: 'ImmoScout, Willhaben, Immowelt — alle Anfragen automatisch verarbeitet.',
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
                title: 'DSGVO-konform',
                description: 'Hosting in Frankfurt, verschlüsselte Daten, rechtssichere Kommunikation.',
                gradient: 'from-slate-500 to-gray-500'
              },
            ].map((feature, i) => (
              <div 
                key={i}
                className="group bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div 
          ref={section5.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${section5.isInView ? 'animate-slide-up' : 'opacity-0'}`}
        >
          <div className="text-center mb-16">
            <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">So funktioniert's</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4 mb-6">
              In 3 Schritten zur KI-Automatisierung
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>

        <div 
          ref={section6.ref}
          className={`max-w-4xl mx-auto px-4 text-center relative z-10 ${section6.isInView ? 'animate-scale-in' : 'opacity-0'}`}
        >
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-8 border border-white/20">
            <Star className="w-4 h-4 mr-2 text-yellow-300" />
            14 Tage kostenlos • Keine Kreditkarte
          </div>

          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Bereit, dein Business zu transformieren?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Schließe dich hunderten Maklern an, die mit NeuroConcepts mehr verdienen und weniger arbeiten. 
            Starte heute — in 5 Minuten bist du live.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/login" 
              className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-indigo-600 bg-white rounded-full hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Jetzt kostenlos starten
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="mailto:hello@neuroconcepts.ai" 
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-full hover:bg-white/10 transition-all"
            >
              Persönliche Demo buchen
            </a>
          </div>

          {/* Trust Logos */}
          <div className="mt-16 pt-8 border-t border-white/20">
            <p className="text-sm text-white/60 mb-6">Integriert mit den Tools, die du bereits nutzt</p>
            <div className="flex justify-center items-center gap-8 flex-wrap opacity-70">
              {['ImmoScout24', 'Willhaben', 'Immowelt', 'Google', 'Outlook'].map((name, i) => (
                <div key={i} className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center mr-3">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">NeuroConcepts</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Das KI-gesteuerte Betriebssystem für moderne Immobilienmakler. 
                Mehr Abschlüsse, weniger Büro.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">Produkt</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li><a href="#jarvis" className="hover:text-white transition-colors">Jarvis KI</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Preise</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrationen</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Unternehmen</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Über uns</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Karriere</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Kontakt</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Rechtliches</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Datenschutz</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AGB</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Impressum</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie-Einstellungen</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">© 2026 NeuroConcepts AI GmbH. Alle Rechte vorbehalten.</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="flex w-2 h-2 bg-green-500 rounded-full"></span>
              Alle Systeme operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
