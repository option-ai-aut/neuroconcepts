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

const RuntimeConfigContext = createContext<RuntimeConfig | null>(null);

export function RuntimeConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        // Try to load from API endpoint
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          // Validate that we have the required fields
          if (data.userPoolId && data.userPoolClientId) {
            setConfig(data);
            // Also set on window for non-React code
            if (typeof window !== 'undefined') {
              (window as any).__ENV__ = data;
            }
          } else {
            // Missing config - show which ones
            const missing: string[] = [];
            if (!data.userPoolId) missing.push('NEXT_PUBLIC_USER_POOL_ID');
            if (!data.userPoolClientId) missing.push('NEXT_PUBLIC_USER_POOL_CLIENT_ID');
            setError(`Missing: ${missing.join(' ')}`);
          }
        } else {
          setError('Failed to load configuration');
        }
      } catch (err) {
        console.error('Config load error:', err);
        setError('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Konfiguration wird geladen...</p>
          <p className="text-xs text-gray-400 mt-2">Falls dies länger dauert, prüfen Sie bitte Ihre Umgebungsvariablen (.env.local).</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Konfiguration wird geladen...</p>
          <p className="text-xs text-gray-400 mt-2">Falls dies länger dauert, prüfen Sie bitte Ihre Umgebungsvariablen (.env.local).</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <RuntimeConfigContext.Provider value={config}>
      {children}
    </RuntimeConfigContext.Provider>
  );
}

export function useRuntimeConfig() {
  const context = useContext(RuntimeConfigContext);
  if (!context) {
    throw new Error('useRuntimeConfig must be used within RuntimeConfigProvider');
  }
  return context;
}

// Helper to get config outside of components
export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__;
  }
  // Fallback - should not happen in production
  return {
    apiUrl: '',
    userPoolId: '',
    userPoolClientId: '',
    adminUserPoolId: '',
    adminUserPoolClientId: '',
    awsRegion: 'eu-central-1',
  };
}
