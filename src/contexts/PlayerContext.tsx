
'use client';
import type { RadioStation } from '@/lib/types';
import React, { createContext, useState, useContext, useRef, ReactNode, useCallback } from 'react';

interface PlayerContextType {
  currentStation: RadioStation | null;
  isPlayerBarOpen: boolean;
  playStation: (station: RadioStation) => void;
  closePlayerBar: () => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlayback: () => void;
  isPlayerMinimized: boolean;
  togglePlayerSize: () => void;
  isMaximizedViewOpen: boolean;
  openMaximizedPlayer: () => void;
  closeMaximizedPlayer: () => void;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  queue: RadioStation[];
  queueIndex: number;
  addToQueue: (station: RadioStation) => void;
  addManyToQueue: (stations: RadioStation[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  audioElementRef: React.MutableRefObject<HTMLAudioElement | null>;
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
  const [queue, setQueue] = useState<RadioStation[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);


  const playStation = useCallback((station: RadioStation) => {
    setCurrentStation(station);
    setIsPlayerBarOpen(true);
    setIsPlayerMinimized(false);
    setIsMaximizedViewOpen(false);
    setIsPlayingState(true);
    setQueueIndex(-1);
  }, []);

  const addToQueue = useCallback((station: RadioStation) => {
    setQueue(prev => [...prev, station]);
  }, []);

  const addManyToQueue = useCallback((stations: RadioStation[]) => {
    setQueue(prev => [...prev, ...stations]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
    setQueueIndex(prev => {
      if (index < prev) return prev - 1;
      if (index === prev) return -1;
      return prev;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
  }, []);

  const playAtQueueIndex = useCallback((index: number, list: RadioStation[]) => {
    const station = list[index];
    if (!station) return;
    setCurrentStation(station);
    setIsPlayerBarOpen(true);
    setIsPlayerMinimized(false);
    setIsMaximizedViewOpen(false);
    setIsPlayingState(true);
    setQueueIndex(index);
  }, []);

  const playNext = useCallback(() => {
    const nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) return;
    playAtQueueIndex(nextIndex, queue);
  }, [queue, queueIndex, playAtQueueIndex]);

  const playPrevious = useCallback(() => {
    const prevIndex = queueIndex - 1;
    if (prevIndex < 0) return;
    playAtQueueIndex(prevIndex, queue);
  }, [queue, queueIndex, playAtQueueIndex]);

  const hasNext = queueIndex + 1 < queue.length;
  const hasPrevious = queueIndex - 1 >= 0;

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

  const togglePlayback = useCallback(() => {
    setIsPlayingState(prev => !prev);
  }, []);

  const togglePlayerSize = useCallback(() => {
    if (isPlayerBarOpen) {
      setIsPlayerMinimized(prev => !prev);
      setIsMaximizedViewOpen(false);
    }
  }, [isPlayerBarOpen]);

  const openMaximizedPlayer = useCallback(() => {
    if (isPlayerBarOpen) {
      setIsMaximizedViewOpen(true);
      setIsPlayerMinimized(false); 
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
      togglePlayback,
      isPlayerMinimized, 
      togglePlayerSize,
      isMaximizedViewOpen,
      openMaximizedPlayer,
      closeMaximizedPlayer,
      volume,
      setVolume,
      isMuted,
      setIsMuted,
      queue,
      queueIndex,
      addToQueue,
      addManyToQueue,
      removeFromQueue,
      clearQueue,
      playNext,
      playPrevious,
      hasNext,
      hasPrevious,
      audioElementRef
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
