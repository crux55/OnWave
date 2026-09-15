'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RadioStation } from '@/lib/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { SafeImage } from '@/components/SafeImage';
import { StationAvatar } from '@/components/StationAvatar';
import { Heart, Pause, Play, X } from 'lucide-react';
import { cn, getProxiedFaviconUrl } from '@/lib/utils';

interface SwipeableStationBrowserProps {
  isLiked: (stationuuid: string) => boolean;
  onToggleLike: (station: RadioStation) => void;
  onClose: () => void;
}

// A skin over PlayerContext's existing queue, not a second copy of it —
// forward/back always calls playNext()/playPrevious(), and the card shown
// is always player.currentStation, so the visual browser can never drift
// out of sync with what's actually playing (OnWave#35).
const COMMIT_THRESHOLD_PX = 100;

export function SwipeableStationBrowser({ isLiked, onToggleLike, onClose }: SwipeableStationBrowserProps) {
  const player = usePlayer();
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; pointerId: number } | null>(null);

  const station = player.currentStation;

  const goNext = useCallback(() => {
    if (player.hasNext) player.playNext();
  }, [player]);

  const goPrevious = useCallback(() => {
    if (player.hasPrevious) player.playPrevious();
  }, [player]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrevious();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrevious, onClose]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartRef.current = { x: e.clientX, pointerId: e.pointerId };
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    setDragX(e.clientX - dragStartRef.current.x);
  };

  const handlePointerUp = () => {
    if (!dragStartRef.current) return;
    dragStartRef.current = null;
    setIsDragging(false);
    if (dragX <= -COMMIT_THRESHOLD_PX) goNext();
    else if (dragX >= COMMIT_THRESHOLD_PX) goPrevious();
    setDragX(0);
  };

  if (!station) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <button
        onClick={onClose}
        aria-label="Close browser"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative flex-1 overflow-hidden">
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 touch-pan-y select-none"
          style={{
            transform: `translateX(${dragX}px)`,
            transition: isDragging ? 'none' : 'transform 200ms ease-out',
          }}
        >
          <SafeImage
            src={getProxiedFaviconUrl(station.favicon)}
            alt={`${station.name} logo`}
            width={800}
            height={800}
            className="h-full w-full object-cover"
            fallback={<StationAvatar name={station.name} seed={station.stationuuid} className="text-6xl" />}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pb-28 pointer-events-none">
            <h2 className="text-2xl font-bold text-white truncate">{station.name}</h2>
            <p className="mt-1 text-sm text-white/70 truncate">
              {(station.tags?.split(',')[0]?.trim() || 'Unknown')} &bull; {station.country || 'Unknown'}
            </p>
            {player.playbackError && (
              <p className="mt-2 inline-block rounded bg-destructive/90 px-2 py-1 text-xs font-medium text-destructive-foreground">
                {player.playbackError}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex items-center justify-center gap-6">
        <button
          onClick={() => onToggleLike(station)}
          aria-label={isLiked(station.stationuuid) ? `Unlike ${station.name}` : `Like ${station.name}`}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
        >
          <Heart className={cn('h-6 w-6', isLiked(station.stationuuid) && 'fill-accent text-accent')} />
        </button>
        <button
          onClick={player.togglePlayback}
          aria-label={player.isPlaying ? 'Pause' : 'Play'}
          className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105"
        >
          {player.isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current" />}
        </button>
      </div>
    </div>
  );
}
