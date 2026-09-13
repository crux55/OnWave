'use client';

import { useEffect, useRef } from 'react';
import type { VisualizerMode } from '@/hooks/use-audio-visualizer';
import type { VisualizerStyle } from '@/hooks/use-visualizer-style';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  mode: VisualizerMode;
  style: VisualizerStyle;
  getFrequencyData: () => Uint8Array | null;
  getTimeDomainData: () => Uint8Array | null;
  isPlaying: boolean;
  className?: string;
}

const CYAN = '183 80% 58%';
const MAGENTA = '331 90% 62%';

const BAR_COUNT = 48;
const RADIAL_COUNT = 64;
// How quickly rendered values chase the latest analyser sample each frame
// (0..1) — turns raw per-frame data into motion that reads as smooth
// energy rather than jittery noise.
const SMOOTHING = 0.35;
// Peaks fall back down slower than the bars/spokes themselves, giving a
// classic hovering "peak cap" instead of just tracking the value exactly.
const PEAK_FALL = 0.02;

function averageBass(data: Uint8Array): number {
  const span = Math.max(1, Math.floor(data.length / 4));
  let sum = 0;
  for (let i = 0; i < span; i++) sum += data[i];
  return sum / span / 255;
}

export function AudioVisualizer({ mode, style, getFrequencyData, getTimeDomainData, isPlaying, className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Smoothing state, kept separate per style so switching styles never
  // reads stale/mismatched arrays from a different engine.
  const barHeights = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const barPeaks = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const radialHeights = useRef<Float32Array>(new Float32Array(RADIAL_COUNT));
  const radialPeaks = useRef<Float32Array>(new Float32Array(RADIAL_COUNT));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // --- Bars: classic equalizer bars, bottom-anchored. ---
    const drawBars = (time: number, reactive: boolean) => {
      const { width, height } = canvas.getBoundingClientRect();
      const heights = barHeights.current;
      const peaks = barPeaks.current;
      ctx.clearRect(0, 0, width, height);

      let targets: Float32Array;
      if (reactive) {
        const data = getFrequencyData();
        targets = new Float32Array(BAR_COUNT);
        if (data) {
          const bucket = Math.max(1, Math.floor(data.length / BAR_COUNT));
          for (let i = 0; i < BAR_COUNT; i++) {
            let sum = 0;
            for (let j = 0; j < bucket; j++) sum += data[i * bucket + j] || 0;
            targets[i] = (sum / bucket) / 255;
          }
        }
      } else {
        // Idle animation: a slow, synchronized breathing pulse across all
        // bars (shared phase, small per-bar offset) — deliberately gentle
        // and uniform-looking rather than each bar moving independently,
        // so it reads as "waiting," not as a visualizer quietly lying
        // about hearing the audio.
        const seconds = time / 1000;
        targets = new Float32Array(BAR_COUNT);
        for (let i = 0; i < BAR_COUNT; i++) {
          targets[i] = 0.1 + Math.sin(seconds * 1.1 + i * 0.12) * 0.06;
        }
      }

      const gap = width / BAR_COUNT;
      const barWidth = gap * 0.62;

      for (let i = 0; i < BAR_COUNT; i++) {
        heights[i] += (targets[i] - heights[i]) * SMOOTHING;
        peaks[i] = Math.max(targets[i], peaks[i] - PEAK_FALL);

        const barHeight = Math.max(4, heights[i] * height);
        const x = i * gap + (gap - barWidth) / 2;
        const y = height - barHeight;
        const t = i / (BAR_COUNT - 1);

        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, `hsl(${CYAN} / 0.9)`);
        gradient.addColorStop(1, `hsl(${MAGENTA} / 0.9)`);
        ctx.fillStyle = gradient;
        ctx.shadowColor = `hsl(${t < 0.5 ? CYAN : MAGENTA} / 0.55)`;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        const radius = Math.min(barWidth / 2, 5);
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();

        if (reactive) {
          ctx.shadowBlur = 0;
          const peakY = height - Math.max(4, peaks[i] * height);
          ctx.fillStyle = `hsl(${t < 0.5 ? CYAN : MAGENTA} / 0.9)`;
          ctx.beginPath();
          ctx.roundRect(x, peakY - 2, barWidth, 2, 1);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
    };

    // --- Radial: a ring of spokes radiating from a center point. ---
    const drawRadial = (time: number, reactive: boolean) => {
      const { width, height } = canvas.getBoundingClientRect();
      const heights = radialHeights.current;
      const peaks = radialPeaks.current;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.22;
      const maxExtra = Math.min(width, height) * 0.22;

      let targets: Float32Array;
      if (reactive) {
        const data = getFrequencyData();
        targets = new Float32Array(RADIAL_COUNT);
        if (data) {
          const bucket = Math.max(1, Math.floor(data.length / RADIAL_COUNT));
          for (let i = 0; i < RADIAL_COUNT; i++) {
            let sum = 0;
            for (let j = 0; j < bucket; j++) sum += data[i * bucket + j] || 0;
            targets[i] = (sum / bucket) / 255;
          }
        }
      } else {
        // Idle: the whole ring breathes in and out together, slowly.
        const seconds = time / 1000;
        const pulse = 0.12 + Math.sin(seconds * 0.9) * 0.05;
        targets = new Float32Array(RADIAL_COUNT).fill(pulse);
      }

      // Base ring, always visible so the shape reads even at rest.
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsl(${CYAN} / 0.35)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      for (let i = 0; i < RADIAL_COUNT; i++) {
        heights[i] += (targets[i] - heights[i]) * SMOOTHING;
        peaks[i] = Math.max(targets[i], peaks[i] - PEAK_FALL);

        const angle = (i / RADIAL_COUNT) * Math.PI * 2 - Math.PI / 2;
        const spokeLen = Math.max(2, heights[i] * maxExtra);
        const innerX = cx + Math.cos(angle) * baseRadius;
        const innerY = cy + Math.sin(angle) * baseRadius;
        const outerX = cx + Math.cos(angle) * (baseRadius + spokeLen);
        const outerY = cy + Math.sin(angle) * (baseRadius + spokeLen);
        const t = i / (RADIAL_COUNT - 1);

        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX, outerY);
        ctx.strokeStyle = `hsl(${t < 0.5 ? CYAN : MAGENTA} / 0.85)`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = `hsl(${t < 0.5 ? CYAN : MAGENTA} / 0.6)`;
        ctx.shadowBlur = 6;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    // --- Waveform: a single oscilloscope-style trace. ---
    const drawWaveform = (time: number, reactive: boolean) => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      const midY = height / 2;

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, `hsl(${CYAN} / 0.9)`);
      gradient.addColorStop(1, `hsl(${MAGENTA} / 0.9)`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = `hsl(${CYAN} / 0.4)`;
      ctx.shadowBlur = 8;
      ctx.beginPath();

      if (reactive) {
        const data = getTimeDomainData();
        if (data) {
          const step = width / (data.length - 1);
          for (let i = 0; i < data.length; i++) {
            const amplitude = (data[i] - 128) / 128; // -1..1
            const x = i * step;
            const y = midY + amplitude * midY * 0.85;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
      } else {
        // Idle: a calm, slowly traveling sine — like a resting heart-rate
        // line rather than a flat "nothing's happening" bar.
        const seconds = time / 1000;
        const steps = 80;
        for (let i = 0; i <= steps; i++) {
          const nx = i / steps;
          const x = nx * width;
          const y = midY + Math.sin(nx * Math.PI * 4 + seconds * 1.4) * height * 0.08;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    // --- Aurora: drifting translucent wave bands — deliberately reads as
    // ambient mood lighting rather than literal audio data, since most
    // Icecast/Shoutcast stations don't send CORS headers and can never
    // produce real frequency data at all. When real data *is* available,
    // bass energy gently swells the bands' amplitude rather than mapping
    // them 1:1 to frequency bins, keeping the "aurora" character intact.
    const drawAurora = (time: number, reactive: boolean) => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      const seconds = time / 1000;

      let bassBoost = 1;
      if (reactive) {
        const data = getFrequencyData();
        if (data) bassBoost = 1 + averageBass(data) * 1.6;
      }

      const bands = [
        { color: CYAN, amp: 0.16, freq: 0.55, speed: 0.35, phase: 0, baseline: 0.62, opacity: 0.35 },
        { color: MAGENTA, amp: 0.13, freq: 0.8, speed: -0.28, phase: 1.4, baseline: 0.72, opacity: 0.3 },
        { color: CYAN, amp: 0.1, freq: 1.1, speed: 0.2, phase: 3.1, baseline: 0.84, opacity: 0.25 },
      ];

      for (const band of bands) {
        ctx.beginPath();
        ctx.moveTo(0, height);
        const steps = 48;
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * width;
          const nx = i / steps;
          const wave =
            Math.sin(nx * Math.PI * 2 * band.freq + seconds * band.speed + band.phase) * band.amp * bassBoost +
            Math.sin(nx * Math.PI * 4 * band.freq + seconds * band.speed * 1.6 + band.phase) * band.amp * 0.3 * bassBoost;
          const y = height * (band.baseline + wave);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, height * band.baseline, 0, height);
        gradient.addColorStop(0, `hsl(${band.color} / ${band.opacity})`);
        gradient.addColorStop(1, `hsl(${band.color} / 0)`);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    };

    const tick = (time: number) => {
      const reactive = mode === 'reactive';
      switch (style) {
        case 'radial':
          drawRadial(time, reactive);
          break;
        case 'waveform':
          drawWaveform(time, reactive);
          break;
        case 'aurora':
          drawAurora(time, reactive);
          break;
        case 'bars':
        default:
          drawBars(time, reactive);
          break;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      barHeights.current.fill(0);
      barPeaks.current.fill(0);
      radialHeights.current.fill(0);
      radialPeaks.current.fill(0);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, style, isPlaying, getFrequencyData, getTimeDomainData]);

  return <canvas ref={canvasRef} className={cn('h-full w-full', className)} />;
}
