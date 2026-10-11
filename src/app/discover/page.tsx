'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MOODS, matchMoodFromText } from '@/lib/moods';
import { DISCOVER_GENRES } from '@/lib/api';
import { useLikedStations } from '@/hooks/use-liked-stations';
import { SwipeableStationBrowser } from '@/components/discover/SwipeableStationBrowser';
import { useMoodRunner } from '@/components/discover/useMoodRunner';
import { SuggestStationDialog } from '@/components/SuggestStationDialog';

// Cycles through the theme's own accent pair for the genre tile grid --
// no per-genre colors to maintain, and every tile still reads as "this app"
// rather than a rainbow of arbitrary hues.
const GENRE_TILE_GRADIENTS = [
  'from-accent/25 to-accent/5',
  'from-accent-2/25 to-accent-2/5',
];

function DiscoverPageContent() {
  const { isLiked, toggleLike } = useLikedStations();
  const [text, setText] = useState('');
  const { runMood, isLoading, activeMood, error, isBrowserOpen, closeBrowser } = useMoodRunner();

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    runMood(matchMoodFromText(text));
  };

  return (
    <div className="w-full">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <Compass className="h-8 w-8 text-accent" />
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Discover</h1>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="mb-1 font-display text-2xl font-bold text-foreground">What&rsquo;s your vibe?</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Describe a mood or moment, or pick one below — we&rsquo;ll queue up a matching spread of stations to swipe through.
        </p>

        <form onSubmit={handleTextSubmit} className="mb-5 flex max-w-xl gap-2">
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              type="button"
              onClick={() => runMood(mood)}
              disabled={isLoading}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-5 text-center transition-colors hover:border-accent/40 disabled:opacity-50"
            >
              <span className="text-3xl">{mood.emoji}</span>
              <span className="text-sm font-medium text-foreground">{mood.label}</span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Finding {activeMood?.label.toLowerCase() || 'your'} stations…
          </div>
        )}
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Browse by genre</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {DISCOVER_GENRES.map((genre, i) => (
            <Link
              key={genre}
              href={`/search?q=${encodeURIComponent(genre)}`}
              className={`rounded-xl border border-border/60 bg-gradient-to-br ${GENRE_TILE_GRADIENTS[i % GENRE_TILE_GRADIENTS.length]} px-4 py-5 text-center text-sm font-semibold capitalize text-foreground transition-transform hover:scale-[1.03]`}
            >
              {genre}
            </Link>
          ))}
        </div>
      </section>

      <SuggestStationDialog
        trigger={
          <Button variant="outline">
            Suggest a station
          </Button>
        }
      />

      {isBrowserOpen && (
        <SwipeableStationBrowser
          isLiked={isLiked}
          onToggleLike={toggleLike}
          onClose={closeBrowser}
        />
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <DiscoverPageContent />
    </React.Suspense>
  );
}
