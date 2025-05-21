
'use client';

import type { RadioStation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play, Pause, Volume2, VolumeX, ExternalLink, Loader2,
  SkipForward, SkipBack, PanelBottomClose, PanelBottomOpen, Music2, X
} from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';

interface RadioPlayerProps {
  station: RadioStation | null;
}

export function RadioPlayer({ station }: RadioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const player = usePlayer();

  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        audioRef.current.load();
    }
    audioRef.current.volume = isMuted ? 0 : volume;

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

    playAudio();
    const currentAudio = audioRef.current;

    const handleAudioError = (e: Event) => {
      setError('Stream error.');
      player.setIsPlaying(false);
      setIsLoading(false);
    };
    
    const handleCanPlay = () => setIsLoading(false);

    if (currentAudio) {
      currentAudio.addEventListener('error', handleAudioError);
      currentAudio.addEventListener('playing', () => { player.setIsPlaying(true); setIsLoading(false); setError(null); });
      currentAudio.addEventListener('waiting', () => setIsLoading(true));
      currentAudio.addEventListener('pause', () => player.setIsPlaying(false));
      currentAudio.addEventListener('canplay', handleCanPlay);
    }

    return () => {
      if (currentAudio) {
        currentAudio.removeEventListener('error', handleAudioError);
        currentAudio.removeEventListener('playing', () => { player.setIsPlaying(true); setIsLoading(false); setError(null); });
        currentAudio.removeEventListener('waiting', () => setIsLoading(true));
        currentAudio.removeEventListener('pause', () => player.setIsPlaying(false));
        currentAudio.removeEventListener('canplay', handleCanPlay);
      }
    };
  }, [station, player.isPlayerBarOpen, player.setIsPlaying]); // Removed volume and isMuted, they don't gatekeep audio logic

  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) return;
    if (player.isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      setError(null);
      try {
        await audioRef.current.play();
      } catch (e: any) {
        setError(`Failed to play`);
        player.setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    }
  }, [player.isPlaying, player.setIsPlaying]);

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    setLastVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) audioRef.current.volume = vol;
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      setLastVolume(volume);
      setVolume(0);
      if (audioRef.current) audioRef.current.volume = 0;
    } else {
      const restoreVolume = lastVolume > 0 ? lastVolume : 0.1;
      setVolume(restoreVolume);
      if (audioRef.current) audioRef.current.volume = restoreVolume;
    }
  }, [isMuted, volume, lastVolume]);

  if (!station) return null;

  if (player.isPlayerMinimized) {
    return (
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
        {/* Placeholder Next/Prev - non-functional for radio */}
        <Button variant="ghost" size="icon" className="w-8 h-8" disabled> <SkipBack className="h-4 w-4 text-muted-foreground/50" /> </Button>
        <Button variant="ghost" size="icon" className="w-8 h-8" disabled> <SkipForward className="h-4 w-4 text-muted-foreground/50" /> </Button>
        <Button onClick={player.togglePlayerSize} variant="ghost" size="icon" className="w-8 h-8">
          <PanelBottomOpen className="h-4 w-4" /> <span className="sr-only">Maximize</span>
        </Button>
         <Button onClick={player.closePlayerBar} variant="ghost" size="icon" className="w-8 h-8">
          <X className="h-4 w-4" /> <span className="sr-only">Close</span>
        </Button>
      </div>
    );
  }

  // Maximized View
  return (
    <div className="flex items-center gap-3 md:gap-4 w-full">
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
        {/* Placeholder for Song Title & Artist */}
        <div className="flex items-center gap-2">
          <Music2 className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="overflow-hidden">
            <p className="text-sm text-primary truncate">Current Song Title Placeholder</p>
            <p className="text-xs text-muted-foreground truncate">Artist Name Placeholder</p>
          </div>
        </div>
        {error && <p className="text-xs text-destructive truncate mt-0.5">{error}</p>}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <Button onClick={player.togglePlayerSize} variant="ghost" size="icon" className="w-9 h-9 hidden md:inline-flex">
          <PanelBottomClose className="h-4 w-4" /> <span className="sr-only">Minimize</span>
        </Button>
        <Button onClick={togglePlayPause} variant="ghost" size="icon" className="w-10 h-10" disabled={isLoading || !station.streamUrl}>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : player.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <div className="items-center gap-2 w-24 sm:w-28 hidden md:flex">
          <Button onClick={toggleMute} variant="ghost" size="icon" className="w-9 h-9">
            {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider value={[volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="flex-grow" aria-label="Volume control" />
        </div>
        <Button variant="ghost" size="icon" asChild className="w-9 h-9 hidden md:inline-flex">
          <a href={station.streamUrl} target="_blank" rel="noopener noreferrer" aria-label="Open stream URL">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
