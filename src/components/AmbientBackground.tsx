'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// OnWave#43's "lava lamp" theme: a few large, heavily blurred, differently-
// hued blobs drifting slowly behind the whole app. Pure CSS animation (no
// canvas, no JS render loop) — cheap on battery and simple to reason about,
// matching the "purely ambient" decision (no tie to playback or time of
// day). Renders nothing for the default 'dark' theme.
export function AmbientBackground() {
  const { theme } = useTheme();
  // Waits for a real client mount before rendering anything theme-
  // dependent — ThemeContext's initial state can differ between the
  // server's render (always the 'dark' default, no localStorage there) and
  // the client's first paint (may already have a cached preference), and
  // rendering this fixed full-viewport overlay during that mismatched
  // window is exactly the kind of thing that causes a visible flash /
  // hydration warning. A one-frame delay before it can ever appear costs
  // nothing for a purely decorative background.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || theme !== 'lava-lamp') return null;

  // z-0, not a negative z-index: this is the first thing mounted inside
  // <body> (see layout.tsx), and every real app element that should sit
  // above it already carries an explicit positive z-index (header, docks,
  // player, dialogs) or simply comes later in the DOM at this same
  // z-level — later-in-tree siblings at an equal stacking level paint over
  // earlier ones, so plain tree order already keeps this behind everything
  // without relying on the trickier "does a negative z-index child sink
  // below its own parent's background" stacking-context edge case.
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="onwave-lava-blob onwave-lava-blob-1" />
      <div className="onwave-lava-blob onwave-lava-blob-2" />
      <div className="onwave-lava-blob onwave-lava-blob-3" />
    </div>
  );
}
