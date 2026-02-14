'use client';

import { Amplify } from 'aws-amplify';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Authenticator } from '@aws-amplify/ui-react';
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

/** Clear all Cognito tokens from localStorage to prevent stale token 400 errors */
function clearCognitoStorage() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('CognitoIdentityServiceProvider.') ||
        key.startsWith('amplify-') ||
        key.includes('cognito')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const config = useEnv();
  const pathname = usePathname();
  const [configured, setConfigured] = useState(false);

  // Skip user pool configuration for admin routes — admin layout handles its own auth
  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) {
      // Don't configure Amplify with user pool for admin routes
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

      // Validate cached session — if tokens are stale, clear them
      fetchAuthSession().catch(() => {
        clearCognitoStorage();
      });

      setConfigured(true);
    }
  }, [config, isAdminRoute]);

  // Always render children - don't block the entire app.
  // Pages that need auth (login, dashboard) handle their own loading state.
  // Public pages (landing page, legal) render instantly.
  return (
    <AuthConfigContext.Provider value={configured}>
      {configured && !isAdminRoute ? (
        <Authenticator.Provider>
          {children}
        </Authenticator.Provider>
      ) : (
        <>{children}</>
      )}
    </AuthConfigContext.Provider>
  );
}
