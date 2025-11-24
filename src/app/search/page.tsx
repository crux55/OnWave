
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import type { RadioStation } from '@/lib/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListMusic, PlayCircle, Search as SearchIcon, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchFromApi } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { SafeImage } from '@/components/SafeImage';

type SortKey = 'name' | 'bitrate' | 'country' | 'votes' | 'clickcount' | 'clicktrend' | 'status';
type SortOrder = 'asc' | 'desc';


function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const player = usePlayer();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
      handleSearchStations(initialSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);


  
  const getStatus = (station: RadioStation) => {
    const lastCheckOKTime = new Date(station.lastcheckoktime);
    const lastCheckTime = new Date(station.lastchecktime);
    return station.lastcheckoktime && lastCheckOKTime >= lastCheckTime ? 1 : 0;
  };

  const sortedStations = [...stations].sort((a, b) => {
    let aValue: any, bValue: any;
    switch (sortKey) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'bitrate':
        aValue = a.bitrate;
        bValue = b.bitrate;
        break;
      case 'country':
        aValue = a.country.toLowerCase();
        bValue = b.country.toLowerCase();
        break;
      case 'votes':
        aValue = a.votes;
        bValue = b.votes;
        break;
      case 'clickcount':
        aValue = a.clickcount;
        bValue = b.clickcount;
        break;
      case 'clicktrend':
        aValue = a.clicktrend;
        bValue = b.clicktrend;
        break;
      case 'status':
        aValue = getStatus(a);
        bValue = getStatus(b);
        break;
      default:
        aValue = a.name;
        bValue = b.name;
    }
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Sort handler
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };


  const handleSearchStations = async (term?: string) => {
    const query = typeof term === 'string' ? term : searchTerm;
    if (!query.trim()) {
      setStations([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setStations([]);

    try {
      const data: RadioStation[] = await fetchFromApi({ term: query });
      setStations(data.map((s, index) => ({ ...s, id: s.serveruuid || `${s.name}-${index}` })));
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred while searching.');
      setStations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayStation = (station: RadioStation) => {
    const playerStation: RadioStation = {
      ...station,
      serveruuid: station.serveruuid || station.name,
      url: station.url_resolved || station.url,
      tags: station.tags?.split(', ')[0]?.trim() || 'Unknown',
      favicon: station.favicon || `https://placehold.co/64x64.png`,
    };

    if (!playerStation.url) {
      return;
    }

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
          <Button onClick={() => handleSearchStations()} disabled={isLoading} className="h-11">
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
                <th
                  className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  Station Name {sortKey === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer"
                  onClick={() => handleSort('bitrate')}
                >
                  Bitrate {sortKey === 'bitrate' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer"
                  onClick={() => handleSort('country')}
                >
                  Country {sortKey === 'country' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer"
                  onClick={() => handleSort('votes')}
                >
                  Votes {sortKey === 'votes' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Last OK</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">OK Time</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Check Time</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Stream</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Resolved</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Homepage</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Icon</th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Tags</th>
                <th
                  className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer"
                  onClick={() => handleSort('clickcount')}
                >
                  Clicks {sortKey === 'clickcount' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer"
                  onClick={() => handleSort('clicktrend')}
                >
                  Trend {sortKey === 'clicktrend' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  Status {sortKey === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-2 border border-border text-left font-semibold text-foreground">Play</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedStations.map((station) => {
                const lastCheckOKTime = new Date(station.lastcheckoktime);
                const lastCheckTime = new Date(station.lastchecktime);
                const isOnline = station.lastcheckoktime && lastCheckOKTime >= lastCheckTime;

                return (
                  <tr key={station.stationuuid || `${station.name}-${station.bitrate}`} className="hover:bg-muted/20">
                    <td className="p-2 border border-border text-foreground break-words whitespace-normal max-w-xs">{station.name}</td>
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
                      <SafeImage 
                        src={station.favicon}
                        alt="Station favicon"
                        width={16}
                        height={16}
                        className="object-contain"
                      />
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

export default function SearchPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <SearchPageContent />
    </React.Suspense>
  );
}