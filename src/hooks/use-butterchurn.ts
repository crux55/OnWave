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
  // 'random' is for the swipeable browser (OnWave: "randomise the vis"),
  // where variety station-to-station is the point — every other caller
  // wants the same "Unchained - Rewop" default every time.
  initialPreset: 'default' | 'random' = 'default'
): UseButterchurnResult {
  const visualizerRef = useRef<any>(null);
  const presetsRef = useRef<[string, any][]>([]);
  const presetIndexRef = useRef(0);
  const [presetName, setPresetName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const rafRef = useRef<number | null>(null);

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

      const presets = Object.entries(butterchurnPresets.getPresets());
      presetsRef.current = presets;
      if (presets.length > 0) {
        // "Unchained - Rewop" is the chosen default preset (until OnWave#40's
        // installable preset library lets users pick their own) — falls
        // back to the first preset in the pack if it's ever missing (e.g. a
        // future butterchurn-presets version renaming/dropping it).
        const startIndex = initialPreset === 'random'
          ? Math.floor(Math.random() * presets.length)
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
  }, [active, audioElement, canvasRef]);

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
