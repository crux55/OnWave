'use client';

import { useEffect, useState } from 'react';
import { Scissors } from 'lucide-react';

import type { Clip } from '@/lib/types';

interface ClipsListProps {
  title?: string;
  fetcher: () => Promise<Clip[]>;
}

/** Renders whatever clips a fetcher returns, or nothing at all if there are none — a show/station/DJ with no clips yet shouldn't show an empty section. */
export function ClipsList({ title = 'Clips', fetcher }: ClipsListProps) {
  const [clipsList, setClipsList] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetcher().then(result => { if (!cancelled) setClipsList(result); }).finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [fetcher]);

  if (isLoading || clipsList.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Scissors className="h-4 w-4" /> {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clipsList.map(clip => (
          <div key={clip.id} className="rounded-lg border border-border bg-card/60 overflow-hidden">
            <video src={clip.media_url} controls playsInline className="w-full aspect-video bg-black" />
            <div className="p-3 space-y-0.5">
              <p className="text-sm font-medium text-foreground truncate">{clip.show_name}</p>
              <p className="text-xs text-muted-foreground">
                Clipped by {clip.username} · {new Date(clip.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
