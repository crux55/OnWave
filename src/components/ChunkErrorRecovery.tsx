'use client';

import { useEffect } from 'react';

const RELOAD_FLAG_KEY = 'onwave:chunk-error-reload';

function isChunkLoadError(message: string | undefined): boolean {
  if (!message) return false;
  return /ChunkLoadError|Loading chunk .* failed/i.test(message);
}

// Frequent deploys mean a tab left open across a build has a stale chunk
// manifest -- it tries to fetch JS files that got pruned during the next
// deploy's cleanup. Rather than leaving the user staring at a broken app,
// reload once to pick up the current build. The sessionStorage guard stops
// a reload loop if the underlying page genuinely can't load (rather than
// just being stale).
export function ChunkErrorRecovery() {
  useEffect(() => {
    const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG_KEY) === '1';

    const recover = (message: string | undefined) => {
      if (!isChunkLoadError(message) || alreadyReloaded) return;
      sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => recover(event.error?.message || event.message);
    const onRejection = (event: PromiseRejectionEvent) => recover(event.reason?.message || String(event.reason));

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    // Clearing the guard immediately would let a genuinely broken chunk
    // (the reload didn't fix anything) trigger another reload right away,
    // looping forever. Only clear it once this page has run stably for a
    // bit -- that's what actually confirms the reload fixed things, at
    // which point a *future* staleness (the next deploy) can trigger one
    // more recovery reload rather than being permanently silenced.
    const clearGuardTimeout = setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG_KEY), 10000);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      clearTimeout(clearGuardTimeout);
    };
  }, []);

  return null;
}
