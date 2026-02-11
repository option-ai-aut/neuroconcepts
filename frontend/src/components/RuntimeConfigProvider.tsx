'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface RuntimeConfig {
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  adminUserPoolId: string;
  adminUserPoolClientId: string;
  awsRegion: string;
}

const defaultConfig: RuntimeConfig = {
  apiUrl: '',
  userPoolId: '',
  userPoolClientId: '',
  adminUserPoolId: '',
  adminUserPoolClientId: '',
  awsRegion: 'eu-central-1',
};

const RuntimeConfigContext = createContext<RuntimeConfig>(defaultConfig);

/**
 * RuntimeConfigProvider fetches config from /api/config and provides it via context.
 * IMPORTANT: It always renders children immediately (non-blocking).
 * Pages that need auth (login, dashboard) handle the "not yet loaded" state themselves
 * by checking if userPoolId is set before configuring Amplify.
 * Public pages (landing page, legal) render instantly without waiting for config.
 */
export function RuntimeConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig>(defaultConfig);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          const loaded: RuntimeConfig = {
            apiUrl: data.apiUrl || '',
            userPoolId: data.userPoolId || '',
            userPoolClientId: data.userPoolClientId || '',
            adminUserPoolId: data.adminUserPoolId || '',
            adminUserPoolClientId: data.adminUserPoolClientId || '',
            awsRegion: data.awsRegion || 'eu-central-1',
          };
          setConfig(loaded);
          // Also set on window for non-React code
          if (typeof window !== 'undefined') {
            (window as any).__ENV__ = loaded;
          }
        }
      } catch (err) {
        console.error('Config load error:', err);
      }
    }

    loadConfig();
  }, []);

  return (
    <RuntimeConfigContext.Provider value={config}>
      {children}
    </RuntimeConfigContext.Provider>
  );
}

export function useRuntimeConfig() {
  return useContext(RuntimeConfigContext);
}

// Helper to get config outside of components
export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__;
  }
  return defaultConfig;
}
