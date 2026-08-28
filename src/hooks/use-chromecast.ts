'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// The Cast Web Sender SDK types aren't in DOM lib — declare just what's used.
declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    cast?: any;
    chrome?: any;
  }
}

// loadCastFramework=1 is required for the SDK to expose window.cast.framework
// (the CAF namespace this hook uses) — without it only the legacy
// window.chrome.cast API loads.
const CAST_SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

let sdkLoadPromise: Promise<boolean> | null = null;

function loadCastSdk(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.cast?.framework) return Promise.resolve(true);
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve) => {
    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (!isAvailable || !window.cast?.framework) {
        resolve(false);
        return;
      }
      try {
        window.cast.framework.CastContext.getInstance().setOptions({
          receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
        });
        resolve(true);
      } catch {
        resolve(false);
      }
    };

    const script = document.createElement('script');
    script.src = CAST_SDK_URL;
    script.async = true;
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

// radio-browser.info's `codec` field values, mapped to the MIME type the
// Cast default media receiver needs to pick the right decoder. An incorrect
// content type (e.g. declaring an AAC+ stream as audio/mpeg) lets
// session.loadMedia() resolve successfully while the receiver silently fails
// to decode the audio — the sender sees no error at all.
function codecToContentType(codec: string | undefined): string {
  switch ((codec || '').toUpperCase().replace(/[^A-Z0-9]/g, '')) {
    case 'AAC':
    case 'AACP':
      return 'audio/aac';
    case 'OGG':
    case 'VORBIS':
    case 'OPUS':
      return 'audio/ogg';
    case 'FLAC':
      return 'audio/flac';
    case 'WMA':
      return 'audio/x-ms-wma';
    case 'MP3':
    default:
      return 'audio/mpeg';
  }
}

export function useChromecast(streamUrl: string | undefined, stationName: string | undefined, codec: string | undefined) {
  const [available, setAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [isRemotePaused, setIsRemotePaused] = useState(false);
  const sessionListenerRef = useRef<((event: any) => void) | null>(null);
  const remotePlayerControllerRef = useRef<any>(null);
  const { toast } = useToast();

  // The remote player mirrors and controls the cast session's own playback
  // state (play/pause), independent of the local <audio> element — so
  // pausing/resuming while casting commands the TV/speaker, not a silent
  // local element, and stays in sync if playback is controlled from
  // elsewhere (e.g. a Google Home app).
  useEffect(() => {
    if (!available) return;

    const remotePlayer = new window.cast.framework.RemotePlayer();
    const remotePlayerController = new window.cast.framework.RemotePlayerController(remotePlayer);
    remotePlayerControllerRef.current = remotePlayerController;

    const onPausedChanged = () => setIsRemotePaused(remotePlayer.isPaused);
    remotePlayerController.addEventListener(
      window.cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
      onPausedChanged
    );

    return () => {
      remotePlayerController.removeEventListener(
        window.cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
        onPausedChanged
      );
      remotePlayerControllerRef.current = null;
    };
  }, [available]);

  const toggleRemotePlayback = useCallback(() => {
    remotePlayerControllerRef.current?.playOrPause();
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadCastSdk().then((ok) => {
      if (cancelled || !ok) return;
      setAvailable(true);

      const context = window.cast.framework.CastContext.getInstance();
      const onSessionStateChanged = (event: any) => {
        const session = context.getCurrentSession();
        const connected = !!session && event.sessionState !== window.cast.framework.SessionState.SESSION_ENDED;
        setIsCasting(connected);
        setDeviceName(connected ? session?.getCastDevice()?.friendlyName ?? null : null);
      };
      sessionListenerRef.current = onSessionStateChanged;
      context.addEventListener(
        window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        onSessionStateChanged
      );
    });

    return () => {
      cancelled = true;
      if (sessionListenerRef.current && window.cast?.framework) {
        window.cast.framework.CastContext.getInstance().removeEventListener(
          window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
          sessionListenerRef.current
        );
      }
    };
  }, []);

  const loadCurrentMedia = useCallback(() => {
    const session = window.cast?.framework?.CastContext.getInstance().getCurrentSession();
    if (!session || !streamUrl) return;

    // The cast receiver is a separate physical device with no notion of
    // "relative to the current page" — a relative URL (e.g. our own
    // /api/stream-proxy/* routes) has to be resolved to absolute before
    // handing it off, or the receiver can't fetch it at all.
    const absoluteStreamUrl = new URL(streamUrl, window.location.origin).href;

    const mediaInfo = new window.chrome.cast.media.MediaInfo(absoluteStreamUrl, codecToContentType(codec));
    mediaInfo.streamType = window.chrome.cast.media.StreamType.LIVE;
    mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title = stationName || 'OnWave';

    const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
    session.loadMedia(request).catch(() => {
      // Casting session exists but the receiver rejected this stream (format/
      // CORS/etc.) — leave the session open, just surface it so it's not a
      // silent failure.
      toast({
        title: 'Cast failed',
        description: `${stationName || 'This station'} couldn't be played on the cast device.`,
        variant: 'destructive',
      });
    });
  }, [streamUrl, stationName, codec, toast]);

  const toggleCast = useCallback(async () => {
    if (!available) return;
    const context = window.cast.framework.CastContext.getInstance();
    const existingSession = context.getCurrentSession();

    if (existingSession) {
      existingSession.endSession(true);
      return;
    }

    try {
      await context.requestSession();
      loadCurrentMedia();
    } catch {
      // User closed the device picker without selecting one — not an error.
    }
  }, [available, loadCurrentMedia]);

  // If the station changes while already casting, load the new stream.
  useEffect(() => {
    if (isCasting) loadCurrentMedia();
  }, [isCasting, loadCurrentMedia]);

  return { available, isCasting, deviceName, toggleCast, isRemotePaused, toggleRemotePlayback };
}
