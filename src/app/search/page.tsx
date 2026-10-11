'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { RadioStation } from '@/lib/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, AlertTriangle, SlidersHorizontal, GalleryHorizontal, Compass } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchFromApi, toPlayerStation, DISCOVER_GENRES } from '@/lib/api';
import { useLikedStations } from '@/hooks/use-liked-stations';
import { RadioStationCard } from '@/components/RadioStationCard';
import { SwipeableStationBrowser } from '@/components/discover/SwipeableStationBrowser';
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

const REVEAL_BATCH = 24;

function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const player = usePlayer();
  const { isLiked, toggleLike } = useLikedStations();

  // `q` is canonical; `search` is kept working as an alias for existing
  // links (Home's genre chips, bookmarks) rather than breaking them.
  const query = searchParams.get('q') ?? searchParams.get('search') ?? '';

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [visibleCount, setVisibleCount] = useState(REVEAL_BATCH);
  const abortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Driven entirely by the URL + filter state -- no mount-only guard and no
  // sessionStorage cache. The search box itself lives in the top bar now
  // (TopBarSearch), not on this page, so there's nothing else that could
  // fight this effect the way a live-typing input used to.
  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setStations([]);
      setError(null);
      return;
    }

    if (minBitrate > maxBitrate || minClicks > maxClicks || minTrend > maxTrend) {
      setError('Invalid filter range: minimum values must be less than or equal to maximum values.');
      return;
    }

    // Cancel any still-in-flight search before starting a new one, so a
    // fast filter change can't have an earlier, slower response land after
    // a newer one and clobber it with stale results.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    fetchFromApi({
      term,
      limit: String(limit),
      min_bitrate: String(minBitrate),
      max_bitrate: String(maxBitrate),
      min_clicks: String(minClicks),
      max_clicks: String(maxClicks),
      min_trend: String(minTrend),
      max_trend: String(maxTrend),
      ...(codec !== 'any' ? { codec } : {}),
      ...(country !== 'any' ? { country } : {}),
    }, controller.signal)
      .then((response) => {
        setStations(response.stations);
        setVisibleCount(REVEAL_BATCH);
      })
      .catch((e: any) => {
        if (e?.name === 'AbortError') return;
        setError(e.message || 'An unexpected error occurred while searching.');
        setStations([]);
      })
      .finally(() => {
        if (abortRef.current === controller) setIsLoading(false);
      });
  }, [query, limit, minBitrate, maxBitrate, minClicks, maxClicks, minTrend, maxTrend, codec, country]);

  // Keep limit/codec/country bookmarkable/shareable -- the search term
  // itself arrives via navigation (TopBarSearch, genre links), not typing
  // on this page, so it's carried through rather than written here.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (limit !== DEFAULT_FILTERS.limit) params.set('limit', String(limit));
    if (codec !== 'any') params.set('codec', codec);
    if (country !== 'any') params.set('country', country);
    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    // Deliberately excludes router/pathname/searchParams from deps -- only
    // the actual filter state (plus query, to keep it in the rewritten URL)
    // should trigger a rewrite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, limit, codec, country]);

  // Reveal more of the already-fetched results as the user scrolls near
  // the bottom of the grid -- a real backend offset/pagination API doesn't
  // exist yet (the search endpoint's "total" is just an echo of what it
  // already returned), so this is progressive rendering of one batch
  // already in hand, not fresh network pages.
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

  const handlePlayStation = (station: RadioStation) => {
    const playerStation = toPlayerStation(station);
    if (!playerStation.url) {
      setError('This station does not have a playable stream URL.');
      return;
    }
    player.playStation(playerStation);
  };

  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const handleOpenBrowser = () => {
    const playable = sortedStations.filter(s => s.url_resolved || s.url).map(toPlayerStation);
    if (playable.length === 0) return;
    player.playQueue(playable);
    setIsBrowserOpen(true);
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
  const trimmedQuery = query.trim();

  return (
    <div className="w-full">
      {!trimmedQuery ? (
        <div className="py-10 text-center">
          <SearchIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold text-foreground">Search for a station</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Use the search box above, or jump straight into a genre:
          </p>
          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
            {DISCOVER_GENRES.map((genre) => (
              <Link
                key={genre}
                href={`/search?q=${encodeURIComponent(genre)}`}
                className="rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-sm text-muted-foreground capitalize transition-colors hover:border-accent/40 hover:text-foreground"
              >
                {genre}
              </Link>
            ))}
          </div>
          <Button variant="outline" size="sm" asChild className="mt-6">
            <Link href="/discover">
              <Compass className="mr-2 h-4 w-4" /> Browse by mood instead
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Results for &quot;{trimmedQuery}&quot;
            </h1>
            {!isLoading && (
              <p className="text-sm text-muted-foreground">
                {stations.length} matching station{stations.length === 1 ? '' : 's'}
              </p>
            )}
          </header>

          <div className="mb-5 flex flex-wrap items-center gap-2">
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
            <Button
              variant={filtersOpen ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenBrowser} disabled={sortedStations.length === 0}>
              <GalleryHorizontal className="mr-1.5 h-4 w-4" />
              Browse All
            </Button>
          </div>

          {filtersOpen && (
            <div className="mb-6 space-y-4 rounded-xl border border-border bg-card/40 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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

              <Button variant="outline" className="h-10" onClick={handleResetFilters} disabled={isLoading}>
                Reset Advanced Filters
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading && stations.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">
              <SearchIcon className="mx-auto mb-2 h-12 w-12 animate-pulse" />
              Searching for stations...
            </div>
          )}

          {!isLoading && !error && stations.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">
              No stations found for &quot;{trimmedQuery}&quot; with the selected filters.
            </div>
          )}

          {stations.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
        </>
      )}

      {isBrowserOpen && (
        <SwipeableStationBrowser
          isLiked={isLiked}
          onToggleLike={(station) => toggleLike(station)}
          onClose={() => setIsBrowserOpen(false)}
        />
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
