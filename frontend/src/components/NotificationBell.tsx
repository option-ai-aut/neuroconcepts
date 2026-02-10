'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, AlertCircle, MessageSquare, UserPlus, Mail, Clock } from 'lucide-react';
import useSWR from 'swr';
import { useEnv } from './EnvProvider';
import { fetchWithAuth } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

const notificationIcons: Record<string, React.ReactNode> = {
  JARVIS_QUESTION: <MessageSquare className="w-4 h-4 text-indigo-400" />,
  REMINDER: <Clock className="w-4 h-4 text-amber-400" />,
  ESCALATION: <AlertCircle className="w-4 h-4 text-red-400" />,
  NEW_LEAD: <UserPlus className="w-4 h-4 text-green-400" />,
  LEAD_RESPONSE: <Mail className="w-4 h-4 text-blue-400" />,
  SYSTEM: <Bell className="w-4 h-4 text-gray-400" />,
};

export default function NotificationBell() {
  const { apiUrl } = useEnv();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, mutate } = useSWR<{ notifications: Notification[]; unreadCount: number }>(
    `${apiUrl}/notifications?limit=20`,
    (url: string) => fetchWithAuth(url),
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetchWithAuth(`${apiUrl}/notifications/${id}/read`, {
        method: 'PATCH'
      });
      mutate();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetchWithAuth(`${apiUrl}/notifications/mark-all-read`, {
        method: 'POST'
      });
      mutate();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    return notificationIcons[type] || notificationIcons.SYSTEM;
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: de });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h3 className="font-semibold text-white">Benachrichtigungen</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                Alle gelesen
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Keine Benachrichtigungen</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-gray-800/30' : ''
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    // TODO: Navigate based on notification type
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${
                          notification.read ? 'text-gray-400' : 'text-white'
                        }`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-700">
              <button className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 py-1">
                Alle anzeigen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
