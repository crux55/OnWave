
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
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isPlayerBarOpen, setIsPlayerBarOpen] = useState(false);
  const [isPlaying, setIsPlayingState] = useState(false);

  const playStation = useCallback((station: RadioStation) => {
    setCurrentStation(station);
    setIsPlayerBarOpen(true);
    // setIsPlayingState(true); // Player component will handle actual play state
  }, []);

  const closePlayerBar = useCallback(() => {
    setIsPlayerBarOpen(false);
    setIsPlayingState(false);
    // setCurrentStation(null); // Keep station so player can fade out or stop gracefully if needed. Player component should handle its audio source.
  }, []);

  const setIsPlaying = useCallback((playing: boolean) => {
    setIsPlayingState(playing);
  }, []);


  return (
    <PlayerContext.Provider value={{ currentStation, isPlayerBarOpen, playStation, closePlayerBar, isPlaying, setIsPlaying }}>
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
