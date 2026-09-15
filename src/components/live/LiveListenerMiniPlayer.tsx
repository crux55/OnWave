'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Radio, X, Volume2, VolumeX } from 'lucide-react';
import { RoomEvent, RemoteTrack } from 'livekit-client';
import { useListenerBroadcast } from '@/contexts/ListenerBroadcastContext';
import { useMobileDock } from '@/contexts/MobileDockContext';
import { useReportHeight } from '@/hooks/use-report-height';
import { cn } from '@/lib/utils';

// Keeps a live broadcast's audio playing (video's audio included — this is
// deliberately audio-only, per project_r#20's "mini-player for video" spec)
// while the listener browses away from its /shows/[id] page. Hidden on that
// page itself, same reasoning as LiveBroadcastIndicator for broadcasters.
export function LiveListenerMiniPlayer() {
  const listener = useListenerBroadcast();
  const router = useRouter();
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  // Same mobile-dock-aware treatment as RadioPlayer (see that file) — this
  // stays mounted for the LiveKit audio subscription regardless, but on
  // mobile only occupies screen space while it's the dock's active tab.
  const dock = useMobileDock();
  const mobileDockActive = dock.activeTab === 'live' && !dock.minimized;
  const reportLiveHeight = useCallback((h: number) => dock.reportHeight('live', h), [dock.reportHeight]);
  const barRef = useReportHeight(mobileDockActive, reportLiveHeight);

  useEffect(() => {
    const room = listener.room;
    if (!room) return;
    const attach = (track: RemoteTrack) => {
      if (track.kind === 'audio' && audioRef.current) {
        track.attach(audioRef.current);
      }
    };
    const detach = (track: RemoteTrack) => {
      if (track.kind === 'audio') track.detach();
    };
    room.on(RoomEvent.TrackSubscribed, attach);
    room.on(RoomEvent.TrackUnsubscribed, detach);
    return () => {
      room.off(RoomEvent.TrackSubscribed, attach);
      room.off(RoomEvent.TrackUnsubscribed, detach);
    };
  }, [listener.room]);

  if (!listener.room || !listener.currentShowId || pathname === `/shows/${listener.currentShowId}`) {
    return null;
  }

  return (
    <div
      ref={barRef}
      className={cn(
        "fixed inset-x-0 z-40 flex items-center gap-3 border-t border-border bg-card px-4 py-2.5 shadow-lg",
        // Mobile: only visible as the dock's active "Live" tab content,
        // positioned just above its strip. Desktop: unchanged, always at
        // the bottom (there's no dock there to collide with).
        mobileDockActive ? "bottom-14" : "hidden",
        "sm:flex sm:bottom-0"
      )}
    >
      <audio ref={audioRef} autoPlay muted={isMuted} />
      <button
        onClick={() => router.push(`/shows/${listener.currentShowId}`)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <Radio className={cn('h-4 w-4 shrink-0 text-red-500', listener.connectionState === 'connected' && 'animate-pulse')} />
        <span className="truncate text-sm font-medium text-foreground">{listener.currentShowName}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {listener.connectionState === 'connecting' ? 'Connecting…' : listener.connectionState === 'failed' ? 'Disconnected' : 'Live'}
        </span>
      </button>
      <button
        onClick={() => setIsMuted(m => !m)}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <button
        onClick={listener.leaveShow}
        aria-label="Stop listening"
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
