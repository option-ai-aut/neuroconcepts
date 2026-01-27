'use client';

import Sidebar from '@/components/Sidebar';
import AiChatSidebar from '@/components/AiChatSidebar';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';

// Configure Amplify only if env vars are present
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        user ? (
          <div className="flex h-screen bg-gray-50 font-sans">
            {/* Main Navigation Sidebar (Left) */}
            <Sidebar />
            
            {/* Main Content Area (Center) */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* Top Header (Optional, for breadcrumbs/search) */}
              <header className="bg-white h-16 border-b border-gray-100 flex items-center px-8 justify-between shrink-0">
                <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                </div>
              </header>

              {/* Scrollable Content */}
              <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50 p-8">
                <div className="max-w-5xl mx-auto">
                  {children}
                </div>
              </main>
            </div>

            {/* AI Chat Sidebar (Right) */}
            <AiChatSidebar />
          </div>
        ) : <></>
      )}
    </Authenticator>
  );
}
