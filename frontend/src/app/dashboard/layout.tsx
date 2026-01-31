'use client';

import Sidebar from '@/components/Sidebar';
import AiChatSidebar from '@/components/AiChatSidebar';
import GlobalDrawer from '@/components/GlobalDrawer';
import ExposeEditor from '@/components/ExposeEditor';
import { useGlobalState } from '@/context/GlobalStateContext';
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

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { drawerOpen, drawerType, exposeEditorData, closeDrawer } = useGlobalState();

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Main Navigation Sidebar (Left) */}
      <Sidebar />
      
      {/* Main Content Area (Center) */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-white overflow-x-visible">
          {children}
        </main>
      </div>

      {/* AI Chat Sidebar (Right) */}
      <AiChatSidebar />
      
      {/* Conditional rendering based on drawer type */}
      {drawerOpen && drawerType === 'EXPOSE_EDITOR' ? (
        /* Expose Editor (Fullscreen Overlay) */
        <ExposeEditor
          exposeId={exposeEditorData?.exposeId}
          propertyId={exposeEditorData?.propertyId}
          templateId={exposeEditorData?.templateId}
          isTemplate={exposeEditorData?.isTemplate}
          onClose={closeDrawer}
        />
      ) : (
        /* Global Drawer (Bottom) - for other drawer types */
        <GlobalDrawer />
      )}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        user ? <DashboardContent>{children}</DashboardContent> : <></>
      )}
    </Authenticator>
  );
}
