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
    
    // Calculate minutes until show starts
    const minutesUntilShow = Math.ceil((showDateTime.getTime() - now.getTime()) / (1000 * 60));
    
    // Show toast notification
    toast({
      title: "📻 Show Starting Soon!",
      description: `${reminder.show_name} starts in ${minutesUntilShow} minute${minutesUntilShow !== 1 ? 's' : ''}`,
      duration: 10000, // Show for 10 seconds
    });

    // Show browser notification if permission granted
    if (notificationPermission === 'granted') {
      try {
        const notification = new Notification(`📻 ${reminder.show_name}`, {
          body: `Starting in ${minutesUntilShow} minute${minutesUntilShow !== 1 ? 's' : ''}`,
          icon: '/icons/icon-192x192.png',
          tag: reminder.id, // Prevent duplicates
          requireInteraction: true, // Keep notification until user interacts
        });

        // Optional: Handle notification click to navigate to show
        notification.onclick = () => {
          window.focus();
          notification.close();
          // You could navigate to a specific show page here
          // router.push(`/shows/${reminder.show_id}`);
        };
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }

    // Mark as notified to prevent duplicates
    markAsNotified(reminder.id);
  }, [notificationPermission, toast, markAsNotified]);

  const checkReminders = useCallback(() => {
    if (!allReminders.length) return;

    const now = new Date();
    
    allReminders.forEach(reminder => {
      // Skip if already notified
      if (notifiedReminders.includes(reminder.id)) return;

      try {
        // Parse reminder date and time
        const showDateTime = new Date(`${reminder.show_date}T${reminder.show_start_time}`);
        const reminderTime = new Date(showDateTime.getTime() - (reminder.reminder_minutes_before * 60 * 1000));
        
        // Check if it's time to show the reminder
        // Show notification if current time is past reminder time and before show starts
        if (now >= reminderTime && now < showDateTime) {
          showReminderNotification(reminder);
        }
      } catch (error) {
        console.error('Error processing reminder:', reminder, error);
      }
    });
  }, [allReminders, notifiedReminders, showReminderNotification]);

  // Set up reminder checking interval
    useEffect(() => {
        checkReminders();
    }, [allReminders]);

    useEffect(() => {
        const interval = setInterval(checkReminders, 60000);
        return () => clearInterval(interval);
    }, []);

  // Clean up old notified reminders (older than 24 hours)
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

  // Request notification permission on first load if not already decided
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