import React, { useState } from 'react';
import type { PBSShow } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock, Calendar, User, ExternalLink, Bell } from 'lucide-react';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { useReminders } from '@/contexts/RemindersContext';
import { useToast } from '@/hooks/use-toast';

interface PBSShowCardProps {
  show: PBSShow;
}

export const PBSShowCard: React.FC<PBSShowCardProps> = ({ show }) => {
  const { subscribeToShow, isLoading: isSubscribing } = useSubscriptions();
  const { addReminder, allReminders } = useReminders();
  const { toast } = useToast();
  const [isCreatingReminder, setIsCreatingReminder] = useState(false);

  // Check if reminder already exists for this show
  const hasExistingReminder = allReminders.some(
    reminder => 
      reminder.show_name === show.name &&
      reminder.show_date === show.date &&
      reminder.show_start_time === show.start_time
  );

  const handleSubscription = async (type: 'subscribe' | 'remind') => {
    try {
      await subscribeToShow(show, type);
      
      toast({
        title: "Success!",
        description: type === 'subscribe' 
          ? `You've subscribed to the "${show.name}" series!` 
          : `You'll be reminded about "${show.name}"`,
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${type}`,
        variant: "destructive",
      });
    }
  };

  const handleCreateReminder = async () => {
    setIsCreatingReminder(true);
    
    try {
      // Default to 15 minutes before - can be configured later
      await addReminder({
        show_name: show.name,
        show_date: show.date,
        show_start_time: show.start_time,
        reminder_minutes_before: 15,
      });

      toast({
        title: "Reminder Created!",
        description: `You'll be reminded 15 minutes before "${show.name}" starts`,
      });
      
    } catch (error) {
      // Handle unauthorized error specially
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        toast({
          title: "Login Required",
          description: "Please log in to set reminders for shows",
          action: (
            <a href="/auth/login" className="text-primary hover:underline">
              Login here
            </a>
          ),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create reminder",
          variant: "destructive",
        });
      }
    } finally {
      setIsCreatingReminder(false);
    }
  };

  // Check if the show is live or expired
  const canSetReminder = show.status !== 'live' && show.status !== 'expired';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-500 text-white';
      case 'upcoming':
        return 'bg-green-500 text-white';
      case 'expired':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200 relative">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold line-clamp-2 flex-1">
            {show.name}
          </CardTitle>
          <Badge className={`ml-2 text-xs ${getStatusColor(show.status)}`}>
            {show.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pb-12">
        <div className="flex items-center text-sm text-muted-foreground">
          <User className="h-4 w-4 mr-2" />
          <span className="truncate">{show.dj}</span>
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mr-2" />
          <span>{show.day} • {formatDate(show.date)}</span>
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-2" />
          <span>{show.start_time} - {show.end_time}</span>
        </div>
        
        {show.duration && (
          <div className="text-sm text-muted-foreground">
            Duration: {show.duration}
          </div>
        )}
        
        {show.program_url && (
          <a
            href={show.program_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View Program
          </a>
        )}
      </CardContent>

      {/* Bell button positioned at bottom left of entire card */}
      <div className="absolute bottom-2 left-2">          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent rounded-full"
                disabled={isSubscribing || isCreatingReminder}
              >
                <Bell className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => handleSubscription('subscribe')}>
                <Bell className="h-4 w-4 mr-2" />
                Subscribe to Series
              </DropdownMenuItem>
              {canSetReminder && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleCreateReminder()}
                    disabled={hasExistingReminder}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {hasExistingReminder ? 'Reminder Already Set' : 'Set Reminder for This Show'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </Card>
  );
};
