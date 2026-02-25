'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getApiUrl, getAuthHeaders } from '@/lib/api';

// Event types matching backend RealtimeEvent.type
export type RealtimeEventType =
  | 'NEW_LEAD'
  | 'PROPERTY_MATCHED'
  | 'PENDING_ACTION'
  | 'NOTIFICATION'
  | 'ACTIVITY'
  | 'LINK_CLICK_REQUIRED';

export interface RealtimeEvent {
  type: RealtimeEventType;
  data: Record<string, any>;
  createdAt: string;
}

type EventHandler = (event: RealtimeEvent) => void;

interface RealtimeContextValue {
  /** Subscribe to a specific event type. Returns unsubscribe function. */
  subscribe: (type: RealtimeEventType | '*', handler: EventHandler) => () => void;
  /** Whether the SSE connection is active */
  connected: boolean;
  /** Manually trigger a refresh for all subscribers (fallback) */
  triggerRefresh: () => void;
  /** Counter that increments on each event (for useEffect deps) */
  eventVersion: number;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  subscribe: () => () => {},
  connected: false,
  triggerRefresh: () => {},
  eventVersion: 0,
});

export function useRealtimeEvents() {
  return useContext(RealtimeContext);
}

/**
 * Hook to subscribe to specific event types and trigger a callback.
 * Re-renders when an event of the specified type(s) arrives.
 */
export function useRealtimeEvent(types: RealtimeEventType | RealtimeEventType[], callback: EventHandler) {
  const { subscribe } = useRealtimeEvents();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const typeList = Array.isArray(types) ? types : [types];
    const unsubscribes = typeList.map(type =>
      subscribe(type, (event) => callbackRef.current(event))
    );
    return () => unsubscribes.forEach(unsub => unsub());
  }, [subscribe, ...(Array.isArray(types) ? types : [types])]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function RealtimeEventProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [eventVersion, setEventVersion] = useState(0);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastEventIdRef = useRef<string>('');
  const retryCountRef = useRef(0);

  const subscribe = useCallback((type: RealtimeEventType | '*', handler: EventHandler): (() => void) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);

    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  const dispatch = useCallback((event: RealtimeEvent) => {
    // Notify type-specific handlers
    const typeHandlers = handlersRef.current.get(event.type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => handler(event));
    }
    // Notify wildcard handlers
    const wildcardHandlers = handlersRef.current.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler(event));
    }
    // Increment version to trigger re-renders
    setEventVersion(v => v + 1);
  }, []);

  const triggerRefresh = useCallback(() => {
    setEventVersion(v => v + 1);
  }, []);

  const connectSSE = useCallback(async () => {
    // Abort any existing connection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const ctrl = new AbortController();
    abortControllerRef.current = ctrl;

    try {
      const apiUrl = getApiUrl();
      const headers = await getAuthHeaders();

      await fetchEventSource(`${apiUrl}/events/stream`, {
        method: 'GET',
        headers: headers as Record<string, string>,
        signal: ctrl.signal,

        onopen: async (response) => {
          if (response.ok) {
            setConnected(true);
            retryCountRef.current = 0;
            console.log('[SSE] Connected to event stream');
          } else {
            console.warn(`[SSE] Connection failed: ${response.status}`);
            setConnected(false);
          }
        },

        onmessage: (msg) => {
          if (!msg.data) return; // heartbeat

          try {
            const event = JSON.parse(msg.data) as RealtimeEvent;
            if (msg.id) lastEventIdRef.current = msg.id;
            dispatch(event);
          } catch (err) {
            console.warn('[SSE] Failed to parse event:', msg.data);
          }
        },

        onerror: (err) => {
          console.warn('[SSE] Error:', err);
          setConnected(false);
          retryCountRef.current++;
          
          // Exponential backoff: 2s, 4s, 8s, max 30s
          const delay = Math.min(2000 * Math.pow(2, retryCountRef.current - 1), 30000);
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${retryCountRef.current})`);
          
          // Return the delay to let fetchEventSource handle retry
          // Returning undefined would use default retry
        },

        onclose: () => {
          setConnected(false);
          console.log('[SSE] Connection closed, will reconnect');
        },

        openWhenHidden: true, // Keep connection even when tab is hidden
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[SSE] Connection error:', err);
        setConnected(false);
      }
    }
  }, [dispatch]);

  useEffect(() => {
    // Small delay to ensure auth is ready
    const timer = setTimeout(() => {
      connectSSE();
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [connectSSE]);

  return (
    <RealtimeContext.Provider value={{ subscribe, connected, triggerRefresh, eventVersion }}>
      {children}
    </RealtimeContext.Provider>
  );
}
