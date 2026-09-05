'use client';

import { useEffect, useState } from 'react';
import { Radio, Loader2 } from 'lucide-react';

import { InternalShowCard } from '@/components/InternalShowCard';
import { fetchAllShows } from '@/lib/api';
import type { InternalShow } from '@/lib/types';

export default function LivePage() {
  const [liveShows, setLiveShows] = useState<InternalShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllShows()
      .then(shows => setLiveShows(shows.filter(s => s.status === 'live')))
      .catch(() => setLiveShows([]))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center gap-2">
        <Radio className="h-6 w-6 text-red-500" />
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Live Now</h1>
      </div>

      {liveShows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Radio className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">Nothing live right now</h2>
          <p className="max-w-md text-muted-foreground">
            DJs and stations broadcast here when they go live — check back soon, or follow a station on its page to hear about it.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {liveShows.map(show => (
            <InternalShowCard key={show.id} show={show} />
          ))}
        </div>
      )}
    </div>
  );
}
