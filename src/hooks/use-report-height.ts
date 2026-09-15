'use client';

import { useEffect, useRef } from 'react';

// Measures a mobile-dock content piece's real rendered height and reports it
// into MobileDockContext, so the dock's total on-screen height is always
// accurate instead of a hand-guessed constant. `active` gates reporting so
// a hidden/unmounted-on-desktop element doesn't claim mobile-dock space.
export function useReportHeight(active: boolean, report: (height: number) => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active) {
      report(0);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) report(entry.contentRect.height);
    });
    observer.observe(el);
    report(el.getBoundingClientRect().height);

    return () => observer.disconnect();
  }, [active, report]);

  return ref;
}
