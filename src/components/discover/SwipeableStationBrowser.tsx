'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RadioStation } from '@/lib/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { useMobileDock } from '@/contexts/MobileDockContext';
import { useButterchurn } from '@/hooks/use-butterchurn';
import { Heart, Pause, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableStationBrowserProps {
  isLiked: (stationuuid: string) => boolean;
  onToggleLike: (station: RadioStation) => void;
  onClose: () => void;
}

// A drag past this distance commits to the next/previous station outright.
const COMMIT_DISTANCE_PX = 100;
// A short, fast drag commits even under that distance -- matches how an
// actual flick gesture feels versus a slow deliberate drag.
const FLICK_MAX_MS = 260;
const FLICK_MIN_DISTANCE_PX = 32;
const EXIT_DURATION_MS = 220;
const SWIPE_TRANSITION = `transform ${EXIT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;

// Every card is Butterchurn, full stop -- no station logo/icon fallback.
// The currently-playing card drives it off the real shared audio element;
// the queued neighbor underneath (nothing is actually playing through it
// yet) reuses that same live signal so it isn't just a frozen frame, paired
// with its own independently-randomized preset so it reads as a distinct
// station rather than a copy of the current card.
function StationCard({ station, errorMessage }: {
  station: RadioStation;
  errorMessage?: string | null;
}) {
  const player = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useButterchurn(canvasRef, player.activeAudioElement, true, 'random');

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="h-full w-full bg-black" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pb-28 pointer-events-none">
        <h2 className="text-2xl font-bold text-white truncate">{station.name}</h2>
        <p className="mt-1 text-sm text-white/70 truncate">
          {(station.tags?.split(',')[0]?.trim() || 'Unknown')} &bull; {station.country || 'Unknown'}
        </p>
        {errorMessage && (
          <p className="mt-2 inline-block rounded bg-destructive/90 px-2 py-1 text-xs font-medium text-destructive-foreground">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}

// A skin over PlayerContext's existing queue, not a second copy of it —
// forward/back always calls playNext()/playPrevious(), and the top card is
// always player.currentStation, so the visual browser can never drift out
// of sync with what's actually playing (OnWave#35).
//
// Vertical feed-style paging (drag up = next, down = previous), not
// left/right — the queued neighbor in the live drag direction is rendered
// as a static card sitting directly underneath the draggable top card, at
// rest (no transform) exactly where it needs to end up. Committing a swipe
// animates only the top card fully off-screen; once that finishes, the real
// player state advances and the drag offset resets with the transition
// suppressed for one frame — the neighbor was already painted in its final
// position, so the handoff has no flash/flicker, just a continuous flick.
export function SwipeableStationBrowser({ isLiked, onToggleLike, onClose }: SwipeableStationBrowserProps) {
  const player = usePlayer();
  const dock = useMobileDock();
  // Closing this fullscreen overlay shouldn't just drop back to whatever
  // the mobile dock's active tab happened to be before it opened (often
  // "menu") -- the station that was playing should surface in the docked
  // player bar, not disappear from view. No-op on desktop, where the bar
  // is always visible regardless of dock state.
  const handleClose = useCallback(() => {
    dock.setActiveTab('player');
    dock.setMinimized(false);
    onClose();
  }, [dock, onClose]);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [suppressTransition, setSuppressTransition] = useState(false);
  const lastDirectionRef = useRef<-1 | 1>(-1); // -1 = last dragged toward "next" (up), 1 = toward "previous" (down)
  const dragStartRef = useRef<{ y: number; pointerId: number; time: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const station = player.currentStation;
  const nextStation = player.queueIndex >= 0 ? player.queue[player.queueIndex + 1] : undefined;
  const prevStation = player.queueIndex >= 0 ? player.queue[player.queueIndex - 1] : undefined;

  const goNext = useCallback(() => { if (player.hasNext) player.playNext(); }, [player]);
  const goPrevious = useCallback(() => { if (player.hasPrevious) player.playPrevious(); }, [player]);

  const commitSwipe = useCallback((direction: -1 | 1) => {
    const height = stageRef.current?.offsetHeight || window.innerHeight;
    setIsExiting(true);
    setDragY(direction * -height);
    window.setTimeout(() => {
      if (direction === -1) goNext(); else goPrevious();
      setSuppressTransition(true);
      setDragY(0);
      setIsExiting(false);
    }, EXIT_DURATION_MS);
  }, [goNext, goPrevious]);

  // suppressTransition only needs to hold for the single frame where dragY
  // resets to 0 right after the real station swap — flipping it back off on
  // the next frame restores normal animated behavior for the next drag
  // without itself causing any visible movement (the transform value isn't
  // changing on that frame, just the transition property).
  useEffect(() => {
    if (!suppressTransition) return;
    const id = requestAnimationFrame(() => setSuppressTransition(false));
    return () => cancelAnimationFrame(id);
  }, [suppressTransition]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isExiting) return;
      if (e.key === 'ArrowUp' && player.hasNext) commitSwipe(-1);
      else if (e.key === 'ArrowDown' && player.hasPrevious) commitSwipe(1);
      else if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commitSwipe, isExiting, handleClose, player.hasNext, player.hasPrevious]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isExiting) return;
    dragStartRef.current = { y: e.clientY, pointerId: e.pointerId, time: Date.now() };
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const delta = e.clientY - dragStartRef.current.y;
    if (delta !== 0) lastDirectionRef.current = delta < 0 ? -1 : 1;
    setDragY(delta);
  };

  const handlePointerUp = () => {
    const start = dragStartRef.current;
    if (!start) return;
    dragStartRef.current = null;
    setIsDragging(false);

    const elapsed = Date.now() - start.time;
    const distance = Math.abs(dragY);
    const isFlick = elapsed <= FLICK_MAX_MS && distance >= FLICK_MIN_DISTANCE_PX;
    const committed = distance >= COMMIT_DISTANCE_PX || isFlick;

    if (committed && dragY < 0 && player.hasNext) commitSwipe(-1);
    else if (committed && dragY > 0 && player.hasPrevious) commitSwipe(1);
    else setDragY(0);
  };

  if (!station) return null;

  const underStation = dragY < 0 ? nextStation : dragY > 0 ? prevStation : (lastDirectionRef.current < 0 ? nextStation : prevStation);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overscroll-none bg-black">
      <button
        onClick={handleClose}
        aria-label="Close browser"
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
      >
        <X className="h-5 w-5" />
      </button>

      <div ref={stageRef} className="relative flex-1 overflow-hidden">
        {underStation && (
          <StationCard key={`under-${underStation.stationuuid}`} station={underStation} />
        )}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 z-10 touch-none select-none"
          style={{
            transform: `translateY(${dragY}px)`,
            transition: isDragging || suppressTransition ? 'none' : SWIPE_TRANSITION,
          }}
        >
          <StationCard key={station.stationuuid} station={station} errorMessage={player.playbackError} />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex items-center justify-center gap-6">
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
