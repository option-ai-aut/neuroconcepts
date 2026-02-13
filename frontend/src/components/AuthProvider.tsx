'use client';

import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Authenticator } from '@aws-amplify/ui-react';
import { useEnv } from './EnvProvider';
import { createContext, useContext, useEffect, useState } from 'react';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const config = useEnv();
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
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
  }, [config]);

  // Always render children - don't block the entire app.
  // Pages that need auth (login, dashboard) handle their own loading state.
  // Public pages (landing page, legal) render instantly.
  return (
    <AuthConfigContext.Provider value={configured}>
      {configured ? (
        <Authenticator.Provider>
          {children}
        </Authenticator.Provider>
      ) : (
        <>{children}</>
      )}
    </AuthConfigContext.Provider>
  );
}
