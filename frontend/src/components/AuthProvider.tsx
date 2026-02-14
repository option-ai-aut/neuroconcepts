'use client';

import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useEnv } from './EnvProvider';
import { createContext, useContext, useEffect, useState, useRef } from 'react';
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
 * Proactively remove ANY Cognito/Amplify tokens from localStorage
 * BEFORE Amplify.configure() so it starts with a clean slate.
 * This prevents the 400 error that occurs when Amplify tries to use
 * a stale/revoked refresh token to restore a session.
 * 
 * NOTE: This only clears tokens if the access token is expired or
 * if there are tokens from a different user pool client. Valid sessions
 * are preserved.
 */
function clearStaleTokensForClient(clientId: string) {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Check if this is a Cognito token from a DIFFERENT client
      if (key.startsWith('CognitoIdentityServiceProvider.') && !key.includes(clientId)) {
        keysToRemove.push(key);
        continue;
      }

      // Check if this client's tokens have an expired access token
      if (key.startsWith(`CognitoIdentityServiceProvider.${clientId}`) && key.endsWith('.accessToken')) {
        try {
          const token = localStorage.getItem(key);
          if (token) {
            // JWT: header.payload.signature — decode payload to check exp
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
              // Access token expired — clear ALL tokens for this client
              // (Amplify would try to refresh with potentially revoked refresh token → 400)
              for (let j = 0; j < localStorage.length; j++) {
                const k2 = localStorage.key(j);
                if (k2 && k2.startsWith(`CognitoIdentityServiceProvider.${clientId}`)) {
                  keysToRemove.push(k2);
                }
              }
            }
          }
        } catch {
          // Can't decode token — remove it to be safe
          keysToRemove.push(key);
        }
      }
    }

    // Also clear any amplify-* keys from different sessions
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('amplify-') || key.includes('cognito'))) {
        // Only remove if we're also removing cognito tokens (stale session)
        if (keysToRemove.length > 0) {
          keysToRemove.push(key);
        }
      }
    }

    if (keysToRemove.length > 0) {
      const unique = [...new Set(keysToRemove)];
      unique.forEach(k => localStorage.removeItem(k));
      console.log(`[AuthProvider] Cleared ${unique.length} stale Cognito token(s)`);
    }
  } catch {}
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
  const hasCleared = useRef(false);

  // Skip user pool configuration for admin routes — admin layout handles its own auth
  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) {
      setConfigured(true);
      return;
    }
    if (config.userPoolId && config.userPoolClientId) {
      // CRITICAL: Clear stale/expired tokens BEFORE configuring Amplify
      // This prevents Amplify from using a revoked refresh token → 400
      if (!hasCleared.current) {
        clearStaleTokensForClient(config.userPoolClientId);
        hasCleared.current = true;
      }

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
