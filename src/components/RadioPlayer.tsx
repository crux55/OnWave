
'use client';

import type { RadioStation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, ExternalLink, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { usePlayer } from '@/contexts/PlayerContext'; // Import usePlayer

interface RadioPlayerProps {
  station: RadioStation | null;
}

export function RadioPlayer({ station }: RadioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const player = usePlayer(); // Access player context

  // Local state for volume, mute, loading, error specific to this instance
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to manage audio source and playback when station changes or player bar opens/closes
  useEffect(() => {
    if (!station || !player.isPlayerBarOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; // Detach source
      }
      player.setIsPlaying(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Initialize or update audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    if (audioRef.current.src !== station.streamUrl) {
        audioRef.current.src = station.streamUrl;
        audioRef.current.load(); // Important to load new source
    }
    audioRef.current.volume = isMuted ? 0 : volume;

    // Attempt to play
    const playAudio = async () => {
      if (audioRef.current && station.streamUrl) {
        try {
          setIsLoading(true);
          setError(null);
          await audioRef.current.play();
          player.setIsPlaying(true);
        } catch (e: any) {
          console.error('Error playing station:', e);
          setError(`Stream error: ${e.message}`);
          player.setIsPlaying(false);
        } finally {
          setIsLoading(false);
        }
      }
    };

    playAudio();

    const currentAudio = audioRef.current; // Capture current audio element for cleanup

    const handleAudioError = (e: Event) => {
      console.error('Audio error event:', e);
      let message = 'An unknown error occurred with the audio stream.';
      if (currentAudio?.error) {
          switch (currentAudio.error.code) {
              case MediaError.MEDIA_ERR_ABORTED: message = 'Playback aborted.'; break;
              case MediaError.MEDIA_ERR_NETWORK: message = 'Network error.'; break;
              case MediaError.MEDIA_ERR_DECODE: message = 'Audio decoding error.'; break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: message = 'Audio format not supported.'; break;
              default: message = 'Unknown audio error.';
          }
      }
      setError(message);
      player.setIsPlaying(false);
      setIsLoading(false);
    };
    
    const handleCanPlay = () => {
      setIsLoading(false);
      // If it was intended to play, play now
      // This can help with autoplay policies if play() was called before stream was ready
      if(player.isPlayerBarOpen && station && audioRef.current && !player.isPlaying) {
         audioRef.current.play().then(() => player.setIsPlaying(true)).catch(() => {/* ignore if still fails */});
      }
    };

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
        // Do not pause or change src here if we want sound to persist across navigations
        // unless the station itself changes or the bar is explicitly closed.
      }
    };
  }, [station, player.isPlayerBarOpen, volume, isMuted, player.setIsPlaying]); // player.setIsPlaying is stable

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
        console.error("Error on toggle play:", e);
        setError(`Failed to play: ${e.message}`);
        player.setIsPlaying(false); // Ensure context is updated
      } finally {
        setIsLoading(false);
      }
    }
  }, [player.isPlaying, player.setIsPlaying]);

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    setLastVolume(vol); // Save for unmuting
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      setLastVolume(volume); // Save current volume before muting
      setVolume(0);
      if (audioRef.current) audioRef.current.volume = 0;
    } else {
      const restoreVolume = lastVolume > 0 ? lastVolume : 0.1;
      setVolume(restoreVolume);
      if (audioRef.current) audioRef.current.volume = restoreVolume;
    }
  }, [isMuted, volume, lastVolume]);


  if (!station) {
    return null; // No station, render nothing or a placeholder
  }

  return (
    <div className="flex items-center gap-3 w-full">
      <Image
        src={station.faviconUrl || `https://placehold.co/48x48.png`}
        alt={station.name}
        width={48}
        height={48}
        className="rounded-md border hidden sm:block"
        data-ai-hint="radio logo"
      />
      <div className="flex-grow overflow-hidden">
        <h4 className="text-sm font-semibold truncate text-foreground">{station.name}</h4>
        <p className="text-xs text-muted-foreground truncate">{station.genre} - {station.country}</p>
        {error && (
          <p className="text-xs text-destructive truncate mt-0.5">{error}</p>
        )}
      </div>

      <Button onClick={togglePlayPause} variant="ghost" size="icon" className="w-10 h-10" disabled={isLoading || !station.streamUrl}>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : player.isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5" />
        )}
        <span className="sr-only">{player.isPlaying ? 'Pause' : 'Play'}</span>
      </Button>

      <div className="flex items-center gap-2 w-24 sm:w-32">
        <Button onClick={toggleMute} variant="ghost" size="icon" className="w-8 h-8 sm:w-10 sm:h-10">
          {isMuted || volume === 0 ? <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" /> : <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />}
          <span className="sr-only">{isMuted ? 'Unmute' : 'Mute'}</span>
        </Button>
        <Slider
          value={[volume]}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className="flex-grow"
          aria-label="Volume control"
        />
      </div>
      <Button variant="ghost" size="icon" asChild className="hidden md:inline-flex w-10 h-10">
        <a href={station.streamUrl} target="_blank" rel="noopener noreferrer" aria-label="Open stream URL">
          <ExternalLink className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}
