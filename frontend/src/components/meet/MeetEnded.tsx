'use client';

import { CheckCircle } from 'lucide-react';

interface MeetEndedProps {
  roomCode: string;
  onRejoin: () => void;
}

export default function MeetEnded({ roomCode, onRejoin }: MeetEndedProps) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-5" />
        <h2 className="text-2xl font-bold text-white mb-2">Meeting beendet</h2>
        <p className="text-gray-400 text-sm mb-6">
          Du hast das Meeting verlassen. Das Fenster kann geschlossen werden.
        </p>
        <button
          onClick={onRejoin}
          className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Wieder beitreten
        </button>
      </div>
    </div>
  );
}
