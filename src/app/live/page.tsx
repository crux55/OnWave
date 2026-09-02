import { Radio } from 'lucide-react';

// Placeholder — the actual live-broadcasting pillar doesn't exist until M4.
// Ships empty on purpose per the M2 plan rather than waiting to add the
// nav entry until there's something behind it.
export default function LivePage() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center py-24 text-center">
      <Radio className="h-12 w-12 text-accent mb-4" />
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground mb-2">
        Live is coming soon
      </h1>
      <p className="max-w-md text-muted-foreground">
        DJs and stations will be able to broadcast live here — video or audio, planned or on the fly. Check back soon.
      </p>
    </div>
  );
}
