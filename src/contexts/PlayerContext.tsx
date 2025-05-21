
'use client';
import type { RadioStation } from '@/lib/types';
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface PlayerContextType {
  currentStation: RadioStation | null;
  isPlayerBarOpen: boolean;
  playStation: (station: RadioStation) => void;
  closePlayerBar: () => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isPlayerMinimized: boolean;
  togglePlayerSize: () => void; // Toggles between minimized corner and standard bar
  isMaximizedViewOpen: boolean;
  openMaximizedPlayer: () => void;
  closeMaximizedPlayer: () => void;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isPlayerBarOpen, setIsPlayerBarOpen] = useState(false);
  const [isPlaying, setIsPlayingState] = useState(false);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);
  const [isMaximizedViewOpen, setIsMaximizedViewOpen] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [isMuted, setIsMutedState] = useState(false);


  const playStation = useCallback((station: RadioStation) => {
    setCurrentStation(station);
    setIsPlayerBarOpen(true);
    setIsPlayerMinimized(false); // Default to standard bar
    setIsMaximizedViewOpen(false); // Ensure maximized view is closed
    // setIsPlayingState(true); // Player component will handle actual play state
  }, []);

  const closePlayerBar = useCallback(() => {
    setIsPlayerBarOpen(false);
    setIsPlayingState(false);
    setCurrentStation(null); 
    setIsMaximizedViewOpen(false);
    setIsPlayerMinimized(false);
  }, []);

  const setIsPlaying = useCallback((playing: boolean) => {
    setIsPlayingState(playing);
  }, []);

  const togglePlayerSize = useCallback(() => {
    if (isPlayerBarOpen) {
      setIsPlayerMinimized(prev => !prev);
      setIsMaximizedViewOpen(false); // Ensure maximized view is closed when toggling bar/minimized
    }
  }, [isPlayerBarOpen]);

  const openMaximizedPlayer = useCallback(() => {
    if (isPlayerBarOpen) {
      setIsMaximizedViewOpen(true);
      // Optional: ensure player is not "minimized" state when opening maximized view
      // setIsPlayerMinimized(false); 
    }
  }, [isPlayerBarOpen]);

  const closeMaximizedPlayer = useCallback(() => {
    setIsMaximizedViewOpen(false);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (newVolume === 0) setIsMutedState(true);
  }, []);

  const setIsMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
  }, []);

  return (
    <PlayerContext.Provider value={{ 
      currentStation, 
      isPlayerBarOpen, 
      playStation, 
      closePlayerBar, 
      isPlaying, 
      setIsPlaying, 
      isPlayerMinimized, 
      togglePlayerSize,
      isMaximizedViewOpen,
      openMaximizedPlayer,
      closeMaximizedPlayer,
      volume,
      setVolume,
      isMuted,
      setIsMuted
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
