'use client';

import { useEffect, useState } from 'react';
import { fetchNowPlaying } from '@/lib/api';

// Polls for the currently-playing track while a stream is active. Matches
// the backend's own 20s cache window -- polling faster would just re-fetch
// the same cached value. See project_r#23.
const POLL_MS = 20000;

export function useNowPlaying(streamUrl: string | null | undefined, isActive: boolean): string | null {
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!streamUrl || !isActive) {
      setTitle(null);
      return;
    }

    let cancelled = false;
    const poll = () => {
      fetchNowPlaying(streamUrl).then(result => {
        if (!cancelled) setTitle(result.healthy ? result.title : null);
      }).catch(() => {
        if (!cancelled) setTitle(null);
      });
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamUrl, isActive]);

  return title;
}
