import React from 'react';
import type { PBSShow } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar, User, ExternalLink } from 'lucide-react';

interface PBSShowCardProps {
  show: PBSShow;
}

export const PBSShowCard: React.FC<PBSShowCardProps> = ({ show }) => {
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
    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
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
      
      <CardContent className="space-y-3">
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
    </Card>
  );
};
