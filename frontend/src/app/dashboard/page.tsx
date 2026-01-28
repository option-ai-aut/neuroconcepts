'use client';

import Link from 'next/link';
import { 
  Inbox, 
  Users, 
  Building2, 
  MessageSquare, 
  BarChart3, 
  Bell,
  ArrowRight
} from 'lucide-react';

// Dashboard Page
export default function DashboardPage() {
  const cards = [
    {
      title: 'Posteingang',
      value: '3 neue',
      description: 'Ungelesene Nachrichten',
      icon: Inbox,
      href: '/dashboard/inbox',
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'Leads',
      value: '12 aktiv',
      description: '4 neue diese Woche',
      icon: Users,
      href: '/dashboard/crm/leads',
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      title: 'Objekte',
      value: '8 total',
      description: '2 in Vermarktung',
      icon: Building2,
      href: '/dashboard/crm/properties',
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      title: 'Team Chat',
      value: '5 Nachrichten',
      description: 'Ungelesen im Allgemein',
      icon: MessageSquare,
      href: '/dashboard/assistant', // Using assistant for now as chat interface
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
    {
      title: 'Statistiken',
      value: '+24%',
      description: 'Conversion Rate',
      icon: BarChart3,
      href: '#',
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    },
    {
      title: 'Updates',
      value: 'System v1.2',
      description: 'Neue Jarvis-Features verfügbar',
      icon: Bell,
      href: '#',
      color: 'text-pink-600',
      bg: 'bg-pink-50'
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 bg-white px-6 pt-6 pb-6 shadow-sm z-10">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>
      
      <div className="flex-1 overflow-auto bg-gray-50/30 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <Link 
            key={index} 
            href={card.href}
            className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-lg ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300" />
            </div>
            
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">{card.value}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions / Recent Activity Placeholder */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Neueste Aktivitäten</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mr-3"></div>
                <span className="text-gray-600">Max Mustermann hat eine Anfrage gesendet</span>
                <span className="ml-auto text-gray-400 text-xs">vor 2 Std.</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Jarvis Insights</h3>
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
            <p className="text-sm text-indigo-800">
              💡 <strong>Tipp:</strong> Die Reaktionszeit auf neue Leads ist heute um 15% schneller als letzte Woche. Weiter so!
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
