'use client';

import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import { useEnv } from './EnvProvider';
import { useEffect, useState } from 'react';

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
  if (!configured) {
    return <>{children}</>;
  }

  return (
    <Authenticator.Provider>
      {children}
    </Authenticator.Provider>
  );
}
