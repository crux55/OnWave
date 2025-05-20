import type { RadioStation } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, RadioTower } from 'lucide-react';
import Image from 'next/image';

interface RadioStationCardProps {
  station: RadioStation;
  onPlay: (station: RadioStation) => void;
}

export function RadioStationCard({ station, onPlay }: RadioStationCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <Image
          src={station.faviconUrl || 'https://placehold.co/64x64.png'}
          alt={`${station.name} logo`}
          width={64}
          height={64}
          className="rounded-md border bg-muted object-cover"
          data-ai-hint="radio logo"
        />
        <div className="flex-1">
          <CardTitle className="text-lg mb-1 leading-tight">{station.name}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground line-clamp-2">
            {station.genre} &bull; {station.country}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        {/* Additional info could go here if available */}
      </CardContent>
      <CardFooter className="p-4 pt-0 mt-auto">
        <Button onClick={() => onPlay(station)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlayCircle className="mr-2 h-5 w-5" />
          Play Station
        </Button>
      </CardFooter>
    </Card>
  );
}
