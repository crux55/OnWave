'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { endBroadcast } from '@/lib/api';

// LiveBroadcastContext keeps the broadcaster's LiveKit Room connection and
// Web Audio mixer alive across a client-side route change — GoLiveDialog
// starts the broadcast, then navigates to /shows/[id], and this context is
// what lets that page pick up the same still-connected Room instead of the
// capture/mix/publish work being torn down with the dialog. Mirrors how
// PlayerContext keeps audio playing across navigation for the same reason.

interface LiveBroadcastState {
  showId: string | null;
  room: Room | null;
  isPublishing: boolean;
  micGain: number;
  desktopGain: number;
  hasDesktopAudio: boolean;
  // videoStream is kept for the broadcaster's own local camera preview
  // (BroadcasterView renders it directly, not via a LiveKit round-trip) —
  // see project_r#20.
  videoStream: MediaStream | null;
  isCameraOn: boolean;
}

interface LiveBroadcastContextValue extends LiveBroadcastState {
  startBroadcasting: (params: {
    showId: string;
    token: string;
    micStream: MediaStream;
    desktopStream: MediaStream | null;
    videoStream?: MediaStream | null;
    initialMicGain?: number;
    initialDesktopGain?: number;
  }) => Promise<void>;
  setMicGain: (value: number) => void;
  setDesktopGain: (value: number) => void;
  toggleCamera: () => void;
  endBroadcasting: () => Promise<void>;
}

const LiveBroadcastContext = createContext<LiveBroadcastContextValue | undefined>(undefined);

const deriveWsUrl = () =>
  (typeof window === 'undefined' ? '' : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/livekit-ws/');

export function LiveBroadcastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LiveBroadcastState>({
    showId: null,
    room: null,
    isPublishing: false,
    micGain: 1,
    desktopGain: 1,
    hasDesktopAudio: false,
    videoStream: null,
    isCameraOn: false,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const desktopGainNodeRef = useRef<GainNode | null>(null);
  const rawStreamsRef = useRef<{ mic: MediaStream; desktop: MediaStream | null; video: MediaStream | null }>({ mic: null as any, desktop: null, video: null });
  const videoPublicationRef = useRef<Awaited<ReturnType<Room['localParticipant']['publishTrack']>> | null>(null);

  const startBroadcasting = useCallback(async ({ showId, token, micStream, desktopStream, videoStream = null, initialMicGain = 1, initialDesktopGain = 1 }: {
    showId: string;
    token: string;
    micStream: MediaStream;
    desktopStream: MediaStream | null;
    videoStream?: MediaStream | null;
    initialMicGain?: number;
    initialDesktopGain?: number;
  }) => {
    const audioCtx = new AudioContext();
    const destination = audioCtx.createMediaStreamDestination();

    const micSource = audioCtx.createMediaStreamSource(micStream);
    const micGainNode = audioCtx.createGain();
    micGainNode.gain.value = initialMicGain;
    micSource.connect(micGainNode).connect(destination);

    let desktopGainNode: GainNode | null = null;
    const desktopAudioTracks = desktopStream?.getAudioTracks() ?? [];
    if (desktopAudioTracks.length > 0) {
      const desktopSource = audioCtx.createMediaStreamSource(new MediaStream(desktopAudioTracks));
      desktopGainNode = audioCtx.createGain();
      desktopGainNode.gain.value = initialDesktopGain;
      desktopSource.connect(desktopGainNode).connect(destination);
    }

    audioCtxRef.current = audioCtx;
    micGainNodeRef.current = micGainNode;
    desktopGainNodeRef.current = desktopGainNode;
    rawStreamsRef.current = { mic: micStream, desktop: desktopStream, video: videoStream };

    const room = new Room();
    await room.connect(deriveWsUrl(), token);
    const mixedTrack = destination.stream.getAudioTracks()[0];
    await room.localParticipant.publishTrack(mixedTrack, {
      name: 'mixed-audio',
      source: Track.Source.Microphone,
    });

    const videoTrack = videoStream?.getVideoTracks()[0] ?? null;
    if (videoTrack) {
      videoPublicationRef.current = await room.localParticipant.publishTrack(videoTrack, {
        name: 'camera',
        source: Track.Source.Camera,
      });
    }

    room.on(RoomEvent.Disconnected, () => {
      setState({ showId: null, room: null, isPublishing: false, micGain: 1, desktopGain: 1, hasDesktopAudio: false, videoStream: null, isCameraOn: false });
    });

    setState({
      showId,
      room,
      isPublishing: true,
      micGain: initialMicGain,
      desktopGain: initialDesktopGain,
      hasDesktopAudio: desktopAudioTracks.length > 0,
      videoStream,
      isCameraOn: !!videoTrack,
    });
  }, []);

  const setMicGain = useCallback((value: number) => {
    if (micGainNodeRef.current) {
      micGainNodeRef.current.gain.value = value;
    }
    setState(prev => ({ ...prev, micGain: value }));
  }, []);

  const setDesktopGain = useCallback((value: number) => {
    if (desktopGainNodeRef.current) {
      desktopGainNodeRef.current.gain.value = value;
    }
    setState(prev => ({ ...prev, desktopGain: value }));
  }, []);

  // Mutes/unmutes the published camera track without re-negotiating the
  // publication — a lightweight camera on/off toggle, not stop-and-restart.
  const toggleCamera = useCallback(() => {
    const publication = videoPublicationRef.current;
    if (!publication?.track) return;
    setState(prev => {
      const next = !prev.isCameraOn;
      if (next) {
        publication.track!.unmute();
      } else {
        publication.track!.mute();
      }
      return { ...prev, isCameraOn: next };
    });
  }, []);

  const endBroadcasting = useCallback(async () => {
    const { showId, room } = state;
    if (!showId) return;
    try {
      await endBroadcast(showId);
    } finally {
      room?.disconnect();
      rawStreamsRef.current.mic?.getTracks().forEach(t => t.stop());
      rawStreamsRef.current.desktop?.getTracks().forEach(t => t.stop());
      rawStreamsRef.current.video?.getTracks().forEach(t => t.stop());
      videoPublicationRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      setState({ showId: null, room: null, isPublishing: false, micGain: 1, desktopGain: 1, hasDesktopAudio: false, videoStream: null, isCameraOn: false });
    }
  }, [state]);

  return (
    <LiveBroadcastContext.Provider value={{ ...state, startBroadcasting, setMicGain, setDesktopGain, toggleCamera, endBroadcasting }}>
      {children}
    </LiveBroadcastContext.Provider>
  );
}

export function useLiveBroadcast() {
  const ctx = useContext(LiveBroadcastContext);
  if (!ctx) {
    throw new Error('useLiveBroadcast must be used within a LiveBroadcastProvider');
  }
  return ctx;
}
