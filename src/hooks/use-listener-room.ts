'use client';

import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { useToast } from '@/hooks/use-toast';
import { joinBroadcast } from '@/lib/api';

const deriveWsUrl = () =>
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/livekit-ws/';

export type ListenerConnectionState = 'connecting' | 'connected' | 'failed';

// One Room connection per listener, shared between audio playback and
// chat — LiveKit only allows one active session per identity per room, so
// a second connection for chat would silently disconnect the first one
// used for audio. Owning the connection here, one level above both
// LiveBroadcastPlayer and LiveChatPanel, is what lets them share it.
export function useListenerRoom(showId: string, enabled: boolean) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connectionState, setConnectionState] = useState<ListenerConnectionState>('connecting');
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (!enabled) {
      setRoom(null);
      return;
    }

    let cancelled = false;
    const r = new Room();
    r.on(RoomEvent.Disconnected, () => {
      if (!cancelled) setConnectionState('failed');
    });

    (async () => {
      try {
        const { token } = await joinBroadcast(showId);
        if (cancelled) return;
        await r.connect(deriveWsUrl(), token);
        if (cancelled) return;
        setRoom(r);
        setConnectionState('connected');
      } catch (error: any) {
        if (!cancelled) {
          setConnectionState('failed');
          toastRef.current({ title: "Couldn't join stream", description: error.message, variant: 'destructive' });
        }
      }
    })();

    return () => {
      cancelled = true;
      r.disconnect();
      setRoom(null);
    };
  }, [showId, enabled]);

  return { room, connectionState };
}
