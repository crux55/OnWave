'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { WebSocketNotification } from '@/lib/types';

interface NotificationContextType {
  requestNotificationPermission: () => Promise<boolean>;
  notificationPermission: NotificationPermission;
  notifiedReminders: string[];
  clearNotifiedReminders: () => void;
  isWsConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost/ws';
const MAX_RECONNECT_DELAY_MS = 30000;

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );
  const [notifiedReminders, setNotifiedReminders] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notifiedReminders');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [isWsConnected, setIsWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);
  const isUnmountedRef = useRef(false);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
    return false;
  }, []);

  const clearNotifiedReminders = useCallback(() => {
    setNotifiedReminders([]);
    localStorage.setItem('notifiedReminders', JSON.stringify([]));
  }, []);

  const showReminderNotification = useCallback((notification: WebSocketNotification) => {
    toast({
      title: notification.title || '📻 Show Starting Soon!',
      description: notification.message,
      duration: 10000,
    });

    const currentPermission = typeof window !== 'undefined' ? Notification.permission : 'default';
    if (currentPermission === 'granted') {
      try {
        const browserNotification = new Notification(`📻 ${notification.show_name}`, {
          body: notification.message,
          icon: '/icons/icon-192x192.png',
          requireInteraction: true,
        });
        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();
        };
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }

    // Track in history for the Recent Notifications UI
    const key = `${notification.show_name}-${notification.show_time}-${notification.timestamp}`;
    setNotifiedReminders(prev => {
      const newNotified = [...prev, key];
      localStorage.setItem('notifiedReminders', JSON.stringify(newNotified));
      return newNotified;
    });
  }, [toast]);

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;

    const stored = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!stored) return;

    let userId: string;
    try {
      const auth = JSON.parse(stored);
      userId = auth.userId;
      if (!userId) return;
    } catch {
      return;
    }

    const url = `${WS_BASE_URL}?user_id=${userId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (isUnmountedRef.current) { ws.close(); return; }
      setIsWsConnected(true);
      reconnectDelayRef.current = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketNotification = JSON.parse(event.data);
        if (data.type === 'show_reminder') {
          showReminderNotification(data);
        }
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };

    ws.onclose = () => {
      setIsWsConnected(false);
      wsRef.current = null;
      if (isUnmountedRef.current) return;
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY_MS);
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      // onerror is always followed by onclose which handles reconnect;
      // logging the Event object directly shows {} because its props aren't enumerable.
      console.warn('[WS] WebSocket connection error — reconnecting automatically');
    };
  }, [showReminderNotification]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    const handleAuthChange = () => {
      const hasToken = !!localStorage.getItem('token');
      if (hasToken) {
        // Connect if not already open or connecting
        if (!wsRef.current) connect();
      } else {
        // Logged out — cancel pending reconnect and close socket
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
        setIsWsConnected(false);
      }
    };

    window.addEventListener('authChange', handleAuthChange);

    return () => {
      isUnmountedRef.current = true;
      window.removeEventListener('authChange', handleAuthChange);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [connect]);

  const value: NotificationContextType = {
    requestNotificationPermission,
    notificationPermission,
    notifiedReminders,
    clearNotifiedReminders,
    isWsConnected,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;