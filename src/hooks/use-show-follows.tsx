'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchMyFollows, followTarget, unfollowTarget } from '@/lib/api';
import type { PBSShow } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Scraped shows are followed by name, not a stable id (scraped_shows.id
// isn't stable across refreshes — see PBSRepository.RefreshShowsForStation).
// Multiple stations can share a same-named show ("Breakfast", "Drive"), so
// the follow key is station-qualified — see project_r#13.
export function showFollowKey(show: PBSShow): string {
  return `${show.station_name ?? ''}::${show.name}`;
}

// Follow state + toggling for both external (PBS-scraped, followed by
// name) and internal (OnWave "program", followed by id) shows — shared by
// /shows and /live so both pages track the same follow state consistently
// instead of each keeping its own copy.
export function useShowFollows() {
  const { toast } = useToast();
  const [followedShowNames, setFollowedShowNames] = useState<Set<string>>(new Set());
  const [togglingShowName, setTogglingShowName] = useState<string | null>(null);
  const [followedProgramIds, setFollowedProgramIds] = useState<Set<string>>(new Set());
  const [togglingProgramId, setTogglingProgramId] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    fetchMyFollows()
      .then(follows => {
        setFollowedShowNames(new Set(follows.filter(f => f.target_type === 'show').map(f => f.target_id)));
        setFollowedProgramIds(new Set(follows.filter(f => f.target_type === 'program').map(f => f.target_id)));
      })
      .catch(() => {
        setFollowedShowNames(new Set());
        setFollowedProgramIds(new Set());
      });
  }, []);

  const requireLogin = useCallback(() => {
    toast({
      title: 'Login Required',
      description: 'Please log in to follow shows',
      action: <a href="/auth/login" className="text-primary hover:underline">Login here</a>,
      variant: 'destructive',
    });
  }, [toast]);

  const toggleShowFollow = useCallback(async (show: PBSShow) => {
    if (!localStorage.getItem('token')) { requireLogin(); return; }
    const key = showFollowKey(show);
    setTogglingShowName(key);
    const alreadyFollowing = followedShowNames.has(key);
    try {
      if (alreadyFollowing) await unfollowTarget('show', key); else await followTarget('show', key);
      setFollowedShowNames(prev => {
        const next = new Set(prev);
        if (alreadyFollowing) next.delete(key); else next.add(key);
        return next;
      });
      toast({
        title: alreadyFollowing ? 'Unfollowed' : 'Following',
        description: alreadyFollowing ? `You'll no longer see updates for "${show.name}"` : `You'll see updates for "${show.name}"`,
      });
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update follow status', variant: 'destructive' });
    } finally {
      setTogglingShowName(null);
    }
  }, [followedShowNames, toast, requireLogin]);

  const toggleProgramFollow = useCallback(async (showId: string) => {
    if (!localStorage.getItem('token')) { requireLogin(); return; }
    setTogglingProgramId(showId);
    const alreadyFollowing = followedProgramIds.has(showId);
    try {
      if (alreadyFollowing) await unfollowTarget('program', showId); else await followTarget('program', showId);
      setFollowedProgramIds(prev => {
        const next = new Set(prev);
        if (alreadyFollowing) next.delete(showId); else next.add(showId);
        return next;
      });
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update follow status', variant: 'destructive' });
    } finally {
      setTogglingProgramId(null);
    }
  }, [followedProgramIds, toast, requireLogin]);

  return {
    followedShowNames,
    togglingShowName,
    toggleShowFollow,
    followedProgramIds,
    togglingProgramId,
    toggleProgramFollow,
  };
}
