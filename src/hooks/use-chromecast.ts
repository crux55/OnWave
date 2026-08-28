'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// The Cast Web Sender SDK types aren't in DOM lib — declare just what's used.
declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    cast?: any;
    chrome?: any;
  }
}

const CAST_SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js';

let sdkLoadPromise: Promise<boolean> | null = null;

function loadCastSdk(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.cast?.framework) return Promise.resolve(true);
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve) => {
    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (!isAvailable) {
        resolve(false);
        return;
      }
      window.cast.framework.CastContext.getInstance().setOptions({
        receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      });
      resolve(true);
    };

    const script = document.createElement('script');
    script.src = CAST_SDK_URL;
    script.async = true;
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

export function useChromecast(streamUrl: string | undefined, stationName: string | undefined) {
  const [available, setAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const sessionListenerRef = useRef<((event: any) => void) | null>(null);

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

    const mediaInfo = new window.chrome.cast.media.MediaInfo(streamUrl, 'audio/mpeg');
    mediaInfo.streamType = window.chrome.cast.media.StreamType.LIVE;
    mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title = stationName || 'OnWave';

    const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
    session.loadMedia(request).catch(() => {
      // Casting session exists but the receiver rejected this stream (format/
      // CORS/etc.) — leave the session open, just don't force an error state
      // over what is otherwise a working local playback experience.
    });
  }, [streamUrl, stationName]);

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

  return { available, isCasting, deviceName, toggleCast };
}
