'use client';

import { useState } from 'react';
import { 
  Search, Filter, Plus, Clock, AlertTriangle, CheckCircle2, 
  Circle, ArrowUp, ArrowDown, Minus, MessageSquare, User, 
  Building2, Tag, X, Send, Paperclip, MoreVertical, RefreshCw
} from 'lucide-react';

type Priority = 'critical' | 'high' | 'medium' | 'low';
type Status = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  tenant: string;
  contactEmail: string;
  priority: Priority;
  status: Status;
  assignedTo: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  messages: number;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: any }> = {
  critical: { label: 'Kritisch', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  high: { label: 'Hoch', color: 'bg-orange-100 text-orange-700', icon: ArrowUp },
  medium: { label: 'Mittel', color: 'bg-amber-100 text-amber-700', icon: Minus },
  low: { label: 'Niedrig', color: 'bg-gray-100 text-gray-600', icon: ArrowDown },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  open: { label: 'Offen', color: 'bg-red-50 text-red-600 border-red-200' },
  in_progress: { label: 'In Bearbeitung', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  waiting: { label: 'Wartet auf Kunde', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  resolved: { label: 'Gelöst', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  closed: { label: 'Geschlossen', color: 'bg-gray-50 text-gray-500 border-gray-200' },
};

const MOCK_TICKETS: Ticket[] = [
  { id: 'T-0047', subject: 'Google Kalender synchronisiert nicht mehr', description: 'Seit heute Morgen werden keine neuen Termine mehr synchronisiert.', tenant: 'Kellner Immobilien', contactEmail: 'markus@kellner-immo.at', priority: 'critical', status: 'in_progress', assignedTo: 'Tom Fischer', category: 'Integration', createdAt: '2026-01-29 08:15', updatedAt: '2026-01-29 09:30', messages: 4 },
  { id: 'T-0046', subject: 'Exposé-PDF wird nicht generiert', description: 'Beim Export als PDF erscheint ein weißes Dokument.', tenant: 'Immo Wien', contactEmail: 'office@immowien.at', priority: 'high', status: 'open', assignedTo: 'Nicht zugewiesen', category: 'Exposé', createdAt: '2026-01-28 16:45', updatedAt: '2026-01-28 16:45', messages: 1 },
  { id: 'T-0045', subject: 'Lead-Import aus Willhaben doppelte Einträge', description: 'Seit dem letzten Update werden Leads doppelt importiert.', tenant: 'Remax Salzburg', contactEmail: 'info@remax-sbg.at', priority: 'medium', status: 'waiting', assignedTo: 'Max Huber', category: 'Import', createdAt: '2026-01-28 11:20', updatedAt: '2026-01-29 08:00', messages: 6 },
  { id: 'T-0044', subject: 'Frage zur Rechnungsstellung', description: 'Können wir auf jährliche Abrechnung umstellen?', tenant: 'Schmidt & Partner', contactEmail: 'buchhaltung@schmidt-partner.de', priority: 'low', status: 'waiting', assignedTo: 'Sarah Weber', category: 'Billing', createdAt: '2026-01-27 14:00', updatedAt: '2026-01-28 10:00', messages: 3 },
  { id: 'T-0043', subject: 'Jarvis antwortet auf Englisch statt Deutsch', description: 'In manchen Fällen antwortet der KI-Assistent auf Englisch.', tenant: 'Immobilien Huber', contactEmail: 'peter@huber-immo.de', priority: 'medium', status: 'resolved', assignedTo: 'Dennis Kral', category: 'AI / Jarvis', createdAt: '2026-01-26 09:00', updatedAt: '2026-01-28 15:30', messages: 8 },
  { id: 'T-0042', subject: 'Neues Feature: Massenversand von Exposés', description: 'Wir möchten Exposés an mehrere Leads gleichzeitig senden.', tenant: 'ProImmo GmbH', contactEmail: 'anfrage@proimmo.at', priority: 'low', status: 'open', assignedTo: 'Nicht zugewiesen', category: 'Feature Request', createdAt: '2026-01-25 16:00', updatedAt: '2026-01-25 16:00', messages: 1 },
];

export default function SupportPage() {
  const [tickets] = useState(MOCK_TICKETS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');

  const filtered = tickets.filter(t => {
    const matchSearch = `${t.subject} ${t.tenant} ${t.id}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    waiting: tickets.filter(t => t.status === 'waiting').length,
    resolved: tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length,
  };

  return (
    <div className="flex h-[calc(100vh-48px)]">
      {/* Ticket List */}
      <div className={`${selectedTicket ? 'w-[420px]' : 'flex-1'} bg-white border-r border-gray-200 flex flex-col shrink-0`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-gray-900">Support & Tickets</h1>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800">
              <Plus className="w-3.5 h-3.5" />
              Neues Ticket
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: 'Offen', value: stats.open, color: 'text-red-600 bg-red-50' },
              { label: 'In Bearbeitung', value: stats.inProgress, color: 'text-gray-700 bg-gray-100' },
              { label: 'Wartet', value: stats.waiting, color: 'text-amber-600 bg-amber-50' },
              { label: 'Gelöst', value: stats.resolved, color: 'text-emerald-600 bg-emerald-50' },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg px-2.5 py-1.5 text-center ${s.color}`}>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Ticket ID, Betreff oder Tenant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-0.5 px-4 py-2 border-b border-gray-100 overflow-x-auto">
          {[{ key: 'all', label: 'Alle' }, ...Object.entries(STATUS_CONFIG).map(([key, c]) => ({ key, label: c.label }))].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as Status | 'all')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors ${
                statusFilter === tab.key ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
                selectedTicket?.id === ticket.id ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-gray-400">{ticket.id}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_CONFIG[ticket.priority].color}`}>
                  {PRIORITY_CONFIG[ticket.priority].label}
                </span>
              </div>
              <p className="text-xs font-medium text-gray-900 truncate">{ticket.subject}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-gray-400">{ticket.tenant}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_CONFIG[ticket.status].color}`}>
                    {STATUS_CONFIG[ticket.status].label}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <MessageSquare className="w-2.5 h-2.5" />{ticket.messages}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Detail */}
      {selectedTicket && (
        <div className="flex-1 flex flex-col bg-white">
          {/* Detail Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-400">{selectedTicket.id}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_CONFIG[selectedTicket.status].color}`}>
                  {STATUS_CONFIG[selectedTicket.status].label}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_CONFIG[selectedTicket.priority].color}`}>
                  {PRIORITY_CONFIG[selectedTicket.priority].label}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mt-1">{selectedTicket.subject}</h2>
            </div>
            <button onClick={() => setSelectedTicket(null)} className="p-1 hover:bg-gray-100 rounded-md">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Ticket Info */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-gray-400 font-medium">Tenant</p>
              <p className="text-xs text-gray-700 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" />{selectedTicket.tenant}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-medium">Kontakt</p>
              <p className="text-xs text-gray-700 flex items-center gap-1 mt-0.5"><User className="w-3 h-3" />{selectedTicket.contactEmail}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-medium">Zugewiesen</p>
              <p className="text-xs text-gray-700 mt-0.5">{selectedTicket.assignedTo}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-medium">Kategorie</p>
              <p className="text-xs text-gray-700 flex items-center gap-1 mt-0.5"><Tag className="w-3 h-3" />{selectedTicket.category}</p>
            </div>
          </div>

          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-gray-500" />
                </div>
                <span className="text-xs font-medium text-gray-900">{selectedTicket.contactEmail}</span>
                <span className="text-[10px] text-gray-400">{selectedTicket.createdAt}</span>
              </div>
              <p className="text-sm text-gray-700">{selectedTicket.description}</p>
            </div>
            
            <div className="text-center text-[10px] text-gray-400 py-2">
              — {selectedTicket.messages - 1} weitere Nachrichten —
            </div>
          </div>

          {/* Reply Input */}
          <div className="px-5 py-3 border-t border-gray-100">
            <div className="bg-gray-50 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Antwort schreiben..."
                rows={2}
                className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none"
              />
              <div className="flex items-center justify-between mt-1">
                <button className="p-1 text-gray-400 hover:text-gray-600 rounded-md"><Paperclip className="w-4 h-4" /></button>
                <button className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 flex items-center gap-1.5">
                  <Send className="w-3 h-3" />Senden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
