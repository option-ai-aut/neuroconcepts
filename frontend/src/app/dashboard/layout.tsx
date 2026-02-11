'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';
import Sidebar from '@/components/Sidebar';
import AiChatSidebar from '@/components/AiChatSidebar';
import GlobalDrawer from '@/components/GlobalDrawer';
import ExposeEditor from '@/components/ExposeEditor';
import PageHeader from '@/components/PageHeader';
import { useGlobalState } from '@/context/GlobalStateContext';
import { useAuthConfigured } from '@/components/AuthProvider';
import { Loader2 } from 'lucide-react';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { drawerOpen, drawerType, exposeEditorData, closeDrawer } = useGlobalState();

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Main Navigation Sidebar (Left) */}
      <Sidebar />
      
      {/* Main Content Area (Center) */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header Bar */}
        <PageHeader />
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
  const pathname = usePathname();
  const authConfigured = useAuthConfigured();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Wait until Amplify is configured before checking auth
    if (!authConfigured) return;

    const checkAuth = async () => {
      try {
        const session = await fetchAuthSession();
        if (session.tokens) {
          setIsAuthenticated(true);
        } else {
          const redirect = pathname && pathname !== '/dashboard' ? `?redirect=${encodeURIComponent(pathname)}` : '';
          router.replace(`/login${redirect}`);
        }
      } catch {
        const redirect = pathname && pathname !== '/dashboard' ? `?redirect=${encodeURIComponent(pathname)}` : '';
        router.replace(`/login${redirect}`);
      }
    };
    checkAuth();
  }, [router, pathname, authConfigured]);

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
