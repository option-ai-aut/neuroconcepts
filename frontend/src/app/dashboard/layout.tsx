'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';
import Sidebar from '@/components/Sidebar';
import AiChatSidebar from '@/components/AiChatSidebar';
import GlobalDrawer from '@/components/GlobalDrawer';
import ExposeEditor from '@/components/ExposeEditor';
import { useGlobalState } from '@/context/GlobalStateContext';
import { Loader2 } from 'lucide-react';

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
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await fetchAuthSession();
        if (session.tokens) {
          setIsAuthenticated(true);
        } else {
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      }
    };
    checkAuth();
  }, [router]);

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Wird geladen...</p>
        </div>
      </div>
    );
  }

  // Authenticated - show dashboard
  return <DashboardContent>{children}</DashboardContent>;
}
