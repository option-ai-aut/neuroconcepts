'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useRuntimeConfig } from '@/components/RuntimeConfigProvider';

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
          onClick={async () => {
            await signOut();
            window.location.href = '/admin/login';
          }}
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
  const router = useRouter();
  const pathname = usePathname();
  const config = useRuntimeConfig();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Configure Amplify with Admin User Pool
  useEffect(() => {
    if (config.adminUserPoolId && config.adminUserPoolClientId) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: config.adminUserPoolId,
            userPoolClientId: config.adminUserPoolClientId,
          }
        }
      });
    }
  }, [config]);

  // Skip auth check on the login page itself
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setIsAuthenticated(true); // Let login page render without redirect
      return;
    }

    const checkAuth = async () => {
      try {
        const session = await fetchAuthSession();
        if (session.tokens) {
          setIsAuthenticated(true);
        } else {
          router.replace('/admin/login');
        }
      } catch {
        router.replace('/admin/login');
      }
    };

    // Wait for Amplify to be configured
    if (config.adminUserPoolId) {
      checkAuth();
    }
  }, [router, config, isLoginPage]);

  // Login page - render without sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-gray-400">Wird geladen...</p>
        </div>
      </div>
    );
  }

  // Authenticated - show admin
  return (
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
  );
}
