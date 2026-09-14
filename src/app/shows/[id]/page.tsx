'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { Loader2, Radio, CalendarClock, CircleOff, Play, Pause, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LiveBroadcastPlayer } from '@/components/live/LiveBroadcastPlayer';
import { LiveChatPanel } from '@/components/live/LiveChatPanel';
import { ClipsList } from '@/components/live/ClipsList';
import { useLiveBroadcast } from '@/contexts/LiveBroadcastContext';
import { useListenerBroadcast } from '@/contexts/ListenerBroadcastContext';
import { useResolvedStationStream } from '@/hooks/use-external-live-streams';
import { usePlayer } from '@/contexts/PlayerContext';
import { fetchShow, closeRoom, fetchShowClips } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { InternalShow, RadioStation, Token } from '@/lib/types';

// External (PBS-scraped) show rooms (project_r#30) and user-opened rooms
// (project_r#33) both have no OnWave broadcast to render — nobody publishes
// into the LiveKit room, so LiveBroadcastPlayer would just sit empty.
// Instead: a plain play/pause against the station's stream, same mechanism
// "Tune In" already uses elsewhere, with the chat panel alongside it
// exactly like a real broadcast.
function ExternalRoomTuneIn({ show, isOwnRoom, onClosed }: { show: InternalShow; isOwnRoom: boolean; onClosed: () => void }) {
  const player = usePlayer();
  const { toast } = useToast();
  const [isClosing, setIsClosing] = useState(false);
  // A room (project_r#33) already knows its exact stream — no need to
  // re-resolve by name the way a #30 external room (tied to a currently-
  // live scraped show, not a specific stored URL) still has to.
  const resolvedStream = useResolvedStationStream(show.room_station_url ? undefined : show.external_station_name);
  const stream: RadioStation | null = show.room_station_url
    ? {
        stationuuid: `room-${show.id}`, name: show.external_station_name || 'Room', url: show.room_station_url,
        url_resolved: show.room_station_url, homepage: '', favicon: '', has_valid_favicon: false, tags: '', country: '',
        countrycode: '', state: '', language: '', languagecodes: '', bitrate: 0, codec: '', votes: 0, clickcount: 0,
        clicktrend: 0, lastchangetime: '', lastchangetime_iso8601: '', lastchecktime: '', lastchecktime_iso8601: '',
        lastcheckok: 1, lastcheckoktime: '', lastcheckoktime_iso8601: '', lastlocalchecktime: '', lastlocalchecktime_iso8601: '',
        ssl_error: 0, has_extended_info: false, serveruuid: `room-${show.id}`, changeuuid: '', iso_3166_2: '', hls: 0,
      }
    : resolvedStream;
  const isThisStation = player.currentStation?.name === stream?.name;
  const isThisPlaying = player.isPlaying && isThisStation;
  // Only show the error if it actually belongs to this stream -- the
  // player is shared app-wide, so a stale error from tuning into
  // something else elsewhere shouldn't show up here.
  const thisStreamError = isThisStation && !player.isPlaying ? player.playbackError : null;

  const handleClose = async () => {
    setIsClosing(true);
    try {
      await closeRoom(show.id);
      toast({ title: 'Room closed' });
      onClosed();
    } catch (error: any) {
      toast({ title: "Couldn't close room", description: error.message, variant: 'destructive' });
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card/60 p-8 text-center h-full min-h-[16rem]">
      {show.is_room ? <Users className="h-8 w-8 text-muted-foreground" /> : <Radio className="h-8 w-8 text-muted-foreground" />}
      <div>
        <p className="font-medium text-foreground">{show.external_station_name}</p>
        <p className="text-sm text-muted-foreground">Listening happens in your player, chat happens here.</p>
      </div>
      <Button
        onClick={() => stream && player.playStation(stream)}
        disabled={!stream}
        className="gap-2"
      >
        {!stream ? <Loader2 className="h-4 w-4 animate-spin" /> : isThisPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {!stream ? 'Finding stream…' : isThisPlaying ? 'Playing' : 'Tune In'}
      </Button>
      {thisStreamError && (
        <p className="text-xs text-destructive">Couldn't play this stream ({thisStreamError}) — try again or check back later.</p>
      )}
      {isOwnRoom && (
        <Button variant="outline" size="sm" onClick={handleClose} disabled={isClosing} className="text-destructive hover:text-destructive">
          {isClosing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <X className="mr-2 h-3.5 w-3.5" />}
          Close Room
        </Button>
      )}
    </div>
  );
}

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
  const listenerBroadcast = useListenerBroadcast();
  useEffect(() => {
    if (show?.status === 'live' && !isOwnBroadcast && show.id) {
      listenerBroadcast.joinShow(show.id, show.name, show.is_video);
    }
    // Deliberately not calling leaveShow() on unmount — navigating away is
    // meant to minimize into LiveListenerMiniPlayer, not disconnect. See
    // project_r#20.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show?.status, show?.id, isOwnBroadcast]);
  const isListeningToThisShow = listenerBroadcast.currentShowId === show?.id;
  const listenerRoom = isListeningToThisShow ? listenerBroadcast.room : null;
  const listenerConnectionState = isListeningToThisShow ? listenerBroadcast.connectionState : 'connecting';
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
            {show.external_station_name ? (
              <ExternalRoomTuneIn
                show={show}
                isOwnRoom={!!show.is_room && (isAdmin || show.dj_id === currentUserId)}
                onClosed={load}
              />
            ) : (
              <LiveBroadcastPlayer
                show={show}
                isAdmin={isAdmin}
                isOwnBroadcast={isOwnBroadcast}
                listenerRoom={listenerRoom}
                listenerConnectionState={listenerConnectionState}
              />
            )}
          </div>
          {/* no_interaction is set at go-live time for a broadcast that
              shouldn't carry chat (e.g. a partner stream whose own
              audience has no way to see or take part in it) -- external
              rooms (#30) are a different feature and always chat-enabled,
              so this only ever suppresses the panel for a real OnWave
              broadcast. See project_r#32. */}
          {!show.no_interaction && (
            <div className="lg:w-80 lg:shrink-0 h-[28rem] lg:h-auto">
              <LiveChatPanel show={show} room={activeRoom} isModerator={isModerator} currentUserId={currentUserId} />
            </div>
          )}
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

      <ClipsList fetcher={useCallback(() => fetchShowClips(show.id), [show.id])} />
    </div>
  );
}
