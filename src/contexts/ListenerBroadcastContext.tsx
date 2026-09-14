'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { joinBroadcast } from '@/lib/api';

// Owns the listener's LiveKit Room connection for whichever live broadcast
// they're currently tuned into, at the app root rather than scoped to
// /shows/[id] — so navigating away from that page no longer silently drops
// the connection. This is what lets a minimized mini-player keep audio
// (and video's audio) playing while browsing elsewhere, the listener-side
// counterpart to how LiveBroadcastContext already keeps a *broadcaster's*
// own session alive across navigation. See project_r#20's "mini-player for
// video" requirement — audio-only broadcasts get the same benefit for free.
//
// Deliberately a single active connection: joining a new show disconnects
// whatever was previously playing, mirroring how PlayerContext's station
// playback already works (starting one station stops another).

export type ListenerConnectionState = 'connecting' | 'connected' | 'failed';

interface ListenerBroadcastState {
  currentShowId: string | null;
  currentShowName: string | null;
  currentShowIsVideo: boolean;
  room: Room | null;
  connectionState: ListenerConnectionState;
}

interface ListenerBroadcastContextValue extends ListenerBroadcastState {
  joinShow: (showId: string, showName: string, isVideo: boolean) => void;
  leaveShow: () => void;
}

const initialState: ListenerBroadcastState = {
  currentShowId: null,
  currentShowName: null,
  currentShowIsVideo: false,
  room: null,
  connectionState: 'connecting',
};

const ListenerBroadcastContext = createContext<ListenerBroadcastContextValue | undefined>(undefined);

const deriveWsUrl = () =>
  (typeof window === 'undefined' ? '' : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/livekit-ws/');

export function ListenerBroadcastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ListenerBroadcastState>(initialState);
  const roomRef = useRef<Room | null>(null);
  // Bumped on every join/leave so a slow-resolving connect() from an
  // already-superseded call can tell it's stale and back out instead of
  // clobbering whatever's connected by the time it finishes.
  const generationRef = useRef(0);

  const leaveShow = useCallback(() => {
    generationRef.current++;
    roomRef.current?.disconnect();
    roomRef.current = null;
    setState(initialState);
  }, []);

  const joinShow = useCallback((showId: string, showName: string, isVideo: boolean) => {
    if (roomRef.current && state.currentShowId === showId) {
      // Already connected to this exact show — nothing to do. Covers the
      // common case of navigating back to the show you're minimized-
      // listening to.
      return;
    }

    roomRef.current?.disconnect();
    roomRef.current = null;

    const myGeneration = ++generationRef.current;
    setState({ currentShowId: showId, currentShowName: showName, currentShowIsVideo: isVideo, room: null, connectionState: 'connecting' });

    const r = new Room();
    r.on(RoomEvent.Disconnected, () => {
      if (generationRef.current !== myGeneration) return;
      roomRef.current = null;
      setState(initialState);
    });

    (async () => {
      try {
        const { token } = await joinBroadcast(showId);
        if (generationRef.current !== myGeneration) {
          r.disconnect();
          return;
        }
        await r.connect(deriveWsUrl(), token);
        if (generationRef.current !== myGeneration) {
          r.disconnect();
          return;
        }
        roomRef.current = r;
        setState(prev => (prev.currentShowId === showId ? { ...prev, room: r, connectionState: 'connected' } : prev));
      } catch {
        if (generationRef.current !== myGeneration) return;
        setState(prev => (prev.currentShowId === showId ? { ...prev, connectionState: 'failed' } : prev));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentShowId]);

  return (
    <ListenerBroadcastContext.Provider value={{ ...state, joinShow, leaveShow }}>
      {children}
    </ListenerBroadcastContext.Provider>
  );
}

export function useListenerBroadcast() {
  const ctx = useContext(ListenerBroadcastContext);
  if (!ctx) {
    throw new Error('useListenerBroadcast must be used within a ListenerBroadcastProvider');
  }
  return ctx;
}
