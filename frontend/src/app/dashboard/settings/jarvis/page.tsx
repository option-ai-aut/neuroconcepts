'use client';

import { useState } from 'react';

export default function JarvisSettingsPage() {
  const [autoReply, setAutoReply] = useState(true);
  const [delay, setDelay] = useState(5);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Jarvis Automatisierung</h2>
        <p className="text-sm text-gray-500 mb-6">
          Konfigurieren Sie, wie Jarvis auf neue Leads reagieren soll.
        </p>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">Automatische Antwort</span>
              <span className="text-sm text-gray-500">Soll Jarvis automatisch Exposés an neue Leads senden?</span>
            </div>
            <button
              onClick={() => setAutoReply(!autoReply)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                autoReply ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoReply ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Verzögerung (Minuten)</label>
            <p className="text-sm text-gray-500 mb-3">
              Wartezeit vor dem Senden, damit es natürlicher wirkt.
            </p>
            <div className="w-full max-w-xs">
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={delay}
                onChange={(e) => setDelay(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="mt-2 text-sm text-gray-900 font-medium">{delay} Minuten</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
