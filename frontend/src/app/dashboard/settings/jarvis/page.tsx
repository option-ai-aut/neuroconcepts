'use client';

import { useState } from 'react';
import { Bot, Clock, MessageSquare, Zap } from 'lucide-react';

export default function JarvisSettingsPage() {
  const [autoReply, setAutoReply] = useState(true);
  const [delay, setDelay] = useState(5);
  const [autoMatch, setAutoMatch] = useState(true);
  const [notifyOnMatch, setNotifyOnMatch] = useState(true);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Jarvis Automatisierung</h2>
        <p className="text-sm text-gray-500 mb-6">
          Konfigurieren Sie, wie Jarvis auf neue Leads reagieren soll.
        </p>

        <div className="space-y-6">
          {/* Auto Reply */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">Automatische Antwort</span>
                <p className="text-xs text-gray-500">Jarvis sendet automatisch Exposés an neue Leads</p>
              </div>
            </div>
            <button
              onClick={() => setAutoReply(!autoReply)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoReply ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoReply ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto Match */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">Auto-Matching</span>
                <p className="text-xs text-gray-500">Leads automatisch mit passenden Objekten verbinden</p>
              </div>
            </div>
            <button
              onClick={() => setAutoMatch(!autoMatch)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoMatch ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoMatch ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Notify on Match */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">Match-Benachrichtigung</span>
                <p className="text-xs text-gray-500">Bei neuen Matches benachrichtigen</p>
              </div>
            </div>
            <button
              onClick={() => setNotifyOnMatch(!notifyOnMatch)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                notifyOnMatch ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  notifyOnMatch ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Delay Setting */}
          <div className="py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">Verzögerung</span>
                <p className="text-xs text-gray-500">Wartezeit vor dem Senden, damit es natürlicher wirkt</p>
              </div>
            </div>
            <div className="ml-13 pl-13">
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={delay}
                onChange={(e) => setDelay(parseInt(e.target.value))}
                className="w-full max-w-xs h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="mt-2 text-sm text-gray-900 font-medium">{delay} Minuten</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
