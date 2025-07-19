import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useReminders } from '@/contexts/RemindersContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Trash2, Bell, RefreshCw } from 'lucide-react';
import type { Reminder } from '@/lib/types';

const ReminderCard: React.FC<{ reminder: Reminder }> = ({ reminder }) => {
  const { removeReminder } = useReminders();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await removeReminder(reminder.id);
      toast({
        title: "Reminder Deleted",
        description: `Reminder for "${reminder.show_name}" has been removed`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getReminderText = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min before`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} before`;
    }
  };

  // Check if reminder is in the past
  const isExpired = new Date(`${reminder.show_date}T${reminder.show_start_time}`) < new Date();

  return (
    <Card className={`transition-all duration-200 ${isExpired ? 'opacity-60' : 'hover:shadow-md'}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-lg text-primary">{reminder.show_name}</h3>
          <div className="flex items-center gap-2">
            {isExpired && (
              <Badge variant="outline" className="text-xs">
                Expired
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(reminder.show_date)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatTime(reminder.show_start_time)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Remind {getReminderText(reminder.reminder_minutes_before)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const RemindersList: React.FC = () => {
  const { allReminders, isLoading, error, fetchReminders } = useReminders();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading your reminders...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchReminders} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Sort reminders by date/time
  const sortedReminders = [...allReminders].sort((a, b) => {
    const dateA = new Date(`${a.show_date}T${a.show_start_time}`);
    const dateB = new Date(`${b.show_date}T${b.show_start_time}`);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Your Reminders ({allReminders.length})
          </CardTitle>
          <Button onClick={fetchReminders} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedReminders.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-2">No reminders yet</p>
            <p className="text-sm text-muted-foreground">Create your first reminder above to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedReminders.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
