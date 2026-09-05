'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { Loader2, Radio, CalendarClock, CircleOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LiveBroadcastPlayer } from '@/components/live/LiveBroadcastPlayer';
import { LiveChatPanel } from '@/components/live/LiveChatPanel';
import { useLiveBroadcast } from '@/contexts/LiveBroadcastContext';
import { useListenerRoom } from '@/hooks/use-listener-room';
import { fetchShow } from '@/lib/api';
import type { InternalShow, Token } from '@/lib/types';

// Live shows are polled rather than pushed for status/viewer_count — chat
// itself is realtime (over the LiveKit room's data channel), but a show
// going live/ending/getting terminated needs its own signal, and a plain
// refetch is simpler than a second push channel for something this
// infrequent.
const LIVE_POLL_MS = 10000;

export default function ShowDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const liveBroadcast = useLiveBroadcast();

  const [show, setShow] = useState<InternalShow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  useEffect(() => {
    const tokenString = localStorage.getItem('token');
    if (!tokenString) return;
    try {
      const decoded = jwt_decode<Token>(JSON.parse(tokenString).token);
      setIsAdmin(!!decoded.is_admin);
      setCurrentUserId(decoded.user_id);
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

  const isOwnBroadcast = liveBroadcast.showId === show?.id;
  const { room: listenerRoom, connectionState: listenerConnectionState } = useListenerRoom(
    params.id,
    show?.status === 'live' && !isOwnBroadcast
  );
  const activeRoom = isOwnBroadcast ? liveBroadcast.room : listenerRoom;
  // Station members who aren't the current broadcaster don't get the
  // moderator UI here yet — the backend enforces the real permission
  // regardless, this is just the frontend's (simplified) show/hide gate.
  const isModerator = isAdmin || isOwnBroadcast;

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

  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">{show.name}</h1>
        {show.description && <p className="text-muted-foreground mt-1">{show.description}</p>}
      </div>

      {show.status === 'live' && (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="lg:flex-1 lg:min-w-0">
            <LiveBroadcastPlayer
              show={show}
              isAdmin={isAdmin}
              isOwnBroadcast={isOwnBroadcast}
              listenerRoom={listenerRoom}
              listenerConnectionState={listenerConnectionState}
            />
          </div>
          <div className="lg:w-80 lg:shrink-0 h-[28rem] lg:h-auto">
            <LiveChatPanel show={show} room={activeRoom} isModerator={isModerator} currentUserId={currentUserId} />
          </div>
        </div>
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
