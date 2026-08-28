'use client';

import { useEffect, useRef, useState } from 'react';

export type VisualizerMode = 'detecting' | 'reactive' | 'ambient';

// createMediaElementSource() can only ever be called once per <audio>
// element (a second call throws), and the shared player element persists
// across the whole session — so the analyser has to be cached per element,
// not recreated whenever this hook mounts/unmounts with the dialog.
const analyserCache = new WeakMap<HTMLAudioElement, AnalyserNode>();

function getOrCreateAnalyser(audio: HTMLAudioElement): AnalyserNode | null {
  const cached = analyserCache.get(audio);
  if (cached) return cached;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    const ctx = new AudioContextClass();
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;

    // Routing through the analyser detaches the element's default output —
    // it must be reconnected to destination or the stream goes silent.
    source.connect(analyser);
    analyser.connect(ctx.destination);

    analyserCache.set(audio, analyser);
    return analyser;
  } catch {
    // Some browsers/streams reject this setup outright — ambient mode covers it.
    return null;
  }
}

/**
 * Attempts real frequency analysis of the shared player's audio element.
 * Most Icecast/Shoutcast stations don't send CORS headers, which taints
 * the Web Audio graph and yields permanently-zero frequency data (no
 * error thrown) — so after a short sampling window, mode falls back to
 * 'ambient' for callers to render a non-reactive animation instead.
 */
export function useAudioVisualizer(audioElement: HTMLAudioElement | null, isPlaying: boolean) {
  const [mode, setMode] = useState<VisualizerMode>('ambient');
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!audioElement || !isPlaying) return;

    const analyser = getOrCreateAnalyser(audioElement);
    if (!analyser) {
      setMode('ambient');
      return;
    }

    // AudioContexts start suspended until a user gesture resumes them.
    const ctx = analyser.context as AudioContext;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    dataRef.current = data;
    setMode('detecting');

    let cancelled = false;
    let sampledNonZero = false;

    const samplingInterval = setInterval(() => {
      if (cancelled) return;
      analyser.getByteFrequencyData(data);
      if (data.some(v => v > 0)) sampledNonZero = true;
    }, 100);

    const decideTimeout = setTimeout(() => {
      clearInterval(samplingInterval);
      if (!cancelled) setMode(sampledNonZero ? 'reactive' : 'ambient');
    }, 1200);

    return () => {
      cancelled = true;
      clearInterval(samplingInterval);
      clearTimeout(decideTimeout);
    };
  }, [audioElement, isPlaying]);

  const getFrequencyData = (): Uint8Array | null => {
    if (!analyserRef.current || !dataRef.current) return null;
    analyserRef.current.getByteFrequencyData(dataRef.current);
    return dataRef.current;
  };

  return { mode, getFrequencyData };
}
