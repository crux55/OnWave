'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useReminders } from './RemindersContext';
import { useToast } from '@/hooks/use-toast';
import { Reminder } from '@/lib/types';

interface NotificationContextType {
  requestNotificationPermission: () => Promise<boolean>;
  notificationPermission: NotificationPermission;
  notifiedReminders: string[];
  markAsNotified: (reminderId: string) => void;
  clearNotifiedReminders: () => void;
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

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { allReminders } = useReminders();
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

  const markAsNotified = useCallback((reminderId: string) => {
    setNotifiedReminders(prev => {
      const newNotified = [...prev, reminderId];
      localStorage.setItem('notifiedReminders', JSON.stringify(newNotified));
      return newNotified;
    });
  }, []);

  const clearNotifiedReminders = useCallback(() => {
    setNotifiedReminders([]);
    localStorage.setItem('notifiedReminders', JSON.stringify([]));
  }, []);

  const showReminderNotification = useCallback((reminder: Reminder) => {
    const now = new Date();
    const showDateTime = new Date(`${reminder.show_date}T${reminder.show_start_time}`);
    const reminderTime = new Date(showDateTime.getTime() - (reminder.reminder_minutes_before * 60 * 1000));
    
    const minutesUntilShow = Math.ceil((showDateTime.getTime() - now.getTime()) / (1000 * 60));
    
    toast({
      title: "📻 Show Starting Soon!",
      description: `${reminder.show_name} starts in ${minutesUntilShow} minute${minutesUntilShow !== 1 ? 's' : ''}`,
      duration: 10000,
    });

    if (notificationPermission === 'granted') {
      try {
        const notification = new Notification(`📻 ${reminder.show_name}`, {
          body: `Starting in ${minutesUntilShow} minute${minutesUntilShow !== 1 ? 's' : ''}`,
          icon: '/icons/icon-192x192.png',
          tag: reminder.id,
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }

    markAsNotified(reminder.id);
  }, [notificationPermission, toast, markAsNotified]);

  const checkReminders = useCallback(() => {
    if (!allReminders.length) return;

    const now = new Date();
    
    allReminders.forEach(reminder => {
      if (notifiedReminders.includes(reminder.id)) return;

      try {
        const showDateTime = new Date(`${reminder.show_date}T${reminder.show_start_time}`);
        const reminderTime = new Date(showDateTime.getTime() - (reminder.reminder_minutes_before * 60 * 1000));
        
        if (now >= reminderTime && now < showDateTime) {
          showReminderNotification(reminder);
        }
      } catch (error) {
        console.error('Error processing reminder:', reminder, error);
      }
    });
  }, [allReminders, notifiedReminders, showReminderNotification]);

    useEffect(() => {
        checkReminders();
    }, [allReminders]);

    useEffect(() => {
        const interval = setInterval(checkReminders, 60000);
        return () => clearInterval(interval);
    }, []);

  useEffect(() => {
    const cleanupOldNotifications = () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const validReminderIds = allReminders
        .filter(reminder => {
          try {
            const showDate = new Date(`${reminder.show_date}T${reminder.show_start_time}`);
            return showDate > oneDayAgo;
          } catch {
            return false;
          }
        })
        .map(reminder => reminder.id);

      setNotifiedReminders(prev => {
        const filtered = prev.filter(id => validReminderIds.includes(id));
        if (filtered.length !== prev.length) {
          localStorage.setItem('notifiedReminders', JSON.stringify(filtered));
        }
        return filtered;
      });
    };

    cleanupOldNotifications();
  }, [allReminders]);

  useEffect(() => {
    if (notificationPermission === 'default') {
      // Don't automatically request permission - let user trigger it
      // You could show a banner or button to request permission
    }
  }, [notificationPermission]);

  const value: NotificationContextType = {
    requestNotificationPermission,
    notificationPermission,
    notifiedReminders,
    markAsNotified,
    clearNotifiedReminders,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;