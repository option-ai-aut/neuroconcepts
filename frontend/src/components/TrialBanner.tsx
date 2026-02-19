'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Zap } from 'lucide-react';

interface TrialBannerProps {
  daysLeft: number;
}

export default function TrialBanner({ daysLeft }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('trial-banner-dismissed') === '1') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('trial-banner-dismissed', '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  const urgency = daysLeft <= 2;

  return (
    <div
      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
        urgency
          ? 'bg-amber-50 border-b border-amber-200 text-amber-900'
          : 'bg-gray-900 border-b border-white/[0.06] text-white'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Zap className={`w-3.5 h-3.5 flex-shrink-0 ${urgency ? 'text-amber-500' : 'text-blue-400'}`} />
        <span className="truncate">
          {daysLeft === 0
            ? 'Deine Testversion ist abgelaufen.'
            : daysLeft === 1
            ? 'Noch 1 Tag kostenlose Testversion.'
            : `Noch ${daysLeft} Tage kostenlose Testversion.`}
          {' '}
          <Link
            href="/dashboard/settings/billing"
            className={`font-semibold underline underline-offset-2 hover:no-underline ${
              urgency ? 'text-amber-700' : 'text-blue-400'
            }`}
          >
            Jetzt upgraden →
          </Link>
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className={`flex-shrink-0 p-0.5 rounded transition-colors ${
          urgency ? 'hover:bg-amber-100 text-amber-600' : 'hover:bg-white/10 text-gray-400'
        }`}
        aria-label="Banner schließen"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
