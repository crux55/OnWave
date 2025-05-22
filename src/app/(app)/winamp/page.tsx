
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
  id?: string; 
  name: string;
  bitrate: number;
  country: string;
  votes: number;
  lastcheckok: boolean | number; 
  lastcheckoktime: string; 
  lastchecktime: string; 
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string; 
  codec: string;
  clickcount: number;
  clicktrend: number;
}

export default function WinampPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stations, setStations] = useState<ApiRadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const player = usePlayer();

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

  const handleSearchStations = async () => {
    if (!searchTerm.trim()) {
      setStations([]);
      setError(null);
      return;
    }
    if (!apiBaseUrl) {
      setError("API base URL is not configured. Please set NEXT_PUBLIC_API_BASE_URL in your environment variables.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setStations([]);

    try {
      const response = await fetch(`${apiBaseUrl}/webradio/search?term=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch stations: ${response.status} ${errorText || response.statusText}`);
      }
      const data: ApiRadioStation[] = await response.json();
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
      id: station.id || station.name,
      name: station.name,
      streamUrl: station.url_resolved,
      genre: station.tags?.split(',')[0]?.trim() || 'Unknown',
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
          Enter a term to search for radio stations via an external API.
        </p>
      </header>

      <Card className="shadow-lg mb-8 bg-card/80">
        <CardHeader>
          <CardTitle className="text-card-foreground">Station Search</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            type="search"
            id="searchInput"
            placeholder="Search for stations (e.g., jazz, techno)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchStations()}
            className="flex-grow h-11 text-base bg-input text-foreground placeholder:text-muted-foreground"
          />
          <Button 
            onClick={handleSearchStations} 
            disabled={isLoading || !apiBaseUrl} 
            className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
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
          No stations found for "{searchTerm}". Try a different search term.
        </div>
      )}

      {stations.length > 0 && (
        <div className="overflow-x-auto bg-neutral-800 p-1 rounded-lg shadow-md border border-neutral-700">
          <table className="min-w-full w-full border-collapse text-sm">
            <thead className="bg-neutral-900">
              <tr>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Station Name</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Bitrate</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Country</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Votes</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Last Check OK</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Last Check OK Time</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Last Check Time</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Stream</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Resolved</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Homepage</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Icon</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Tags</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Clicks</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Trend</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Status</th>
                <th className="p-2 border border-neutral-700 text-left font-semibold text-white">Play</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-700">
              {stations.map((station) => {
                const lastCheckOKTime = new Date(station.lastcheckoktime);
                const lastCheckTime = new Date(station.lastchecktime);
                const isOnline = !!station.lastcheckok && lastCheckOKTime >= lastCheckTime;

                return (
                  <tr key={station.id || station.name} className="hover:bg-neutral-700/50">
                    <td className="p-1.5 border border-neutral-700 text-white whitespace-nowrap">{station.name}</td>
                    <td className="p-1.5 border border-neutral-700 text-neutral-300">{station.bitrate} kbps</td>
                    <td className="p-1.5 border border-neutral-700 text-neutral-300">{station.country}</td>
                    <td className="p-1.5 border border-neutral-700 text-neutral-300">{station.votes}</td>
                    <td className="p-1.5 border border-neutral-700 text-neutral-300">{station.lastcheckok ? 'Yes' : 'No'}</td>
                    <td className="p-1.5 border border-neutral-700 text-neutral-300 whitespace-nowrap">{station.lastcheckoktime?.substring(0,19).replace('T', ' ')}</td>
                    <td className="p-1.5 border border-neutral-700 text-neutral-300 whitespace-nowrap">{station.lastchecktime?.substring(0,19).replace('T', ' ')}</td>
                    <td className="p-1.5 border border-neutral-700">
                      <a href={station.url} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
                        Stream
                      </a>
                    </td>
                    <td className="p-1.5 border border-neutral-700">
                      <a href={station.url_resolved} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
                        Resolved
                      </a>
                    </td>
                    <td className="p-1.5 border border-neutral-700">
                      <a href={station.homepage} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
                        Homepage
                      </a>
                    </td>
                    <td className="p-1.5 border border-neutral-700 align-middle text-center">
                      {station.favicon ? (
                        <Image src={station.favicon} alt="" width={16} height={16} className="object-contain inline-block" data-ai-hint="radio logo" onError={(e) => e.currentTarget.style.display='none'}/>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-1.5 border border-neutral-700 text-neutral-300 truncate max-w-[150px] sm:max-w-xs">{station.tags}</td>
                    <td className="p-1.5 border border-neutral-700 text-neutral-300">{station.clickcount}</td>
                    <td className="p-1.5 border border-neutral-700 text-neutral-300">{station.clicktrend}</td>
                    <td className="p-1.5 border border-neutral-700 text-center text-xl" title={isOnline ? 'Online' : 'Offline'}>
                      {isOnline ? '💚' : '🚫'}
                    </td>
                    <td className="p-1.5 border border-neutral-700 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlayStation(station)}
                        className="text-pink-400 hover:text-white hover:bg-pink-500/70 h-7 px-2"
                      >
                        <PlayCircle className="mr-1 h-4 w-4" />
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
