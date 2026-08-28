
'use client';

import React, { useCallback } from 'react';
import type { RadioStation } from '@/lib/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import {
  Play, Pause, Volume2, VolumeX, SkipForward, SkipBack, Loader2, ExternalLink, Minimize2, Music2, X
} from 'lucide-react';
import { cn, isValidImageUrl } from '@/lib/utils';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { useAudioVisualizer } from '@/hooks/use-audio-visualizer';
import { useChromecast } from '@/hooks/use-chromecast';

interface MaximizedPlayerDialogProps {
  station: RadioStation;
}

export function MaximizedPlayerDialog({ station }: MaximizedPlayerDialogProps) {
  const player = usePlayer();
  const streamUrl = station.url_resolved || station.url;
  // isLoading and error states might need to be mirrored from RadioPlayer or context if they are specific to playback attempts.
  // For simplicity, we'll rely on context's isPlaying for now.
  const [lastVolumeBeforeMute, setLastVolumeBeforeMute] = React.useState(player.volume);
  const { mode: visualizerMode, getFrequencyData } = useAudioVisualizer(player.audioElementRef.current, player.isPlaying);
  const chromecast = useChromecast(streamUrl, station.name, station.codec);

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

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    const vol = newVolume[0];
    player.setVolume(vol);
     if (vol > 0 && player.isMuted) {
      player.setIsMuted(false);
    } else if (vol === 0 && !player.isMuted) {
      player.setIsMuted(true);
    }
  }, [player]);

  const toggleMute = useCallback(() => {
    const newMuted = !player.isMuted;
    player.setIsMuted(newMuted);
    if (newMuted) {
      setLastVolumeBeforeMute(player.volume);
      // player.setVolume(0); // Context handles this via audioRef listener
    } else {
      // player.setVolume(lastVolumeBeforeMute > 0 ? lastVolumeBeforeMute : 0.1); // Context handles this
    }
  }, [player.isMuted, player.volume, player.setIsMuted, player.setVolume, lastVolumeBeforeMute]);


  // DialogClose X button is handled by ShadCN Dialog, which calls onOpenChange(false)
  // onOpenChange for the dialog should call player.closeMaximizedPlayer()
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      player.closeMaximizedPlayer();
    }
  };

  return (
    <Dialog open={player.isMaximizedViewOpen} onOpenChange={handleDialogClose}>
      <DialogContent hideCloseButton className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 overflow-hidden data-[state=open]:min-h-[70vh] flex flex-col">
        <div className="relative h-60 sm:h-80 md:h-96 w-full">
          <Image
            src={isValidImageUrl(station.favicon) ? station.favicon : `https://placehold.co/1200x800.png`}
            alt={`${station.name} artwork`}
            layout="fill"
            objectFit="cover"
            className="bg-muted blur-md scale-110 opacity-50"
            data-ai-hint="radio station background"
          />
          <div className="absolute inset-0">
            <AudioVisualizer
              mode={visualizerMode}
              getFrequencyData={getFrequencyData}
              isPlaying={player.isPlaying}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 w-full">
            <DialogHeader>
              <DialogTitle className="text-3xl sm:text-4xl font-bold text-card-foreground truncate">{station.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{station.tags} &bull; {station.country}</p>
            </DialogHeader>
          </div>
           <DialogClose asChild className="absolute top-4 right-4 z-50">
            <Button variant="ghost" size="icon" className="bg-card/50 hover:bg-card/80 text-card-foreground hover:text-accent-foreground rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
        </div>

        <div className="flex-grow p-6 space-y-6">

          {/* Player Controls */}
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={player.playPrevious}
                variant="ghost"
                size="icon"
                className={cn("w-12 h-12", !player.hasPrevious && "text-muted-foreground/70")}
                disabled={!player.hasPrevious}
                title="Previous in queue"
              >
                <SkipBack className="h-6 w-6" />
              </Button>
              <Button
                onClick={togglePlayPause}
                variant="outline"
                size="icon"
                className="w-16 h-16 rounded-full border-2 border-primary hover:bg-primary/10"
                disabled={!streamUrl /* || player.isLoading - if isLoading is in context */}
              >
                {/* {player.isLoading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : player.isPlaying ? <Pause className="h-8 w-8 text-primary" /> : <Play className="h-8 w-8 text-primary" />} */}
                 {isPlayingDisplay ? <Pause className="h-8 w-8 text-primary" /> : <Play className="h-8 w-8 text-primary" />}
              </Button>
              <Button
                onClick={player.playNext}
                variant="ghost"
                size="icon"
                className={cn("w-12 h-12", !player.hasNext && "text-muted-foreground/70")}
                disabled={!player.hasNext}
                title="Next in queue"
              >
                <SkipForward className="h-6 w-6" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 w-full max-w-xs pt-4">
              <Button onClick={toggleMute} variant="ghost" size="icon">
                {player.isMuted || player.volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <Slider
                value={[player.isMuted ? 0 : player.volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="flex-grow"
                aria-label="Volume control"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t items-center justify-between sm:justify-between">
           <Button variant="ghost" asChild className="text-sm" disabled={!streamUrl}>
              <a href={streamUrl} target="_blank" rel="noopener noreferrer" aria-label="Open stream URL">
                <ExternalLink className="mr-2 h-4 w-4" /> Open Stream
              </a>
            </Button>
          <Button variant="outline" onClick={player.closeMaximizedPlayer}>
            <Minimize2 className="mr-2 h-4 w-4" />
            Collapse to Bar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

