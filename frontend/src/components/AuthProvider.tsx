'use client';

import { Amplify } from 'aws-amplify';
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

  if (!configured) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
