'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RadioStation } from '@/lib/types';
import { fetchLikedStations, likeStation, unlikeStation } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function useLikedStations() {
  const [likedUuids, setLikedUuids] = useState<Set<string>>(new Set());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  const loadLiked = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      setLikedUuids(new Set());
      return;
    }
    setIsAuthenticated(true);
    fetchLikedStations()
      .then(stations => setLikedUuids(new Set(stations.map(s => s.stationuuid))))
      .catch(() => {
        // Not logged in or backend hiccup — leave the liked set empty rather
        // than surfacing an error for a background sync.
      });
  }, []);

  useEffect(() => {
    loadLiked();
    window.addEventListener('authChange', loadLiked);
    window.addEventListener('storage', loadLiked);
    // Every call site gets its own independent copy of likedUuids (this is
    // a plain hook, not a shared context) -- a like/unlike toggled from one
    // component (e.g. a station card) otherwise never reaches another
    // instance showing the same station elsewhere (e.g. the player bar's
    // heart), which is exactly the "heart stays lit on mobile" bug this
    // event fixes: every instance also refreshes on any instance's toggle.
    window.addEventListener('likedStationsChanged', loadLiked);
    return () => {
      window.removeEventListener('authChange', loadLiked);
      window.removeEventListener('storage', loadLiked);
      window.removeEventListener('likedStationsChanged', loadLiked);
    };
  }, [loadLiked]);

  const isLiked = useCallback((stationuuid: string) => likedUuids.has(stationuuid), [likedUuids]);

  const toggleLike = useCallback(async (station: RadioStation) => {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Log in to save stations you like.',
        variant: 'destructive',
      });
      return;
    }

    const uuid = station.stationuuid;
    const currentlyLiked = likedUuids.has(uuid);

    setLikedUuids(prev => {
      const next = new Set(prev);
      if (currentlyLiked) next.delete(uuid); else next.add(uuid);
      return next;
    });

    try {
      if (currentlyLiked) {
        await unlikeStation(uuid);
      } else {
        await likeStation(station);
      }
      // Tell every other useLikedStations() instance on the page to
      // refresh -- see the listener above for why this is needed.
      window.dispatchEvent(new Event('likedStationsChanged'));
    } catch (err) {
      // Roll back the optimistic update.
      setLikedUuids(prev => {
        const next = new Set(prev);
        if (currentlyLiked) next.add(uuid); else next.delete(uuid);
        return next;
      });
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Failed to update liked stations',
        variant: 'destructive',
      });
    }
  }, [isAuthenticated, likedUuids, toast]);

  return { isLiked, toggleLike, isAuthenticated };
}
