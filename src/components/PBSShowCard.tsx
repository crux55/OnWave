import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Clock, Calendar, User, ExternalLink, Bell, Play, Radio, Mic, MessagesSquare, Loader2 } from 'lucide-react';
import { useReminders } from '@/contexts/RemindersContext';
import { useToast } from '@/hooks/use-toast';
import { joinExternalShowRoom } from '@/lib/api';

interface PBSShowCardProps {
  show: PBSShow;
  onTuneIn?: () => void;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  isTogglingFollow?: boolean;
}

export const PBSShowCard: React.FC<PBSShowCardProps> = ({ show, onTuneIn, isFollowing, onToggleFollow, isTogglingFollow }) => {
  const { addReminder, allReminders } = useReminders();
  const { toast } = useToast();
  const router = useRouter();
  const [isCreatingReminder, setIsCreatingReminder] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  const handleJoinRoom = async () => {
    setIsJoiningRoom(true);
    try {
      const id = await joinExternalShowRoom(show.station_name ?? '', show.name, show.start_time, undefined);
      router.push(`/shows/${id}`);
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        toast({
          title: 'Login Required',
          description: 'Please log in to join the room',
          action: <a href="/auth/login" className="text-primary hover:underline">Login here</a>,
          variant: 'destructive',
        });
      } else {
        toast({ title: "Couldn't open room", description: error.message, variant: 'destructive' });
      }
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const hasExistingReminder = allReminders.some(
    reminder =>
      reminder.show_name === show.name &&
      reminder.show_date === show.date &&
      reminder.show_start_time === show.start_time
  );

  const handleCreateReminder = async () => {
    setIsCreatingReminder(true);
    
    try {
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

  // Some sources (KEXP, NTS, FBi Radio) don't report a duration string —
  // derive one from start/end so every card shows one, not just PBS/4ZZZ.
  const formatDuration = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if ([sh, sm, eh, em].some(Number.isNaN)) return null;
    let minutes = (eh * 60 + em) - (sh * 60 + sm);
    if (minutes <= 0) minutes += 24 * 60;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  };

  const durationLabel = show.duration || formatDuration(show.start_time, show.end_time);

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200 relative">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold line-clamp-2 flex-1">
            {show.name}
          </CardTitle>
          <div className="ml-2 flex shrink-0 items-center gap-1.5">
            {show.status === 'live' && (
              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                <Mic className="h-3 w-3" />
                Audio
              </Badge>
            )}
            <Badge className={`text-xs ${getStatusColor(show.status)}`}>
              {show.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pb-12">
        {show.station_name && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Radio className="h-4 w-4 mr-2 shrink-0" />
            {show.station_slug ? (
              <Link href={`/stations/${show.station_slug}`} className="truncate hover:text-foreground hover:underline">
                {show.station_name}
              </Link>
            ) : (
              <span className="truncate">{show.station_name}</span>
            )}
          </div>
        )}

        {show.dj && (
          <div className="flex items-center text-sm text-muted-foreground">
            <User className="h-4 w-4 mr-2" />
            <span className="truncate">{show.dj}</span>
          </div>
        )}

        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mr-2" />
          <span>{show.day} • {formatDate(show.date)}</span>
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-2" />
          <span>{show.start_time} - {show.end_time}</span>
        </div>

        {durationLabel && (
          <div className="text-sm text-muted-foreground">
            Duration: {durationLabel}
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
                disabled={isTogglingFollow || isCreatingReminder}
              >
                <Bell className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {onToggleFollow && (
                <DropdownMenuItem onClick={onToggleFollow}>
                  <Bell className="h-4 w-4 mr-2" />
                  {isFollowing ? 'Unfollow This Show' : 'Follow This Show'}
                </DropdownMenuItem>
              )}
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

      {(onTuneIn || show.status === 'live') && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          {show.status === 'live' && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleJoinRoom}
              disabled={isJoiningRoom}
              title="Listen along and chat with others tuned in"
            >
              {isJoiningRoom ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessagesSquare className="h-3.5 w-3.5" />}
              Join Room
            </Button>
          )}
          {onTuneIn && (
            <Button
              variant="default"
              size="sm"
              className="h-8 gap-1.5"
              onClick={onTuneIn}
            >
              <Play className="h-3.5 w-3.5" />
              Tune In
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
