'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';
import Sidebar from '@/components/Sidebar';
import AiChatSidebar from '@/components/AiChatSidebar';
import GlobalDrawer from '@/components/GlobalDrawer';
import ExposeEditor from '@/components/ExposeEditor';
import PageHeader from '@/components/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useGlobalState } from '@/context/GlobalStateContext';
import { useAuthConfigured } from '@/components/AuthProvider';
import { DarkModeProvider, useDarkMode } from '@/context/DarkModeContext';
import { Loader2, Monitor } from 'lucide-react';
import Image from 'next/image';

// Routes allowed on mobile devices
const MOBILE_ALLOWED_PREFIXES = [
  '/dashboard/activities',
  '/dashboard/inbox',
  '/dashboard/crm',
  '/dashboard/calendar',
  '/dashboard/assistant',
];

function isMobileAllowedRoute(pathname: string): boolean {
  if (pathname === '/dashboard') return true;
  return MOBILE_ALLOWED_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

// Mobile route guard component
function MobileRouteGuard({ children, pathname }: { children: React.ReactNode; pathname: string }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile && !isMobileAllowedRoute(pathname)) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center pb-20">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-5">
          <Monitor className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Desktop-Funktion</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
          Diese Seite ist nur in der Desktop-Version verfügbar. Öffne Immivo auf deinem Computer für vollen Zugriff.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { drawerOpen, drawerType, exposeEditorData, closeDrawer, mobileJarvisOpen, setMobileJarvisOpen } = useGlobalState();
  const { isDark } = useDarkMode();
  const pathname = usePathname();
  const [jarvisClosing, setJarvisClosing] = useState(false);

  const handleCloseJarvis = useCallback(() => {
    setJarvisClosing(true);
    setTimeout(() => {
      setMobileJarvisOpen(false);
      setJarvisClosing(false);
    }, 250);
  }, [setMobileJarvisOpen]);

  return (
    <div className={`flex h-screen font-sans transition-colors duration-300 ${isDark ? 'dark bg-[#111111]' : 'bg-white'}`}>
      {/* Safe area top fill — ensures correct bg behind iPhone notch/status bar */}
      <div className={`fixed top-0 left-0 right-0 z-[60] lg:hidden transition-colors ${isDark ? 'bg-[#111111]' : 'bg-white'}`} style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      
      {/* Main Navigation Sidebar (Left) - Desktop only */}
      <Sidebar />
      
      {/* Main Content Area (Center) */}
      <div className="flex-1 flex flex-col overflow-hidden relative" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Top Header Bar */}
        <PageHeader />
        {/* Scrollable Content - extra bottom padding on mobile for nav bar */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#111111] overflow-x-visible pb-16 lg:pb-0 transition-colors">
          <MobileRouteGuard pathname={pathname}>
            {children}
          </MobileRouteGuard>
        </main>
      </div>

      {/* AI Chat Sidebar (Right) - Desktop only */}
      <div className="hidden lg:block">
        <AiChatSidebar />
      </div>

      {/* Mobile: Jarvis Floating Action Button */}
      {!mobileJarvisOpen && !jarvisClosing && (
        <button
          onClick={() => setMobileJarvisOpen(true)}
          className="lg:hidden fixed bottom-[72px] right-4 z-40 active:scale-95 transition-transform safe-bottom"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label="Jarvis KI-Chat öffnen"
        >
          <Image src="/logo-icon-only.png" alt="Jarvis" width={52} height={52} />
        </button>
      )}

      {/* Mobile: Jarvis Full-Screen Chat Overlay */}
      {(mobileJarvisOpen || jarvisClosing) && (
        <div className={`lg:hidden fixed inset-0 z-50 ${isDark ? 'bg-[#111111]' : 'bg-white'} ${jarvisClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
          <AiChatSidebar mobile onClose={handleCloseJarvis} />
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
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
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Wird geladen...</p>
        </div>
      </div>
    );
  }

  // Authenticated - show dashboard
  return (
    <DarkModeProvider>
      <DashboardContent>{children}</DashboardContent>
    </DarkModeProvider>
  );
}
