'use client';

import { BarChart3, CircleDot, Activity, Waves } from 'lucide-react';
import { VISUALIZER_STYLES, type VisualizerStyle } from '@/hooks/use-visualizer-style';
import { cn } from '@/lib/utils';

const ICONS: Record<VisualizerStyle, typeof BarChart3> = {
  bars: BarChart3,
  radial: CircleDot,
  waveform: Activity,
  aurora: Waves,
};

interface VisualizerStylePickerProps {
  value: VisualizerStyle;
  onChange: (style: VisualizerStyle) => void;
  className?: string;
}

// A small always-visible row rather than a hidden dropdown — with only
// four options, letting people see and flip through all of them at a
// glance beats burying the choice a click deeper.
export function VisualizerStylePicker({ value, onChange, className }: VisualizerStylePickerProps) {
  return (
    <div className={cn('flex items-center gap-1 rounded-full bg-card/60 p-1 backdrop-blur-sm', className)}>
      {VISUALIZER_STYLES.map(({ id, label }) => {
        const Icon = ICONS[id];
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-label={`${label} visualizer`}
            aria-pressed={active}
            title={`${label} visualizer`}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-card-foreground/70 hover:bg-card/80 hover:text-card-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
