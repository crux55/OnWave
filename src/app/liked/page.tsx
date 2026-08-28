'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchLikedStations, type LikedStation } from '@/lib/api';
import type { RadioStation } from '@/lib/types';
import { RadioStationCard } from '@/components/RadioStationCard';
import { usePlayer } from '@/contexts/PlayerContext';
import { useLikedStations } from '@/hooks/use-liked-stations';
import { Heart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

function toRadioStation(liked: LikedStation): RadioStation {
  return {
    stationuuid: liked.stationuuid,
    name: liked.name,
    url: liked.url,
    url_resolved: liked.url_resolved || liked.url,
    homepage: '',
    favicon: liked.favicon,
    has_valid_favicon: !!liked.favicon,
    tags: liked.tags,
    country: liked.country,
    countrycode: '',
    state: '',
    language: '',
    languagecodes: '',
    bitrate: liked.bitrate,
    codec: liked.codec,
    votes: 0,
    clickcount: 0,
    clicktrend: 0,
    lastchangetime: '',
    lastchangetime_iso8601: '',
    lastchecktime: '',
    lastchecktime_iso8601: '',
    lastcheckok: 1,
    lastcheckoktime: '',
    lastcheckoktime_iso8601: '',
    lastlocalchecktime: '',
    lastlocalchecktime_iso8601: '',
    ssl_error: 0,
    has_extended_info: false,
    serveruuid: liked.stationuuid,
    changeuuid: '',
    iso_3166_2: '',
    hls: 0,
  };
}

export default function LikedStationsPage() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(true);
  const player = usePlayer();
  const { isLiked, toggleLike } = useLikedStations();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const liked = await fetchLikedStations();
      setStations(liked.map(toRadioStation));
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
