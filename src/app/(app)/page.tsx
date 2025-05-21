
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { mockStations } from '@/lib/mock-data';
import type { RadioStation } from '@/lib/types';
import { RadioStationCard } from '@/components/RadioStationCard';
import { usePlayer } from '@/contexts/PlayerContext';
import { Music, Disc3, Radio, Coffee } from 'lucide-react'; // Example icons

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
            key={station.id}
            station={station}
            onPlay={onPlay}
          />
        ))}
      </div>
    </section>
  );
};

export default function HomePage() {
  const [allStations, setAllStations] = useState<RadioStation[]>([]);
  const player = usePlayer();

  useEffect(() => {
    setAllStations(mockStations);
  }, []);

  const handlePlayStation = (station: RadioStation) => {
    player.playStation(station);
  };

  const featuredStations = useMemo(() => {
    return allStations.slice(0, 4);
  }, [allStations]);

  const synthwaveStations = useMemo(() => {
    return allStations.filter(s => s.genre.toLowerCase().includes('synthwave')).slice(0, 4);
  }, [allStations]);

  const lofiStations = useMemo(() => {
    return allStations.filter(s => s.genre.toLowerCase().includes('lo-fi hip hop')).slice(0, 4);
  }, [allStations]);

  const jazzStations = useMemo(() => {
    return allStations.filter(s => s.genre.toLowerCase().includes('jazz')).slice(0, 4);
  }, [allStations]);

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

      <StationSection
        title="Featured Stations"
        stations={featuredStations}
        onPlay={handlePlayStation}
        icon={Radio}
      />

      <StationSection
        title="Synthwave Vibes"
        stations={synthwaveStations}
        onPlay={handlePlayStation}
        icon={Disc3}
        emptyMessage="No synthwave stations found at the moment. Explore other genres!"
      />

      <StationSection
        title="Lo-Fi Beats"
        stations={lofiStations}
        onPlay={handlePlayStation}
        icon={Music}
        emptyMessage="No lo-fi stations available right now. Chill to something else?"
      />
      
      <StationSection
        title="Jazz Cafe"
        stations={jazzStations}
        onPlay={handlePlayStation}
        icon={Coffee}
        emptyMessage="The Jazz Cafe is quiet today. Try another section."
      />
    </div>
  );
}
