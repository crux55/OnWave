'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchPBSShowsByDateRange, fetchFromApi, fetchMyFollows, followTarget, unfollowTarget, fetchAllShows as fetchAllInternalShows } from '@/lib/api';
import type { PBSShow, RadioStation, InternalShow } from '@/lib/types';
import { PBSShowCard } from '@/components/PBSShowCard';
import { InternalShowCard } from '@/components/InternalShowCard';
import { showStatus } from '@/lib/show-schedule';
import { Tv, Calendar, Clock, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlayer } from '@/contexts/PlayerContext';
import { useToast } from '@/hooks/use-toast';

// Picks the best playable stream for a station search result — prefers a
// direct stream over HLS (plain <audio> elements only play HLS natively in
// Safari, not Chrome/Firefox) and forces https so a redirect-based stream
// host (StreamTheWorld etc., which resolves http/https based on the scheme
// of the request) doesn't get blocked as mixed content on this https site.
function resolveBestStream(stations: RadioStation[]): RadioStation | null {
  const candidates = stations.filter(s => s.lastcheckok === 1);
  const best = candidates.find(s => !s.url_resolved?.includes('.m3u8')) || candidates[0] || stations[0] || null;
  if (!best) return null;
  const toHttps = (url: string | undefined) => url?.replace(/^http:\/\//i, 'https://');
  return { ...best, url: toHttps(best.url) ?? best.url, url_resolved: toHttps(best.url_resolved) ?? best.url_resolved };
}

// The scraper's station_name doesn't always match radio-browser's naming —
// verified against the live API: "NTS 1"/"NTS 2" either mismatch to an
// unrelated station ("Northants 1") or return nothing, while "NTS Radio 1"/
// "NTS Radio 2" resolve correctly. Everything else matches its own name.
const STATION_SEARCH_TERM_OVERRIDES: Record<string, string> = {
  'NTS 1': 'NTS Radio 1',
  'NTS 2': 'NTS Radio 2',
};

export default function ShowsPage() {
  const [allShows, setAllShows] = useState<PBSShow[]>([]);
  const [internalShows, setInternalShows] = useState<InternalShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Resolved live stream per station name — looked up on demand for
  // whichever stations actually have a live show right now, not just PBS.
  const [stationStreams, setStationStreams] = useState<Record<string, RadioStation | null>>({});
  const stationLookupsStarted = useRef<Set<string>>(new Set());
  const [followedShowNames, setFollowedShowNames] = useState<Set<string>>(new Set());
  const [togglingShowName, setTogglingShowName] = useState<string | null>(null);
  const [followedProgramIds, setFollowedProgramIds] = useState<Set<string>>(new Set());
  const [togglingProgramId, setTogglingProgramId] = useState<string | null>(null);
  const player = usePlayer();
  const { toast } = useToast();

  const { currentInternalShows, upcomingInternalShows } = useMemo(() => ({
    currentInternalShows: internalShows.filter(show => showStatus(show) === 'live'),
    upcomingInternalShows: internalShows.filter(show => showStatus(show) !== 'live' && showStatus(show) !== 'expired'),
  }), [internalShows]);

  const { currentShows, upcomingShows } = useMemo(() => ({
    currentShows: allShows.filter(show => show.status === 'live'),
    upcomingShows: allShows.filter(show => show.status === 'upcoming')
  }), [allShows]);

  const totalShowCount = allShows.length + internalShows.length;

  const stationNames = useMemo(() => {
    const names = new Set<string>();
    allShows.forEach(s => { if (s.station_name) names.add(s.station_name); });
    internalShows.forEach(s => { if (s.station_name) names.add(s.station_name); });
    return Array.from(names).sort();
  }, [allShows, internalShows]);

  useEffect(() => {
    const fetchAllShows = async () => {
      try {
        const pbsShows = await fetchPBSShowsByDateRange(30);
        const filteredShows = Array.isArray(pbsShows)
          ? pbsShows.filter(show => show.status !== 'expired')
          : [];
        setAllShows(filteredShows);
      } catch (error) {
        setAllShows([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllShows();

    fetchAllInternalShows()
      .then(setInternalShows)
      .catch(() => setInternalShows([]));

    if (localStorage.getItem('token')) {
      fetchMyFollows()
        .then(follows => {
          setFollowedShowNames(new Set(follows.filter(f => f.target_type === 'show').map(f => f.target_id)));
          setFollowedProgramIds(new Set(follows.filter(f => f.target_type === 'program').map(f => f.target_id)));
        })
        .catch(() => {
          setFollowedShowNames(new Set());
          setFollowedProgramIds(new Set());
        });
    }
  }, []);

  const handleToggleProgramFollow = useCallback(async (showId: string) => {
    if (!localStorage.getItem('token')) {
      toast({
        title: 'Login Required',
        description: 'Please log in to follow shows',
        action: <a href="/auth/login" className="text-primary hover:underline">Login here</a>,
        variant: 'destructive',
      });
      return;
    }

    setTogglingProgramId(showId);
    const alreadyFollowing = followedProgramIds.has(showId);
    try {
      if (alreadyFollowing) {
        await unfollowTarget('program', showId);
      } else {
        await followTarget('program', showId);
      }
      setFollowedProgramIds(prev => {
        const next = new Set(prev);
        if (alreadyFollowing) next.delete(showId); else next.add(showId);
        return next;
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update follow status',
        variant: 'destructive',
      });
    } finally {
      setTogglingProgramId(null);
    }
  }, [followedProgramIds, toast]);

  const handleToggleFollow = useCallback(async (showName: string) => {
    if (!localStorage.getItem('token')) {
      toast({
        title: 'Login Required',
        description: 'Please log in to follow shows',
        action: <a href="/auth/login" className="text-primary hover:underline">Login here</a>,
        variant: 'destructive',
      });
      return;
    }

    setTogglingShowName(showName);
    const alreadyFollowing = followedShowNames.has(showName);
    try {
      if (alreadyFollowing) {
        await unfollowTarget('show', showName);
      } else {
        await followTarget('show', showName);
      }
      setFollowedShowNames(prev => {
        const next = new Set(prev);
        if (alreadyFollowing) next.delete(showName); else next.add(showName);
        return next;
      });
      toast({
        title: alreadyFollowing ? 'Unfollowed' : 'Following',
        description: alreadyFollowing ? `You'll no longer see updates for "${showName}"` : `You'll see updates for "${showName}"`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update follow status',
        variant: 'destructive',
      });
    } finally {
      setTogglingShowName(null);
    }
  }, [followedShowNames, toast]);

  const liveStationNames = useMemo(() => {
    const names = new Set<string>();
    currentShows.forEach(s => { if (s.station_name) names.add(s.station_name); });
    return Array.from(names);
  }, [currentShows]);

  useEffect(() => {
    const namesToResolve = liveStationNames.filter(name => !stationLookupsStarted.current.has(name));
    if (namesToResolve.length === 0) return;
    namesToResolve.forEach(name => stationLookupsStarted.current.add(name));

    namesToResolve.forEach(async (name) => {
      try {
        const term = STATION_SEARCH_TERM_OVERRIDES[name] ?? name;
        const result = await fetchFromApi({ term });
        setStationStreams(prev => ({ ...prev, [name]: resolveBestStream(result.stations) }));
      } catch (error) {
        setStationStreams(prev => ({ ...prev, [name]: null }));
      }
    });
  }, [liveStationNames]);

  const handleTuneIn = useCallback((station: RadioStation) => {
    player.playStation(station);
  }, [player]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Radio className="h-16 w-16 text-accent animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Radio className="h-8 w-8 text-accent mr-3" />
          <h1 className="text-4xl font-bold tracking-tight">Radio Shows</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Discover and explore radio shows from all your favorite stations
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        {stationNames.map(name => (
          <Badge key={name} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Tv className="h-3 w-3 mr-1" />
            {name}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Now</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentShows.length + currentInternalShows.length}</div>
            <p className="text-xs text-muted-foreground">Currently broadcasting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingShows.length + upcomingInternalShows.length}</div>
            <p className="text-xs text-muted-foreground">Shows scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shows</CardTitle>
            <Radio className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShowCount}</div>
            <p className="text-xs text-muted-foreground">In the next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {(currentShows.length > 0 || currentInternalShows.length > 0) && (
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <Clock className="h-6 w-6 text-red-500 mr-3" />
            <h2 className="text-3xl font-semibold tracking-tight">Live Now</h2>
            <div className="ml-3">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {currentShows.map(show => {
              const stream = show.station_name ? stationStreams[show.station_name] : null;
              return (
                <PBSShowCard
                  key={show.id}
                  show={show}
                  onTuneIn={stream ? () => handleTuneIn(stream) : undefined}
                  isFollowing={followedShowNames.has(show.name)}
                  onToggleFollow={() => handleToggleFollow(show.name)}
                  isTogglingFollow={togglingShowName === show.name}
                />
              );
            })}
            {currentInternalShows.map(show => (
              <InternalShowCard
                key={show.id}
                show={show}
                isFollowing={followedProgramIds.has(show.id)}
                onToggleFollow={() => handleToggleProgramFollow(show.id)}
                isTogglingFollow={togglingProgramId === show.id}
              />
            ))}
          </div>
        </section>
      )}

      {(upcomingShows.length > 0 || upcomingInternalShows.length > 0) && (
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <Calendar className="h-6 w-6 text-blue-500 mr-3" />
            <h2 className="text-3xl font-semibold tracking-tight">Upcoming Shows</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {upcomingShows.map(show => (
              <PBSShowCard
                key={show.id}
                show={show}
                isFollowing={followedShowNames.has(show.name)}
                onToggleFollow={() => handleToggleFollow(show.name)}
                isTogglingFollow={togglingShowName === show.name}
              />
            ))}
            {upcomingInternalShows.map(show => (
              <InternalShowCard
                key={show.id}
                show={show}
                isFollowing={followedProgramIds.has(show.id)}
                onToggleFollow={() => handleToggleProgramFollow(show.id)}
                isTogglingFollow={togglingProgramId === show.id}
              />
            ))}
          </div>
        </section>
      )}

      {totalShowCount === 0 && !isLoading && (
        <div className="text-center py-16">
          <Radio className="h-24 w-24 text-muted-foreground/50 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold mb-2">No Shows Available</h3>
          <p className="text-lg text-muted-foreground mb-4">
            There are no radio shows scheduled at the moment.
          </p>
          <p className="text-sm text-muted-foreground">Check back later for updates!</p>
        </div>
      )}
    </div>
  );
}
