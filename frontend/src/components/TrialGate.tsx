'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, Loader2, Zap } from 'lucide-react';
import { safeRedirect } from '@/lib/safeRedirect';
import { getApiUrl, getAuthHeaders } from '@/lib/api';

interface TrialGateProps {
  billingEnabled: boolean;
}

const PLANS = [
  {
    id: 'solo' as const,
    name: 'Solo',
    tagline: 'Für Einzelmakler',
    monthly: 149,
    yearly: 134,
    features: ['Unbegrenzter Mivo', 'Unbegrenztes Bildstudio', '24 Portal-Integrationen', 'KI-Exposé-Editor', 'CRM + Lead-Management', 'Priority Support'],
  },
  {
    id: 'team' as const,
    name: 'Team',
    tagline: 'Für kleine Teams',
    monthly: 699,
    yearly: 629,
    features: ['Alles aus Solo', '5 Seats inklusive', 'Team-Verwaltung', 'Gemeinsame Objekte & Leads', 'Rollen & Berechtigungen'],
    popular: true,
  },
];

export default function TrialGate({ billingEnabled }: TrialGateProps) {
  const router = useRouter();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [freeActivated, setFreeActivated] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleSelect = async (planId: 'solo' | 'team') => {
    setLoading(planId);
    setCheckoutError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiUrl()}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ plan: planId, billingCycle: cycle }),
      });
      const data = await res.json();

      if (data.url) {
        safeRedirect(data.url);
      } else {
        // BILLING_ENABLED=false → kostenloser Zugang
        setFreeActivated(true);
        setTimeout(() => router.push('/dashboard'), 1800);
      }
    } catch {
      setCheckoutError('Verbindung fehlgeschlagen. Bitte versuche es erneut.');
      setLoading(null);
    }
  };

  if (freeActivated) {
    return (
      <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Testphase verlängert</h2>
        <p className="text-gray-500 text-center max-w-xs">
          Während der Testphase hast du kostenlosen Vollzugang zu allen Features.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-white overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center px-5 py-16">
        {/* Header */}
        <div className="text-center mb-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold mb-4">
            <Zap className="w-3 h-3" />
            Testversion abgelaufen
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
            Wähle deinen Plan
          </h1>
          <p className="text-gray-500">
            Starte jetzt und erhalte Zugang zu allen Features.{' '}
            {!billingEnabled && (
              <span className="font-medium text-emerald-600">Während der Testphase kostenlos.</span>
            )}
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 mt-6 p-1 rounded-full bg-gray-100">
            <button
              onClick={() => setCycle('monthly')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                cycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monatlich
            </button>
            <button
              onClick={() => setCycle('yearly')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                cycle === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Jährlich
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">−10%</span>
            </button>
          </div>
        </div>

        {/* Checkout error */}
        {checkoutError && (
          <p className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center max-w-md">
            {checkoutError}
          </p>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 flex flex-col gap-5 ${
                plan.popular
                  ? 'border-gray-900 shadow-xl shadow-black/5'
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gray-900 text-white text-xs font-semibold rounded-full">
                  Beliebteste Wahl
                </span>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{plan.tagline}</p>
                <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    €{cycle === 'monthly' ? plan.monthly : plan.yearly}
                  </span>
                  <span className="text-gray-400 text-sm">/Monat</span>
                </div>
                {cycle === 'yearly' && (
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">
                    Jährlich abgerechnet (€{plan.yearly * 12}/Jahr)
                  </p>
                )}
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan.id)}
                disabled={!!loading}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                  plan.popular
                    ? 'bg-gray-900 text-white hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                } disabled:opacity-60`}
              >
                {loading === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {billingEnabled ? `${plan.name} starten` : 'Kostenlos aktivieren'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Contact for enterprise */}
        <p className="mt-8 text-sm text-gray-400">
          Größeres Team?{' '}
          <a href="/contact" className="text-gray-600 underline underline-offset-2 hover:text-gray-900">
            Kontaktiere uns für Enterprise
          </a>
        </p>
      </div>
    </div>
  );
}
