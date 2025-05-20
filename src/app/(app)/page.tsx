
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { mockStations } from '@/lib/mock-data';
import type { RadioStation } from '@/lib/types';
import { RadioStationCard } from '@/components/RadioStationCard';
import { StationSearchInput } from '@/components/StationSearchInput';
import { Music2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePlayer } from '@/contexts/PlayerContext'; // Import usePlayer

export default function BrowseStationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stations, setStations] = useState<RadioStation[]>([]);
  const player = usePlayer(); // Get player context

  // Simulate fetching stations
  useEffect(() => {
    setStations(mockStations);
  }, []);

  const filteredStations = useMemo(() => {
    if (!searchTerm) {
      return stations;
    }
    return stations.filter(station =>
      station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.genre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.country.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stations, searchTerm]);

  const handlePlayStation = (station: RadioStation) => {
    player.playStation(station); // Use player context to play station
  };

  return (
    <div className="container mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
          Discover Radio Stations
        </h1>
        <p className="text-lg text-muted-foreground">
          Explore a curated list of radio stations or search for your favorites.
        </p>
      </header>
      
      <StationSearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        className="mb-8"
      />

      {filteredStations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredStations.map(station => (
            <RadioStationCard
              key={station.id}
              station={station}
              onPlay={handlePlayStation}
            />
          ))}
        </div>
      ) : (
        <Alert variant="default" className="bg-secondary/50">
          <Music2 className="h-5 w-5 text-secondary-foreground" />
          <AlertTitle className="text-secondary-foreground">No Stations Found</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            No stations match your current search term "{searchTerm}". Try a different search or browse all stations.
          </AlertDescription>
        </Alert>
      )}
      {/* RadioPlayerDialog is removed as player is now a persistent bar */}
    </div>
  );
}
