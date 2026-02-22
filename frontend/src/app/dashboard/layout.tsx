'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import Sidebar from '@/components/Sidebar';
import AiChatSidebar from '@/components/AiChatSidebar';
import GlobalDrawer from '@/components/GlobalDrawer';
import ExposeEditor from '@/components/ExposeEditor';
import PageHeader from '@/components/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useGlobalState } from '@/context/GlobalStateContext';
import { useAuthConfigured } from '@/components/AuthProvider';
import { DarkModeProvider, useDarkMode } from '@/context/DarkModeContext';
import { RealtimeEventProvider } from '@/components/RealtimeEventProvider';
import { sendPresenceHeartbeat, getApiUrl, getAuthHeaders } from '@/lib/api';
import TrialBanner from '@/components/TrialBanner';
import TrialGate from '@/components/TrialGate';
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
  const t = useTranslations('mobileGuard');
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
          {t('description')}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { drawerOpen, drawerType, exposeEditorData, closeDrawer, mobileMivoOpen, setMobileMivoOpen } = useGlobalState();
  const { isDark } = useDarkMode();
  const pathname = usePathname();
  const [mivoClosing, setMivoClosing] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Draggable Mivo FAB state
  const [fabY, setFabY] = useState<number | null>(null);
  const fabRef = useRef<HTMLDivElement>(null);
  const fabDragging = useRef(false);
  const fabStartY = useRef(0);
  const fabStartTop = useRef(0);
  const fabMoved = useRef(false);
  const fabYRef = useRef<number | null>(null);

  // Keep ref in sync with state so native handlers can read current value
  useEffect(() => { fabYRef.current = fabY; }, [fabY]);

  // Attach native touch listeners with { passive: false } so preventDefault works
  useEffect(() => {
    const el = fabRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      fabStartY.current = touch.clientY;
      fabStartTop.current = fabYRef.current ?? (window.innerHeight - 72 - 52 - 16);
      fabMoved.current = false;
      fabDragging.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dy = touch.clientY - fabStartY.current;
      if (Math.abs(dy) > 8) {
        fabDragging.current = true;
        fabMoved.current = true;
      }
      if (fabDragging.current) {
        e.preventDefault();
        e.stopPropagation();
        const safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10) || 44;
        const minY = safeTop + 56;
        const maxY = window.innerHeight - 72 - 52 - 16;
        const newY = Math.min(maxY, Math.max(minY, fabStartTop.current + dy));
        // Direct DOM manipulation for smooth 60fps dragging
        el.style.transition = 'none';
        el.style.top = `${newY}px`;
        el.style.bottom = 'auto';
        fabYRef.current = newY;
      }
    };

    const onTouchEnd = () => {
      if (fabDragging.current) {
        // Commit final position to React state
        setFabY(fabYRef.current);
        el.style.transition = '';
      }
      fabDragging.current = false;
      if (!fabMoved.current) {
        setMobileMivoOpen(true);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [setMobileMivoOpen]);

  // Presence heartbeat — send every 60 seconds
  useEffect(() => {
    sendPresenceHeartbeat(); // Send immediately on mount
    heartbeatRef.current = setInterval(() => sendPresenceHeartbeat(), 60_000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, []);

  const handleCloseMivo = useCallback(() => {
    setMivoClosing(true);
    fabMoved.current = false;
    setTimeout(() => {
      setMobileMivoOpen(false);
      setMivoClosing(false);
    }, 250);
  }, [setMobileMivoOpen]);

  return (
    <div className={`app-shell flex h-full overflow-hidden font-sans transition-colors duration-300 ${isDark ? 'dark bg-[#111111]' : 'bg-white'}`} style={{ overscrollBehavior: 'none' }}>
      {/* Safe area top fill — ensures correct bg behind iPhone notch/status bar */}
      <div className={`fixed top-0 left-0 right-0 z-[60] lg:hidden transition-colors ${isDark ? 'bg-[#111111]' : 'bg-white'}`} style={{ height: 'env(safe-area-inset-top, 0px)', touchAction: 'none' }} />
      
      {/* Main Navigation Sidebar (Left) - Desktop only */}
      <Sidebar />
      
      {/* Main Content Area (Center) */}
      <div className="flex-1 flex flex-col overflow-hidden relative" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Top Header Bar */}
        <PageHeader />
        {/* Scrollable Content - extra bottom padding on mobile for nav bar */}
        <main className={`flex-1 overflow-y-auto bg-white dark:bg-[#111111] overflow-x-hidden pb-16 lg:pb-0 transition-colors ${mobileMivoOpen ? 'overflow-hidden' : ''}`} style={{ overscrollBehavior: 'none' }}>
          <MobileRouteGuard pathname={pathname}>
            {children}
          </MobileRouteGuard>
        </main>
      </div>

      {/* AI Chat Sidebar (Right) - Desktop only */}
      <div className="hidden lg:block">
        <AiChatSidebar />
      </div>

      {/* Mobile: Mivo Floating Action Button (draggable vertically) — always mounted to keep touch listeners alive */}
      <div
        ref={fabRef}
        onClick={() => { if (!fabMoved.current) setMobileMivoOpen(true); }}
        className={`lg:hidden fixed right-4 z-40 cursor-pointer select-none transition-opacity duration-200 ${
          mobileMivoOpen || mivoClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          top: fabY != null ? `${fabY}px` : undefined,
          bottom: fabY == null ? `calc(72px + 16px + env(safe-area-inset-bottom, 0px))` : undefined,
          transition: fabDragging.current ? 'none' : 'top 0.2s ease-out, opacity 0.2s ease',
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
        }}
        role="button"
        aria-label="Mivo KI-Chat öffnen"
      >
        <Image src="/logo-icon-only.png" alt="Mivo" width={52} height={52} className="pointer-events-none" draggable={false} />
      </div>

      {/* Mobile: Mivo Full-Screen Chat Overlay */}
      {(mobileMivoOpen || mivoClosing) && (
        <div
          className={`lg:hidden fixed inset-0 z-50 ${isDark ? 'bg-[#111111]' : 'bg-white'} ${mivoClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
          style={{ overscrollBehavior: 'none' }}
        >
          <AiChatSidebar mobile onClose={handleCloseMivo} />
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
  const tCommon = useTranslations('common');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    isTrialActive: boolean;
    trialDaysLeft: number;
    subscriptionId: string | null;
    billingEnabled: boolean;
  } | null>(null);
  // True once the billing fetch has settled (success or error), so the gate
  // logic doesn't stay forever deferred when the API is unreachable.
  const [billingResolved, setBillingResolved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchSub = async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${getApiUrl()}/billing/subscription`, { headers });
        if (res.ok) {
          const data = await res.json();
          setSubscriptionStatus({
            isTrialActive: data.isTrialActive ?? false,
            trialDaysLeft: data.trialDaysLeft ?? 0,
            subscriptionId: data.subscriptionId ?? null,
            billingEnabled: data.billingEnabled ?? false,
          });
        }
      } catch {
        // non-critical — don't block dashboard
      } finally {
        setBillingResolved(true);
      }
    };
    fetchSub();
  }, [isAuthenticated]);

  useEffect(() => {
    // Wait until Amplify is configured before checking auth
    if (!authConfigured) return;

    const checkAuth = async () => {
      try {
        // forceRefresh ensures tokens are actually valid (not just cached but revoked)
        const session = await fetchAuthSession({ forceRefresh: true });
        if (session.tokens) {
          setIsAuthenticated(true);
        } else {
          const redirect = pathname && pathname !== '/dashboard' ? `?redirect=${encodeURIComponent(pathname)}` : '';
          router.replace(`/login${redirect}`);
        }
      } catch {
        // Clear stale tokens so the login page doesn't encounter them again
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('CognitoIdentityServiceProvider.') || key.startsWith('amplify-') || key.includes('cognito') || key.includes('Cognito'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
          try { await signOut(); } catch {}
        } catch {}
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
          <p className="mt-4 text-gray-600">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  // Determine if trial gate should be shown:
  // - trial expired (not active) AND no active subscription
  // - skip gate on billing settings page so users can always reach it
  // - if billing API failed (status still null after resolve), fall back to
  //   open access — we never block users due to a backend error
  const isOnBillingPage = pathname?.startsWith('/dashboard/settings/billing');
  const showTrialGate =
    billingResolved &&
    subscriptionStatus !== null &&
    !subscriptionStatus.isTrialActive &&
    !subscriptionStatus.subscriptionId &&
    subscriptionStatus.billingEnabled &&
    !isOnBillingPage;

  // Authenticated - show dashboard
  return (
    <DarkModeProvider>
      <RealtimeEventProvider>
        {showTrialGate && (
          <TrialGate billingEnabled={subscriptionStatus.billingEnabled} />
        )}
        <DashboardContent>{children}</DashboardContent>
      </RealtimeEventProvider>
    </DarkModeProvider>
  );
}
