'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';
import { useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [crmOpen, setCrmOpen] = useState(true);

  const mainNavigation = [
    { name: 'Posteingang', href: '/dashboard/inbox' },
    { name: 'KI Assistent', href: '/dashboard/assistant' },
    { 
      name: 'CRM', 
      href: '#', 
      children: [
        { name: 'Leads', href: '/dashboard/crm/leads' },
        { name: 'Objekte', href: '/dashboard/crm/properties' },
      ]
    },
  ];

  const bottomNavigation = [
    { name: 'Einstellungen', href: '/dashboard/settings' },
  ];

  return (
    <div className="flex flex-col w-64 bg-gray-800 h-screen fixed">
      <div className="flex items-center justify-center h-16 bg-gray-900">
        <span className="text-white font-bold text-lg">NeuroConcepts AI</span>
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto py-4">
        <nav className="flex-1 px-2 space-y-1">
          {mainNavigation.map((item) => (
            <div key={item.name}>
              {item.children ? (
                <>
                  <button
                    onClick={() => setCrmOpen(!crmOpen)}
                    className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-md"
                  >
                    {item.name}
                    <svg className={`w-4 h-4 transition-transform ${crmOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {crmOpen && (
                    <div className="ml-4 space-y-1 mt-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={`${
                            pathname === child.href
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
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
                  className={`${
                    pathname === item.href
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                >
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-700 space-y-2">
        <nav className="px-2 space-y-1 mb-4">
          {bottomNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`${
                pathname === item.href
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Abmelden
        </button>
      </div>
    </div>
  );
}
