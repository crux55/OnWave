'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// createMediaElementSource() can only ever be called once per <audio>
// element (a second call throws), and the shared player element persists
// across the whole session — so this has to be cached per element, not
// recreated whenever a visualizer mounts/unmounts with the dialog. Carried
// over from the old use-audio-visualizer.ts (now deleted).
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

    // Routing through the analyser detaches the element's default output —
    // it must be reconnected to destination or the stream goes silent.
    source.connect(analyser);
    analyser.connect(ctx.destination);

    analyserCache.set(audio, analyser);
    return analyser;
  } catch {
    // Some browsers/streams reject this setup outright.
    return null;
  }
}

interface UseButterchurnResult {
  presetName: string | null;
  nextPreset: () => void;
  previousPreset: () => void;
  isReady: boolean;
}

/**
 * Renders a real Butterchurn (WebGL MilkDrop-style) visualizer onto the
 * given canvas, tapping the shared player's audio element via the same
 * analyser used elsewhere (see getOrCreateAnalyser above) — Butterchurn's
 * connectAudio() just adds another .connect() fan-out from that node, so it
 * doesn't disturb the existing source -> analyser -> destination routing
 * that keeps audio audible. `active` gates the render loop so it doesn't
 * burn GPU while the fullscreen view isn't actually open.
 */
export function useButterchurn(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  audioElement: HTMLAudioElement | null,
  active: boolean,
  // 'default' picks the fixed "Unchained - Rewop" preset every time (every
  // caller except the swipeable browser). A number 0-1 is a caller-supplied
  // random seed used to derive the starting preset index instead — the
  // swipeable browser (OnWave: "randomise the vis") wants a DIFFERENT
  // preset per station, but this effect's own `active` re-gates its setup
  // (see the effect below) whenever a card's visualizer is paused and
  // resumed, e.g. toggling off/on across a hesitant, uncommitted drag on
  // the same station — rolling Math.random() fresh in here on every one of
  // those restarts would re-randomize mid-gesture instead of staying
  // stable for as long as the same station is showing. The caller picks
  // the seed once (typically via useState(() => Math.random())) so it's
  // stable across restarts and only actually changes when the caller
  // itself remounts for a new station.
  initialPreset: 'default' | number = 'default',
  // OnWave#40: a logged-in user's personal preset rotation, by name. When
  // non-empty, cycling (manual prev/next and the #41 auto-cycle) is
  // restricted to just these — when empty/undefined (the default for
  // everyone who hasn't curated one, including logged-out listeners), the
  // full butterchurn-presets pack is available exactly as before this
  // ticket existed.
  installedPresetNames?: string[]
): UseButterchurnResult {
  const visualizerRef = useRef<any>(null);
  const presetsRef = useRef<[string, any][]>([]);
  const presetIndexRef = useRef(0);
  const [presetName, setPresetName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const rafRef = useRef<number | null>(null);

  // A content-based key, not the raw array, drives the effect below —
  // callers that derive installedPresetNames inline (e.g. an inline .map()
  // over fetched data) hand this hook a new array reference every render
  // even when the actual names haven't changed, and this effect is
  // expensive enough (full WebGL re-init) that reacting to reference
  // churn instead of real content changes would be a real regression.
  const installedKey = installedPresetNames && installedPresetNames.length > 0
    ? [...installedPresetNames].sort().join(',')
    : '';

  useEffect(() => {
    if (!active || !audioElement || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      // Both packages touch `window` at module-eval time (butterchurn's UMD
      // wrapper isn't even SSR-guarded) — must only ever load client-side,
      // never as a static top-level import.
      const [butterchurnMod, butterchurnPresetsMod] = await Promise.all([
        import('butterchurn'),
        import('butterchurn-presets'),
      ]);
      if (cancelled) return;
      // Both are UMD/CJS modules — webpack's interop shape for a dynamic
      // import() of one isn't perfectly consistent, so unwrap defensively
      // rather than assuming `.default` is always present.
      const butterchurn: any = (butterchurnMod as any).default || butterchurnMod;
      const butterchurnPresets: any = (butterchurnPresetsMod as any).default || butterchurnPresetsMod;

      const analyser = getOrCreateAnalyser(audioElement);
      if (!analyser) return;
      const ctx = analyser.context as AudioContext;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * pixelRatio);
      canvas.height = Math.round(rect.height * pixelRatio);

      const visualizer = butterchurn.createVisualizer(ctx, canvas, {
        width: canvas.width,
        height: canvas.height,
        pixelRatio,
        textureRatio: 1,
      });
      visualizer.connectAudio(analyser);
      visualizerRef.current = visualizer;

      const allPresets = Object.entries(butterchurnPresets.getPresets());
      // OnWave#40: restrict to the user's installed rotation when they've
      // curated one. An installed name that's since vanished from the pack
      // (renamed/removed upstream) is silently dropped by the filter rather
      // than erroring; falling back to the full pack if that leaves nothing
      // usable avoids a curated-but-now-empty rotation going silent.
      const installedSet = installedPresetNames && installedPresetNames.length > 0
        ? new Set(installedPresetNames)
        : null;
      const filtered = installedSet ? allPresets.filter(([name]) => installedSet.has(name)) : allPresets;
      const presets = filtered.length > 0 ? filtered : allPresets;
      presetsRef.current = presets;
      if (presets.length > 0) {
        // "Unchained - Rewop" is the fallback starting preset when nothing
        // more specific applies — falls back further to the first preset in
        // whatever pool is active if it's ever missing there too (e.g. it
        // isn't part of this user's installed rotation, or a future
        // butterchurn-presets version renames/drops it).
        const startIndex = typeof initialPreset === 'number'
          ? Math.min(presets.length - 1, Math.floor(initialPreset * presets.length))
          : Math.max(0, presets.findIndex(([name]) => name === 'Unchained - Rewop'));
        presetIndexRef.current = startIndex;
        visualizer.loadPreset(presets[startIndex][1], 0);
        setPresetName(presets[startIndex][0]);
      }
      setIsReady(true);

      const renderLoop = () => {
        visualizerRef.current?.render();
        rafRef.current = requestAnimationFrame(renderLoop);
      };
      renderLoop();
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      visualizerRef.current = null;
      setIsReady(false);
    };
  }, [active, audioElement, canvasRef, initialPreset, installedKey]);

  // Tracks real fullscreen viewport size (orientation changes, mobile
  // browser chrome show/hide) rather than the size at mount time.
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry || !visualizerRef.current) return;
      const pixelRatio = window.devicePixelRatio || 1;
      const width = Math.round(entry.contentRect.width * pixelRatio);
      const height = Math.round(entry.contentRect.height * pixelRatio);
      canvas.width = width;
      canvas.height = height;
      visualizerRef.current.setRendererSize(width, height);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [active, canvasRef]);

  const goToPreset = useCallback((index: number) => {
    const presets = presetsRef.current;
    if (presets.length === 0 || !visualizerRef.current) return;
    const wrapped = ((index % presets.length) + presets.length) % presets.length;
    presetIndexRef.current = wrapped;
    visualizerRef.current.loadPreset(presets[wrapped][1], 1.2);
    setPresetName(presets[wrapped][0]);
  }, []);

  const nextPreset = useCallback(() => goToPreset(presetIndexRef.current + 1), [goToPreset]);
  const previousPreset = useCallback(() => goToPreset(presetIndexRef.current - 1), [goToPreset]);

  return { presetName, nextPreset, previousPreset, isReady };
}
