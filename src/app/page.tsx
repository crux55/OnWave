'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchTopTags, fetchHomePageSections, fetchDiscoverSection } from '@/lib/api';
import type { RadioStation, TopTag } from '@/lib/types';
import { RadioStationCard } from '@/components/RadioStationCard';
import { usePlayer } from '@/contexts/PlayerContext';
import { Music, Disc3, TrendingUp, RefreshCw, Sparkles, Shuffle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface StationSectionProps {
  title: string;
  stations: RadioStation[];
  onPlay: (station: RadioStation) => void;
  icon?: React.ElementType;
  emptyMessage?: string;
  action?: React.ReactNode;
  isLoading?: boolean;
}

const StationSection: React.FC<StationSectionProps> = ({
  title, stations, onPlay, icon: Icon,
  emptyMessage = 'No stations available in this section right now.',
  action,
  isLoading = false,
}) => {
  const header = (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center">
        {Icon && <Icon className="h-7 w-7 text-accent mr-3" />}
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );

  if (isLoading) {
    return (
      <section className="mb-12">
        {header}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!stations || stations.length === 0) {
    return (
      <section className="mb-12">
        {header}
        <p className="text-muted-foreground">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="mb-12">
      {header}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {stations.map(station => (
          <RadioStationCard
            key={station.stationuuid}
            station={station}
            onPlay={onPlay}
          />
        ))}
      </div>
    </section>
  );
};

export default function HomePage() {
  const [featuredStations, setFeaturedStations] = useState<RadioStation[]>([]);
  const [mostListens, setMostListens] = useState<RadioStation[]>([]);
  const [trending, setTrending] = useState<RadioStation[]>([]);
  const [discoverStations, setDiscoverStations] = useState<RadioStation[]>([]);
  const [discoverGenre, setDiscoverGenre] = useState<string>('');
  const [topTags, setTopTags] = useState<TopTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);
  const player = usePlayer();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [sections, tags] = await Promise.all([
          fetchHomePageSections(),
          fetchTopTags(),
        ]);
        setFeaturedStations(sections.featured);
        setMostListens(sections.popular);
        setTrending(sections.trending);
        setDiscoverStations(sections.discover);
        setDiscoverGenre(sections.discoverGenre);
        setTopTags(tags);
      } catch (error) {
        console.error('Error loading home page:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleShuffle = useCallback(async () => {
    setIsShuffling(true);
    try {
      const result = await fetchDiscoverSection();
      setDiscoverStations(result.stations);
      setDiscoverGenre(result.genre);
    } catch (error) {
      console.error('Shuffle failed:', error);
    } finally {
      setIsShuffling(false);
    }
  }, []);

  const handlePlayStation = (station: RadioStation) => {
    player.playStation(station);
  };

  return (
    <div className="container mx-auto">
      <header className="mb-10 text-center">
        <Music className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          Welcome to OnWave
        </h1>
        <p className="text-xl text-muted-foreground mt-3 max-w-2xl mx-auto">
          Discover curated radio stations, explore new sounds, and find your next favorite tune.
        </p>
      </header>

      {topTags.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-3 text-foreground">Top Tags</h2>
          <div className="flex flex-wrap gap-2">
            {topTags.slice(0, 30).map(tagObj => (
              <Link
                key={tagObj.name}
                href={`/search?search=${encodeURIComponent(tagObj.name)}`}
                className="inline-block bg-muted text-foreground px-3 py-1 rounded-full text-sm font-medium"
              >
                {tagObj.name} <span className="text-xs text-muted-foreground">({tagObj.stationcount})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <StationSection
        title="Editor's Picks"
        stations={featuredStations}
        onPlay={handlePlayStation}
        icon={Sparkles}
        isLoading={isLoading}
        emptyMessage="No featured stations available right now."
      />

      <StationSection
        title="Most Listened"
        stations={mostListens}
        onPlay={handlePlayStation}
        icon={Disc3}
        isLoading={isLoading}
        emptyMessage="No popular stations available right now."
      />

      <StationSection
        title="Trending Now"
        stations={trending}
        onPlay={handlePlayStation}
        icon={TrendingUp}
        isLoading={isLoading}
        emptyMessage="No trending stations right now. Check back later!"
      />

      <StationSection
        title={discoverGenre ? `Discover: ${discoverGenre.charAt(0).toUpperCase() + discoverGenre.slice(1)}` : 'Discover'}
        stations={discoverStations}
        onPlay={handlePlayStation}
        icon={Shuffle}
        isLoading={isLoading}
        emptyMessage="Nothing to discover right now. Try shuffling!"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShuffle}
            disabled={isShuffling || isLoading}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isShuffling ? 'animate-spin' : ''}`} />
            Shuffle
          </Button>
        }
      />
    </div>
  );
}