'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { useCallback, useTransition } from 'react';
import { Globe } from 'lucide-react';
import { getApiUrl, fetchWithAuth } from '@/lib/api';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'toggle' | 'footer';
  className?: string;
  persistToDb?: boolean;
}

export default function LanguageSwitcher({ variant = 'toggle', className = '', persistToDb = false }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchLocale = useCallback(async (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Set cookie via API route
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    });

    // Persist to user settings in DB if logged in
    if (persistToDb) {
      try {
        const apiUrl = getApiUrl();
        await fetchWithAuth(`${apiUrl}/me/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: newLocale }),
        });
      } catch {
        // Silently fail - cookie is already set
      }
    }

    startTransition(() => {
      router.refresh();
    });
  }, [locale, router, persistToDb]);

  if (variant === 'footer') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Globe className="w-4 h-4 text-gray-400" />
        <div className="flex gap-1">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => switchLocale(l)}
              disabled={isPending}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                l === locale
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              } ${isPending ? 'opacity-50' : ''}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <select
        value={locale}
        onChange={(e) => switchLocale(e.target.value as Locale)}
        disabled={isPending}
        className={`text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 ${isPending ? 'opacity-50' : ''} ${className}`}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    );
  }

  // Toggle variant (default)
  return (
    <div className={`flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 ${className}`}>
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          disabled={isPending}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            l === locale
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          } ${isPending ? 'opacity-50' : ''}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
