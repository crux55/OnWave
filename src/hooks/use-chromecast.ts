'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useToast } from '@/hooks/use-toast';
import { getProxiedFaviconUrl } from '@/lib/utils';

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

// CastContext is a genuine global singleton (one real cast session for the
// whole page/app), but useChromecast() is called independently by multiple
// mounted components at once (RadioPlayer + MaximizedPlayerDialog — the
// player bar stays mounted, just CSS-hidden, under the maximized view) —
// each with its own React state, each observing the same shared session.
// Rather than trying to reason about which component "owns" sending a
// given LOAD, or distinguishing why a particular call happened, this pair
// tracks the last stream actually sent and when, at the module level —
// shared across every hook instance — so a second call for the identical
// URL within a short window is a guaranteed no-op regardless of which
// instance or effect triggered it. Time-windowed rather than keyed off the
// CAF session's identity deliberately — the exact shape/availability of a
// session-id accessor on cast.framework.CastSession isn't something to
// stake correctness on, whereas "the same URL requested again a few
// milliseconds later" is exactly the failure signature actually observed
// (three kWebMediaPlayerCreated events within 33ms on a Shield receiver
// for one cast start, project_r/OnWave#39) and needs no such assumption.
// A genuine intentional re-cast of the same station is never seconds-fast
// like that, so the window is generous without risking a legitimate load.
const DUPLICATE_LOAD_WINDOW_MS = 3000;
let lastLoadedStreamUrl: string | null = null;
let lastLoadedAt = 0;

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
        // Unset (the default until the custom receiver is registered and
        // its App ID added to prod's env) keeps every cast on Google's
        // Default Media Receiver exactly as before — an unpublished custom
        // receiver only works on Cast devices explicitly registered under
        // the developer's own Google Cast account, so this must never be
        // hardcoded to it, or casting would break for everyone else.
        window.cast.framework.CastContext.getInstance().setOptions({
          receiverApplicationId:
            process.env.NEXT_PUBLIC_CAST_RECEIVER_APP_ID || window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
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

export function useChromecast(
  streamUrl: string | undefined,
  stationName: string | undefined,
  codec: string | undefined,
  favicon?: string,
  tags?: string
) {
  const [available, setAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  // deviceName is display-only (used in one toast string) but was in
  // loadCurrentMedia's dependency array — since it updates in the same
  // handler that flips isCasting true, that changed the callback's
  // identity moments after mount, contributing to the duplicate-LOAD
  // pattern documented in full above lastLoadedStreamUrl/lastLoadedAt.
  // Reading it via a ref decouples the callback's identity from this state
  // without needing a stale closure — necessary, but not sufficient on its
  // own, which is why that module-level dedup exists too.
  const deviceNameRef = useRef<string | null>(null);
  useEffect(() => { deviceNameRef.current = deviceName; }, [deviceName]);
  const [isRemotePaused, setIsRemotePaused] = useState(false);
  const sessionListenerRef = useRef<((event: any) => void) | null>(null);
  const remotePlayerControllerRef = useRef<any>(null);
  const remotePlayerRef = useRef<any>(null);
  const stalledCastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    remotePlayerRef.current = remotePlayer;

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
      remotePlayerRef.current = null;
    };
  }, [available]);

  const toggleRemotePlayback = useCallback(() => {
    remotePlayerControllerRef.current?.playOrPause();
  }, []);

  useEffect(() => {
    return () => {
      if (stalledCastTimeoutRef.current) clearTimeout(stalledCastTimeoutRef.current);
    };
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

  const loadCurrentMedia = useCallback(async () => {
    const session = window.cast?.framework?.CastContext.getInstance().getCurrentSession();
    if (!session || !streamUrl) return;

    // The cast receiver is a separate physical device with no notion of
    // "relative to the current page" — a relative URL (e.g. our own
    // /api/stream-proxy/* routes) has to be resolved to absolute before
    // handing it off, or the receiver can't fetch it at all.
    const absoluteStreamUrl = new URL(streamUrl, window.location.origin).href;

    // Dedup against the module-level state above -- if some other mounted
    // instance (or an earlier effect run in this one) already sent this
    // exact URL moments ago, sending it again only makes the receiver
    // tear down and recreate its whole media pipeline for no reason.
    // Deliberately updated synchronously, before the mint request below
    // ever awaits anything -- doing it after would leave a real race where
    // a second concurrent call (another mounted instance) could pass this
    // check too before either one finishes.
    const now = Date.now();
    if (absoluteStreamUrl === lastLoadedStreamUrl && now - lastLoadedAt < DUPLICATE_LOAD_WINDOW_MS) {
      return;
    }
    lastLoadedStreamUrl = absoluteStreamUrl;
    lastLoadedAt = now;

    // OnWave/project_r#39: route every cast through our own stream-proxy
    // instead of sending the raw external URL. A receiver's Web Audio graph
    // (createMediaElementSource, needed for Butterchurn's frequency
    // analysis) silences its OUTPUT entirely for a cross-origin source with
    // no CORS headers -- confirmed via the Shield's logcat: no error
    // anywhere, the native pipeline reports genuine "playing" state, just
    // no sound. Third-party station servers aren't ours to add CORS headers
    // to, but our own proxy can set whatever it wants on its own response.
    // See project_r's internal/streamproxy/cast.go for the mint-then-fetch
    // design (never a plain "fetch any URL" open relay). Falls back to the
    // raw URL if minting fails for any reason -- casting still basically
    // works without the fix rather than not casting at all.
    let castUrl = absoluteStreamUrl;
    try {
      const mintResponse = await fetch('/api/stream-proxy/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: absoluteStreamUrl }),
      });
      if (mintResponse.ok) {
        const { proxy_path } = await mintResponse.json();
        // proxy_path is the backend's OWN route (e.g. "/stream-proxy/cast/...")
        // with no /api prefix -- correct from the backend's perspective,
        // since nginx is what strips /api/ before forwarding to it (see
        // nginx.prod.conf), not something the backend itself should know
        // about. But the receiver fetches this as a plain public URL, which
        // has to go back through nginx to reach the backend at all -- so the
        // prefix has to be added back here. Missing it sent the receiver to
        // Next.js's own catch-all route instead of the backend, silently
        // trying to play a 404 HTML page as audio (confirmed live: the
        // Shield accepted the cast but never actually started playback).
        if (proxy_path) castUrl = new URL(`/api${proxy_path}`, window.location.origin).href;
      } else {
        // Falls back to the raw URL below, but a mint rejection (e.g. the
        // resolver couldn't confirm this is a real audio stream) is exactly
        // the kind of thing that otherwise looks like "casting just doesn't
        // work" with zero clue why -- surface it instead of swallowing it.
        const reason = await mintResponse.text().catch(() => '');
        console.warn('[OnWave cast] mint rejected, casting raw URL instead', { status: mintResponse.status, reason, absoluteStreamUrl });
        Sentry.captureMessage('Cast stream mint rejected', {
          level: 'warning',
          extra: { status: mintResponse.status, reason, absoluteStreamUrl },
        });
      }
    } catch (err) {
      // Network hiccup reaching our own backend -- proceed with the raw URL.
      console.warn('[OnWave cast] mint request failed, casting raw URL instead', err);
      Sentry.captureException(err, { extra: { stage: 'mint', absoluteStreamUrl } });
    }

    const mediaInfo = new window.chrome.cast.media.MediaInfo(castUrl, codecToContentType(codec));
    mediaInfo.streamType = window.chrome.cast.media.StreamType.LIVE;

    // MusicTrackMediaMetadata (not Generic) is what both the Default
    // Receiver and our own custom receiver (cast-receiver.html) render
    // artwork/artist for — Generic only ever showed a bare title.
    mediaInfo.metadata = new window.chrome.cast.media.MusicTrackMediaMetadata();
    mediaInfo.metadata.title = stationName || 'OnWave';
    mediaInfo.metadata.artist = tags?.split(',')[0]?.trim() || 'Live Radio';
    const proxiedFavicon = getProxiedFaviconUrl(favicon);
    if (proxiedFavicon) {
      const absoluteFaviconUrl = new URL(proxiedFavicon, window.location.origin).href;
      mediaInfo.metadata.images = [new window.chrome.cast.Image(absoluteFaviconUrl)];
    }

    const request = new window.chrome.cast.media.LoadRequest(mediaInfo);

    if (stalledCastTimeoutRef.current) clearTimeout(stalledCastTimeoutRef.current);

    console.log('[OnWave cast] sending LOAD', { castUrl, stationName, contentType: codecToContentType(codec) });

    session.loadMedia(request).then(() => {
      // loadMedia() resolving only means the receiver accepted the request —
      // some receivers (seen with NVIDIA Shield, project_r#39/OnWave#39)
      // then silently never actually start playback, with no further error
      // on the sender side. Give it a few seconds, then check whether media
      // genuinely loaded before treating this as a real success.
      stalledCastTimeoutRef.current = setTimeout(() => {
        if (!remotePlayerRef.current?.isMediaLoaded) {
          console.warn('[OnWave cast] LOAD accepted but media never reported loaded', { castUrl, stationName, deviceName: deviceNameRef.current });
          Sentry.captureMessage('Cast accepted but playback never started', {
            level: 'warning',
            extra: { castUrl, stationName, deviceName: deviceNameRef.current },
          });
          toast({
            title: 'Cast connected, but nothing is playing',
            description: `${deviceNameRef.current || 'The cast device'} accepted the connection but never started playback of ${stationName || 'this station'}.`,
            variant: 'destructive',
          });
        }
      }, 8000);
    }).catch((err: any) => {
      // Casting session exists but the receiver rejected this stream (format/
      // CORS/etc.) — leave the session open, just surface it so it's not a
      // silent failure.
      console.error('[OnWave cast] loadMedia() rejected', { castUrl, stationName, err });
      Sentry.captureException(err instanceof Error ? err : new Error(`loadMedia rejected: ${JSON.stringify(err)}`), {
        extra: { castUrl, stationName },
      });
      toast({
        title: 'Cast failed',
        description: `${stationName || 'This station'} couldn't be played on the cast device.`,
        variant: 'destructive',
      });
    });
  }, [streamUrl, stationName, codec, favicon, tags, toast]);

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

  // Lets the sender (phone/laptop) control the receiver's own independent
  // Butterchurn instance (cast-receiver.html) -- previously a TV had no way
  // to be told to stop auto-cycling on a preset the viewer actually likes,
  // or to be manually stepped through presets at all. "Best effort, not
  // guaranteed" delivery per Cast's own docs, so failures here are logged
  // rather than surfaced to the user -- worst case a tap does nothing and
  // they try again, not worth a toast over.
  const VISUALIZER_CHANNEL = 'urn:x-cast:com.onwave.visualizer';
  const sendVisualizerCommand = useCallback((payload: Record<string, unknown>) => {
    const session = window.cast?.framework?.CastContext.getInstance().getCurrentSession();
    if (!session) return;
    session.sendMessage(VISUALIZER_CHANNEL, payload).catch((err: any) => {
      console.warn('[OnWave cast] failed to send visualizer command', payload, err);
    });
  }, []);
  const castNextPreset = useCallback(() => sendVisualizerCommand({ action: 'next' }), [sendVisualizerCommand]);
  const castPreviousPreset = useCallback(() => sendVisualizerCommand({ action: 'previous' }), [sendVisualizerCommand]);
  const castSetAutoCycle = useCallback(
    (enabled: boolean) => sendVisualizerCommand({ action: 'setAutoCycle', enabled }),
    [sendVisualizerCommand]
  );

  // If the station changes while already casting, load the new stream.
  // Safe to call unconditionally on every isCasting/loadCurrentMedia
  // change, including the initial false->true transition that toggleCast()
  // already handles directly -- loadCurrentMedia's own module-level dedup
  // (see lastLoadedStreamUrl/lastLoadedAt above) makes a redundant call
  // here, or from another mounted useChromecast instance reacting to the
  // same shared session (RadioPlayer + MaximizedPlayerDialog are both
  // mounted at once), a guaranteed no-op rather than a real extra LOAD.
  useEffect(() => {
    if (isCasting) loadCurrentMedia();
  }, [isCasting, loadCurrentMedia]);

  return {
    available,
    isCasting,
    deviceName,
    toggleCast,
    isRemotePaused,
    toggleRemotePlayback,
    castNextPreset,
    castPreviousPreset,
    castSetAutoCycle,
  };
}
