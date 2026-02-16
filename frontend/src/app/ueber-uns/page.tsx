'use client';

import Link from 'next/link';
import { Mail, MapPin, ArrowRight, Sparkles, Shield, Users, Target, Zap, Globe, Code, TrendingUp } from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

export default function UeberUnsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="ueber-uns" />

      {/* Hero — Bold, full-width */}
      <section className="relative pt-24 sm:pt-32 pb-20 sm:pb-32 bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 text-sm font-medium mb-8 border border-white/10">
            <Zap className="w-4 h-4 mr-2" />
            Gegründet 2026 in Wien
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold mb-6 leading-tight">
            Wir machen Makler<br />
            <span className="text-gray-400">unaufhaltbar.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Immivo ist das erste vollständig KI-gesteuerte Betriebssystem für die Immobilienbranche. 
            Zwei Gründer, eine Mission: Makler von Büroarbeit befreien.
          </p>
        </div>
      </section>

      {/* Story — Engaging narrative */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Die Geschichte</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-3 mb-6">
                Vom Frust zur Lösung
              </h2>
              <div className="space-y-4 text-gray-600 text-base sm:text-lg leading-relaxed">
                <p>
                  Anfang 2026. Wien. Zwei Gründer sitzen in einem Kaffeehaus und reden über ein Problem, 
                  das die gesamte Immobilienbranche betrifft: Makler verbringen 80% ihrer Zeit mit E-Mails, 
                  Papierkram und Organisation — statt mit dem, wofür sie eigentlich brennen.
                </p>
                <p>
                  Die Idee war einfach: Was wäre, wenn ein KI-Assistent das gesamte Tagesgeschäft übernimmt? 
                  Nicht ein weiteres CRM. Nicht noch ein Tool. Ein komplettes Betriebssystem, das mitdenkt.
                </p>
                <p className="font-medium text-gray-900">
                  Aus dieser Idee wurde Immivo — und aus dem Assistenten wurde Jarvis.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Code, label: 'Entwickelt', value: 'in Wien' },
                { icon: Globe, label: 'Portale', value: '24+' },
                { icon: Shield, label: 'Hosting', value: 'AWS EU' },
                { icon: TrendingUp, label: 'Gründung', value: '2026' },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center">
                  <item.icon className="w-6 h-6 text-gray-900 mx-auto mb-3" />
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                  <p className="text-sm text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Founders — Josef first, no quotes */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Das Team</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-3">
              Die Gründer
            </h2>
            <p className="text-gray-600 mt-3 max-w-xl mx-auto">Die Köpfe hinter Immivo.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Josef Leutgeb — First */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  JL
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Josef Leutgeb</h3>
                  <p className="text-blue-600 font-medium">Co-Founder & CEO</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Strategie, Vertrieb & Unternehmensentwicklung
              </p>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <a href="mailto:josef.leutgeb@immivo.ai" className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                  <Mail className="w-4 h-4" />
                  josef.leutgeb@immivo.ai
                </a>
              </div>
            </div>

            {/* Dennis Kral — Second */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  DK
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Dennis Kral</h3>
                  <p className="text-blue-600 font-medium">Technical Co-Founder & CTO</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Technologie, Produktentwicklung & KI
              </p>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <a href="mailto:dennis.kral@immivo.ai" className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                  <Mail className="w-4 h-4" />
                  dennis.kral@immivo.ai
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Was uns antreibt</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-3">
              Unsere Werte
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Sparkles, title: 'Innovation', description: 'KI ist nicht nur ein Feature — sie ist das Fundament unserer Plattform.' },
              { icon: Target, title: 'Einfachheit', description: 'Komplexe Technologie, die sich anfühlt, als wäre sie einfach.' },
              { icon: Shield, title: 'Vertrauen', description: 'DSGVO-konform. AWS EU. Eure Daten gehören euch.' },
              { icon: Users, title: 'Kundenerfolg', description: 'Wir gewinnen nur, wenn unsere Kunden gewinnen.' },
            ].map((value) => (
              <div key={value.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Info + CTA */}
      <section className="py-16 sm:py-24 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Bereit, die Zukunft zu erleben?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Entdecke, wie Immivo dein Tagesgeschäft transformiert — in einer kostenlosen Demo oder direkt selbst.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/#demo" className="inline-flex items-center px-8 py-4 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 transition-colors">
              Demo buchen
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link href="/login?mode=register" className="inline-flex items-center px-8 py-4 border-2 border-white/30 text-white rounded-full font-semibold hover:bg-white/10 transition-colors">
              Kostenlos starten
            </Link>
          </div>
          <div className="pt-8 border-t border-white/10">
            <p className="font-semibold text-lg mb-4">Dynamo Lab Technologies GmbH</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-gray-400">
              <a href="https://maps.google.com/?q=Sterngasse+3,+1010+Wien" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                <MapPin className="w-4 h-4" /> Sterngasse 3, 1010 Wien
              </a>
              <a href="mailto:office@immivo.ai" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4" /> office@immivo.ai
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
