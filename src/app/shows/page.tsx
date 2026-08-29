'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchPBSShowsByDateRange, fetchFromApi, fetchMyFollows, followTarget, unfollowTarget } from '@/lib/api';
import type { PBSShow, RadioStation } from '@/lib/types';
import { PBSShowCard } from '@/components/PBSShowCard';
import { Tv, Calendar, Clock, Radio, Play, Pause, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePlayer } from '@/contexts/PlayerContext';
import { useToast } from '@/hooks/use-toast';

export default function ShowsPage() {
  const [allShows, setAllShows] = useState<PBSShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pbsStation, setPbsStation] = useState<RadioStation | null>(null);
  const [isLoadingStation, setIsLoadingStation] = useState(true);
  const [followedShowNames, setFollowedShowNames] = useState<Set<string>>(new Set());
  const [togglingShowName, setTogglingShowName] = useState<string | null>(null);
  const player = usePlayer();
  const { toast } = useToast();

  const { currentShows, upcomingShows } = useMemo(() => ({
    currentShows: allShows.filter(show => show.status === 'live'),
    upcomingShows: allShows.filter(show => show.status === 'upcoming')
  }), [allShows]);

  const isPbsPlaying = player.isPlaying && !!pbsStation && player.currentStation?.stationuuid === pbsStation.stationuuid;

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

    if (localStorage.getItem('token')) {
      fetchMyFollows()
        .then(follows => setFollowedShowNames(new Set(follows.filter(f => f.target_type === 'show').map(f => f.target_id))))
        .catch(() => setFollowedShowNames(new Set()));
    }
  }, []);

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

  useEffect(() => {
    const loadPbsStation = async () => {
      try {
        const result = await fetchFromApi({ term: 'PBS FM' });
        // Prefer a direct stream over HLS (.m3u8) — plain <audio> elements
        // only play HLS natively in Safari, not Chrome/Firefox.
        const candidates = result.stations.filter(s => s.lastcheckok === 1);
        const best =
          candidates.find(s => !s.url_resolved?.includes('.m3u8')) ||
          candidates[0] ||
          result.stations[0] ||
          null;
        // Some redirect-based stream hosts (e.g. StreamTheWorld, which serves
        // PBS FM) resolve to an http:// or https:// final stream depending on
        // the scheme of the *request*, not a fixed value. Since this site is
        // served over https, force https on the initial request so the
        // resulting stream isn't blocked as mixed content.
        const toHttps = (url: string | undefined) => url?.replace(/^http:\/\//i, 'https://');
        const secureBest = best
          ? { ...best, url: toHttps(best.url) ?? best.url, url_resolved: toHttps(best.url_resolved) ?? best.url_resolved }
          : null;
        setPbsStation(secureBest);
      } catch (error) {
        setPbsStation(null);
      } finally {
        setIsLoadingStation(false);
      }
    };

    loadPbsStation();
  }, []);

  const handleListenLive = useCallback(() => {
    if (!pbsStation) return;
    if (isPbsPlaying) {
      player.togglePlayback();
    } else {
      player.playStation(pbsStation);
    }
  }, [pbsStation, isPbsPlaying, player]);

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
        <Button
          onClick={handleListenLive}
          disabled={isLoadingStation || !pbsStation}
          className="gap-2"
        >
          {isLoadingStation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPbsPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isPbsPlaying ? 'Playing PBS FM' : 'Listen Live to PBS FM'}
        </Button>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Tv className="h-3 w-3 mr-1" />
          PBS Radio
        </Badge>
        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
          More stations coming soon...
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Now</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentShows.length}</div>
            <p className="text-xs text-muted-foreground">Currently broadcasting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingShows.length}</div>
            <p className="text-xs text-muted-foreground">Shows scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shows</CardTitle>
            <Radio className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allShows.length}</div>
            <p className="text-xs text-muted-foreground">In the next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {currentShows.length > 0 && (
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
            {currentShows.map(show => (
              <PBSShowCard
                key={show.id}
                show={show}
                onTuneIn={handleListenLive}
                isTunedIn={isPbsPlaying}
                isFollowing={followedShowNames.has(show.name)}
                onToggleFollow={() => handleToggleFollow(show.name)}
                isTogglingFollow={togglingShowName === show.name}
              />
            ))}
          </div>
        </section>
      )}

      {upcomingShows.length > 0 && (
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
          </div>
        </section>
      )}

      {allShows.length === 0 && !isLoading && (
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
