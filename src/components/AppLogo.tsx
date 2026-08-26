import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

interface AppLogoProps extends SVGProps<SVGSVGElement> {
  iconOnly?: boolean;
}

export function AppLogo({ iconOnly = false, className, ...props }: AppLogoProps) {
  return (
    <div className="flex items-center gap-2 p-2">
      <svg
        viewBox="0 0 30 30"
        fill="none"
        className={cn("h-7 w-7", className)}
        {...props}
      >
        <path
          d="M2 20 L8 20 L11 10 L14 24 L17 6 L20 20 L23 14 L28 14"
          stroke="url(#onwave-logo-gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="onwave-logo-gradient" x1="0" y1="0" x2="30" y2="0">
            <stop offset="0" stopColor="hsl(var(--primary))" />
            <stop offset="1" stopColor="hsl(var(--accent-2))" />
          </linearGradient>
        </defs>
      </svg>
      {!iconOnly && (
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">OnWave</h1>
      )}
    </div>
  );
}
