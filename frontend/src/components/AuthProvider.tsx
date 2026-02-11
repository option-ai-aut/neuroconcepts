'use client';

import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import { useEnv } from './EnvProvider';
import { createContext, useContext, useEffect, useState } from 'react';

// Context to expose whether Amplify has been configured
const AuthConfigContext = createContext<boolean>(false);

export function useAuthConfigured() {
  return useContext(AuthConfigContext);
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
