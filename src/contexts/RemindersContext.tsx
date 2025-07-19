'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { createReminder, getUserReminders, deleteReminder } from '@/lib/api';
import type { Reminder } from '@/lib/types';

interface RemindersContextType {
  reminders: Reminder[];
  allReminders: Reminder[];
  isLoading: boolean;
  error: string | null;
  fetchReminders: () => Promise<void>;
  addReminder: (reminderData: {
    show_name: string;
    show_date: string;
    show_start_time: string;
    reminder_minutes_before: number;
  }) => Promise<Reminder>;
  removeReminder: (reminderId: string) => Promise<void>;
  clearError: () => void;
}

const RemindersContext = createContext<RemindersContextType | undefined>(undefined);

export const RemindersProvider = ({ children }: { children: ReactNode }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [allReminders, setAllReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = async () => {
    // Don't fetch if not logged in
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getUserReminders();
      setReminders(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch reminders';
      setError(errorMessage);
      setReminders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addReminder = async (reminderData: {
    show_name: string;
    show_date: string;
    show_start_time: string;
    reminder_minutes_before: number;
  }) => {
    setError(null);
    
    // Check if reminder already exists locally
    const existingReminder = allReminders.find(
      reminder => 
        reminder.show_name === reminderData.show_name &&
        reminder.show_date === reminderData.show_date &&
        reminder.show_start_time === reminderData.show_start_time
    );
    
    if (existingReminder) {
      const errorMessage = 'You already have a reminder set for this show';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      const newReminder = await createReminder(reminderData);
      setAllReminders(prev => [...prev, newReminder]);
      // Only fetch reminders if user is still logged in
      const token = localStorage.getItem("token");
      if (token) {
        await fetchReminders();
      }
      return newReminder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create reminder';
      setError(errorMessage);
      throw err;
    }
  };

  const removeReminder = async (reminderId: string) => {
    setError(null);
    
    try {
      await deleteReminder(reminderId);
      // Remove from both active and all reminders
      setReminders(prev => {
        const currentReminders = Array.isArray(prev) ? prev : [];
        return currentReminders.filter(reminder => reminder.id !== reminderId);
      });
      setAllReminders(prev => prev.filter(reminder => reminder.id !== reminderId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete reminder';
      setError(errorMessage);
      throw err;
    }
  };

  // Auto-fetch reminders on mount - only once per app session
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchReminders();
    }
  }, []);

  const clearError = () => setError(null);

  const value = {
    reminders,
    allReminders,
    isLoading,
    error,
    fetchReminders,
    addReminder,
    removeReminder,
    clearError,
  };

  return (
    <RemindersContext.Provider value={value}>
      {children}
    </RemindersContext.Provider>
  );
};

export const useReminders = () => {
  const context = useContext(RemindersContext);
  if (context === undefined) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return context;
};
