'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { RadioStation } from '@/lib/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { Button } from '@/components/ui/button';
import {
  Play, Pause, SkipForward, SkipBack, ChevronLeft, ChevronRight, X, Timer, LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useButterchurn } from '@/hooks/use-butterchurn';
import { useChromecast } from '@/hooks/use-chromecast';
import { useNowPlaying } from '@/hooks/use-now-playing';
import { PresetLibraryDialog } from '@/components/PresetLibraryDialog';
import { fetchInstalledPresets } from '@/lib/api';

interface MaximizedPlayerDialogProps {
  station: RadioStation;
}

const HIDE_DELAY_MS = 2000;
// OnWave#41: how long each preset shows before auto-advancing.
const AUTO_CYCLE_MS = 30000;
const AUTO_CYCLE_STORAGE_KEY = 'butterchurnAutoCycle';

// A genuinely fullscreen overlay, not a centered shadcn Dialog — the whole
// screen is a real Butterchurn visualizer (see use-butterchurn.ts), with a
// transport/preset control cluster that fades to transparent after 2s of
// inactivity and reappears on mouse move / touch. Volume, "Open Stream",
// and "Start a Room" are deliberately not carried into this view (not in
// the requested control set) — they stay reachable from the standard
// player bar / mobile dock.
export function MaximizedPlayerDialog({ station }: MaximizedPlayerDialogProps) {
  const player = usePlayer();
  const streamUrl = station.url_resolved || station.url;
  const chromecast = useChromecast(streamUrl, station.name, station.codec, station.favicon, station.tags);

  // OnWave#40: a logged-out listener or one who hasn't starred anything
  // gets an empty array here, which use-butterchurn.ts treats as "use the
  // full pack" -- this only ever narrows the rotation, never blocks it.
  const [installedPresetNames, setInstalledPresetNames] = useState<string[]>([]);
  const [isPresetLibraryOpen, setIsPresetLibraryOpen] = useState(false);
  useEffect(() => {
    if (!player.isMaximizedViewOpen) return;
    let cancelled = false;
    fetchInstalledPresets()
      .then(presets => { if (!cancelled) setInstalledPresetNames(presets.map(p => p.preset_name)); })
      .catch(() => {}); // logged out, or a transient failure -- falls back to the full pack
    return () => { cancelled = true; };
  }, [player.isMaximizedViewOpen]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { presetName, nextPreset, previousPreset } = useButterchurn(
    canvasRef,
    player.activeAudioElement,
    player.isMaximizedViewOpen,
    'default',
    installedPresetNames
  );

  // Defaults on -- the whole point of #41 is that presets change on their
  // own; a viewer who doesn't want that turns it off, rather than everyone
  // having to discover and opt in. Reads localStorage lazily (useState
  // initializer) so this doesn't flash on then immediately off for a
  // returning viewer who'd disabled it.
  const [autoCycleEnabled, setAutoCycleEnabled] = useState(() => {
    try {
      return localStorage.getItem(AUTO_CYCLE_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const toggleAutoCycle = useCallback(() => {
    setAutoCycleEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem(AUTO_CYCLE_STORAGE_KEY, String(next));
      } catch {
        // Private browsing / storage disabled -- the toggle still works for
        // this session, it just won't persist to the next one.
      }
      return next;
    });
  }, []);

  // Re-arms on every preset change, whichever caused it -- including a
  // manual prev/next click, so picking a preset by hand resets the clock
  // instead of getting overridden a few seconds later. presetName is null
  // until Butterchurn's finished loading, which doubles as the "don't start
  // the timer before there's anything to advance from" guard.
  useEffect(() => {
    if (!autoCycleEnabled || !player.isMaximizedViewOpen || !presetName) return;
    const timeout = setTimeout(nextPreset, AUTO_CYCLE_MS);
    return () => clearTimeout(timeout);
  }, [autoCycleEnabled, player.isMaximizedViewOpen, presetName, nextPreset]);

  const togglePlayPause = useCallback(() => {
    if (!streamUrl) return;
    if (chromecast.isCasting) {
      chromecast.toggleRemotePlayback();
      return;
    }
    player.togglePlayback();
  }, [player, streamUrl, chromecast]);

  // While casting, this reflects and controls the remote session's state,
  // not the (paused) local audio element.
  const isPlayingDisplay = chromecast.isCasting ? !chromecast.isRemotePaused : player.isPlaying;
  const nowPlaying = useNowPlaying(streamUrl, isPlayingDisplay);

  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setControlsVisible(false), HIDE_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!player.isMaximizedViewOpen) return;
    showControls();
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [player.isMaximizedViewOpen, showControls]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') player.closeMaximizedPlayer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [player]);

  if (!player.isMaximizedViewOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      onPointerMove={showControls}
      onPointerDown={showControls}
    >
      <canvas ref={canvasRef} className="h-full w-full" />

      <div
        className={cn(
          'absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/60 via-transparent to-black/60 transition-opacity duration-500',
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div className="flex items-start justify-between p-6">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold text-white drop-shadow-md">{station.name}</h2>
            {nowPlaying && <p className="truncate text-sm text-white/80 drop-shadow-md">{nowPlaying}</p>}
            {presetName && <p className="truncate text-xs text-white/50 drop-shadow-md">{presetName}</p>}
          </div>
          <Button
            onClick={player.closeMaximizedPlayer}
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full bg-black/40 text-white hover:bg-black/60"
            aria-label="Exit fullscreen"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col items-center gap-4 p-6">
          <div className="flex items-center gap-3">
            <Button
              onClick={previousPreset}
              variant="ghost"
              size="icon"
              className="rounded-full bg-black/40 text-white hover:bg-black/60"
              aria-label="Previous preset"
              title="Previous preset"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              onClick={nextPreset}
              variant="ghost"
              size="icon"
              className="rounded-full bg-black/40 text-white hover:bg-black/60"
              aria-label="Next preset"
              title="Next preset"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              onClick={toggleAutoCycle}
              variant="ghost"
              size="icon"
              className={cn(
                'rounded-full bg-black/40 text-white hover:bg-black/60',
                autoCycleEnabled && 'text-primary'
              )}
              aria-label={autoCycleEnabled ? 'Turn off auto-cycling presets' : 'Turn on auto-cycling presets'}
              aria-pressed={autoCycleEnabled}
              title={autoCycleEnabled ? 'Auto-cycle: on (every 30s)' : 'Auto-cycle: off'}
            >
              <Timer className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setIsPresetLibraryOpen(true)}
              variant="ghost"
              size="icon"
              className="rounded-full bg-black/40 text-white hover:bg-black/60"
              aria-label="Browse preset library"
              title="Preset library"
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-5">
            <Button
              onClick={player.playPrevious}
              variant="ghost"
              size="icon"
              className={cn('h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60', !player.hasPrevious && 'opacity-40')}
              disabled={!player.hasPrevious}
              aria-label="Previous station"
            >
              <SkipBack className="h-6 w-6" />
            </Button>
            <Button
              onClick={togglePlayPause}
              variant="ghost"
              size="icon"
              className="h-16 w-16 rounded-full border-2 border-white/80 bg-black/40 text-white hover:bg-black/60"
              disabled={!streamUrl}
              aria-label={isPlayingDisplay ? 'Pause' : 'Play'}
            >
              {isPlayingDisplay ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
            </Button>
            <Button
              onClick={player.playNext}
              variant="ghost"
              size="icon"
              className={cn('h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60', !player.hasNext && 'opacity-40')}
              disabled={!player.hasNext}
              aria-label="Next station"
            >
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      <PresetLibraryDialog
        open={isPresetLibraryOpen}
        onOpenChange={setIsPresetLibraryOpen}
        onInstalledChange={setInstalledPresetNames}
      />
    </div>
  );
}
