import { Waves } from 'lucide-react';
import type { SVGProps } from 'react';

interface AppLogoProps extends SVGProps<SVGSVGElement> {
  iconOnly?: boolean;
}

export function AppLogo({ iconOnly = false, className, ...props }: AppLogoProps) {
  return (
    <div className="flex items-center gap-2 p-2">
      <Waves className={cn("h-8 w-8 text-accent", className)} {...props} />
      {!iconOnly && (
        <h1 className="text-2xl font-bold text-foreground">OnWave</h1>
      )}
    </div>
  );
}

// Helper cn function if not globally available (though it should be from utils)
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
