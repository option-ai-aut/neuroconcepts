'use client';

import { useState } from 'react';
import { Mail, Inbox, Shield, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const MAILBOXES = [
  {
    email: 'office@immivo.ai',
    label: 'Office',
    description: 'Allgemeine Anfragen, Kontaktformular, Demo-Buchungen',
    color: 'bg-gray-900',
    type: 'shared' as const,
  },
  {
    email: 'support@immivo.ai',
    label: 'Support',
    description: 'Bug-Reports, technische Anfragen, Kundensupport',
    color: 'bg-amber-600',
    type: 'shared' as const,
  },
  {
    email: 'dennis.kral@immivo.ai',
    label: 'Dennis Kral',
    description: 'Persönliches Postfach — Technical Co-Founder & CTO',
    color: 'bg-blue-600',
    type: 'personal' as const,
  },
  {
    email: 'josef.leutgeb@immivo.ai',
    label: 'Josef Leutgeb',
    description: 'Persönliches Postfach — Co-Founder & CEO',
    color: 'bg-emerald-600',
    type: 'personal' as const,
  },
];

export default function AdminInboxPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'shared' | 'personal'>('all');

  const filtered = activeTab === 'all' ? MAILBOXES : MAILBOXES.filter(m => m.type === activeTab);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Posteingang</h1>
        <p className="text-sm text-gray-500 mt-1">E-Mail-Postfächer der Immivo GmbH</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([['all', 'Alle'], ['shared', 'Team'], ['personal', 'Persönlich']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">AWS WorkMail Integration</p>
            <p className="text-xs text-blue-700 mt-1">
              Die E-Mails werden über AWS WorkMail verwaltet. Du kannst sie direkt im WorkMail Webinterface lesen und beantworten,
              oder ein E-Mail-Programm (Outlook, Thunderbird, Apple Mail) via IMAP/SMTP anbinden.
            </p>
          </div>
        </div>
      </div>

      {/* Mailboxes */}
      <div className="grid gap-4">
        {filtered.map((mailbox) => (
          <div key={mailbox.email} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 ${mailbox.color} rounded-xl flex items-center justify-center`}>
                  {mailbox.type === 'shared' ? <Inbox className="w-5 h-5 text-white" /> : <Mail className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{mailbox.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{mailbox.description}</p>
                  <p className="text-xs font-mono text-gray-400 mt-1">{mailbox.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`mailto:${mailbox.email}`}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Schreiben
                </a>
                {mailbox.email === 'office@immivo.ai' && (
                  <Link
                    href="/admin/contacts"
                    className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1"
                  >
                    Kontaktanfragen
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
                {mailbox.email === 'support@immivo.ai' && (
                  <Link
                    href="/admin/support"
                    className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1"
                  >
                    Bug Reports
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>

            {/* Connection Info */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <details className="group">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
                  IMAP/SMTP Einstellungen anzeigen
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-medium text-gray-700 mb-1">IMAP (Empfang)</p>
                    <p className="text-gray-500">Server: <span className="font-mono">imap.mail.eu-west-1.awsapps.com</span></p>
                    <p className="text-gray-500">Port: 993 (SSL/TLS)</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 mb-1">SMTP (Versand)</p>
                    <p className="text-gray-500">Server: <span className="font-mono">smtp.mail.eu-west-1.awsapps.com</span></p>
                    <p className="text-gray-500">Port: 465 (SSL/TLS)</p>
                  </div>
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
