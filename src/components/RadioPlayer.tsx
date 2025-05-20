'use client';

import type { RadioStation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface RadioPlayerProps {
  station: RadioStation | null;
}

export function RadioPlayer({ station }: RadioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5); // Initial volume 50%
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (station && station.streamUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(station.streamUrl);
      } else {
        audioRef.current.src = station.streamUrl;
      }
      audioRef.current.volume = isMuted ? 0 : volume;
      
      const playPromise = audioRef.current.play();
      setIsLoading(true);
      setError(null);

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch((e) => {
            console.error('Error playing station:', e);
            setError(`Could not play station: ${e.message}. Please try another or check the stream URL.`);
            setIsPlaying(false);
            setIsLoading(false);
          });
      }

      const handleAudioError = (e: Event) => {
        console.error('Audio error:', e);
        let message = 'An unknown error occurred with the audio stream.';
        if (audioRef.current?.error) {
            switch (audioRef.current.error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                    message = 'Playback aborted by the user or script.';
                    break;
                case MediaError.MEDIA_ERR_NETWORK:
                    message = 'A network error caused the audio download to fail.';
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    message = 'The audio playback was aborted due to a corruption problem or because the audio used features your browser did not support.';
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    message = 'The audio could not be loaded, either because the server or network failed or because the format is not supported.';
                    break;
                default:
                    message = 'An unknown error occurred.';
            }
        }
        setError(message);
        setIsPlaying(false);
        setIsLoading(false);
      };
      
      audioRef.current.addEventListener('error', handleAudioError);
      audioRef.current.addEventListener('playing', () => { setIsPlaying(true); setIsLoading(false); setError(null); });
      audioRef.current.addEventListener('waiting', () => setIsLoading(true));
      audioRef.current.addEventListener('pause', () => setIsPlaying(false));

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeEventListener('error', handleAudioError);
          audioRef.current.removeEventListener('playing', () => { setIsPlaying(true); setIsLoading(false); setError(null); });
          audioRef.current.removeEventListener('waiting', () => setIsLoading(true));
          audioRef.current.removeEventListener('pause', () => setIsPlaying(false));
          // audioRef.current.src = ''; // Detach source
          // audioRef.current = null; // Potentially helps GC
        }
        setIsPlaying(false);
        setIsLoading(false);
      };
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setIsLoading(false);
      setError(null);
    }
  }, [station, volume, isMuted]);


  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      setError(null);
      audioRef.current.play().catch(e => {
        console.error("Error on toggle play:", e);
        setError(`Failed to play: ${e.message}`);
        setIsLoading(false);
        setIsPlaying(false);
      });
    }
  }, [isPlaying]);

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    setLastVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(lastVolume > 0 ? lastVolume : 0.1); // Restore last volume or a small default
      setIsMuted(false);
    } else {
      setLastVolume(volume); // Save current volume before muting
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume, lastVolume]);


  if (!station) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Select a station to start listening.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-card rounded-lg shadow-xl">
      <div className="flex items-center space-x-4">
        <Image
          src={station.faviconUrl || `https://placehold.co/64x64.png`}
          alt={station.name}
          width={64}
          height={64}
          className="rounded-md border"
          data-ai-hint="radio logo"
        />
        <div>
          <h3 className="text-xl font-semibold text-foreground">{station.name}</h3>
          <p className="text-sm text-muted-foreground">{station.genre} - {station.country}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-center space-x-4">
        <Button onClick={togglePlayPause} variant="ghost" size="icon" className="w-12 h-12" disabled={isLoading}>
          {isLoading ? (
            <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
          <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
        </Button>
      </div>

      <div className="flex items-center space-x-3">
        <Button onClick={toggleMute} variant="ghost" size="icon">
          {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          <span className="sr-only">{isMuted ? 'Unmute' : 'Mute'}</span>
        </Button>
        <Slider
          value={[volume]}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className="w-full"
          aria-label="Volume control"
        />
      </div>
      
      <div className="text-center">
        <Button variant="link" asChild>
          <a href={station.streamUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:text-accent/80">
            Open Stream URL <ExternalLink className="ml-1 h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
