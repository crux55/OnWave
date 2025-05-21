
'use client';

import type { RadioStation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play, Pause, Volume2, VolumeX, ExternalLink, Loader2,
  SkipForward, SkipBack, PanelBottomClose, PanelBottomOpen, Expand, X, Music2
} from 'lucide-react';
import React, { useRef, useEffect, useCallback, useState } from 'react';
import Image from 'next/image';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';

interface RadioPlayerProps {
  station: RadioStation | null;
}

export function RadioPlayer({ station }: RadioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const player = usePlayer();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastVolumeBeforeMute, setLastVolumeBeforeMute] = useState(player.volume);


  useEffect(() => {
    if (!station || !player.isPlayerBarOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      player.setIsPlaying(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    if (audioRef.current.src !== station.streamUrl) {
        audioRef.current.src = station.streamUrl;
        audioRef.current.load(); // Ensure stream is loaded
    }
    // audioRef.current.volume set by volume effect

    const playAudio = async () => {
      if (audioRef.current && station.streamUrl) {
        try {
          setIsLoading(true);
          setError(null);
          await audioRef.current.play();
          player.setIsPlaying(true);
        } catch (e: any) {
          console.error('Error playing station:', e);
          setError(`Stream error`);
          player.setIsPlaying(false);
        } finally {
          setIsLoading(false);
        }
      }
    };

    // Only attempt to play if player bar is open and not in maximized view (audio handled by dialog potentially)
    // Or if the intention is to play immediately. For now, let's assume play when station is set.
    if (player.isPlayerBarOpen) {
        playAudio();
    }
    
    const currentAudio = audioRef.current;

    const handleAudioError = (e: Event) => {
      console.error("Audio Error:", e);
      const mediaError = (e.target as HTMLAudioElement).error;
      let errorMessage = 'Stream error.';
      if (mediaError) {
        switch (mediaError.code) {
          case mediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Playback aborted.';
            break;
          case mediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error.';
            break;
          case mediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Decode error.';
            break;
          case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Format not supported.';
            break;
          default:
            errorMessage = 'Unknown stream error.';
        }
      }
      setError(errorMessage);
      player.setIsPlaying(false);
      setIsLoading(false);
    };
    
    const handleCanPlay = () => setIsLoading(false);
    const handlePlaying = () => { player.setIsPlaying(true); setIsLoading(false); setError(null); };
    const handleWaiting = () => setIsLoading(true);
    const handlePause = () => player.setIsPlaying(false);


    if (currentAudio) {
      currentAudio.addEventListener('error', handleAudioError);
      currentAudio.addEventListener('playing', handlePlaying);
      currentAudio.addEventListener('waiting', handleWaiting);
      currentAudio.addEventListener('pause', handlePause);
      currentAudio.addEventListener('canplay', handleCanPlay);
    }

    return () => {
      if (currentAudio) {
        currentAudio.removeEventListener('error', handleAudioError);
        currentAudio.removeEventListener('playing', handlePlaying);
        currentAudio.removeEventListener('waiting', handleWaiting);
        currentAudio.removeEventListener('pause', handlePause);
        currentAudio.removeEventListener('canplay', handleCanPlay);
      }
    };
  // player.isMaximizedViewOpen is intentionally not a dependency here, 
  // as this component instance manages the core audio lifecycle.
  }, [station, player.isPlayerBarOpen, player.setIsPlaying]);


  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = player.isMuted ? 0 : player.volume;
    }
  }, [player.volume, player.isMuted]);


  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current || !station?.streamUrl) return;
    if (player.isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      setError(null);
      try {
        // Ensure src is set, especially if it was cleared or changed
        if (audioRef.current.src !== station.streamUrl) {
            audioRef.current.src = station.streamUrl;
            audioRef.current.load();
        }
        await audioRef.current.play();
      } catch (e: any) {
        setError(`Failed to play`);
        player.setIsPlaying(false); // Ensure context is updated
      } finally {
        setIsLoading(false);
      }
    }
  }, [player.isPlaying, station, player.setIsPlaying]);

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
      setLastVolumeBeforeMute(player.volume); // Save current volume before muting
      player.setVolume(0); // Set volume to 0, context will update audioRef
    } else {
      // Restore to lastVolumeBeforeMute or a small default if lastVolume was 0
      player.setVolume(lastVolumeBeforeMute > 0 ? lastVolumeBeforeMute : 0.1);
    }
  }, [player.isMuted, player.volume, player.setIsMuted, player.setVolume, lastVolumeBeforeMute]);


  if (!station || !player.isPlayerBarOpen) return null; // This component shouldn't render if bar is closed

  const playerRootClasses = cn(
    "fixed z-40 bg-card shadow-lg border-t transition-all duration-300 ease-in-out",
    player.isPlayerMinimized
      ? "bottom-4 right-4 w-72 rounded-lg sm:mb-0 mb-16" // Minimized state
      : "bottom-0 left-0 right-0 sm:mb-0 mb-16" // Standard bar state
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
              <Image
                src={station.faviconUrl || `https://placehold.co/32x32.png`}
                alt={station.name}
                width={32}
                height={32}
                className="rounded border"
                data-ai-hint="radio logo"
              />
              <div className="flex-grow overflow-hidden">
                <h4 className="text-xs font-semibold truncate text-foreground">{station.name}</h4>
                {error && <p className="text-xs text-destructive truncate">{error}</p>}
              </div>
              <Button onClick={togglePlayPause} variant="ghost" size="icon" className="w-8 h-8" disabled={isLoading || !station.streamUrl}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : player.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8" disabled> <SkipBack className="h-4 w-4 text-muted-foreground/50" /> </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8" disabled> <SkipForward className="h-4 w-4 text-muted-foreground/50" /> </Button>
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
    <div className={playerRootClasses}>
        <div className={playerContainerClasses}>
            <div className={playerFlexClasses}>
                <div className="flex items-center gap-3 md:gap-4 flex-grow overflow-hidden">
                    <Image
                        src={station.faviconUrl || `https://placehold.co/64x64.png`}
                        alt={station.name}
                        width={64}
                        height={64}
                        className="rounded-md border hidden sm:block aspect-square"
                        data-ai-hint="radio station art"
                    />
                    <div className="flex-grow overflow-hidden space-y-1">
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-base font-semibold truncate text-foreground">{station.name}</h3>
                            <p className="text-xs text-muted-foreground truncate hidden md:block">{station.genre} - {station.country}</p>
                        </div>
                        <div className="flex items-center gap-2">
                        <Music2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="overflow-hidden">
                            <p className="text-sm text-primary truncate">Current Song Title Placeholder</p>
                            <p className="text-xs text-muted-foreground truncate">Artist Name Placeholder</p>
                        </div>
                        </div>
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
                    <Button onClick={togglePlayPause} variant="ghost" size="icon" className="w-10 h-10" disabled={isLoading || !station.streamUrl}>
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : player.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    <div className="items-center gap-2 w-24 sm:w-28 hidden md:flex">
                        <Button onClick={toggleMute} variant="ghost" size="icon" className="w-9 h-9">
                            {player.isMuted || player.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <Slider value={[player.isMuted ? 0 : player.volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="flex-grow" aria-label="Volume control" />
                    </div>
                     <Button variant="ghost" size="icon" asChild className="w-9 h-9 hidden md:inline-flex" title="Open stream in new tab">
                        <a href={station.streamUrl} target="_blank" rel="noopener noreferrer" aria-label="Open stream URL">
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
