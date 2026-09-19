import type { InternalShow } from '@/lib/types';

// Server-side-only show lookup for generateMetadata and the OG image route
// below — hits the Go backend directly (same host/pattern as
// /api/shows/[showId]/route.ts) rather than going through that Next API
// route, since both run at request time on the server anyway and a show is
// public data with no auth to thread through here.
export async function fetchShowForMetadata(id: string): Promise<InternalShow | null> {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  try {
    const response = await fetch(`${apiHost}/shows/${id}`, { next: { revalidate: 30 } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function showStatusLabel(status: InternalShow['status']): string {
  switch (status) {
    case 'live': return 'Live now';
    case 'scheduled': return 'Starts soon';
    case 'terminated': return 'Broadcast ended';
    case 'ended':
    default: return 'Broadcast ended';
  }
}

// Falls back to a generic-but-still-descriptive line when the show has no
// description of its own, so a shared link never previews as just a bare
// title with nothing else.
export function describeShow(show: InternalShow): string {
  if (show.description?.trim()) return show.description.trim();
  const who = show.dj_name || show.station_name;
  const parts = [showStatusLabel(show.status)];
  parts.push(who ? `${who} on OnWave` : 'on OnWave');
  return parts.join(' · ');
}

// Deterministic per-show hue so shared cards get a varied, colourful
// background instead of every OG image looking identical — not meant to
// represent real station branding (OnWave has no station-art field to
// composite here), just enough visual variety to read as "designed."
export function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % 360;
}
