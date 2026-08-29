'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAllStations } from '@/lib/api';
import type { Station } from '@/lib/api';
import { Radio, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function StationsDirectoryPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllStations()
      .then(setStations)
      .catch(() => setStations([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="container mx-auto">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <Radio className="h-8 w-8 text-accent" />
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Stations
          </h1>
        </div>
        <p className="text-muted-foreground">Every station on OnWave — browse their shows, schedules, and badges.</p>
      </header>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && stations.length === 0 && (
        <p className="text-muted-foreground">No stations yet.</p>
      )}

      {!isLoading && stations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stations.map(station => (
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
    </div>
  );
}
