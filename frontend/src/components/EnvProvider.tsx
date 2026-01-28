'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface EnvConfig {
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  awsRegion: string;
}

const EnvContext = createContext<EnvConfig | null>(null);

export function EnvProvider({ 
  children, 
  config 
}: { 
  children: React.ReactNode; 
  config: EnvConfig;
}) {
  // Also set on window for non-React code if needed
  if (typeof window !== 'undefined') {
    (window as any).__ENV__ = config;
  }

  return (
    <EnvContext.Provider value={config}>
      {children}
    </EnvContext.Provider>
  );
}

export function useEnv() {
  const context = useContext(EnvContext);
  if (!context) {
    // Fallback to process.env for development/build time if context is missing
    return {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
      awsRegion: process.env.NEXT_PUBLIC_AWS_REGION || '',
    };
  }
  return context;
}

// Helper to get config outside of components (e.g. in api.ts)
export function getRuntimeConfig(): EnvConfig {
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__;
  }
  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
    userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
    awsRegion: process.env.NEXT_PUBLIC_AWS_REGION || '',
  };
}
