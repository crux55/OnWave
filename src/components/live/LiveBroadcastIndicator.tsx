'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Radio } from 'lucide-react';
import { useLiveBroadcast } from '@/contexts/LiveBroadcastContext';

// Persistent corner control while broadcasting — the actual mute/gain/end
// controls only live on the show's own watch page, so navigating anywhere
// else would otherwise leave you with no visible sign you're still live
// and no way back to them. Hidden on the watch page itself since the real
// controls are already on screen there.
export function LiveBroadcastIndicator() {
  const { showId, isPublishing } = useLiveBroadcast();
  const router = useRouter();
  const pathname = usePathname();

  if (!isPublishing || !showId || pathname === `/shows/${showId}`) {
    return null;
  }

  return (
    <button
      onClick={() => router.push(`/shows/${showId}`)}
      className="fixed top-20 right-4 z-40 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-red-700 transition-colors"
    >
      <Radio className="h-4 w-4 animate-pulse" />
      You're live
    </button>
  );
}
