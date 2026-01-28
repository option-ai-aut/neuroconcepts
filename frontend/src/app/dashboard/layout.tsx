'use client';

import Sidebar from '@/components/Sidebar';
import AiChatSidebar from '@/components/AiChatSidebar';
import GlobalDrawer from '@/components/GlobalDrawer';
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
              {/* Scrollable Content */}
              <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white">
                {children}
              </main>
            </div>

            {/* AI Chat Sidebar (Right) */}
            <AiChatSidebar />
            
            {/* Global Drawer (Bottom) */}
            <GlobalDrawer />
          </div>
        ) : <></>
      )}
    </Authenticator>
  );
}
