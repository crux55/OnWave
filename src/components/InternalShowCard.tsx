import React from 'react';
import type { InternalShow } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, User, Radio, Bell, Loader2 } from 'lucide-react';
import { nextOccurrence, showStatus } from '@/lib/show-schedule';

interface InternalShowCardProps {
  show: InternalShow;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  isTogglingFollow?: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const InternalShowCard: React.FC<InternalShowCardProps> = ({ show, isFollowing, onToggleFollow, isTogglingFollow }) => {
  const status = showStatus(show);
  const occurrence = nextOccurrence(show);

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'live': return 'bg-red-500 text-white';
      case 'upcoming': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const scheduleLabel = show.one_off_date
    ? occurrence.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : `${DAY_NAMES[show.day_of_week ?? 0]}s`;

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200 relative">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold line-clamp-2 flex-1">
            {show.name}
          </CardTitle>
          <Badge className={`ml-2 text-xs ${getStatusColor(status)}`}>
            {status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-12">
        {(show.station_name || show.dj_name) && (
          <div className="flex items-center text-sm text-muted-foreground">
            {show.station_name ? <Radio className="h-4 w-4 mr-2" /> : <User className="h-4 w-4 mr-2" />}
            <span className="truncate">{show.station_name || show.dj_name}</span>
          </div>
        )}

        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mr-2" />
          <span>{scheduleLabel}</span>
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-2" />
          <span>{occurrence.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {show.duration_minutes} min</span>
        </div>

        {show.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{show.description}</p>
        )}
      </CardContent>

      {onToggleFollow && (
        <div className="absolute bottom-2 left-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-accent rounded-full"
            onClick={onToggleFollow}
            disabled={isTogglingFollow}
          >
            {isTogglingFollow ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className={`h-4 w-4 ${isFollowing ? 'fill-current text-accent' : ''}`} />
            )}
          </Button>
        </div>
      )}
    </Card>
  );
};
