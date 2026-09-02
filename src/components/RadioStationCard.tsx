import type { RadioStation } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, Heart } from 'lucide-react';
import { SafeImage } from '@/components/SafeImage';
import { cn } from '@/lib/utils';

interface RadioStationCardProps {
  station: RadioStation;
  onPlay: (station: RadioStation) => void;
  isLiked?: boolean;
  onToggleLike?: (station: RadioStation) => void;
  /** 'grid' (default): wide card, art beside title — used in the /liked grid.
   *  'row': compact, art stacked above title — used in home page scroll rows. */
  variant?: 'grid' | 'row';
}

export function RadioStationCard({ station, onPlay, isLiked, onToggleLike, variant = 'grid' }: RadioStationCardProps) {
  const likeButton = onToggleLike && (
    <button
      onClick={() => onToggleLike(station)}
      aria-label={isLiked ? `Unlike ${station.name}` : `Like ${station.name}`}
      className="shrink-0 text-muted-foreground/60 transition-colors hover:text-accent"
    >
      <Heart className={cn('h-4 w-4', isLiked && 'fill-accent text-accent')} />
    </button>
  );

  if (variant === 'row') {
    return (
      <Card className="flex h-full w-full flex-col overflow-hidden border-border/80 bg-card/60 p-0 transition-colors duration-300 hover:border-accent/40">
        <button
          onClick={() => onPlay(station)}
          aria-label={`Play ${station.name}`}
          className="group relative aspect-square w-full overflow-hidden bg-gradient-to-br from-accent/25 to-[hsl(var(--accent-2))]/20"
        >
          <SafeImage
            src={station.favicon}
            alt={`${station.name} logo`}
            width={160}
            height={160}
            className="h-full w-full object-cover"
            fallback={<div className="h-full w-full" />}
          />
          <span className="absolute inset-0 flex items-center justify-center bg-background/0 opacity-0 transition-all duration-200 group-hover:bg-background/40 group-hover:opacity-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
          </span>
        </button>
        <div className="flex flex-1 items-start justify-between gap-1.5 p-2.5">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-foreground" title={station.name}>{station.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={station.country || 'Unknown'}>{station.country || 'Unknown'}</p>
          </div>
          {likeButton}
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border/80 bg-card/60 transition-colors duration-300 hover:border-accent/40">
      <CardHeader className="flex flex-row items-start gap-3 p-4">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-accent/25 to-[hsl(var(--accent-2))]/20">
          <SafeImage
            src={station.favicon}
            alt={`${station.name} logo`}
            width={48}
            height={48}
            className="h-full w-full object-cover"
            fallback={<div className="h-full w-full" />}
          />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-[15px] leading-tight" title={station.name}>{station.name}</CardTitle>
          <CardDescription className="mt-1 line-clamp-2 text-xs" title={`${station.tags} • ${station.country}`}>
            {station.tags} &bull; {station.country}
          </CardDescription>
        </div>
        {likeButton}
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
