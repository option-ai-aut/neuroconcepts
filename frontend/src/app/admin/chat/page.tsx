'use client';

import { MessageSquare, Inbox } from 'lucide-react';

export default function AdminChatPage() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Team Chat</h1>
        <p className="text-sm text-gray-500 mt-0.5">Internes Admin-Team</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Team Chat noch nicht aktiv</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Der interne Admin-Chat wird mit dem nächsten Update verfügbar. Tenant-User haben bereits Zugang zum Team Chat innerhalb ihrer Organisation.
        </p>
      </div>
    </div>
  );
}
