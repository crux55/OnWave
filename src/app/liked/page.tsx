'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchLikedStations, likedStationToRadioStation, resolveStationUrl, likeStation, submitFeedback } from '@/lib/api';
import type { RadioStation } from '@/lib/types';
import { RadioStationCard } from '@/components/RadioStationCard';
import { usePlayer } from '@/contexts/PlayerContext';
import { useLikedStations } from '@/hooks/use-liked-stations';
import { Heart, Plus, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// A "bring your own" station's own stream URL is stored in url/url_resolved,
// same as any other liked station -- resolveStationUrl already confirmed
// it's a real playable stream before this ever gets saved.

export default function LikedStationsPage() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(true);
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const player = usePlayer();
  const { isLiked, toggleLike } = useLikedStations();
  const { toast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const liked = await fetchLikedStations();
      setStations(liked.map(likedStationToRadioStation));
      setIsAuthed(true);
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        setIsAuthed(false);
      }
      setStations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Drop a station from the visible list as soon as it's unliked.
  const handleToggleLike = useCallback(async (station: RadioStation) => {
    await toggleLike(station);
    setStations(prev => prev.filter(s => s.stationuuid !== station.stationuuid));
  }, [toggleLike]);

  const handlePlay = (station: RadioStation) => {
    player.playStation(station);
  };

  // BYO station (OnWave#32) — for stations that don't show up in search.
  // resolveStationUrl (backed by project_r's internal/resolver) confirms the
  // URL is actually a working audio stream before it's saved.
  const handleAddCustomStation = async () => {
    const url = customUrl.trim();
    if (!url) return;
    setIsAddingCustom(true);
    try {
      const resolved = await resolveStationUrl(url);
      let displayName = customName.trim() || resolved.name;
      if (!displayName) {
        try {
          displayName = new URL(resolved.url_resolved || url).hostname;
        } catch {
          displayName = 'My Station';
        }
      }
      const station: RadioStation = {
        ...likedStationToRadioStation({
          stationuuid: resolved.suggested_uuid,
          name: displayName,
          url,
          url_resolved: resolved.url_resolved,
          favicon: '',
          tags: resolved.tags || '',
          country: '',
          codec: '',
          bitrate: 0,
          is_custom: true,
          created_at: new Date().toISOString(),
        }),
      };
      await likeStation(station);
      toast({ title: 'Station added', description: `${displayName} is now in your list.` });
      setCustomUrl('');
      setCustomName('');
      load();
    } catch (error: any) {
      toast({ title: "Couldn't add that station", description: error.message, variant: 'destructive' });
    } finally {
      setIsAddingCustom(false);
    }
  };

  const handleSuggestStation = async (station: RadioStation) => {
    try {
      await submitFeedback('station_suggestion', `Station: ${station.name}\nURL: ${station.url_resolved || station.url}`, '/liked');
      toast({ title: 'Suggested!', description: "We'll take a look at adding it for everyone." });
    } catch (error: any) {
      toast({ title: "Couldn't submit suggestion", description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <Heart className="h-8 w-8 text-accent" />
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Liked Stations
          </h1>
        </div>
        <p className="text-muted-foreground">Stations you've saved for later.</p>
      </header>

      {!isAuthed && (
        <p className="text-muted-foreground">
          <Link href="/auth/login" className="text-accent underline">Sign in</Link> to see and save liked stations.
        </p>
      )}

      {isAuthed && (
        <section className="mb-8 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Plus className="h-4 w-4 text-accent" /> Add Your Own Station
          </h2>
          <p className="text-xs text-muted-foreground">
            Got a stream that doesn't show up in search? Add it by URL — just for you, unless you suggest it to us below.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              placeholder="Stream URL (required)"
              value={customUrl}
              onChange={e => setCustomUrl(e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              placeholder="Name (optional)"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="h-9 text-sm"
            />
            <Button size="sm" onClick={handleAddCustomStation} disabled={isAddingCustom || !customUrl.trim()}>
              {isAddingCustom ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Add
            </Button>
          </div>
        </section>
      )}

      {isAuthed && isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isAuthed && !isLoading && stations.length === 0 && (
        <p className="text-muted-foreground">
          No liked stations yet — tap the heart icon on any station to save it here.
        </p>
      )}

      {isAuthed && !isLoading && stations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {stations.map(station => (
            <RadioStationCard
              key={station.stationuuid}
              station={station}
              onPlay={handlePlay}
              isLiked={isLiked(station.stationuuid)}
              onToggleLike={handleToggleLike}
              onSuggest={station.is_custom ? handleSuggestStation : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
