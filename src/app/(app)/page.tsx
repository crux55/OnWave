'use client';

import React, { useState, useEffect } from 'react';
import { fetchTopTags } from '@/lib/api';
import type { RadioStation, TopTag } from '@/lib/types';
import { RadioStationCard } from '@/components/RadioStationCard';
import { usePlayer } from '@/contexts/PlayerContext';
import { Music, Disc3, Radio, Coffee } from 'lucide-react'; // Example icons
import { sortStationsByClickTrend, fetchStationByBitRate, sortStationsByListeners, fetchStationByRandom } from '@/lib/api';
import Link from 'next/link';

interface StationSectionProps {
  title: string;
  stations: RadioStation[];
  onPlay: (station: RadioStation) => void;
  icon?: React.ElementType;
  emptyMessage?: string;
}

const StationSection: React.FC<StationSectionProps> = ({ title, stations, onPlay, icon: Icon, emptyMessage = "No stations available in this section right now." }) => {
  if (!stations || stations.length === 0) {
    return (
      <section className="mb-12">
        <div className="flex items-center mb-6">
          {Icon && <Icon className="h-7 w-7 text-accent mr-3" />}
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex items-center mb-6">
        {Icon && <Icon className="h-7 w-7 text-accent mr-3" />}
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
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
  const [randomiser, setRandomiser] = useState<RadioStation[]>([]);
  const [topTags, setTopTags] = useState<TopTag[]>([]);
  const player = usePlayer();

  useEffect(() => {

    // Fetch and set featured stations
    fetchStationByBitRate({ term: 'LoFi' })
      .then((stations) => setFeaturedStations(stations.slice(0, 4)))
      .catch((error) => console.error('Error fetching featured stations:', error));

    // Fetch and set most listened stations
    sortStationsByListeners({ term: 'LoFi' })
      .then((stations) => setMostListens(stations.slice(0, 4)))
      .catch((error) => console.error('Error fetching most listened stations:', error));

    // Fetch and set trending stations
    sortStationsByClickTrend({ term: 'LoFi' })
      .then((stations) => setTrending(stations.slice(0, 4)))
      .catch((error) => console.error('Error fetching trending stations:', error));

    // Fetch and set random stations
    fetchStationByRandom({ term: 'LoFi' })
      .then((stations) => setRandomiser(stations.slice(0, 4)))
      .catch((error) => console.error('Error fetching random stations:', error));

    fetchTopTags()
      .then(setTopTags)
      .catch((error) => console.error('Error fetching tags:', error));
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
                href={`/winamp?search=${encodeURIComponent(tagObj.name)}`}
                className="inline-block bg-muted text-foreground px-3 py-1 rounded-full text-sm font-medium"
              >
                {tagObj.name} <span className="text-xs text-muted-foreground">({tagObj.stationcount})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <StationSection
        title="Featured Stations"
        stations={featuredStations}
        onPlay={handlePlayStation}
        icon={Radio}
      />

      <StationSection
        title="Popular Stations"
        stations={mostListens}
        onPlay={handlePlayStation}
        icon={Disc3}
        emptyMessage="No popular stations available right now. Chill to something else?"
      />

      <StationSection
        title="Trending Stations"
        stations={trending}
        onPlay={handlePlayStation}
        icon={Music}
        emptyMessage="No trending stations available right now. Chill to something else?"
      />
      
      <StationSection
        title="Random Stations"
        stations={randomiser}
        onPlay={handlePlayStation}
        icon={Coffee}
        emptyMessage="The randomizer is taking a break. Check back later for more stations!"
      />
    </div>
  );
}