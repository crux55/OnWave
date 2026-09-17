'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MOODS, matchMoodFromText, type Mood } from '@/lib/moods';
import { fetchMoodStations, toPlayerStation } from '@/lib/api';
import { usePlayer } from '@/contexts/PlayerContext';
import { useLikedStations } from '@/hooks/use-liked-stations';
import { SwipeableStationBrowser } from '@/components/discover/SwipeableStationBrowser';

interface MoodPickerProps {
  // asChild-style trigger so callers keep their own button/card look (home
  // page CTA, a nav entry, etc.) instead of MoodPicker imposing one design —
  // see OnWave#36 ("make it usable elsewhere").
  trigger: React.ReactNode;
}

// Mood-based discovery (OnWave#36): free text or a mood chip both resolve to
// a Mood (lib/moods.ts), which fetches a pooled/shuffled set of stations
// across that mood's tags and hands them to the same SwipeableStationBrowser
// already built for Discover's "Browse All" (OnWave#35) — reusing it here is
// exactly the point, not a second copy of the swipe UI.
export function MoodPicker({ trigger }: MoodPickerProps) {
  const player = usePlayer();
  const { isLiked, toggleLike } = useLikedStations();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMood, setActiveMood] = useState<Mood | null>(null);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runMood = async (mood: Mood) => {
    setActiveMood(mood);
    setIsLoading(true);
    setError(null);
    try {
      const stations = await fetchMoodStations(mood.tags);
      if (stations.length === 0) {
        setError("Couldn't find stations for that vibe — try another.");
        return;
      }
      player.playQueue(stations.map(toPlayerStation));
      setOpen(false);
      setIsBrowserOpen(true);
    } catch {
      setError('Something went wrong finding stations — try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    runMood(matchMoodFromText(text));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What&rsquo;s your vibe?</DialogTitle>
            <DialogDescription>
              Describe a mood or moment, or pick one below — we&rsquo;ll queue up a matching spread of stations to swipe through.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. happy morning making breakfast"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !text.trim()}>
              Go
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {MOODS.map(mood => (
              <button
                key={mood.id}
                type="button"
                onClick={() => runMood(mood)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-accent disabled:opacity-50"
              >
                <span>{mood.emoji}</span> {mood.label}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Finding {activeMood?.label.toLowerCase() || 'your'} stations…
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogContent>
      </Dialog>

      {isBrowserOpen && (
        <SwipeableStationBrowser
          isLiked={isLiked}
          onToggleLike={toggleLike}
          onClose={() => setIsBrowserOpen(false)}
        />
      )}
    </>
  );
}
