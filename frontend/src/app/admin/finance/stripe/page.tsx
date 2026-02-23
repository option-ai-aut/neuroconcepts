'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, Users, CreditCard, FileText, Package, Settings,
  Loader2, RefreshCw, AlertTriangle, ExternalLink, CheckCircle2
} from 'lucide-react';
import {
  getStripeOverview, getStripeCustomers, getStripeSubscriptions, getStripeInvoices,
  getStripeProducts, getStripeSettings,
  type StripeOverview, type StripeCustomer, type StripeSubscription, type StripeInvoice, type StripeSettings
} from '@/lib/adminApi';

type StripeTab = 'overview' | 'customers' | 'subscriptions' | 'invoices' | 'products' | 'settings';

function formatCents(cents: number, currency = 'usd'): string {
  const sym = currency === 'eur' ? '€' : '$';
  return `${sym}${(cents / 100).toFixed(2)}`;
}

export default function StripeFinancePage() {
  const [activeTab, setActiveTab] = useState<StripeTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<StripeOverview | null>(null);
  const [customers, setCustomers] = useState<StripeCustomer[]>([]);
  const [subscriptions, setSubscriptions] = useState<StripeSubscription[]>([]);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [products, setProducts] = useState<{ products: any[]; prices: any[]; stripePrices: any } | null>(null);
  const [settings, setSettings] = useState<StripeSettings | null>(null);

  const loadOverview = async () => {
    try {
      const data = await getStripeOverview();
      setOverview(data);
    } catch (e: any) {
      setOverview({ configured: false, billingEnabled: false, mrrCents: 0, activeSubscriptions: 0, totalCustomers: 0, recentInvoices: [], error: e.message });
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadOverview(),
        getStripeCustomers(50).then(r => setCustomers(r.data)).catch(() => setCustomers([])),
        getStripeSubscriptions('active', 50).then(r => setSubscriptions(r.data)).catch(() => setSubscriptions([])),
        getStripeInvoices(30).then(r => setInvoices(r.data)).catch(() => setInvoices([])),
        getStripeProducts().then(setProducts).catch(() => setProducts(null)),
        getStripeSettings().then(setSettings).catch(() => setSettings(null)),
      ]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const tabs: { id: StripeTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Übersicht', icon: DollarSign },
    { id: 'customers', label: 'Kunden', icon: Users },
    { id: 'subscriptions', label: 'Abonnements', icon: CreditCard },
    { id: 'invoices', label: 'Rechnungen', icon: FileText },
    { id: 'products', label: 'Produkte & Preise', icon: Package },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Stripe</h1>
          <p className="text-sm text-gray-500 mt-0.5">Zahlungen, Abonnements und Rechnungen</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Stripe Dashboard
          </a>
          <button
            onClick={loadAll}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Aktualisieren
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!overview?.configured && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Stripe nicht konfiguriert</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {overview?.error || 'STRIPE_SECRET_KEY fehlt in der Umgebung. Konfiguriere Stripe in den App-Secrets (AWS Secrets Manager).'}
            </p>
          </div>
        </div>
      )}

      {/* Tab Nav */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">MRR</p>
              <p className="text-2xl font-bold text-gray-900">{formatCents(overview.mrrCents)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Aktive Abos</p>
              <p className="text-2xl font-bold text-gray-900">{overview.activeSubscriptions}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Stripe Kunden</p>
              <p className="text-2xl font-bold text-gray-900">{overview.totalCustomers}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Billing</p>
              <p className="text-lg font-semibold">{overview.billingEnabled ? 'Aktiv' : 'Deaktiviert'}</p>
            </div>
          </div>
          {overview.recentInvoices.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Letzte Rechnungen</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {overview.recentInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.number || inv.id}</p>
                      <p className="text-xs text-gray-500">{inv.customerEmail || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                        inv.status === 'open' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {inv.status}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{formatCents(inv.amountPaid, inv.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Stripe Kunden</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">{customers.length} geladen</p>
          </div>
          {customers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Keine Kunden</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">E-Mail</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Customer ID</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-900">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.name || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{c.id}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Aktive Abonnements</h2>
          </div>
          {subscriptions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Keine aktiven Abos</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Kunde</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Plan</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Betrag</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Läuft bis</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{s.customerEmail || s.customerId}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.productName || s.planInterval || '—'}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {s.planAmount != null ? formatCents(s.planAmount, s.planCurrency) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(s.currentPeriodEnd * 1000).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Rechnungen</h2>
          </div>
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Keine Rechnungen</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Nummer</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Kunde</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Betrag</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Datum</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.number || inv.id.slice(-12)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inv.customerEmail || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        inv.paid ? 'bg-emerald-50 text-emerald-700' :
                        inv.status === 'open' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">{formatCents(inv.amountPaid || inv.amountDue, inv.currency)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(inv.created * 1000).toLocaleDateString('de-DE')}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && products && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Produkte</h2>
            </div>
            {products.products.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Keine Produkte</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {products.products.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{p.id}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Preise (in Code verwendet)</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">STRIPE_PRICES in BillingService.ts</p>
            </div>
            <div className="p-4">
              <pre className="text-xs font-mono text-gray-700 bg-gray-50 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(products.stripePrices, null, 2)}
              </pre>
            </div>
            {products.prices.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Produkt</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Price ID</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Betrag</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Intervall</th>
                  </tr>
                </thead>
                <tbody>
                  {products.prices.map((pr, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm text-gray-900">{pr.productName}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{pr.priceId}</td>
                      <td className="px-4 py-3 text-right text-sm">{pr.amount != null ? formatCents(pr.amount, pr.currency) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{pr.interval}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Stripe Konfiguration</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Konfiguriert</dt>
              <dd className="text-sm font-medium">{settings.configured ? <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" /> : 'Nein'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Billing aktiv</dt>
              <dd className="text-sm font-medium">{settings.billingEnabled ? 'Ja' : 'Nein'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Webhook Secret</dt>
              <dd className="text-sm font-medium">{settings.hasWebhookSecret ? 'Gesetzt' : 'Fehlt'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Modus</dt>
              <dd className="text-sm font-medium">
                <span className={settings.mode === 'live' ? 'text-emerald-600' : 'text-amber-600'}>
                  {settings.mode === 'live' ? 'Live' : settings.mode === 'test' ? 'Test' : '—'}
                </span>
              </dd>
            </div>
          </dl>
          {settings.priceIds && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Price IDs (Code)</p>
              <pre className="text-xs font-mono text-gray-700 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(settings.priceIds, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
