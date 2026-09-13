'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { fetchPBSShowsByDateRange, fetchAllShows as fetchAllInternalShows, fetchAllStations, type Station } from '@/lib/api';
import type { PBSShow, InternalShow } from '@/lib/types';
import { PBSShowCard } from '@/components/PBSShowCard';
import { InternalShowCard } from '@/components/InternalShowCard';
import { StationAvatar } from '@/components/StationAvatar';
import { showStatus } from '@/lib/show-schedule';
import { useShowFollows, showFollowKey } from '@/hooks/use-show-follows';
import { Calendar, Radio, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateStationRequestForm } from '@/components/CreateStationRequestForm';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ShowsPage() {
  const [allShows, setAllShows] = useState<PBSShow[]>([]);
  const [internalShows, setInternalShows] = useState<InternalShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [excludedStations, setExcludedStations] = useState<Set<string>>(new Set());
  const [showAllStationFilters, setShowAllStationFilters] = useState(false);
  // OnWave's own hosted-station directory — its own tab (rather than a
  // section at the top of Schedule) so a schedule-focused visit isn't
  // pushed down by an unrelated directory grid.
  const [stationDirectory, setStationDirectory] = useState<Station[]>([]);
  const [isStationDirectoryLoading, setIsStationDirectoryLoading] = useState(true);
  const [stationDirectoryError, setStationDirectoryError] = useState(false);
  const [isCreateStationOpen, setIsCreateStationOpen] = useState(false);
  const { toast } = useToast();
  const {
    followedShowNames, togglingShowName, toggleShowFollow,
    followedProgramIds, togglingProgramId, toggleProgramFollow,
  } = useShowFollows();

  const stationNames = useMemo(() => {
    const names = new Set<string>();
    allShows.forEach(s => { if (s.station_name) names.add(s.station_name); });
    internalShows.forEach(s => { if (s.station_name) names.add(s.station_name); });
    return Array.from(names).sort();
  }, [allShows, internalShows]);

  const toggleStationFilter = useCallback((name: string) => {
    setExcludedStations(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  const isStationVisible = useCallback(
    (stationName: string | null | undefined) => !stationName || !excludedStations.has(stationName),
    [excludedStations]
  );

  const { currentInternalShows, upcomingInternalShows } = useMemo(() => ({
    currentInternalShows: internalShows.filter(show => showStatus(show) === 'live' && isStationVisible(show.station_name)),
    upcomingInternalShows: internalShows.filter(show => showStatus(show) !== 'live' && showStatus(show) !== 'expired' && isStationVisible(show.station_name)),
  }), [internalShows, isStationVisible]);

  const { currentShows, upcomingShows } = useMemo(() => ({
    currentShows: allShows.filter(show => show.status === 'live' && isStationVisible(show.station_name)),
    upcomingShows: allShows.filter(show => show.status === 'upcoming' && isStationVisible(show.station_name))
  }), [allShows, isStationVisible]);

  // "Live now" isn't browsed from here anymore (that's /live's job) — this
  // count only feeds the banner below, pointing there.
  const liveNowCount = currentShows.length + currentInternalShows.length;
  const upcomingCount = upcomingShows.length + upcomingInternalShows.length;
  const totalShowCount = liveNowCount + upcomingCount;

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

    fetchAllStations()
      .then(setStationDirectory)
      .catch(() => setStationDirectoryError(true))
      .finally(() => setIsStationDirectoryLoading(false));
  }, []);

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

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="stations">Stations</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          {liveNowCount > 0 && (
            <Link href="/live" className="mb-8 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/5 p-4 transition-colors hover:bg-red-500/10">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="font-medium text-foreground">
                  {liveNowCount} show{liveNowCount === 1 ? '' : 's'} live right now
                </span>
              </div>
              <span className="flex items-center gap-1 text-sm text-accent">
                See what's live <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-8">
            {(showAllStationFilters ? stationNames : stationNames.slice(0, 12)).map(name => {
              const isActive = !excludedStations.has(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleStationFilter(name)}
                  aria-pressed={isActive}
                  title={isActive ? `Hide ${name}` : `Show ${name}`}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                >
                  <Badge
                    variant="outline"
                    className={
                      isActive
                        ? 'bg-accent/10 text-accent border-accent/30 hover:bg-accent/20 cursor-pointer'
                        : 'bg-transparent text-muted-foreground border-border opacity-50 hover:opacity-75 cursor-pointer'
                    }
                  >
                    <Radio className="h-3 w-3 mr-1" />
                    {name}
                  </Badge>
                </button>
              );
            })}
            {stationNames.length > 12 && (
              <button
                type="button"
                onClick={() => setShowAllStationFilters(prev => !prev)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
              >
                <Badge variant="outline" className="bg-transparent text-muted-foreground border-border cursor-pointer hover:bg-muted/40">
                  {showAllStationFilters ? 'Show fewer' : `+${stationNames.length - 12} more`}
                </Badge>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 mb-8 max-w-md">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Upcoming</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold">{upcomingCount}</div>
                <p className="hidden sm:block text-xs text-muted-foreground">Shows scheduled</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Shows</CardTitle>
                <Radio className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold">{totalShowCount}</div>
                <p className="hidden sm:block text-xs text-muted-foreground">In the next 30 days</p>
              </CardContent>
            </Card>
          </div>

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
                    isFollowing={followedShowNames.has(showFollowKey(show))}
                    onToggleFollow={() => toggleShowFollow(show)}
                    isTogglingFollow={togglingShowName === showFollowKey(show)}
                  />
                ))}
                {upcomingInternalShows.map(show => (
                  <InternalShowCard
                    key={show.id}
                    show={show}
                    isFollowing={followedProgramIds.has(show.id)}
                    onToggleFollow={() => toggleProgramFollow(show.id)}
                    isTogglingFollow={togglingProgramId === show.id}
                  />
                ))}
              </div>
            </section>
          )}

          {totalShowCount === 0 && (
            <div className="text-center py-16">
              <Radio className="h-24 w-24 text-muted-foreground/50 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold mb-2">No Shows Available</h3>
              <p className="text-lg text-muted-foreground mb-4">
                There are no radio shows scheduled at the moment.
              </p>
              <p className="text-sm text-muted-foreground">Check back later for updates!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stations">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">OnWave Stations</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!localStorage.getItem('token')) {
                  toast({
                    title: 'Login Required',
                    description: 'Please log in to request a station',
                    action: <a href="/auth/login" className="text-primary hover:underline">Login here</a>,
                    variant: 'destructive',
                  });
                  return;
                }
                setIsCreateStationOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Don&apos;t see your station? Create one
            </Button>
          </div>
          <Dialog open={isCreateStationOpen} onOpenChange={setIsCreateStationOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Station</DialogTitle>
              </DialogHeader>
              <CreateStationRequestForm onSubmitted={() => setIsCreateStationOpen(false)} />
            </DialogContent>
          </Dialog>
          {isStationDirectoryLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          )}
          {!isStationDirectoryLoading && stationDirectoryError && (
            <p className="text-muted-foreground">Couldn&apos;t load the station directory right now — try again shortly.</p>
          )}
          {!isStationDirectoryLoading && !stationDirectoryError && stationDirectory.length === 0 && (
            <p className="text-muted-foreground">No stations yet.</p>
          )}
          {!isStationDirectoryLoading && !stationDirectoryError && stationDirectory.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stationDirectory.map((station) => (
                <Link key={station.id} href={`/stations/${station.slug || station.id}`}>
                  <Card className="h-full hover:shadow-lg hover:border-accent/50 transition-all">
                    <CardHeader className="flex flex-row items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                        <StationAvatar name={station.name} seed={station.id} className="text-xs" />
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
