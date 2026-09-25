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

    // getBoundingClientRect() throughout, not ResizeObserver's own
    // entry.contentRect -- contentRect is content-box only (excludes border
    // and padding), while the element's real on-screen footprint (what a
    // scroll container actually needs to clear) is the border-box size.
    // They silently diverged the moment this element gained any
    // padding/border, under-reporting how much space it actually occupies
    // and leaving a sliver of a page's bottom content unreachable behind it.
    const reportBorderBoxHeight = () => report(el.getBoundingClientRect().height);
    const observer = new ResizeObserver(reportBorderBoxHeight);
    observer.observe(el);
    reportBorderBoxHeight();

    return () => observer.disconnect();
  }, [active, report]);

  return ref;
}
