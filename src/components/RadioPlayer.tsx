
'use client';

import type { RadioStation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play, Pause, Volume2, VolumeX, ExternalLink, Loader2,
  SkipForward, SkipBack, PanelBottomClose, PanelBottomOpen, Expand, X, Cast, Airplay, Heart
} from 'lucide-react';
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn, getProxiedFaviconUrl } from '@/lib/utils';
import { useChromecast } from '@/hooks/use-chromecast';
import { useLikedStations } from '@/hooks/use-liked-stations';
import { useNowPlaying } from '@/hooks/use-now-playing';
import { SafeImage } from '@/components/SafeImage';
import { StationAvatar } from '@/components/StationAvatar';
import { useMobileDock } from '@/contexts/MobileDockContext';
import { useReportHeight } from '@/hooks/use-report-height';

declare global {
  interface HTMLMediaElement {
    webkitShowPlaybackTargetPicker?: () => void;
  }
  interface WindowEventMap {
    webkitplaybacktargetavailabilitychanged: Event;
  }
}

interface RadioPlayerProps {
  station: RadioStation | null;
  className?: string;
}

// How far around the current queue position to keep a warm, pre-buffering
// element ready: one station back and two ahead — covers a quick
// double-flick forward as well as an immediate backtrack, not just the
// single next station.
const PRELOAD_OFFSETS = [-1, 1, 2] as const;

export function RadioPlayer({ station, className }: RadioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Tracks which streamUrl (if any) has already had a no-CORS retry — reset
  // on every genuinely new station so each one gets its own fresh attempt.
  const retriedWithoutCorsRef = useRef<string | null>(null);
  // A small pool of always-muted <audio> elements kept warm on nearby queue
  // entries (see PRELOAD_OFFSETS/the sync effect below), keyed by streamUrl
  // — lets a flick/skip to any of them promote an already-buffering element
  // instead of paying for a fresh connection + startup buffering.
  const preloadPoolRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const player = usePlayer();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  // Also lifted into PlayerContext (player.playbackError) so surfaces other
  // than this bar/dialog -- e.g. the external-room tune-in control on
  // /shows/[id] -- can show why playback failed instead of just silently
  // reverting to "not playing". See project_r#35.
  const setError = useCallback((message: string | null) => {
    setErrorState(message);
    player.setPlaybackError(message);
  }, [player]);
  const [lastVolumeBeforeMute, setLastVolumeBeforeMute] = useState(player.volume);
  const [airPlayAvailable, setAirPlayAvailable] = useState(false);
  const streamUrl = station?.url_resolved || station?.url;
  const chromecast = useChromecast(streamUrl, station?.name, station?.codec, station?.favicon, station?.tags);
  const { isLiked, toggleLike } = useLikedStations();
  // On mobile, the standard bar (not the separate minimized corner-card
  // below) only actually occupies screen space when it's the thing showing
  // above MobileBottomDock's strip — otherwise it stays mounted (so
  // playback/audio effects keep running) but hidden and reports 0 height.
  // Desktop is unaffected; see the `sm:` overrides in playerRootClasses.
  const dock = useMobileDock();
  const mobileDockActive = dock.activeTab === 'player' && !dock.minimized;
  const reportPlayerHeight = useCallback((h: number) => dock.reportHeight('player', h), [dock.reportHeight]);
  const barRef = useReportHeight(mobileDockActive, reportPlayerHeight);


  // Single effect owning both the audio element's lifecycle (creating it,
  // loading the right src, wiring listeners) and driving play/pause off
  // isPlaying — previously split into two separate effects that both
  // independently called .play()/.pause() on the same element in reaction
  // to the same state. That split was the actual cause of the
  // paused/unpaused loop bug: a real external pause (headphones
  // disconnecting fires a native 'pause' event) flipped isPlaying to
  // false, which re-ran *both* effects, each unconditionally calling
  // .pause() again in their cleanup/body — regardless of whether the
  // element was already paused — which is itself enough to keep firing
  // more 'pause' events and re-triggering the same effects. Consolidating
  // to one effect removes the duplicate mutation; checking
  // audio.paused before calling .play()/.pause() (rather than calling
  // them unconditionally on every run) removes the redundant native
  // events those calls would otherwise keep generating.
  useEffect(() => {
    if (!station || !player.isPlayerBarOpen) {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      if (audioRef.current) audioRef.current.src = '';
      player.setIsPlaying(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio();
      // Lets the visualizer attempt real frequency analysis via Web Audio —
      // usually harmless even without CORS headers (the source just stays
      // untaint-able for analysis and keeps playing normally), but some
      // stream servers (e.g. KEXP's) reject a CORS-mode request outright
      // instead of just omitting the headers — handleAudioError below
      // detects that and retries without it, per station.
      audioRef.current.crossOrigin = 'anonymous';
      player.audioElementRef.current = audioRef.current;
      player.setActiveAudioElement(audioRef.current);
    }
    let currentAudio = audioRef.current;

    if (streamUrl && currentAudio.src !== streamUrl) {
      // Keyed by the raw streamUrl (not preload.src, which the DOM always
      // resolves to an absolute URL — a relative streamUrl, e.g. our own
      // stream-proxy routes, would never match that) so lookup is exact.
      const preload = preloadPoolRef.current.get(streamUrl);
      if (preload && !preload.error) {
        // The pool already has this exact station warm and buffering on a
        // separate element — promote it in place of a cold load instead of
        // starting a fresh connection on the element we've been using. The
        // demoted element is just released; the pool-sync effect below
        // creates whatever's newly needed for the shifted window.
        preload.muted = player.isMuted;
        preload.volume = player.isMuted ? 0 : player.volume;
        audioRef.current = preload;
        player.audioElementRef.current = preload;
        player.setActiveAudioElement(preload);
        preloadPoolRef.current.delete(streamUrl);
        currentAudio.pause();
        currentAudio.muted = true;
        currentAudio.src = '';
        currentAudio = preload;
      } else {
        // Fresh attempt with CORS enabled for every new station, regardless
        // of whether a previous station needed the no-CORS fallback below.
        currentAudio.crossOrigin = 'anonymous';
        retriedWithoutCorsRef.current = null;
        currentAudio.src = streamUrl;
        currentAudio.load();
      }
    }

    const handleAudioError = (e: Event) => {
      const audioElement = e.target as HTMLAudioElement;
      const mediaError = audioElement.error;

      // Retry once without CORS mode before surfacing a real error — losing
      // visualizer support for this one stream beats losing audio entirely.
      if (audioElement.crossOrigin && retriedWithoutCorsRef.current !== streamUrl) {
        retriedWithoutCorsRef.current = streamUrl ?? null;
        audioElement.crossOrigin = null;
        audioElement.load();
        return;
      }

      let uiErrorMessage = 'Stream error';

      if (!mediaError) {
        setError(uiErrorMessage);
        player.setIsPlaying(false);
        setIsLoading(false);
        return;
      }

      const MEDIA_ERR_ABORTED = (window.MediaError && window.MediaError.MEDIA_ERR_ABORTED) || 1;
      const MEDIA_ERR_NETWORK = (window.MediaError && window.MediaError.MEDIA_ERR_NETWORK) || 2;
      const MEDIA_ERR_DECODE = (window.MediaError && window.MediaError.MEDIA_ERR_DECODE) || 3;
      const MEDIA_ERR_SRC_NOT_SUPPORTED = (window.MediaError && window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) || 4;

      switch (mediaError.code) {
        case MEDIA_ERR_ABORTED:
          uiErrorMessage = 'Playback aborted.';
          break;
        case MEDIA_ERR_NETWORK:
          uiErrorMessage = 'Network error.';
          break;
        case MEDIA_ERR_DECODE:
          uiErrorMessage = 'Decode error.';
          break;
        case MEDIA_ERR_SRC_NOT_SUPPORTED:
          uiErrorMessage = 'Format not supported.';
          break;
        default:
          uiErrorMessage = 'Unknown stream error.';
      }

      setError(uiErrorMessage);
      player.setIsPlaying(false);
      setIsLoading(false);
    };

    const handleCanPlay = () => setIsLoading(false);
    const handlePlaying = () => { player.setIsPlaying(true); setIsLoading(false); setError(null); };
    const handleWaiting = () => setIsLoading(true);
    // Only push a state change when one's actually needed — a pause we
    // triggered ourselves below already has isPlaying=false by the time
    // this fires, so this only really does something for a genuine
    // external pause (headphones disconnecting, OS media controls, etc.).
    const handlePause = () => {
      if (player.isPlaying) player.setIsPlaying(false);
    };

    currentAudio.addEventListener('error', handleAudioError);
    currentAudio.addEventListener('playing', handlePlaying);
    currentAudio.addEventListener('waiting', handleWaiting);
    currentAudio.addEventListener('pause', handlePause);
    currentAudio.addEventListener('canplay', handleCanPlay);

    // Only autoplay when context says playback should be active — and not
    // while casting, since the remote device is the one actually playing.
    // Checking .paused first means a render that doesn't actually need to
    // change playback state (most of them — this effect re-runs on every
    // isPlaying change, not just the ones that started here) doesn't
    // re-issue a redundant play()/pause() call.
    if (player.isPlaying && !chromecast.isCasting) {
      if (currentAudio.paused) {
        setIsLoading(true);
        setError(null);
        currentAudio.play()
          .then(() => player.setIsPlaying(true))
          .catch(() => {
            setError('Stream init error');
            player.setIsPlaying(false);
          })
          .finally(() => setIsLoading(false));
      }
    } else if (!currentAudio.paused) {
      currentAudio.pause();
    }

    return () => {
      currentAudio.removeEventListener('error', handleAudioError);
      currentAudio.removeEventListener('playing', handlePlaying);
      currentAudio.removeEventListener('waiting', handleWaiting);
      currentAudio.removeEventListener('pause', handlePause);
      currentAudio.removeEventListener('canplay', handleCanPlay);
    };
  }, [station, streamUrl, player.isPlayerBarOpen, player.isPlaying, player.setIsPlaying, chromecast.isCasting]);

  // Keeps a small pool of muted elements warm on whatever's currently in
  // that window (see PRELOAD_OFFSETS) so a flick/skip to any of them
  // (SwipeableStationBrowser, the mini-player's skip button) can promote an
  // already-buffering connection instead of starting cold — see the
  // promotion branch in the main effect above. Re-syncs on every queue move
  // rather than just adding: entries that fall outside the window are
  // released so the pool doesn't grow unbounded as someone browses through
  // a long queue.
  useEffect(() => {
    if (!player.isPlayerBarOpen) return;
    const pool = preloadPoolRef.current;

    const desiredUrls = new Set<string>();
    for (const offset of PRELOAD_OFFSETS) {
      const idx = player.queueIndex + offset;
      const candidate = idx >= 0 ? player.queue[idx] : undefined;
      const url = candidate?.url_resolved || candidate?.url;
      if (url && url !== streamUrl) desiredUrls.add(url);
    }

    for (const [url, el] of pool) {
      if (desiredUrls.has(url)) continue;
      el.pause();
      el.src = '';
      pool.delete(url);
    }

    for (const url of desiredUrls) {
      if (pool.has(url)) continue;
      const el = new Audio();
      el.crossOrigin = 'anonymous';
      el.muted = true;
      el.volume = 0;
      el.src = url;
      el.load();
      // A muted play() (not just preload="auto"/load()) is what actually
      // gets browsers to start pulling and decoding bytes ahead of time for
      // a live/indefinite stream — plain preloading tends to only fetch
      // enough to identify the format for something with no known duration.
      el.play().catch(() => {});
      pool.set(url, el);
    }
  }, [player.queue, player.queueIndex, player.isPlayerBarOpen, streamUrl]);

  useEffect(() => {
    return () => {
      for (const el of preloadPoolRef.current.values()) el.pause();
      preloadPoolRef.current.clear();
    };
  }, []);

  // Closing the player (station -> null) makes the parent stop rendering
  // this component entirely rather than re-rendering it with the new props
  // first — the early-return branch above that would normally pause
  // playback never runs in that case, only a real unmount does. Split into
  // its own effect with an empty dependency array (rather than folded into
  // the main effect's cleanup, as it originally was) so it only fires on
  // an actual unmount, not on every dependency change above — that
  // unconditional per-run pause() was the other half of the feedback loop
  // this fix addresses.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);


  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = player.isMuted ? 0 : player.volume;
    }
  }, [player.volume, player.isMuted]);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || typeof audio.webkitShowPlaybackTargetPicker !== 'function') {
      setAirPlayAvailable(false);
      return;
    }
    setAirPlayAvailable(true);

    const handleAvailabilityChanged = (event: any) => {
      setAirPlayAvailable(event?.availability !== 'not-available');
    };
    audio.addEventListener('webkitplaybacktargetavailabilitychanged', handleAvailabilityChanged);
    return () => audio.removeEventListener('webkitplaybacktargetavailabilitychanged', handleAvailabilityChanged);
  }, [station]);

  const toggleAirPlay = useCallback(() => {
    audioRef.current?.webkitShowPlaybackTargetPicker?.();
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!streamUrl) return;
    if (chromecast.isCasting) {
      chromecast.toggleRemotePlayback();
      return;
    }
    player.togglePlayback();
  }, [player, streamUrl, chromecast]);

  // While casting, the play/pause button reflects and controls the remote
  // session's state, not the (paused) local audio element.
  const isPlayingDisplay = chromecast.isCasting ? !chromecast.isRemotePaused : player.isPlaying;
  const nowPlaying = useNowPlaying(streamUrl, isPlayingDisplay);

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    const vol = newVolume[0];
    player.setVolume(vol);
    if (vol > 0 && player.isMuted) {
      player.setIsMuted(false);
    } else if (vol === 0 && !player.isMuted) {
      player.setIsMuted(true);
    }
  }, [player.setVolume, player.isMuted, player.setIsMuted]);

  const toggleMute = useCallback(() => {
    const newMuted = !player.isMuted;
    player.setIsMuted(newMuted);
    if (newMuted) {
      setLastVolumeBeforeMute(player.volume); 
      // player.setVolume(0); // Context updates audioRef via useEffect on player.volume/isMuted
    } else {
      // player.setVolume(lastVolumeBeforeMute > 0 ? lastVolumeBeforeMute : 0.1); // Context updates audioRef
    }
  }, [player.isMuted, player.volume, player.setIsMuted, player.setVolume, lastVolumeBeforeMute]);


  if (!station || !player.isPlayerBarOpen) return null; 

  const playerRootClasses = cn(
    "fixed z-40 bg-card transition-all duration-300 ease-in-out",
    player.isPlayerMinimized
      ? "bottom-16 right-4 w-72 rounded-lg shadow-lg border"
      // Inset pill, not a flush-edge bar — the rounding only reads as a
      // pill with margin around it, and the glow is the point. Mobile:
      // occupies space only while it's MobileBottomDock's active tab,
      // sitting just above the dock's strip; desktop always shows at the
      // bottom, unaffected by the dock (which doesn't exist there).
      : cn(
          "left-2 right-2 sm:left-4 sm:right-4 rounded-full border border-border/60 shadow-[0_0_0_1px_hsl(var(--accent)/0.15),0_12px_32px_-8px_hsl(var(--accent)/0.35),0_12px_32px_-12px_hsl(var(--accent-2)/0.25)]",
          mobileDockActive ? "bottom-14" : "hidden",
          "sm:block sm:bottom-0"
        ),
    className // Apply the className prop for extra overrides (e.g. invisible when maximized)
  );

  const playerContainerClasses = cn(
    "mx-auto",
    player.isPlayerMinimized ? "p-2" : "container p-3 max-w-screen-xl"
  );
  
  const playerFlexClasses = cn(
    "flex items-center justify-between gap-2",
    player.isPlayerMinimized ? "flex-col items-stretch" : "gap-4"
  );

  if (player.isPlayerMinimized) {
    return (
      <div className={playerRootClasses}>
        <div className={playerContainerClasses}>
          <div className={playerFlexClasses}>
            <div className="flex items-center gap-2 w-full">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-accent/25 to-[hsl(var(--accent-2))]/20">
                <SafeImage
                  src={getProxiedFaviconUrl(station.favicon)}
                  alt={`${station.name} logo`}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  fallback={<StationAvatar name={station.name} seed={station.stationuuid} className="text-[10px]" />}
                />
              </div>
              <div className="flex-grow overflow-hidden">
                <h4 className="text-xs font-semibold truncate text-foreground">{station.name}</h4>
                {error && <p className="text-xs text-destructive truncate">{error}</p>}
              </div>
              <Button onClick={togglePlayPause} variant="ghost" size="icon" className="w-8 h-8" disabled={isLoading || !streamUrl}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : isPlayingDisplay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button onClick={player.playPrevious} variant="ghost" size="icon" className="w-8 h-8" disabled={!player.hasPrevious} title="Previous in queue">
                <SkipBack className={cn("h-4 w-4", !player.hasPrevious && "text-muted-foreground/50")} />
              </Button>
              <Button onClick={player.playNext} variant="ghost" size="icon" className="w-8 h-8" disabled={!player.hasNext} title="Next in queue">
                <SkipForward className={cn("h-4 w-4", !player.hasNext && "text-muted-foreground/50")} />
              </Button>
              {chromecast.available && (
                <Button onClick={chromecast.toggleCast} variant="ghost" size="icon" className="w-8 h-8" title={chromecast.isCasting ? `Casting to ${chromecast.deviceName || 'device'}` : 'Cast'}>
                  <Cast className={cn("h-4 w-4", chromecast.isCasting && "text-primary")} />
                </Button>
              )}
              {airPlayAvailable && (
                <Button onClick={toggleAirPlay} variant="ghost" size="icon" className="w-8 h-8" title="AirPlay">
                  <Airplay className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={player.togglePlayerSize} variant="ghost" size="icon" className="w-8 h-8">
                <PanelBottomOpen className="h-4 w-4" /> <span className="sr-only">Maximize to bar</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard Bar View
  return (
    <div ref={barRef} className={playerRootClasses}>
        <div className={playerContainerClasses}>
            <div className={playerFlexClasses}>
                <div className="flex items-center gap-3 md:gap-4 flex-grow overflow-hidden">
                    <div className="hidden sm:block h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-accent/25 to-[hsl(var(--accent-2))]/20 shadow-[0_0_0_2px_hsl(var(--accent)/0.4)]">
                        <SafeImage
                            src={getProxiedFaviconUrl(station.favicon)}
                            alt={`${station.name} logo`}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                            fallback={<StationAvatar name={station.name} seed={station.stationuuid} className="text-xs" />}
                        />
                    </div>
                    <div className="flex-grow overflow-hidden space-y-1">
                        {isPlayingDisplay && (
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Live</span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-base font-semibold truncate text-foreground">{station.name}</h3>
                            <p className="text-xs text-muted-foreground truncate hidden md:block">
                              {(station.tags?.split(',')[0]?.trim() || 'Unknown')} - {station.country || 'Unknown'}
                            </p>                        </div>
                        {nowPlaying && <p className="text-xs text-foreground/80 truncate">{nowPlaying}</p>}
                        {error && <p className="text-xs text-destructive truncate mt-0.5">{error}</p>}
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <Button onClick={player.togglePlayerSize} variant="ghost" size="icon" className="w-9 h-9 hidden md:inline-flex" title="Minimize to corner">
                        <PanelBottomClose className="h-4 w-4" /> <span className="sr-only">Minimize</span>
                    </Button>
                     <Button onClick={player.openMaximizedPlayer} variant="ghost" size="icon" className="w-9 h-9" title="Open maximized player view">
                        <Expand className="h-4 w-4" /> <span className="sr-only">Maximize View</span>
                    </Button>
                    <Button onClick={player.playPrevious} variant="ghost" size="icon" className="w-9 h-9" disabled={!player.hasPrevious} title="Previous in queue">
                        <SkipBack className={cn("h-4 w-4", !player.hasPrevious && "text-muted-foreground/50")} />
                    </Button>
                    <Button onClick={togglePlayPause} variant="ghost" size="icon" className="w-10 h-10" disabled={isLoading || !streamUrl}>
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : isPlayingDisplay ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    <Button onClick={player.playNext} variant="ghost" size="icon" className="w-9 h-9" disabled={!player.hasNext} title="Next in queue">
                        <SkipForward className={cn("h-4 w-4", !player.hasNext && "text-muted-foreground/50")} />
                    </Button>
                    <div className="items-center gap-2 w-24 sm:w-28 hidden md:flex">
                        <Button onClick={toggleMute} variant="ghost" size="icon" className="w-9 h-9">
                            {player.isMuted || player.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <Slider value={[player.isMuted ? 0 : player.volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="flex-grow" aria-label="Volume control" />
                    </div>
                    <Button onClick={() => toggleLike(station)} variant="ghost" size="icon" className="w-9 h-9" title={isLiked(station.stationuuid) ? 'Unlike' : 'Like'}>
                        <Heart className={cn("h-4 w-4", isLiked(station.stationuuid) && "fill-accent text-accent")} />
                    </Button>
                    {chromecast.available && (
                        <Button onClick={chromecast.toggleCast} variant="ghost" size="icon" className="w-9 h-9" title={chromecast.isCasting ? `Casting to ${chromecast.deviceName || 'device'}` : 'Cast'}>
                            <Cast className={cn("h-4 w-4", chromecast.isCasting && "text-primary")} />
                        </Button>
                    )}
                    {airPlayAvailable && (
                        <Button onClick={toggleAirPlay} variant="ghost" size="icon" className="w-9 h-9" title="AirPlay">
                            <Airplay className="h-4 w-4" />
                        </Button>
                    )}
                     <Button variant="ghost" size="icon" asChild className="w-9 h-9 hidden md:inline-flex" title="Open stream in new tab">
                        <a href={streamUrl} target="_blank" rel="noopener noreferrer" aria-label="Open stream URL">
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={player.closePlayerBar}
                        aria-label="Close player"
                        className="w-9 h-9"
                        title="Close Player"
                        >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
}

