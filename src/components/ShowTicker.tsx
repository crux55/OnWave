'use client';

import React, { useState, useEffect } from 'react';
import { fetchPBSShowsByDateRange } from '@/lib/api';
import type { PBSShow } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, Radio, X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReminders } from '@/contexts/RemindersContext';
import { useToast } from '@/hooks/use-toast';
import { useTicker } from '@/contexts/TickerContext';

interface ShowTickerProps {
  className?: string;
}

export const ShowTicker: React.FC<ShowTickerProps> = ({ className }) => {
  const [shows, setShows] = useState<PBSShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addReminder, allReminders } = useReminders();
  const { toast } = useToast();
  const { isTickerVisible, setTickerVisible } = useTicker();

  useEffect(() => {
    const fetchShows = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const fetchedShows = await fetchPBSShowsByDateRange(7);
        
        if (Array.isArray(fetchedShows)) {
          const filteredShows = fetchedShows
            .filter(show => show.status === 'live' || show.status === 'upcoming')
            .sort((a, b) => {
              const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
              if (dateComparison !== 0) return dateComparison;
              return a.start_time.localeCompare(b.start_time);
            });
          
          const liveShows = filteredShows.filter(show => show.status === 'live');
          const upcomingShows = filteredShows.filter(show => show.status === 'upcoming').slice(0, 3);
          const limitedShows = [...liveShows, ...upcomingShows];
          
          setShows(limitedShows);
        } else {
          setShows([]);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch shows');
        setShows([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShows();
    
    const interval = setInterval(fetchShows, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // Convert "HH:MM:SS" to "HH:MM"
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-500 text-white animate-pulse';
      case 'upcoming':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const handleCreateReminder = async (show: PBSShow) => {
    // Check if user is logged in before making API call
    const token = localStorage.getItem("token");
    if (!token) {
      toast({
        title: "Login required",
        description: "Please log in to set reminders for shows.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addReminder({
        show_name: show.name,
        show_date: show.date,
        show_start_time: show.start_time,
        reminder_minutes_before: 15, // Default to 15 minutes before
      });
      
      toast({
        title: "Reminder set!",
        description: `You'll be reminded about "${show.name}" 15 minutes before it starts.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to set reminder',
        variant: "destructive",
      });
    }
  };

  const hasExistingReminder = (show: PBSShow) => {
    // Only check for existing reminders if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      return false;
    }
    
    return allReminders.some(
      reminder => 
        reminder.show_name === show.name &&
        reminder.show_date === show.date &&
        reminder.show_start_time === show.start_time
    );
  };

  const isLoggedIn = () => {
    return !!localStorage.getItem("token");
  };

  if (!isTickerVisible) {
    return null;
  };

  if (isLoading) {
    return (
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border h-12",
        "flex items-center justify-center text-sm text-muted-foreground",
        className
      )}>
        <Radio className="h-4 w-4 mr-2 animate-spin" />
        Loading shows...
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border h-12",
        "flex items-center justify-center text-sm text-destructive",
        className
      )}>
        <Radio className="h-4 w-4 mr-2" />
        Error loading shows
      </div>
    );
  }

  if (shows.length === 0) {
    return (
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border h-12",
        "flex items-center justify-center text-sm text-muted-foreground",
        className
      )}>
        <Radio className="h-4 w-4 mr-2" />
        No upcoming shows
      </div>
    );
  }

  // Duplicate shows array for seamless scrolling, but less repetition
  const tickerShows = [...shows, ...shows];

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border h-12",
      "overflow-hidden flex items-center",
      className
    )}>
      {/* Show indicator - with higher z-index to stay on top */}
      <div className="relative z-30 flex-shrink-0 bg-primary text-primary-foreground px-3 py-2 h-full flex items-center">
        <Radio className="h-4 w-4 mr-2" />
        <span className="font-semibold text-sm">SHOWS</span>
      </div>
      
      {/* Scrolling ticker content - lower z-index so it scrolls behind the indicator */}
      <div className="flex-1 relative z-10">
        <div 
          className="flex whitespace-nowrap animate-scroll-ticker"
        >
          {tickerShows.map((show, index) => (
            <div key={`${show.id}-${index}`} className="inline-flex items-center mr-12 text-sm">
              <Badge 
                variant="secondary" 
                className={cn("mr-2 text-xs", getStatusColor(show.status))}
              >
                {show.status.toUpperCase()}
              </Badge>
              
              <span className="font-medium text-foreground mr-3">
                {show.name}
              </span>
              
              <div className="flex items-center text-muted-foreground mr-3">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{formatDate(show.date)}</span>
              </div>
              
              <div className="flex items-center text-muted-foreground mr-3">
                <Clock className="h-3 w-3 mr-1" />
                <span>{formatTime(show.start_time)}</span>
              </div>
              
              {show.dj && (
                <span className="text-muted-foreground mr-3">
                  with {show.dj}
                </span>
              )}
              
              {/* Reminder Bell - only show for upcoming shows and logged in users */}
              {show.status === 'upcoming' && isLoggedIn() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-accent/20 mr-2"
                  onClick={() => handleCreateReminder(show)}
                  disabled={hasExistingReminder(show)}
                  title={hasExistingReminder(show) ? "Reminder already set" : "Set reminder"}
                >
                  <Bell className={cn(
                    "h-3 w-3",
                    hasExistingReminder(show) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )} />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative z-30 flex-shrink-0 h-8 w-8 p-0 hover:bg-accent/20 mr-2"
        onClick={() => setTickerVisible(false)}
        title="Close ticker"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
