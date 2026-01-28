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

  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Konfiguration wird geladen...</h2>
          <p className="text-sm text-gray-500 mt-2">
            Falls dies länger dauert, prüfen Sie bitte Ihre Umgebungsvariablen (.env.local).
          </p>
          <div className="mt-4 text-xs text-gray-400 font-mono bg-gray-100 p-2 rounded text-left inline-block">
            Missing: {config.userPoolId ? '' : 'NEXT_PUBLIC_USER_POOL_ID '}
            {config.userPoolClientId ? '' : 'NEXT_PUBLIC_USER_POOL_CLIENT_ID'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Authenticator.Provider>
      {children}
    </Authenticator.Provider>
  );
}
