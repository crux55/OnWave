
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { RadioStation } from '@/lib/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListMusic, Search as SearchIcon, AlertTriangle, PlayCircle, ExternalLink, SlidersHorizontal } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchFromApi } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { SafeImage } from '@/components/SafeImage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEFAULT_FILTERS = {
  limit: 50,
  minBitrate: 0,
  maxBitrate: 999999,
  minClicks: 0,
  maxClicks: 999999999,
  minTrend: -999999,
  maxTrend: 999999,
  codec: 'any',
  country: 'any',
};

const CODEC_OPTIONS = ['any', 'MP3', 'AAC', 'AAC+', 'OGG', 'OPUS', 'FLAC'];

const COUNTRY_OPTIONS = [
  'any',
  'Australia',
  'New Zealand',
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'France',
  'Japan',
  'Netherlands',
];

type BitrateProfileKey = 'custom' | 'talk' | 'church' | 'music' | 'dj' | 'hifi';
type SortOrder = 'asc' | 'desc';
type SortKey = 'name' | 'bitrate' | 'country' | 'clickcount' | 'clicktrend' | 'status';

const BITRATE_PROFILES: Record<BitrateProfileKey, { label: string; min: number; max: number; codec: string }> = {
  custom: { label: 'Custom', min: 0, max: 999999, codec: 'any' },
  talk: { label: 'Talk Radio / Podcasts', min: 48, max: 64, codec: 'AAC+' },
  church: { label: 'Church Services', min: 64, max: 96, codec: 'AAC+' },
  music: { label: 'Music Radio Station', min: 128, max: 128, codec: 'MP3' },
  dj: { label: 'DJ Mixes / Live Events', min: 192, max: 192, codec: 'MP3' },
  hifi: { label: 'Premium Hi-Fi Stream', min: 256, max: 320, codec: 'MP3' },
};


function SearchPageContent() {
  const searchParams = useSearchParams();
  const player = usePlayer();
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(DEFAULT_FILTERS.limit);
  const [minBitrate, setMinBitrate] = useState<number>(DEFAULT_FILTERS.minBitrate);
  const [maxBitrate, setMaxBitrate] = useState<number>(DEFAULT_FILTERS.maxBitrate);
  const [minClicks, setMinClicks] = useState<number>(DEFAULT_FILTERS.minClicks);
  const [maxClicks, setMaxClicks] = useState<number>(DEFAULT_FILTERS.maxClicks);
  const [minTrend, setMinTrend] = useState<number>(DEFAULT_FILTERS.minTrend);
  const [maxTrend, setMaxTrend] = useState<number>(DEFAULT_FILTERS.maxTrend);
  const [codec, setCodec] = useState<string>(DEFAULT_FILTERS.codec);
  const [country, setCountry] = useState<string>(DEFAULT_FILTERS.country);
  const [bitrateProfile, setBitrateProfile] = useState<BitrateProfileKey>('custom');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSearchStations = useCallback(async (term?: string) => {
    const query = typeof term === 'string' ? term : searchTerm;
    if (!query.trim()) {
      setStations([]);
      setTotalResults(0);
      setError(null);
      return;
    }

    if (minBitrate > maxBitrate || minClicks > maxClicks || minTrend > maxTrend) {
      setError('Invalid filter range: minimum values must be less than or equal to maximum values.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchFromApi({
        term: query.trim(),
        limit: String(limit),
        min_bitrate: String(minBitrate),
        max_bitrate: String(maxBitrate),
        min_clicks: String(minClicks),
        max_clicks: String(maxClicks),
        min_trend: String(minTrend),
        max_trend: String(maxTrend),
        ...(codec !== 'any' ? { codec } : {}),
        ...(country !== 'any' ? { country } : {}),
      });

      setStations(response.stations);
      setTotalResults(response.total ?? response.stations.length);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred while searching.');
      setStations([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, limit, minBitrate, maxBitrate, minClicks, maxClicks, minTrend, maxTrend, codec, country]);

  useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
      handleSearchStations(initialSearch);
    }
  }, [initialSearch, handleSearchStations]);

  const handlePlayStation = (station: RadioStation) => {
    const playerStation: RadioStation = {
      ...station,
      serveruuid: station.serveruuid || station.stationuuid || station.name,
      url: station.url_resolved || station.url,
      tags: station.tags?.split(', ')[0]?.trim() || station.tags || 'Unknown',
      favicon: station.favicon || 'https://placehold.co/64x64.png',
    };

    if (!playerStation.url) {
      setError('This station does not have a playable stream URL.');
      return;
    }

    player.playStation(playerStation);
  };

  const handleResetFilters = () => {
    setLimit(DEFAULT_FILTERS.limit);
    setMinBitrate(DEFAULT_FILTERS.minBitrate);
    setMaxBitrate(DEFAULT_FILTERS.maxBitrate);
    setMinClicks(DEFAULT_FILTERS.minClicks);
    setMaxClicks(DEFAULT_FILTERS.maxClicks);
    setMinTrend(DEFAULT_FILTERS.minTrend);
    setMaxTrend(DEFAULT_FILTERS.maxTrend);
    setCodec(DEFAULT_FILTERS.codec);
    setCountry(DEFAULT_FILTERS.country);
    setBitrateProfile('custom');
  };

  const handleBitrateProfileChange = (profileKey: BitrateProfileKey) => {
    setBitrateProfile(profileKey);
    if (profileKey === 'custom') {
      return;
    }

    const profile = BITRATE_PROFILES[profileKey];
    setMinBitrate(profile.min);
    setMaxBitrate(profile.max);
    setCodec(profile.codec);
  };

  const getStationStatus = (station: RadioStation): string => {
    if (station.lastcheckok === 1) {
      return 'OK';
    }
    return 'Down';
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortOrder('asc');
  };

  const sortedStations = useMemo(() => {
    if (!sortKey) {
      return stations;
    }

    const copied = [...stations];
    copied.sort((a, b) => {
      const direction = sortOrder === 'asc' ? 1 : -1;

      if (sortKey === 'status') {
        const first = getStationStatus(a);
        const second = getStationStatus(b);
        return first.localeCompare(second) * direction;
      }

      if (sortKey === 'name' || sortKey === 'country') {
        const first = String(a[sortKey] || '').toLowerCase();
        const second = String(b[sortKey] || '').toLowerCase();
        return first.localeCompare(second) * direction;
      }

      const first = Number(a[sortKey] ?? 0);
      const second = Number(b[sortKey] ?? 0);
      return (first - second) * direction;
    });

    return copied;
  }, [stations, sortKey, sortOrder]);

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
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div>
              <label htmlFor="searchInput" className="text-sm font-medium mb-1 block">Search term</label>
              <Input
                type="search"
                id="searchInput"
                placeholder="Search station name (required)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchStations()}
                className="h-11 text-base"
              />
            </div>

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
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setShowAdvanced((prev) => !prev)}
              disabled={isLoading}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {showAdvanced ? 'Hide Advanced' : 'Advanced'}
            </Button>
          </div>

          {showAdvanced && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Bitrate profile</p>
                  <Select value={bitrateProfile} onValueChange={(value) => handleBitrateProfileChange(value as BitrateProfileKey)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select bitrate profile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="talk">Talk Radio / Podcasts (48-64 kbps, AAC+)</SelectItem>
                      <SelectItem value="church">Church Services (64-96 kbps, AAC+)</SelectItem>
                      <SelectItem value="music">Music Radio Station (128 kbps, MP3/AAC)</SelectItem>
                      <SelectItem value="dj">DJ Mixes / Live Events (192 kbps, MP3)</SelectItem>
                      <SelectItem value="hifi">Premium Hi-Fi Stream (256-320 kbps, MP3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Bitrate (kbps)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      value={minBitrate}
                      onChange={(e) => {
                        setMinBitrate(Number(e.target.value || 0));
                        setBitrateProfile('custom');
                      }}
                      placeholder="Min"
                    />
                    <Input
                      type="number"
                      value={maxBitrate}
                      onChange={(e) => {
                        setMaxBitrate(Number(e.target.value || 0));
                        setBitrateProfile('custom');
                      }}
                      placeholder="Max"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Results per page</p>
                  <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Limit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="250">250</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Popularity (Clicks)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" value={minClicks} onChange={(e) => setMinClicks(Number(e.target.value || 0))} placeholder="Min" />
                    <Input type="number" value={maxClicks} onChange={(e) => setMaxClicks(Number(e.target.value || 0))} placeholder="Max" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Growth Trend</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" value={minTrend} onChange={(e) => setMinTrend(Number(e.target.value || 0))} placeholder="Min" />
                    <Input type="number" value={maxTrend} onChange={(e) => setMaxTrend(Number(e.target.value || 0))} placeholder="Max" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Codec</p>
                  <Select value={codec} onValueChange={setCodec}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Any codec" />
                    </SelectTrigger>
                    <SelectContent>
                      {CODEC_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === 'any' ? 'Any codec' : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Country</p>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Any country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === 'any' ? 'Any country' : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={handleResetFilters}
                  disabled={isLoading}
                >
                  Reset Advanced Filters
                </Button>
              </div>
            </>
          )}
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
          No stations found for "{searchTerm}" with the selected filters.
        </div>
      )}

      {stations.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Showing {stations.length} of {totalResults} matching stations.
          </p>
          <div className="overflow-x-auto bg-card p-1 rounded-lg shadow-md">
            <table className="min-w-full w-full border border-border border-collapse text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="p-2 border border-border text-left font-semibold text-foreground w-10"></th>
                  <th
                    className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    Station Name {sortKey === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort('bitrate')}
                  >
                    Quality {sortKey === 'bitrate' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer"
                    onClick={() => handleSort('country')}
                  >
                    Country {sortKey === 'country' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="p-2 border border-border text-left font-semibold text-foreground">Tags</th>
                  <th
                    className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer whitespace-nowrap"
                    title="Total lifetime plays via RadioBrowser"
                    onClick={() => handleSort('clickcount')}
                  >
                    Plays {sortKey === 'clickcount' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer whitespace-nowrap"
                    title="Change in play count over the last 24 hours"
                    onClick={() => handleSort('clicktrend')}
                  >
                    24h Trend {sortKey === 'clicktrend' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    className="p-2 border border-border text-left font-semibold text-foreground cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    Status {sortKey === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="p-2 border border-border text-left font-semibold text-foreground">Links</th>
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
                      <td className="p-2 border border-border">
                        <SafeImage
                          src={station.favicon}
                          alt="Station favicon"
                          width={20}
                          height={20}
                          className="object-contain rounded-sm"
                        />
                      </td>
                      <td className="p-2 border border-border text-foreground max-w-[200px]">
                        <p className="truncate font-medium" title={station.name}>{station.name}</p>
                      </td>
                      <td className="p-2 border border-border text-muted-foreground whitespace-nowrap">
                        <span>{station.bitrate} kbps</span>
                        <span className="ml-1 text-xs text-muted-foreground/70">{station.codec}</span>
                      </td>
                      <td className="p-2 border border-border text-muted-foreground whitespace-nowrap">{station.country || '—'}</td>
                      <td className="p-2 border border-border text-muted-foreground truncate max-w-[160px]" title={station.tags || ''}>{station.tags || '—'}</td>
                      <td className="p-2 border border-border text-muted-foreground whitespace-nowrap">{(station.clickcount ?? 0).toLocaleString()}</td>
                      <td className={`p-2 border border-border whitespace-nowrap font-medium ${(station.clicktrend ?? 0) > 0 ? 'text-green-600' : (station.clicktrend ?? 0) < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {(station.clicktrend ?? 0) > 0 ? '+' : ''}{station.clicktrend ?? 0}
                      </td>
                      <td className="p-2 border border-border text-center text-lg" title={isOnline ? 'Online' : 'Offline'}>
                        {isOnline ? '💚' : '🚫'}
                      </td>
                      <td className="p-2 border border-border whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {station.url && (
                            <a href={station.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                              Stream
                            </a>
                          )}
                          {station.homepage && (
                            <a href={station.homepage} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs inline-flex items-center gap-0.5">
                              Site <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
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