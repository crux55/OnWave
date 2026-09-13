'use client';

import { useEffect, useRef } from 'react';
import type { VisualizerMode } from '@/hooks/use-audio-visualizer';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  mode: VisualizerMode;
  getFrequencyData: () => Uint8Array | null;
  isPlaying: boolean;
  className?: string;
}

const CYAN = '183 80% 58%';
const MAGENTA = '331 90% 62%';
const BAR_COUNT = 48;
// How quickly rendered bar heights chase the latest analyser sample each
// frame (0..1) — this is what turns raw per-frame data into motion that
// reads as smooth energy rather than jittery noise.
const SMOOTHING = 0.35;
// Peaks fall back down slower than the bars themselves rise/fall, giving a
// classic hovering "peak cap" instead of just tracking the bar exactly.
const PEAK_FALL = 0.02;

export function AudioVisualizer({ mode, getFrequencyData, isPlaying, className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const heightsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const peaksRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));

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

    const drawReactiveBars = (targets: Float32Array) => {
      const { width, height } = canvas.getBoundingClientRect();
      const heights = heightsRef.current;
      const peaks = peaksRef.current;
      ctx.clearRect(0, 0, width, height);

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

        // Hovering peak cap, drawn without the glow so it stays crisp.
        ctx.shadowBlur = 0;
        const peakY = height - Math.max(4, peaks[i] * height);
        ctx.fillStyle = `hsl(${t < 0.5 ? CYAN : MAGENTA} / 0.9)`;
        ctx.beginPath();
        ctx.roundRect(x, peakY - 2, barWidth, 2, 1);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    // Ambient fallback (no usable frequency data — most Icecast/Shoutcast
    // stations don't send CORS headers, so this is the common case, not an
    // edge case). Rather than faking bars off a sine wave, this leans into
    // a different visual language on purpose — a slow drifting "aurora" of
    // translucent wave bands — so it reads as ambient mood lighting rather
    // than a visualizer quietly lying about reacting to the audio.
    const drawAurora = (time: number) => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      const seconds = time / 1000;

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
            Math.sin(nx * Math.PI * 2 * band.freq + seconds * band.speed + band.phase) * band.amp +
            Math.sin(nx * Math.PI * 4 * band.freq + seconds * band.speed * 1.6 + band.phase) * band.amp * 0.3;
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
      if (mode === 'reactive') {
        const data = getFrequencyData();
        if (data) {
          const targets = new Float32Array(BAR_COUNT);
          const bucket = Math.max(1, Math.floor(data.length / BAR_COUNT));
          for (let i = 0; i < BAR_COUNT; i++) {
            let sum = 0;
            for (let j = 0; j < bucket; j++) sum += data[i * bucket + j] || 0;
            targets[i] = (sum / bucket) / 255;
          }
          drawReactiveBars(targets);
        }
      } else {
        drawAurora(time);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      heightsRef.current.fill(0);
      peaksRef.current.fill(0);
      drawReactiveBars(new Float32Array(BAR_COUNT));
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, isPlaying, getFrequencyData]);

  return <canvas ref={canvasRef} className={cn('h-full w-full', className)} />;
}
