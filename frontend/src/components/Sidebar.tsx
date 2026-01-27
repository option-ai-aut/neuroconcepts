'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Settings, 
  LogOut, 
  ChevronDown,
  Inbox
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [crmOpen, setCrmOpen] = useState(true);

  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Posteingang', href: '/dashboard/inbox', icon: Inbox },
    { 
      name: 'CRM', 
      href: '#', 
      icon: Users,
      children: [
        { name: 'Leads', href: '/dashboard/crm/leads' },
        { name: 'Objekte', href: '/dashboard/crm/properties' },
      ]
    },
  ];

  return (
    <div className="flex flex-col w-64 bg-white h-screen border-r border-gray-100 shadow-sm">
      <div className="flex items-center h-20 px-6 border-b border-gray-50">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-md shadow-indigo-200">
          <span className="text-white font-bold text-lg">N</span>
        </div>
        <span className="text-gray-900 font-bold text-lg tracking-tight">NeuroConcepts</span>
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto py-6 px-3 space-y-1">
        {mainNavigation.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <>
                <button
                  onClick={() => setCrmOpen(!crmOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    pathname.includes('/crm') 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`w-5 h-5 mr-3 ${pathname.includes('/crm') ? 'text-indigo-600' : 'text-gray-400'}`} />
                    {item.name}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${crmOpen ? 'transform rotate-180' : ''}`} />
                </button>
                {crmOpen && (
                  <div className="ml-9 space-y-1 mt-1 relative">
                    <div className="absolute left-[-18px] top-0 bottom-0 w-px bg-gray-100"></div>
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          pathname === child.href
                            ? 'text-indigo-600 bg-white shadow-sm ring-1 ring-gray-100'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${pathname === item.href ? 'text-white' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-50 space-y-1">
        <Link
          href="/dashboard/settings"
          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
            pathname.includes('/settings')
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Settings className="w-5 h-5 mr-3 text-gray-400" />
          Einstellungen
        </Link>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-500 rounded-xl hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Abmelden
        </button>
      </div>
    </div>
  );
}
