'use client';

import React, { useState, useEffect } from 'react';
import { fetchPBSShowsByDateRange } from '@/lib/api';
import type { PBSShow } from '@/lib/types';
import { PBSShowCard } from '@/components/PBSShowCard';
import { Tv, Calendar, Clock, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ShowsPage() {
  const [allShows, setAllShows] = useState<PBSShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllShows = async () => {
      try {
        const pbsShows = await fetchPBSShowsByDateRange(30);
        
        let allShowsData: PBSShow[] = [];
        
        if (Array.isArray(pbsShows)) {
          allShowsData = [...pbsShows.filter((show) => show.status !== 'expired')];
        } else {
          console.warn('PBS shows response is not an array:', pbsShows);
        }
        setAllShows(allShowsData);
      } catch (error) {
        console.error('Error fetching shows:', error);
        setAllShows([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllShows();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Radio className="h-16 w-16 text-accent mx-auto mb-4 animate-pulse" />
            <p className="text-lg text-muted-foreground">Loading shows...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentShows = allShows.filter(show => show.status === 'live');
  const upcomingShows = allShows.filter(show => show.status === 'upcoming');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Radio className="h-8 w-8 text-accent mr-3" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Radio Shows</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Discover and explore radio shows from all your favorite stations
        </p>
      </div>

      {/* Show Sources Info */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Tv className="h-3 w-3 mr-1" />
          PBS Radio
        </Badge>
        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
          More stations coming soon...
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Now</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentShows.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently broadcasting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingShows.length}</div>
            <p className="text-xs text-muted-foreground">
              Shows scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shows</CardTitle>
            <Radio className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allShows.length}</div>
            <p className="text-xs text-muted-foreground">
              In the next 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Shows Section */}
      {currentShows.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <Clock className="h-6 w-6 text-red-500 mr-3" />
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Live Now</h2>
            <div className="ml-3">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {currentShows.map(show => (
              <PBSShowCard key={show.id} show={show} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Shows Section */}
      {upcomingShows.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <Calendar className="h-6 w-6 text-blue-500 mr-3" />
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Upcoming Shows</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {upcomingShows.map(show => (
              <PBSShowCard key={show.id} show={show} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {allShows.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <Radio className="h-24 w-24 text-muted-foreground/50 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-foreground mb-2">No Shows Available</h3>
          <p className="text-lg text-muted-foreground mb-4">
            There are no radio shows scheduled at the moment.
          </p>
          <p className="text-sm text-muted-foreground">
            Check back later for updates!
          </p>
        </div>
      )}
    </div>
  );
}
