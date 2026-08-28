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
const BAR_COUNT = 32;

export function AudioVisualizer({ mode, getFrequencyData, isPlaying, className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

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

    const drawBars = (heights: number[]) => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const gap = width / BAR_COUNT;
      const barWidth = gap * 0.6;

      for (let i = 0; i < BAR_COUNT; i++) {
        const t = i / (BAR_COUNT - 1);
        const barHeight = Math.max(4, heights[i] * height);
        const x = i * gap + (gap - barWidth) / 2;
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, `hsl(${CYAN} / 0.85)`);
        gradient.addColorStop(1, `hsl(${MAGENTA} / 0.85)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = Math.min(barWidth / 2, 6);
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
        void t;
      }
    };

    const tick = (time: number) => {
      if (mode === 'reactive') {
        const data = getFrequencyData();
        if (data) {
          // Sample the array down to BAR_COUNT bars and normalize to 0..1.
          const bucket = Math.max(1, Math.floor(data.length / BAR_COUNT));
          const heights = Array.from({ length: BAR_COUNT }, (_, i) => {
            let sum = 0;
            for (let j = 0; j < bucket; j++) sum += data[i * bucket + j] || 0;
            return (sum / bucket) / 255;
          });
          drawBars(heights);
        }
      } else {
        // Ambient fallback: layered sine waves per bar so the motion looks
        // organic rather than a single uniform pulse.
        const seconds = time / 1000;
        const heights = Array.from({ length: BAR_COUNT }, (_, i) => {
          const phase = i * 0.35;
          const wave =
            Math.sin(seconds * 1.3 + phase) * 0.25 +
            Math.sin(seconds * 0.7 + phase * 1.7) * 0.15 +
            0.35;
          return Math.min(1, Math.max(0.05, wave));
        });
        drawBars(heights);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      drawBars(Array.from({ length: BAR_COUNT }, () => 0.04));
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, isPlaying, getFrequencyData]);

  return <canvas ref={canvasRef} className={cn('h-full w-full', className)} />;
}
