'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface RuntimeConfig {
  apiUrl: string;
  streamUrl: string; // Lambda Function URL for streaming (no API GW 29s limit)
  userPoolId: string;
  userPoolClientId: string;
  adminUserPoolId: string;
  adminUserPoolClientId: string;
  awsRegion: string;
  mediaCdnUrl: string; // Media CDN base URL (e.g. https://test-media.immivo.ai) — used for landing video
}

const defaultConfig: RuntimeConfig = {
  apiUrl: '',
  streamUrl: '',
  userPoolId: '',
  userPoolClientId: '',
  adminUserPoolId: '',
  adminUserPoolClientId: '',
  awsRegion: 'eu-central-1',
  mediaCdnUrl: '',
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
            apiUrl: (data.apiUrl || '').replace(/\/+$/, ''),
            streamUrl: (data.streamUrl || '').replace(/\/+$/, ''),
            userPoolId: data.userPoolId || '',
            userPoolClientId: data.userPoolClientId || '',
            adminUserPoolId: data.adminUserPoolId || '',
            adminUserPoolClientId: data.adminUserPoolClientId || '',
            awsRegion: data.awsRegion || 'eu-central-1',
            mediaCdnUrl: (data.mediaCdnUrl || '').replace(/\/+$/, ''),
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
