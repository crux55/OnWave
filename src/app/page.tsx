'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchHomePageSections, fetchDiscoverSection, fetchLikedStations, likedStationToRadioStation, extractPreferredGenres, DISCOVER_GENRES, fetchAllShows } from '@/lib/api';
import type { RadioStation, InternalShow } from '@/lib/types';
import { RadioStationCard } from '@/components/RadioStationCard';
import { InternalShowCard } from '@/components/InternalShowCard';
import { usePlayer } from '@/contexts/PlayerContext';
import { useLikedStations } from '@/hooks/use-liked-stations';
import { RefreshCw, Sparkles, Shuffle, Heart, Play, Flame, Radio } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SafeImage } from '@/components/SafeImage';
import { cn } from '@/lib/utils';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const HOME_CACHE_KEY = 'onwave:home-cache';
const HOME_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

interface HomeCache {
  timestamp: number;
  featuredStations: RadioStation[];
  featuredGenre: string;
  mostListens: RadioStation[];
  discoverStations: RadioStation[];
  discoverGenre: string;
  discoverStations2: RadioStation[];
  discoverGenre2: string;
  discoverStations3: RadioStation[];
  discoverGenre3: string;
  discoverStations4: RadioStation[];
  discoverGenre4: string;
  likedStations: RadioStation[];
  preferredGenres: string[];
}

interface HeroCardProps {
  station: RadioStation;
  onPlay: (station: RadioStation) => void;
  isLiked: boolean;
  onToggleLike: (station: RadioStation) => void;
}

const HeroCard: React.FC<HeroCardProps> = ({ station, onPlay, isLiked, onToggleLike }) => (
  <div
    className="relative mb-12 overflow-hidden rounded-2xl border border-border/60"
    style={{
      background:
        'radial-gradient(120% 140% at 15% 0%, hsl(var(--accent-2) / 0.32), transparent 60%), ' +
        'radial-gradient(120% 140% at 90% 100%, hsl(var(--accent) / 0.28), transparent 55%), ' +
        'hsl(var(--card))',
    }}
  >
    {/* Station art, scaled up and softened, gives each pick its own look
        instead of the same two gradient blobs regardless of station. */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <SafeImage
        src={station.favicon}
        alt=""
        width={600}
        height={600}
        className="absolute -right-16 -top-16 h-[140%] w-[70%] scale-110 object-cover opacity-[0.18] blur-2xl sm:w-1/2"
        fallback={<span />}
      />
    </div>

    <div className="relative flex min-h-[200px] items-end gap-5 p-6 sm:min-h-[260px] sm:p-8">
      <div className="hidden h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg sm:block sm:h-32 sm:w-32">
        <SafeImage
          src={station.favicon}
          alt={`${station.name} logo`}
          width={128}
          height={128}
          className="h-full w-full object-cover"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/25 to-[hsl(var(--accent-2))]/20">
              <Radio className="h-10 w-10 text-muted-foreground" />
            </div>
          }
        />
      </div>

      <div className="flex w-full flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">Today&rsquo;s Pick</span>
          <h2 className="font-display mt-1 truncate text-2xl font-bold text-foreground sm:text-4xl">{station.name}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {(station.tags?.split(',')[0]?.trim() || 'Unknown')} &bull; {station.country || 'Unknown'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => onToggleLike(station)}
            aria-label={isLiked ? `Unlike ${station.name}` : `Like ${station.name}`}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/60 text-muted-foreground transition-colors hover:text-accent"
          >
            <Heart className={cn('h-4 w-4', isLiked && 'fill-accent text-accent')} />
          </button>
          <button
            onClick={() => onPlay(station)}
            aria-label={`Play ${station.name}`}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform hover:scale-105"
          >
            <Play className="h-5 w-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

interface StationSectionProps {
  title: string;
  stations: RadioStation[];
  onPlay: (station: RadioStation) => void;
  icon?: React.ElementType;
  emptyMessage?: string;
  action?: React.ReactNode;
  isLoading?: boolean;
  isLiked?: (stationuuid: string) => boolean;
  onToggleLike?: (station: RadioStation) => void;
}

const StationSection: React.FC<StationSectionProps> = ({
  title, stations, onPlay, icon: Icon,
  emptyMessage = 'No stations available in this section right now.',
  action,
  isLoading = false,
  isLiked,
  onToggleLike,
}) => {
  const header = (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        {Icon && <Icon className="h-5 w-5 text-accent mr-2.5" />}
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );

  if (isLoading) {
    return (
      <section className="mb-10">
        {header}
        <div className="flex gap-4 overflow-x-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-40 shrink-0 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!stations || stations.length === 0) {
    return (
      <section className="mb-10">
        {header}
        <p className="text-muted-foreground">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="mb-10">
      {header}
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {stations.map(station => (
          <div key={station.stationuuid} className="w-36 shrink-0 snap-start sm:w-40">
            <RadioStationCard
              station={station}
              onPlay={onPlay}
              isLiked={isLiked?.(station.stationuuid)}
              onToggleLike={onToggleLike}
              variant="row"
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default function HomePage() {
  const [featuredStations, setFeaturedStations] = useState<RadioStation[]>([]);
  const [featuredGenre, setFeaturedGenre] = useState<string>('');
  const [mostListens, setMostListens] = useState<RadioStation[]>([]);
  const [discoverStations, setDiscoverStations] = useState<RadioStation[]>([]);
  const [discoverGenre, setDiscoverGenre] = useState<string>('');
  const [discoverStations2, setDiscoverStations2] = useState<RadioStation[]>([]);
  const [discoverGenre2, setDiscoverGenre2] = useState<string>('');
  const [discoverStations3, setDiscoverStations3] = useState<RadioStation[]>([]);
  const [discoverGenre3, setDiscoverGenre3] = useState<string>('');
  const [discoverStations4, setDiscoverStations4] = useState<RadioStation[]>([]);
  const [discoverGenre4, setDiscoverGenre4] = useState<string>('');
  const [likedStations, setLikedStations] = useState<RadioStation[]>([]);
  const [preferredGenres, setPreferredGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);
  const [liveShows, setLiveShows] = useState<InternalShow[]>([]);
  const player = usePlayer();
  const { isLiked, toggleLike } = useLikedStations();

  // Independent of the main station-data load below — a slow/failed fetch
  // here shouldn't hold up or break the rest of the page.
  useEffect(() => {
    fetchAllShows()
      .then(shows => setLiveShows(shows.filter(s => s.status === 'live')))
      .catch(() => setLiveShows([]));
  }, []);

  useEffect(() => {
    // A fresh cached snapshot skips the network round-trip entirely so
    // switching back to Home from another tab is instant, not another full
    // fetch chain against the backend/radio-browser.info every single time.
    try {
      const cached = sessionStorage.getItem(HOME_CACHE_KEY);
      if (cached) {
        const parsed: HomeCache = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < HOME_CACHE_MAX_AGE_MS) {
          setFeaturedStations(parsed.featuredStations);
          setFeaturedGenre(parsed.featuredGenre);
          setMostListens(parsed.mostListens);
          setDiscoverStations(parsed.discoverStations);
          setDiscoverGenre(parsed.discoverGenre);
          setDiscoverStations2(parsed.discoverStations2 ?? []);
          setDiscoverGenre2(parsed.discoverGenre2 ?? '');
          setDiscoverStations3(parsed.discoverStations3 ?? []);
          setDiscoverGenre3(parsed.discoverGenre3 ?? '');
          setDiscoverStations4(parsed.discoverStations4 ?? []);
          setDiscoverGenre4(parsed.discoverGenre4 ?? '');
          setLikedStations(parsed.likedStations ?? []);
          setPreferredGenres(parsed.preferredGenres ?? []);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Corrupt or inaccessible cache — fall through to a normal fetch.
    }

    const load = async () => {
      setIsLoading(true);
      try {
        // Liked stations first, since the Discover row's genre pick needs
        // to know what the viewer already likes before it can be biased
        // toward it — fetchHomePageSections/fetchDiscoverSection below
        // depend on this resolving first, which does add one extra
        // round-trip to the initial load (liked-stations is small/fast,
        // but not zero) in exchange for genuine personalization.
        const liked = await fetchLikedStations().catch(() => []);
        const likedAsStations = liked.map(likedStationToRadioStation);
        const preferred = extractPreferredGenres(likedAsStations);
        setLikedStations(likedAsStations);
        setPreferredGenres(preferred);

        // Four independent Discover rows instead of two — replacing the
        // old "Most Listened"/"Trending Now" sections (both near-identical
        // click-based rankings on a catalog this size) with more of what
        // the page is actually for: turning up stations you didn't already
        // know to look for.
        const emptyDiscover = { stations: [] as RadioStation[], genre: '' };
        const [sections, discover2, discover3, discover4] = await Promise.all([
          fetchHomePageSections(preferred),
          fetchDiscoverSection([], 8, preferred).catch(() => emptyDiscover),
          fetchDiscoverSection([], 8, preferred).catch(() => emptyDiscover),
          fetchDiscoverSection([], 8, preferred).catch(() => emptyDiscover),
        ]);
        const featured = sections.featured;
        setFeaturedStations(featured);
        setFeaturedGenre(sections.featuredGenre);
        setMostListens(sections.popular);
        setDiscoverStations(sections.discover);
        setDiscoverGenre(sections.discoverGenre);
        setDiscoverStations2(discover2.stations);
        setDiscoverGenre2(discover2.genre);
        setDiscoverStations3(discover3.stations);
        setDiscoverGenre3(discover3.genre);
        setDiscoverStations4(discover4.stations);
        setDiscoverGenre4(discover4.genre);

        try {
          const cache: HomeCache = {
            timestamp: Date.now(),
            featuredStations: featured,
            featuredGenre: sections.featuredGenre,
            mostListens: sections.popular,
            discoverStations: sections.discover,
            discoverGenre: sections.discoverGenre,
            discoverStations2: discover2.stations,
            discoverGenre2: discover2.genre,
            discoverStations3: discover3.stations,
            discoverGenre3: discover3.genre,
            discoverStations4: discover4.stations,
            discoverGenre4: discover4.genre,
            likedStations: likedAsStations,
            preferredGenres: preferred,
          };
          sessionStorage.setItem(HOME_CACHE_KEY, JSON.stringify(cache));
        } catch {
          // sessionStorage unavailable (private browsing, quota) — fine to skip.
        }
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
      const result = await fetchDiscoverSection([], 8, preferredGenres);
      setDiscoverStations(result.stations);
      setDiscoverGenre(result.genre);

      try {
        const cached = sessionStorage.getItem(HOME_CACHE_KEY);
        if (cached) {
          const parsed: HomeCache = JSON.parse(cached);
          parsed.discoverStations = result.stations;
          parsed.discoverGenre = result.genre;
          sessionStorage.setItem(HOME_CACHE_KEY, JSON.stringify(parsed));
        }
      } catch {
        // Not fatal — worst case the next cached load shows the pre-shuffle discover set.
      }
    } catch (error) {
      console.error('Shuffle failed:', error);
    } finally {
      setIsShuffling(false);
    }
  }, [preferredGenres]);

  const handlePlayStation = (station: RadioStation) => {
    player.playStation(station);
  };

  const heroStation = featuredStations[0];
  const editorsPicksRest = featuredStations.slice(1);

  return (
    <div className="container mx-auto">
      <header className="mb-10 text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight text-foreground">
          Tune into something new.
        </h1>
        <p className="text-xl text-muted-foreground mt-3 max-w-2xl mx-auto">
          Curated radio stations, discovered fresh every visit.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-semibold mb-3 text-foreground">Browse by Genre</h2>
        <div className="flex flex-wrap gap-2">
          {DISCOVER_GENRES.map(genre => (
            <Link
              key={genre}
              href={`/search?search=${encodeURIComponent(genre)}`}
              className="inline-block rounded-full border border-border bg-card/40 px-3 py-1 text-sm font-medium capitalize text-foreground"
            >
              {genre}
            </Link>
          ))}
        </div>
      </section>

      {!isLoading && heroStation && (
        <HeroCard station={heroStation} onPlay={handlePlayStation} isLiked={isLiked(heroStation.stationuuid)} onToggleLike={toggleLike} />
      )}
      {isLoading && <Skeleton className="mb-12 h-[200px] w-full rounded-2xl sm:h-[260px]" />}

      {liveShows.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-foreground flex items-center gap-2">
              <Radio className="h-5 w-5 text-red-500" /> Live Now
            </h2>
            <Link href="/live" className="text-sm font-medium text-accent hover:underline">See all</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {liveShows.slice(0, 8).map(show => (
              <div key={show.id} className="w-56 shrink-0 snap-start">
                <InternalShowCard show={show} />
              </div>
            ))}
          </div>
        </section>
      )}

      <StationSection
        title={featuredGenre ? `Editor's Picks: ${capitalize(featuredGenre)}` : "Editor's Picks"}
        stations={editorsPicksRest}
        onPlay={handlePlayStation}
        icon={Sparkles}
        isLoading={isLoading}
        isLiked={isLiked}
        onToggleLike={toggleLike}
        emptyMessage="No featured stations available right now."
      />

      {likedStations.length > 0 ? (
        <StationSection
          title="Liked Stations"
          stations={likedStations}
          onPlay={handlePlayStation}
          icon={Heart}
          isLoading={isLoading}
          isLiked={isLiked}
          onToggleLike={toggleLike}
        />
      ) : (
        // No likes yet — this slot shouldn't just be empty. Substitute
        // already-fetched popular stations rather than leaving nothing
        // here until the viewer actually likes something.
        <StationSection
          title="Popular Right Now"
          stations={mostListens.slice(0, 6)}
          onPlay={handlePlayStation}
          icon={Flame}
          isLoading={isLoading}
          isLiked={isLiked}
          onToggleLike={toggleLike}
          emptyMessage="Nothing popular to show right now — check back soon."
        />
      )}

      <StationSection
        title={discoverGenre ? `Discover: ${capitalize(discoverGenre)}` : 'Discover'}
        stations={discoverStations}
        onPlay={handlePlayStation}
        icon={Shuffle}
        isLoading={isLoading}
        isLiked={isLiked}
        onToggleLike={toggleLike}
        emptyMessage="Nothing to discover right now. Try shuffling!"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShuffle}
            disabled={isShuffling || isLoading}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-4 text-muted-foreground hover:border-accent/40 hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isShuffling ? 'animate-spin' : ''}`} />
            Shuffle
          </Button>
        }
      />

      {discoverStations2.length > 0 && (
        <StationSection
          title={discoverGenre2 ? `Discover: ${capitalize(discoverGenre2)}` : 'Discover More'}
          stations={discoverStations2}
          onPlay={handlePlayStation}
          icon={Shuffle}
          isLoading={isLoading}
          isLiked={isLiked}
          onToggleLike={toggleLike}
        />
      )}

      {discoverStations3.length > 0 && (
        <StationSection
          title={discoverGenre3 ? `Discover: ${capitalize(discoverGenre3)}` : 'Discover More'}
          stations={discoverStations3}
          onPlay={handlePlayStation}
          icon={Shuffle}
          isLoading={isLoading}
          isLiked={isLiked}
          onToggleLike={toggleLike}
        />
      )}

      {discoverStations4.length > 0 && (
        <StationSection
          title={discoverGenre4 ? `Discover: ${capitalize(discoverGenre4)}` : 'Discover More'}
          stations={discoverStations4}
          onPlay={handlePlayStation}
          icon={Shuffle}
          isLoading={isLoading}
          isLiked={isLiked}
          onToggleLike={toggleLike}
        />
      )}
    </div>
  );
}
