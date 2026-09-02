'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { RadioStation } from '@/lib/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search as SearchIcon, AlertTriangle, SlidersHorizontal, ListPlus, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchFromApi, toPlayerStation, fetchAllStations, type Station } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLikedStations } from '@/hooks/use-liked-stations';
import { RadioStationCard } from '@/components/RadioStationCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEFAULT_FILTERS = {
  limit: 250,
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
type SortKey = 'name' | 'bitrate' | 'clickcount' | 'clicktrend';

const BITRATE_PROFILES: Record<BitrateProfileKey, { label: string; min: number; max: number; codec: string }> = {
  custom: { label: 'Custom', min: 0, max: 999999, codec: 'any' },
  talk: { label: 'Talk Radio / Podcasts', min: 48, max: 64, codec: 'AAC+' },
  church: { label: 'Church Services', min: 64, max: 96, codec: 'AAC+' },
  music: { label: 'Music Radio Station', min: 128, max: 128, codec: 'MP3' },
  dj: { label: 'DJ Mixes / Live Events', min: 192, max: 192, codec: 'MP3' },
  hifi: { label: 'Premium Hi-Fi Stream', min: 256, max: 320, codec: 'MP3' },
};

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name',
  bitrate: 'Bitrate',
  clickcount: 'Popularity',
  clicktrend: '24h Trend',
};

const SEARCH_CACHE_KEY = 'onwave:discover-search-cache';
const REVEAL_BATCH = 24;

function DiscoverPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const player = usePlayer();
  const { toast } = useToast();
  const { isLiked, toggleLike } = useLikedStations();

  const initialTab = searchParams.get('tab') === 'directory' ? 'directory' : 'search';
  const [activeTab, setActiveTab] = useState<'search' | 'directory'>(initialTab);

  // --- Search tab state ---
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(Number(searchParams.get('limit')) || DEFAULT_FILTERS.limit);
  const [minBitrate, setMinBitrate] = useState<number>(DEFAULT_FILTERS.minBitrate);
  const [maxBitrate, setMaxBitrate] = useState<number>(DEFAULT_FILTERS.maxBitrate);
  const [minClicks, setMinClicks] = useState<number>(DEFAULT_FILTERS.minClicks);
  const [maxClicks, setMaxClicks] = useState<number>(DEFAULT_FILTERS.maxClicks);
  const [minTrend, setMinTrend] = useState<number>(DEFAULT_FILTERS.minTrend);
  const [maxTrend, setMaxTrend] = useState<number>(DEFAULT_FILTERS.maxTrend);
  const [codec, setCodec] = useState<string>(searchParams.get('codec') || DEFAULT_FILTERS.codec);
  const [country, setCountry] = useState<string>(searchParams.get('country') || DEFAULT_FILTERS.country);
  const [bitrateProfile, setBitrateProfile] = useState<BitrateProfileKey>('custom');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [visibleCount, setVisibleCount] = useState(REVEAL_BATCH);
  const abortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // --- Directory tab state ---
  const [directoryStations, setDirectoryStations] = useState<Station[]>([]);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState(false);

  const handleSearchStations = useCallback(async (term?: string) => {
    const query = typeof term === 'string' ? term : searchTerm;
    if (!query.trim()) {
      setStations([]);
      setError(null);
      return;
    }

    if (minBitrate > maxBitrate || minClicks > maxClicks || minTrend > maxTrend) {
      setError('Invalid filter range: minimum values must be less than or equal to maximum values.');
      return;
    }

    // Cancel any still-in-flight search before starting a new one, so a
    // fast edit + re-search can't have an earlier, slower response land
    // after a newer one and clobber it with stale results.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

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
      }, controller.signal);

      setStations(response.stations);
      setVisibleCount(REVEAL_BATCH);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e.message || 'An unexpected error occurred while searching.');
      setStations([]);
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [searchTerm, limit, minBitrate, maxBitrate, minClicks, maxClicks, minTrend, maxTrend, codec, country]);

  // Run the initial search once on mount if the URL arrived with one
  // (e.g. from Home's Top Tags row, or a bookmarked/shared search).
  useEffect(() => {
    if (initialSearch) {
      handleSearchStations(initialSearch);
    } else {
      try {
        const cached = sessionStorage.getItem(SEARCH_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setSearchTerm(parsed.searchTerm ?? '');
          setStations(parsed.stations ?? []);
        }
      } catch {
        // Corrupt or inaccessible cache — ignore, tab just starts blank.
      }
    }
    // Deliberately mount-only — handleSearchStations' identity changes on
    // every keystroke (it depends on searchTerm/filters), and re-running
    // this on every change would refire the initial search and fight
    // typing, mirroring the same guard the previous /search page used.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the current search + results for a same-tab refresh.
  useEffect(() => {
    if (!searchTerm.trim()) return;
    try {
      sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify({ searchTerm, stations }));
    } catch {
      // sessionStorage unavailable (private browsing, quota) — fine to skip.
    }
  }, [searchTerm, stations]);

  // Sync tab + key filters to the URL so a search is bookmarkable/shareable.
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab === 'directory') params.set('tab', 'directory');
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (limit !== DEFAULT_FILTERS.limit) params.set('limit', String(limit));
    if (codec !== 'any') params.set('codec', codec);
    if (country !== 'any') params.set('country', country);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // Deliberately excludes router/pathname/searchParams from deps — only
    // the actual filter/tab state should trigger a URL rewrite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchTerm, limit, codec, country]);

  // Reveal more of the already-fetched results as the user scrolls near
  // the bottom of the grid — a real backend offset/pagination API doesn't
  // exist yet (checked: the search endpoint's "total" is just an echo of
  // what it already returned), so this is progressive rendering of one
  // batch already in hand, not fresh network pages.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + REVEAL_BATCH, stations.length));
      }
    }, { rootMargin: '400px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [stations.length]);

  // Load the OnWave station directory once, for the Directory tab.
  useEffect(() => {
    fetchAllStations()
      .then(setDirectoryStations)
      .catch(() => setDirectoryError(true))
      .finally(() => setIsDirectoryLoading(false));
  }, []);

  const handlePlayStation = (station: RadioStation) => {
    const playerStation = toPlayerStation(station);
    if (!playerStation.url) {
      setError('This station does not have a playable stream URL.');
      return;
    }
    player.playStation(playerStation);
  };

  const handleAddAllToQueue = () => {
    const playable = sortedStations.filter(s => s.url_resolved || s.url).map(toPlayerStation);
    if (playable.length === 0) return;
    player.addManyToQueue(playable);
    toast({ title: 'Added to queue', description: `${playable.length} station${playable.length === 1 ? '' : 's'} added.` });
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
    if (profileKey === 'custom') return;
    const profile = BITRATE_PROFILES[profileKey];
    setMinBitrate(profile.min);
    setMaxBitrate(profile.max);
    setCodec(profile.codec);
  };

  const sortedStations = useMemo(() => {
    const copied = [...stations];
    copied.sort((a, b) => {
      if (sortKey === 'name') {
        return String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase());
      }
      // bitrate/clickcount/clicktrend: highest first, most useful default
      // for "popularity"/"quality"-style sorts on a card grid.
      return Number(b[sortKey] ?? 0) - Number(a[sortKey] ?? 0);
    });
    return copied;
  }, [stations, sortKey]);

  const visibleStations = sortedStations.slice(0, visibleCount);

  return (
    <div className="container mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <SearchIcon className="h-8 w-8 text-accent" />
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Discover
          </h1>
        </div>
        <p className="text-md text-muted-foreground">
          Search thousands of stations worldwide, or browse OnWave's own station directory.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'directory')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="directory">Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="search">
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
                          onChange={(e) => { setMinBitrate(Number(e.target.value || 0)); setBitrateProfile('custom'); }}
                          placeholder="Min"
                        />
                        <Input
                          type="number"
                          value={maxBitrate}
                          onChange={(e) => { setMaxBitrate(Number(e.target.value || 0)); setBitrateProfile('custom'); }}
                          placeholder="Max"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Results fetched</p>
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
                            <SelectItem key={option} value={option}>{option === 'any' ? 'Any codec' : option}</SelectItem>
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
                            <SelectItem key={option} value={option}>{option === 'any' ? 'Any country' : option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Button variant="outline" className="h-10" onClick={handleResetFilters} disabled={isLoading}>
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
              No stations found for &quot;{searchTerm}&quot; with the selected filters.
            </div>
          )}

          {stations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {stations.length} matching station{stations.length === 1 ? '' : 's'}.
                </p>
                <div className="flex items-center gap-2">
                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger className="h-9 w-[160px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                        <SelectItem key={key} value={key}>Sort: {SORT_LABELS[key]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={handleAddAllToQueue}>
                    <ListPlus className="mr-1.5 h-4 w-4" />
                    Add All to Queue
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {visibleStations.map((station) => (
                  <RadioStationCard
                    key={station.stationuuid || `${station.name}-${station.bitrate}`}
                    station={station}
                    onPlay={handlePlayStation}
                    isLiked={isLiked(station.stationuuid)}
                    onToggleLike={() => toggleLike(toPlayerStation(station))}
                  />
                ))}
              </div>

              {visibleCount < sortedStations.length && (
                <div ref={sentinelRef} className="py-6 text-center text-sm text-muted-foreground">
                  Loading more...
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="directory">
          {isDirectoryLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          )}

          {!isDirectoryLoading && directoryError && (
            <p className="text-muted-foreground">Couldn't load the station directory right now — try again shortly.</p>
          )}

          {!isDirectoryLoading && !directoryError && directoryStations.length === 0 && (
            <p className="text-muted-foreground">No stations yet.</p>
          )}

          {!isDirectoryLoading && !directoryError && directoryStations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {directoryStations.map((station) => (
                <Link key={station.id} href={`/stations/${station.slug || station.id}`}>
                  <Card className="h-full hover:shadow-lg hover:border-accent/50 transition-all">
                    <CardHeader className="flex flex-row items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-base truncate">{station.name}</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <DiscoverPageContent />
    </React.Suspense>
  );
}
