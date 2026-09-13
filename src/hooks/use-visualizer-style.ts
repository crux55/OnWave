'use client';

import { useEffect, useState } from 'react';

// The four visualizer looks a listener can choose between (project_r#26 —
// "I'd like the users to have a few to pick from"). Kept here, rather than
// inline in the picker component, so any future consumer (not just
// MaximizedPlayerDialog) can import the same list/labels without
// duplicating them.
export type VisualizerStyle = 'bars' | 'radial' | 'waveform' | 'aurora';

export const VISUALIZER_STYLES: { id: VisualizerStyle; label: string }[] = [
  { id: 'bars', label: 'Bars' },
  { id: 'radial', label: 'Radial' },
  { id: 'waveform', label: 'Waveform' },
  { id: 'aurora', label: 'Aurora' },
];

const STORAGE_KEY = 'onwave:visualizer-style';
const DEFAULT_STYLE: VisualizerStyle = 'bars';

function isVisualizerStyle(value: string | null): value is VisualizerStyle {
  return !!value && VISUALIZER_STYLES.some(s => s.id === value);
}

// A per-device look preference, not account data — localStorage is the
// right home for it (same reasoning as any other per-viewer UI toggle),
// not a synced user setting.
export function useVisualizerStyle() {
  const [style, setStyleState] = useState<VisualizerStyle>(DEFAULT_STYLE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isVisualizerStyle(stored)) setStyleState(stored);
    } catch {
      // Private browsing / storage blocked — just keep the default.
    }
  }, []);

  const setStyle = (next: VisualizerStyle) => {
    setStyleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal — the choice just won't persist across reloads.
    }
  };

  return { style, setStyle };
}
