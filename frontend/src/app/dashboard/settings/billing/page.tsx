'use client';

import { useState } from 'react';
import { CreditCard, FileText, Download, Calendar, CheckCircle, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import useSWR from 'swr';
import { getMe } from '@/lib/api';
import { useRouter } from 'next/navigation';

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
  seats: number;
  pricePerSeat: number;
  billingCycle: string;
  nextBillingDate: string;
  paymentMethod?: {
    type: string;
    last4: string;
    brand: string;
    expiry: string;
  };
}

export default function BillingSettingsPage() {
  const { data: user } = useSWR('/me', getMe);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // Redirect non-admins
  if (user && user.role !== 'ADMIN') {
    router.push('/dashboard/settings/profile');
    return null;
  }

  // TODO: Load subscription and invoices from API
  // useEffect(() => {
  //   loadBillingData();
  // }, []);

  // const loadBillingData = async () => {
  //   try {
  //     const token = localStorage.getItem('token');
  //     const [subRes, invRes] = await Promise.all([
  //       fetch(`${API_URL}/billing/subscription`, { headers: { Authorization: `Bearer ${token}` } }),
  //       fetch(`${API_URL}/billing/invoices`, { headers: { Authorization: `Bearer ${token}` } })
  //     ]);
  //     if (subRes.ok) setSubscription(await subRes.json());
  //     if (invRes.ok) setInvoices(await invRes.json());
  //   } catch (error) {
  //     console.error('Error loading billing data:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (!user) return <div className="p-8 text-center text-gray-500">Laden...</div>;

  return (
    <div className="space-y-10">
      {/* Current Plan */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Aktueller Plan</h2>
        <p className="text-sm text-gray-500 mb-6">
          Verwalten Sie Ihr Abonnement und Ihre Zahlungsmethoden.
        </p>
        
        {subscription ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">{subscription.plan}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Aktiv
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {subscription.seats} Seats × {formatCurrency(subscription.pricePerSeat)}/Monat
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(subscription.seats * subscription.pricePerSeat)}
                </div>
                <div className="text-sm text-gray-500">pro Monat</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 py-4 border-t border-gray-100">
              <div>
                <div className="text-sm text-gray-500 mb-1">Nächste Abrechnung</div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDate(subscription.nextBillingDate)}
                </div>
              </div>
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
              <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50">
                Plan ändern
              </button>
              <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50">
                Zahlungsmethode ändern
              </button>
              <button className="px-4 py-2 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Stripe Portal öffnen
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Kein aktives Abonnement</h3>
            <p className="text-sm text-gray-500 mb-6">
              Verbinden Sie Stripe, um Abonnements und Rechnungen zu verwalten.
            </p>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 inline-flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Stripe verbinden
            </button>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="border-t border-gray-200 pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Rechnungen</h2>
            <p className="text-sm text-gray-500">
              Übersicht aller bisherigen Rechnungen.
            </p>
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktion</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{invoice.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : invoice.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {invoice.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {invoice.status === 'paid' ? 'Bezahlt' : invoice.status === 'pending' ? 'Ausstehend' : 'Fehlgeschlagen'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded-lg flex items-center gap-1 ml-auto">
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
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
              Sobald Rechnungen erstellt werden, erscheinen sie hier.
            </p>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-base font-semibold text-red-600 mb-1">Gefahrenzone</h2>
        <p className="text-sm text-gray-500 mb-6">
          Irreversible Aktionen für Ihr Konto.
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-800">Abonnement kündigen</h3>
              <p className="text-sm text-red-600 mt-1">
                Ihr Zugang bleibt bis zum Ende des Abrechnungszeitraums aktiv.
              </p>
            </div>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-white border border-red-300 hover:bg-red-50">
              Kündigen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
