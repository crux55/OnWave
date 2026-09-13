'use client';

import { useCallback, useEffect, useState } from 'react';
import { Radio, Loader2 } from 'lucide-react';

import { InternalShowCard } from '@/components/InternalShowCard';
import { PBSShowCard } from '@/components/PBSShowCard';
import { fetchAllLiveNow } from '@/lib/api';
import { useExternalLiveStreams } from '@/hooks/use-external-live-streams';
import { useShowFollows, showFollowKey } from '@/hooks/use-show-follows';
import { usePlayer } from '@/contexts/PlayerContext';
import type { InternalShow, PBSShow } from '@/lib/types';

// The single source of truth for "what's live on OnWave right now" —
// merges OnWave-native live shows with external (PBS-scraped) shows
// currently live, so a station's own live programming shows up here
// alongside our own DJs/stations, not just on the Shows schedule.
export default function LivePage() {
  const [internalLive, setInternalLive] = useState<InternalShow[]>([]);
  const [externalLive, setExternalLive] = useState<PBSShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const player = usePlayer();

  const stationStreams = useExternalLiveStreams(externalLive);
  const {
    followedShowNames, togglingShowName, toggleShowFollow,
    followedProgramIds, togglingProgramId, toggleProgramFollow,
  } = useShowFollows();

  useEffect(() => {
    fetchAllLiveNow()
      .then(({ internal, external }) => {
        setInternalLive(internal);
        setExternalLive(external);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleTuneIn = useCallback((show: PBSShow) => {
    const stream = show.station_name ? stationStreams[show.station_name] : null;
    if (stream) player.playStation(stream);
  }, [player, stationStreams]);

  const totalLive = internalLive.length + externalLive.length;

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

      {totalLive === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Radio className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">Nothing live right now</h2>
          <p className="max-w-md text-muted-foreground">
            DJs, stations, and shows broadcast here when they go live — check back soon, or follow a station or show to hear about it.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {internalLive.map(show => (
            <InternalShowCard
              key={show.id}
              show={show}
              isFollowing={followedProgramIds.has(show.id)}
              onToggleFollow={() => toggleProgramFollow(show.id)}
              isTogglingFollow={togglingProgramId === show.id}
            />
          ))}
          {externalLive.map(show => (
            <PBSShowCard
              key={show.id}
              show={show}
              onTuneIn={stationStreams[show.station_name ?? ''] ? () => handleTuneIn(show) : undefined}
              isFollowing={followedShowNames.has(showFollowKey(show))}
              onToggleFollow={() => toggleShowFollow(show)}
              isTogglingFollow={togglingShowName === showFollowKey(show)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
