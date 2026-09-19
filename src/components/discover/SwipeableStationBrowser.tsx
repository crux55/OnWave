'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
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
// Movement below this doesn't move the card at all yet -- without a dead
// zone, the tiniest jitter (or the start of a tap on a button underneath)
// immediately shifts the card, which reads as twitchy rather than a
// deliberate drag (OnWave#36).
const DRAG_DEADZONE_PX = 6;
// A fast drag commits even under COMMIT_DISTANCE_PX -- matches how an actual
// flick gesture feels versus a slow deliberate drag. Velocity-based rather
// than a fixed max-duration cutoff (the previous FLICK_MAX_MS = 260 rejected
// perfectly normal flicks that happened to take slightly longer, forcing a
// full COMMIT_DISTANCE_PX drag instead -- reported as "how high you have to
// flick to change" in OnWave#36).
const FLICK_MIN_VELOCITY_PX_MS = 0.5;
const FLICK_MIN_DISTANCE_PX = 24;
const EXIT_DURATION_MS = 220;
const SWIPE_TRANSITION = `transform ${EXIT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;

// Every card is Butterchurn, full stop -- no station logo/icon fallback.
// The currently-playing card drives it off the real shared audio element;
// the queued neighbor underneath (nothing is actually playing through it
// yet) reuses that same live signal so it isn't just a frozen frame, paired
// with its own independently-randomized preset so it reads as a distinct
// station rather than a copy of the current card.
//
// memo()'d because the parent re-renders on every single pointermove during
// a drag (to update the live transform) -- without this, both cards (each
// running their own WebGL render loop) get fully re-invoked dozens of times
// a second for a prop set that never actually changed mid-drag, which reads
// as dropped frames/jank rather than a smooth 1:1 drag.
const StationCard = memo(function StationCard({ station, active, isTop, errorMessage }: {
  station: RadioStation;
  active: boolean;
  // The under slot renders at reduced internal resolution -- it's glimpsed
  // mid-drag but never actually the one in focus, and running two full-
  // resolution WebGL instances at once during a drag was a real GPU-load
  // contributor to reported jank there (OnWave#36), on top of the
  // remount-on-commit bug already fixed separately.
  isTop: boolean;
  errorMessage?: string | null;
}) {
  const player = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Picked once per station (stable for as long as this card's key/mount
  // lasts) rather than letting useButterchurn roll a fresh random preset
  // every time `active` toggles off/on -- otherwise a hesitant, uncommitted
  // drag on the same upcoming station would flicker to a different preset
  // each time it's re-engaged.
  const [presetSeed] = useState(() => Math.random());
  useButterchurn(canvasRef, active ? player.activeAudioElement : null, active, presetSeed, undefined, isTop ? 1 : 0.5);

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
});

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
// suppressed for one frame.
//
// The two cards live in two permanent "slots" (topSlot below), not one kept
// by station identity — each slot's StationCard/Butterchurn instance is
// mounted once and simply gets handed a different station to display over
// time, rather than being torn down and recreated. Butterchurn's visuals
// are generic audio-reactive art, not per-station content, so there's
// nothing gained by resetting the WebGL canvas/preset on every commit — and
// doing so was exactly the bug in OnWave#36 ("jerk"/"flip to new cards"):
// the neighbor card that had already been rendering smoothly underneath got
// discarded and replaced by a freshly-initialized, freshly-re-randomized-
// preset instance at the exact moment it should have just continued.
// Swapping which slot is "top" instead means the already-running visual
// keeps flowing straight through the handoff; only the text label changes.
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
  // Which of the two permanent card slots is currently "top" (the
  // interactive, always-active one showing player.currentStation) versus
  // "under" (the revealed neighbor, only active during a drag/exit) — see
  // the comment above this component for why identity is tracked this way
  // instead of by station id.
  const [topSlot, setTopSlot] = useState<0 | 1>(0);
  const lastDirectionRef = useRef<-1 | 1>(-1); // -1 = last dragged toward "next" (up), 1 = toward "previous" (down)
  const dragStartRef = useRef<{ y: number; pointerId: number; time: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // With this overlay open, a vertical drag that starts even a frame before
  // our own pointer handling takes hold can otherwise also scroll the page
  // underneath (touch-action/pointer capture aren't always enough to fully
  // claim a gesture on every mobile browser) — the page moving *and* our
  // transform moving at once is exactly the kind of double-motion that
  // reads as janky rather than a clean 1:1 drag.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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
      // The slot that was "under" (already rendering the station we're
      // committing to) becomes "top" -- its Butterchurn instance never
      // stops, so nothing visibly resets here. The old "top" slot becomes
      // "under" and will pick up whatever the new neighbor is next render.
      setTopSlot(prev => (prev === 0 ? 1 : 0));
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
    // isDragging deliberately isn't set yet -- see the dead zone in
    // handlePointerMove below. Capture starts immediately regardless, so a
    // gesture that does turn into a drag keeps receiving move events even
    // once the pointer leaves this element's bounds.
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start) return;
    const delta = e.clientY - start.y;
    if (!isDragging) {
      // Still inside the dead zone -- a tap or a hand tremor, not a
      // deliberate drag yet. Don't move the card at all until it's real.
      if (Math.abs(delta) < DRAG_DEADZONE_PX) return;
      setIsDragging(true);
    }
    if (delta !== 0) lastDirectionRef.current = delta < 0 ? -1 : 1;
    setDragY(delta);
  };

  const handlePointerUp = () => {
    const start = dragStartRef.current;
    if (!start) return;
    dragStartRef.current = null;
    if (!isDragging) return; // never left the dead zone -- a tap, nothing to settle

    setIsDragging(false);

    const elapsed = Date.now() - start.time;
    const distance = Math.abs(dragY);
    const velocity = distance / Math.max(1, elapsed); // px/ms
    const isFlick = distance >= FLICK_MIN_DISTANCE_PX && velocity >= FLICK_MIN_VELOCITY_PX_MS;
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
        {([0, 1] as const).map((slotIndex) => {
          const isTop = slotIndex === topSlot;
          const slotStation = isTop ? station : underStation;
          if (!slotStation) return null; // no neighbor yet (start/end of queue) -- this slot sits unused
          return (
            <div
              key={`slot-${slotIndex}`}
              onPointerDown={isTop ? handlePointerDown : undefined}
              onPointerMove={isTop ? handlePointerMove : undefined}
              onPointerUp={isTop ? handlePointerUp : undefined}
              onPointerCancel={isTop ? handlePointerUp : undefined}
              className={cn('absolute inset-0', isTop && 'z-10 touch-none select-none')}
              style={isTop ? {
                transform: `translateY(${dragY}px)`,
                transition: isDragging || suppressTransition ? 'none' : SWIPE_TRANSITION,
              } : undefined}
            >
              <StationCard
                station={slotStation}
                // The top slot is always live; the under slot only bothers
                // running its WebGL renderer while it's actually about to
                // be revealed (or was just committed to and hasn't taken
                // over as top yet) -- halves idle GPU cost otherwise.
                active={isTop || isDragging || isExiting}
                isTop={isTop}
                errorMessage={isTop ? player.playbackError : undefined}
              />
            </div>
          );
        })}
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
