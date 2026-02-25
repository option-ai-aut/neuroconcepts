'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, X, AlertCircle, MessageSquare, UserPlus, Mail, Clock } from 'lucide-react';
import useSWR from 'swr';
import { useEnv } from './EnvProvider';
import { fetchWithAuth } from '@/lib/api';
import { useRealtimeEvents } from './RealtimeEventProvider';
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
  MIVO_QUESTION: <MessageSquare className="w-4 h-4 text-blue-400" />,
  REMINDER: <Clock className="w-4 h-4 text-amber-400" />,
  ESCALATION: <AlertCircle className="w-4 h-4 text-red-400" />,
  NEW_LEAD: <UserPlus className="w-4 h-4 text-green-400" />,
  LEAD_RESPONSE: <Mail className="w-4 h-4 text-blue-400" />,
  SYSTEM: <Bell className="w-4 h-4 text-gray-400" />,
};

export default function NotificationBell() {
  const { apiUrl } = useEnv();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  const { eventVersion } = useRealtimeEvents();

  const { data, mutate } = useSWR<{ notifications: Notification[]; unreadCount: number }>(
    `${apiUrl}/notifications?limit=20`,
    (url: string) => fetchWithAuth(url),
    { refreshInterval: 30_000 } // Polling every 30s as fallback (SSE can be delayed on API Gateway)
  );

  // Re-fetch when SSE event arrives
  useEffect(() => {
    if (eventVersion > 0) {
      mutate();
    }
  }, [eventVersion, mutate]);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Calculate dropdown position from button
  const openDropdown = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen(prev => !prev);
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

  const getNotificationLink = (notification: Notification): string => {
    const meta = notification.metadata;
    const leadId = meta?.leadId;
    const propertyId = meta?.propertyId;
    const actionId = meta?.actionId;

    switch (notification.type) {
      case 'NEW_LEAD':
      case 'LEAD_RESPONSE':
        if (leadId) return `/dashboard/leads/${leadId}`;
        return '/dashboard/leads';
      case 'MIVO_QUESTION':
      case 'ESCALATION':
        if (leadId) return `/dashboard/leads/${leadId}`;
        return '/dashboard/activities';
      case 'REMINDER':
        if (leadId) return `/dashboard/leads/${leadId}`;
        return '/dashboard/activities';
      default:
        if (leadId) return `/dashboard/leads/${leadId}`;
        if (propertyId) return `/dashboard/properties/${propertyId}`;
        return '/dashboard/activities';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    const link = getNotificationLink(notification);
    setIsOpen(false);
    router.push(link);
  };

  const dropdownContent = isOpen ? createPortal(
    <>
      {/* Backdrop — closes dropdown on click */}
      <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />

      {/* Dropdown — fixed position, escapes overflow-hidden parents */}
      <div
        className="fixed w-96 max-w-[calc(100vw-1rem)] rounded-xl shadow-2xl z-[9999] overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827]"
        style={{ top: dropdownPos.top, right: dropdownPos.right }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Benachrichtigungen</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" />
              Alle gelesen
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Keine Benachrichtigungen</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                  !notification.read ? 'bg-blue-50/50 dark:bg-gray-800/30' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${
                        notification.read ? 'text-gray-400 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
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
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/dashboard/activities');
              }}
              className="w-full text-center text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 py-1"
            >
              Alle anzeigen
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={openDropdown}
        className="relative p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {dropdownContent}
    </>
  );
}
