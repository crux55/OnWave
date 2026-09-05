'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { Loader2, Radio, CalendarClock, CircleOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LiveBroadcastPlayer } from '@/components/live/LiveBroadcastPlayer';
import { useLiveBroadcast } from '@/contexts/LiveBroadcastContext';
import { fetchShow } from '@/lib/api';
import type { InternalShow, Token } from '@/lib/types';

// Live shows are polled rather than pushed — M4 is deliberately audio-only
// with no chat/websocket layer yet (that's M5), so a plain refetch is what
// keeps viewer_count and an admin's kill-switch/room_finished transition
// visible to everyone already on this page.
const LIVE_POLL_MS = 10000;

export default function ShowDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const liveBroadcast = useLiveBroadcast();

  const [show, setShow] = useState<InternalShow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const tokenString = localStorage.getItem('token');
    if (!tokenString) return;
    try {
      const decoded = jwt_decode<Token>(JSON.parse(tokenString).token);
      setIsAdmin(!!decoded.is_admin);
    } catch {
      // Not logged in / bad token — isAdmin stays false, page still works for listening.
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const result = await fetchShow(params.id);
      setShow(result);
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (show?.status !== 'live') return;
    const interval = setInterval(load, LIVE_POLL_MS);
    return () => clearInterval(interval);
  }, [show?.status, load]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !show) {
    return (
      <div className="container mx-auto max-w-2xl py-16 text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Show Not Found</h2>
        <Button onClick={() => router.push('/shows')}>Back to Shows</Button>
      </div>
    );
  }

  const isOwnBroadcast = liveBroadcast.showId === show.id;

  return (
    <div className="container mx-auto max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">{show.name}</h1>
        {show.description && <p className="text-muted-foreground mt-1">{show.description}</p>}
      </div>

      {show.status === 'live' && (
        <LiveBroadcastPlayer show={show} isAdmin={isAdmin} isOwnBroadcast={isOwnBroadcast} />
      )}

      {show.status === 'scheduled' && (
        <div className="rounded-xl border border-border bg-card/60 p-8 text-center space-y-3">
          <CalendarClock className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">This show hasn't gone live yet.</p>
        </div>
      )}

      {show.status === 'ended' && (
        <div className="rounded-xl border border-border bg-card/60 p-8 text-center space-y-3">
          <Radio className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">This broadcast has ended.</p>
        </div>
      )}

      {show.status === 'terminated' && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-8 text-center space-y-3">
          <CircleOff className="h-8 w-8 text-destructive mx-auto" />
          <p className="font-medium text-foreground">This broadcast was ended by an admin.</p>
          {show.termination_reason && (
            <p className="text-sm text-muted-foreground">Reason: {show.termination_reason}</p>
          )}
        </div>
      )}
    </div>
  );
}
