import type { RadioStation } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play } from 'lucide-react';
import Image from 'next/image';

interface RadioStationCardProps {
  station: RadioStation;
  onPlay: (station: RadioStation) => void;
}

export function RadioStationCard({ station, onPlay }: RadioStationCardProps) {
  return (
    <Card className="flex h-full flex-col overflow-hidden border-border/80 bg-card/60 transition-colors duration-300 hover:border-accent/40">
      <CardHeader className="flex flex-row items-start gap-3 p-4">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-accent/25 to-[hsl(var(--accent-2))]/20">
          <Image
            src={station.favicon || 'https://placehold.co/64x64.png'}
            alt={`${station.name} logo`}
            width={48}
            height={48}
            className="h-full w-full object-cover"
            data-ai-hint="radio logo"
          />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-[15px] leading-tight">{station.name}</CardTitle>
          <CardDescription className="mt-1 line-clamp-2 text-xs">
            {station.tags} &bull; {station.country}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0" />
      <CardFooter className="mt-auto flex items-center justify-between p-4 pt-0">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
          {station.bitrate ? `${station.bitrate}K` : ''}
        </span>
        <button
          onClick={() => onPlay(station)}
          aria-label={`Play ${station.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform hover:scale-105"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
        </button>
      </CardFooter>
    </Card>
  );
}
