'use client';

import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useEnv } from './EnvProvider';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Context to expose whether Amplify has been configured
const AuthConfigContext = createContext<boolean>(false);

export function useAuthConfigured() {
  return useContext(AuthConfigContext);
}

/** Returns session with getIdToken().getJwtToken() for auth headers. Token may be null while loading. */
export function useAuth() {
  const [session, setSession] = useState<{ getIdToken: () => { getJwtToken: () => string } } | null>(null);

  useEffect(() => {
    fetchAuthSession()
      .then((s) => {
        const token = s.tokens?.idToken?.toString();
        setSession(token ? { getIdToken: () => ({ getJwtToken: () => token }) } : null);
      })
      .catch(() => setSession(null));
  }, []);

  return { session };
}

/**
 * AuthProvider — configures Amplify with the correct Cognito User Pool.
 *
 * IMPORTANT: We intentionally do NOT use <Authenticator.Provider> because:
 * 1. The app uses custom login pages (signIn/signUp from aws-amplify/auth), not <Authenticator>
 * 2. Authenticator.Provider auto-restores sessions on mount, which causes 400 errors
 *    when stale refresh tokens exist in localStorage (e.g. after password resets)
 * 3. No component in the app uses useAuthenticator()
 *
 * Admin routes (/admin/*) are skipped here — they configure their own Amplify
 * instance with the separate Admin User Pool in admin/layout.tsx.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const config = useEnv();
  const pathname = usePathname();
  const [configured, setConfigured] = useState(false);

  // Skip user pool configuration for admin routes — admin layout handles its own auth
  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) {
      setConfigured(true);
      return;
    }
    if (config.userPoolId && config.userPoolClientId) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: config.userPoolId,
            userPoolClientId: config.userPoolClientId,
          }
        }
      });
      setConfigured(true);
    }
  }, [config, isAdminRoute]);

  return (
    <AuthConfigContext.Provider value={configured}>
      {children}
    </AuthConfigContext.Provider>
  );
}
