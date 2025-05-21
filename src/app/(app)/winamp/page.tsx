
'use client';

import React, { useState, useCallback } from 'react';
import type { RadioStation } from '@/lib/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListMusic, PlayCircle, Search as SearchIcon, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define the expected shape of station data from the API
interface ApiRadioStation {
  id?: string; // Optional, but good for React keys if available
  name: string;
  bitrate: number;
  country: string;
  votes: number;
  lastcheckok: boolean | number; // API might send 0/1 or true/false
  lastcheckoktime: string; // ISO date string
  lastchecktime: string; // ISO date string
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string; // Comma-separated
  codec: string;
  clickcount: number;
  clicktrend: number;
  // language: string;
  // state: string; // Region/State
  // countrycode: string;
  // ... any other fields the API might return
}

export default function WinampPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stations, setStations] = useState<ApiRadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const player = usePlayer();

  const handleSearchStations = async () => {
    if (!searchTerm.trim()) {
      setStations([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setStations([]);

    try {
      const response = await fetch(`/webradio/search?term=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch stations: ${response.status} ${errorText || response.statusText}`);
      }
      const data: ApiRadioStation[] = await response.json();
      // Add a simple client-side ID if not provided by API, for React keys
      setStations(data.map((s, index) => ({ ...s, id: s.id || `${s.name}-${index}` })));
    } catch (e: any) {
      console.error('Search stations error:', e);
      setError(e.message || 'An unexpected error occurred while searching.');
      setStations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayStation = (station: ApiRadioStation) => {
    const playerStation: RadioStation = {
      id: station.id || station.name, // Use API ID or fallback
      name: station.name,
      streamUrl: station.url_resolved,
      genre: station.tags?.split(',')[0]?.trim() || 'Unknown', // Use first tag as genre
      country: station.country,
      faviconUrl: station.favicon || `https://placehold.co/64x64.png`,
    };
    player.playStation(playerStation);
  };

  return (
    <div className="container mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <ListMusic className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Search Web Radio
          </h1>
        </div>
        <p className="text-md text-muted-foreground">
          Enter a term to search for radio stations via the Radio Browser API.
        </p>
      </header>

      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle>Station Search</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            type="search"
            id="searchInput"
            placeholder="Search for stations (e.g., jazz, techno, country name)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchStations()}
            className="flex-grow h-11 text-base"
          />
          <Button onClick={handleSearchStations} disabled={isLoading} className="h-11">
            {isLoading ? (
              <>
                <SearchIcon className="mr-2 h-4 w-4 animate-spin" /> Searching...
              </>
            ) : (
              <>
                <SearchIcon className="mr-2 h-4 w-4" /> Search
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && stations.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <SearchIcon className="mx-auto h-12 w-12 animate-pulse mb-2" />
          Searching for stations...
        </div>
      )}

      {!isLoading && !error && stations.length === 0 && searchTerm && (
         <div className="text-center py-10 text-muted-foreground">
          No stations found for "{searchTerm}". Try a different search.
        </div>
      )}

      {stations.length > 0 && (
        <div className="overflow-x-auto bg-card p-1 rounded-lg shadow-md">
          <table className="min-w-full w-full border border-border border-collapse text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Station Name</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Bitrate</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Country</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Votes</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Last OK</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">OK Time</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Check Time</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Stream</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Resolved</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Homepage</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Icon</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Tags</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Clicks</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Trend</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Status</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Play</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stations.map((station) => {
                const lastCheckOKTime = new Date(station.lastcheckoktime);
                const lastCheckTime = new Date(station.lastchecktime);
                const isOnline = station.lastcheckok && lastCheckOKTime >= lastCheckTime;

                return (
                  <tr key={station.id || station.name} className="hover:bg-muted/20">
                    <td className="p-2 border border-border text-foreground whitespace-nowrap">{station.name}</td>
                    <td className="p-2 border border-border text-muted-foreground">{station.bitrate} kbps</td>
                    <td className="p-2 border border-border text-muted-foreground">{station.country}</td>
                    <td className="p-2 border border-border text-muted-foreground">{station.votes}</td>
                    <td className="p-2 border border-border text-muted-foreground">{station.lastcheckok ? 'Yes' : 'No'}</td>
                    <td className="p-2 border border-border text-muted-foreground whitespace-nowrap">{station.lastcheckoktime?.substring(0,19).replace('T', ' ')}</td>
                    <td className="p-2 border border-border text-muted-foreground whitespace-nowrap">{station.lastchecktime?.substring(0,19).replace('T', ' ')}</td>
                    <td className="p-2 border border-border">
                      <a href={station.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Stream
                      </a>
                    </td>
                    <td className="p-2 border border-border">
                      <a href={station.url_resolved} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Resolved
                      </a>
                    </td>
                    <td className="p-2 border border-border">
                      <a href={station.homepage} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Homepage
                      </a>
                    </td>
                    <td className="p-2 border border-border">
                      {station.favicon ? (
                        <Image src={station.favicon} alt="Favicon" width={16} height={16} className="object-contain" data-ai-hint="radio logo" onError={(e) => e.currentTarget.style.display='none'}/>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-2 border border-border text-muted-foreground truncate max-w-xs">{station.tags}</td>
                    <td className="p-2 border border-border text-muted-foreground">{station.clickcount}</td>
                    <td className="p-2 border border-border text-muted-foreground">{station.clicktrend}</td>
                    <td className="p-2 border border-border text-center text-xl" title={isOnline ? 'Online' : 'Offline'}>
                      {isOnline ? '💚' : '🚫'}
                    </td>
                    <td className="p-2 border border-border text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlayStation(station)}
                        className="text-accent hover:text-accent-foreground hover:bg-accent/90 h-7 px-2"
                      >
                        <PlayCircle className="mr-1.5 h-4 w-4" />
                        Play
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

    