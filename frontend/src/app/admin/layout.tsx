'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';

// Configure Amplify globally
if (process.env.NEXT_PUBLIC_USER_POOL_ID && process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
        userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
      }
    }
  });
}

function AdminSidebar() {
  const pathname = usePathname();
  const navigation = [
    { name: 'Übersicht', href: '/admin' },
    { name: 'Team Chat', href: '/admin/chat' },
    { name: 'Jarvis Konfiguration', href: '/admin/ai-config' },
    { name: 'User Management', href: '/admin/users' },
  ];

  return (
    <div className="flex flex-col w-64 bg-gray-900 h-screen fixed border-r border-gray-800">
      <div className="flex items-center justify-center h-16 bg-black">
        <span className="text-red-500 font-bold text-lg">ADMIN KONSOLE</span>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto py-4">
        <nav className="flex-1 px-2 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`${
                pathname === item.href
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-900 hover:bg-red-800 focus:outline-none"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        user ? (
          <div className="flex h-screen bg-gray-100">
            <AdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden ml-64">
              <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
                <div className="container mx-auto px-6 py-8">
                  {children}
                </div>
              </main>
            </div>
          </div>
        ) : <></>
      )}
    </Authenticator>
  );
}
