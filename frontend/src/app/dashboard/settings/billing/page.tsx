'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, FileText, Download, Calendar, CheckCircle, AlertCircle, ExternalLink, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import useSWR from 'swr';
import { getMe, getApiUrl } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl?: string;
}

interface Subscription {
  plan: string;
  status: string;
  billingEnabled: boolean;
  customerId: string | null;
  subscriptionId: string | null;
  currentPeriodEnd: number | null;
  billingCycle: string | null;
  paymentMethod: { brand: string; last4: string; expiry: string } | null;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  solo: 'Solo',
  team: 'Team',
  enterprise: 'Enterprise',
};

const PLAN_PRICES: Record<string, string> = {
  free: '€0',
  solo: '€149',
  team: '€699',
  enterprise: 'Individuell',
};

async function apiFetch(path: string, options?: RequestInit) {
  const base = getApiUrl();
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '';
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export default function BillingSettingsPage() {
  const { data: user } = useSWR('/me', getMe);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.push('/dashboard/settings/profile');
  }, [user, router]);

  // Show success message on redirect back from Stripe
  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setSuccessMsg('Abonnement erfolgreich aktiviert!');
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  }, [searchParams]);

  const loadBillingData = useCallback(async () => {
    try {
      setLoading(true);
      const [sub, inv] = await Promise.all([
        apiFetch('/billing/subscription'),
        apiFetch('/billing/invoices'),
      ]);
      setSubscription(sub);
      setInvoices(inv);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'ADMIN') loadBillingData();
  }, [user, loadBillingData]);

  const handleOpenPortal = async () => {
    try {
      setPortalLoading(true);
      const { url } = await apiFetch('/billing/portal', { method: 'POST' });
      window.location.href = url;
    } catch {
      alert('Stripe Portal konnte nicht geöffnet werden.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setCancelLoading(true);
      await apiFetch('/billing/subscription', { method: 'DELETE' });
      setCancelConfirm(false);
      await loadBillingData();
    } catch {
      alert('Kündigung fehlgeschlagen.');
    } finally {
      setCancelLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatDateStr = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (!user) return <div className="p-8 text-center text-gray-500">Laden...</div>;

  return (
    <div className="space-y-10">
      {/* Success Banner */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3 text-green-800 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Current Plan */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Aktueller Plan</h2>
        <p className="text-sm text-gray-500 mb-6">Verwalte dein Abonnement und deine Zahlungsmethoden.</p>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : subscription && !subscription.billingEnabled ? (
          /* ── Test-Phase Banner ── */
          <div className="bg-white border border-gray-200 rounded-xl p-7">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">Testphase — Kostenloser Vollzugang</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Aktiv
                  </span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Während der Testphase hast du kostenlosen Zugang zu allen Features. Keine Kreditkarte nötig.
                  Sobald wir live gehen, wirst du rechtzeitig informiert.
                </p>
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-400">Aktiver Plan: <span className="font-medium text-gray-700">{PLAN_LABELS[subscription.plan] || 'Free'}</span></p>
              <Link href="/preise" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors">
                Pläne ansehen <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : subscription?.subscriptionId ? (
          /* ── Active Subscription ── */
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">{PLAN_LABELS[subscription.plan] || subscription.plan}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {subscription.status === 'active'
                      ? <><CheckCircle className="w-3 h-3 mr-1" />Aktiv</>
                      : <><AlertCircle className="w-3 h-3 mr-1" />{subscription.status}</>}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {PLAN_PRICES[subscription.plan] || ''}/Monat · {subscription.billingCycle === 'yearly' ? 'Jährlich' : 'Monatlich'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 py-4 border-t border-gray-100">
              {subscription.currentPeriodEnd && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Nächste Abrechnung</div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDate(subscription.currentPeriodEnd)}
                  </div>
                </div>
              )}
              {subscription.paymentMethod && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Zahlungsmethode</div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    {subscription.paymentMethod.brand} •••• {subscription.paymentMethod.last4}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
              >
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Stripe Portal öffnen
              </button>
            </div>
          </div>
        ) : (
          /* ── No Subscription ── */
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Kein aktives Abonnement</h3>
            <p className="text-sm text-gray-500 mb-6">Wähle einen Plan um loszulegen.</p>
            <Link
              href="/preise"
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gray-900 hover:bg-black inline-flex items-center gap-2 transition-colors"
            >
              Pläne ansehen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="border-t border-gray-200 pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Rechnungen</h2>
            <p className="text-sm text-gray-500">Übersicht aller bisherigen Rechnungen.</p>
          </div>
        </div>

        {invoices.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rechnung</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Betrag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{invoice.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateStr(invoice.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(invoice.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800'
                        : invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {invoice.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {invoice.status === 'paid' ? 'Bezahlt' : invoice.status === 'pending' ? 'Ausstehend' : 'Fehlgeschlagen'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {invoice.pdfUrl && (
                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 p-1 hover:bg-gray-50 rounded-lg inline-flex items-center gap-1 text-sm">
                          <Download className="w-4 h-4" />
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Rechnungen</h3>
            <p className="text-sm text-gray-500">
              {subscription?.billingEnabled === false
                ? 'Während der Testphase gibt es keine Rechnungen.'
                : 'Sobald Rechnungen erstellt werden, erscheinen sie hier.'}
            </p>
          </div>
        )}
      </div>

      {/* Danger Zone — only if active paid subscription */}
      {subscription?.subscriptionId && subscription.billingEnabled && (
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-base font-semibold text-red-600 mb-1">Gefahrenzone</h2>
          <p className="text-sm text-gray-500 mb-6">Irreversible Aktionen für dein Konto.</p>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-red-800">Abonnement kündigen</h3>
                <p className="text-sm text-red-600 mt-1">Dein Zugang bleibt bis zum Ende des Abrechnungszeitraums aktiv.</p>
              </div>
              {!cancelConfirm ? (
                <button onClick={() => setCancelConfirm(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-white border border-red-300 hover:bg-red-50">
                  Kündigen
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setCancelConfirm(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50">
                    Abbrechen
                  </button>
                  <button onClick={handleCancel} disabled={cancelLoading}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                    {cancelLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Bestätigen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
