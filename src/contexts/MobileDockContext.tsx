'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export type MobileDockTab = 'menu' | 'player' | 'live';

interface MobileDockContextType {
  activeTab: MobileDockTab;
  setActiveTab: (tab: MobileDockTab) => void;
  minimized: boolean;
  setMinimized: (minimized: boolean) => void;
  // Each piece of dock content (the dock's own strip/menu, and the
  // separately-mounted RadioPlayer/LiveListenerMiniPlayer bars, which stay
  // separately mounted so there's only ever one <audio> element and one
  // LiveKit room subscription — see MobileBottomDock.tsx) reports its own
  // rendered height here, so `totalHeight` is always the true on-screen
  // total regardless of which tab is active, instead of every consumer
  // hand-guessing an offset from player state (the bug this replaces).
  reportHeight: (key: 'dock' | 'player' | 'live', height: number) => void;
  totalHeight: number;
}

const MobileDockContext = createContext<MobileDockContextType | undefined>(undefined);

export function MobileDockProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<MobileDockTab>('menu');
  const [minimized, setMinimized] = useState(false);
  const [heights, setHeights] = useState<{ dock: number; player: number; live: number }>({ dock: 0, player: 0, live: 0 });

  const reportHeight = useCallback((key: 'dock' | 'player' | 'live', height: number) => {
    setHeights(prev => (prev[key] === height ? prev : { ...prev, [key]: height }));
  }, []);

  const totalHeight = useMemo(() => {
    if (minimized) return heights.dock;
    if (activeTab === 'player') return heights.dock + heights.player;
    if (activeTab === 'live') return heights.dock + heights.live;
    return heights.dock;
  }, [heights, activeTab, minimized]);

  const value = useMemo(() => ({
    activeTab, setActiveTab, minimized, setMinimized, reportHeight, totalHeight,
  }), [activeTab, minimized, reportHeight, totalHeight]);

  return <MobileDockContext.Provider value={value}>{children}</MobileDockContext.Provider>;
}

export function useMobileDock(): MobileDockContextType {
  const ctx = useContext(MobileDockContext);
  if (ctx === undefined) {
    throw new Error('useMobileDock must be used within a MobileDockProvider');
  }
  return ctx;
}
