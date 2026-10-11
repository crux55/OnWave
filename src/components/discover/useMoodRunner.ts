'use client';

import { useState } from 'react';
import { type Mood } from '@/lib/moods';
import { fetchMoodStations, toPlayerStation } from '@/lib/api';
import { usePlayer } from '@/contexts/PlayerContext';

export interface MoodRunnerState {
  // Returns whether it actually found stations and opened the browser --
  // MoodPicker's dialog needs this (not just the error/isBrowserOpen state
  // below) to decide whether to close itself: reading state right after
  // `await`ing would see a stale value from before the state update
  // actually lands, since React batches it.
  runMood: (mood: Mood) => Promise<boolean>;
  isLoading: boolean;
  activeMood: Mood | null;
  error: string | null;
  isBrowserOpen: boolean;
  closeBrowser: () => void;
}

// The actual "pick a mood, get a swipeable spread of stations" flow
// (fetchMoodStations -> player.playQueue -> SwipeableStationBrowser),
// extracted out of MoodPicker's dialog so Discover's mood tiles can trigger
// it directly without a dialog wrapper in between. MoodPicker itself now
// just calls this hook too -- one real implementation, two entry points
// (a dialog trigger, and Discover's inline tiles).
export function useMoodRunner(): MoodRunnerState {
  const player = usePlayer();
  const [isLoading, setIsLoading] = useState(false);
  const [activeMood, setActiveMood] = useState<Mood | null>(null);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runMood = async (mood: Mood): Promise<boolean> => {
    setActiveMood(mood);
    setIsLoading(true);
    setError(null);
    try {
      const stations = await fetchMoodStations(mood.tags);
      if (stations.length === 0) {
        setError("Couldn't find stations for that vibe — try another.");
        return false;
      }
      player.playQueue(stations.map(toPlayerStation));
      setIsBrowserOpen(true);
      return true;
    } catch {
      setError('Something went wrong finding stations — try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { runMood, isLoading, activeMood, error, isBrowserOpen, closeBrowser: () => setIsBrowserOpen(false) };
}
