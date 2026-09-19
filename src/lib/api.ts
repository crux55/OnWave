import type { RadioStation, TopTag, PBSShow, InternalShow, WebradioSearchResponse, TopStationsResponse, Profile, Clip } from '@/lib/types';
import { PINNED_STATIONS } from '@/lib/pinned-stations';
import { isValidImageUrl } from '@/lib/utils';

export async function fetchFromApi(params: Record<string, string> = {}, signal?: AbortSignal): Promise<WebradioSearchResponse> {
  const queryString = new URLSearchParams(params).toString();
  const url = `/api/webradio/search${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch: ${response.status} ${errorText || response.statusText}`);
  }

  const data = await response.json();

  // Backward-compatible parsing: older backend returned a raw array.
  if (Array.isArray(data)) {
    return {
      stations: data,
      total: data.length,
      filters: {
        min_bitrate: Number(params.min_bitrate ?? 0),
        max_bitrate: Number(params.max_bitrate ?? 999999),
        min_clicks: Number(params.min_clicks ?? 0),
        max_clicks: Number(params.max_clicks ?? 999999999),
        min_trend: Number(params.min_trend ?? -999999),
        max_trend: Number(params.max_trend ?? 999999),
        codec: params.codec || undefined,
        country: params.country || undefined,
        limit: Number(params.limit ?? 50),
      },
    };
  }

  if (!data || !Array.isArray(data.stations)) {
    throw new Error('Invalid response format: expected { stations, total, filters }');
  }

  return data as WebradioSearchResponse;
}

// toPlayerStation normalizes a raw catalog RadioStation into the shape the
// player/queue/liked-stations flow expects — a stable id (serveruuid,
// falling back through stationuuid to name), a resolved playable url, a
// single clean tag, and a favicon fallback. Shared so every entry point
// that hands a station to the player does the same normalization; previously
// only the search page did this and Home's play handler passed stations
// through raw (see OnWave health-check #12).
export function toPlayerStation(station: RadioStation): RadioStation {
  return {
    ...station,
    serveruuid: station.serveruuid || station.stationuuid || station.name,
    url: station.url_resolved || station.url,
    tags: station.tags?.split(', ')[0]?.trim() || station.tags || 'Unknown',
    favicon: station.favicon || 'https://placehold.co/64x64.png',
  };
}

export async function getTopStationsGrouped(): Promise<TopStationsResponse> {
  const response = await fetch('/api/webradio/top');
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch: ${response.status} ${errorText || response.statusText}`);
  }

  const data = await response.json();

  // New grouped response
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return {
      featured: Array.isArray(data.featured) ? data.featured : [],
      popular: Array.isArray(data.popular) ? data.popular : [],
      trending: Array.isArray(data.trending) ? data.trending : [],
      random: Array.isArray(data.random) ? data.random : [],
    };
  }

  // Legacy flat-array fallback: distribute evenly across categories
  if (Array.isArray(data)) {
    const chunk = Math.ceil(data.length / 4);
    return {
      featured: data.slice(0, chunk),
      popular: data.slice(chunk, chunk * 2),
      trending: data.slice(chunk * 2, chunk * 3),
      random: data.slice(chunk * 3),
    };
  }

  throw new Error('Invalid response format from /api/webradio/top');
}

/** @deprecated Use getTopStationsGrouped(). Kept for legacy sort helpers. */
export async function getTopStations(): Promise<RadioStation[]> {
  const grouped = await getTopStationsGrouped();
  return [
    ...grouped.featured,
    ...grouped.popular,
    ...grouped.trending,
    ...grouped.random,
  ];
}

export async function fetchTopTags(): Promise<TopTag[]> {
  const response = await fetch('/api/webradio/toptags');
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch: ${response.status} ${errorText || response.statusText}`);
  }

  return response.json();
}

export interface NowPlaying {
  title: string;
  healthy: boolean;
}

// Pulls the currently-playing track from a stream's ICY metadata, when it
// has any -- not every station supports this. healthy: false just means
// "nothing to show," not an error (project_r#23).
export async function fetchNowPlaying(streamUrl: string): Promise<NowPlaying> {
  const response = await fetch(`/api/webradio/now-playing?url=${encodeURIComponent(streamUrl)}`);
  if (!response.ok) {
    return { title: '', healthy: false };
  }
  return response.json();
}

export async function fetchCurrentUserProfile() {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const auth = JSON.parse(token);
    const res = await fetch('/api/users/me', {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      }
    });

    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
}

export async function updateProfile(fields: {
  name: string;
  location: string;
  bio: string;
  website: string;
  avatar: string;
  is_public: boolean;
  slug: string;
  favorite_genre: string;
}): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify(fields),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to update profile');
  }
}

// OnWave#43: site-wide theme, persisted per-account. Its own tiny endpoint
// rather than folded into updateProfile above -- that one is a full-form
// PATCH that would blank out name/bio/etc. if called with just a theme.
export async function updateTheme(theme: string): Promise<void> {
  const authToken = requireAuthToken();
  const response = await fetch('/api/profile/theme', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ theme }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to update theme');
  }
}

export async function uploadAvatar(file: File): Promise<string> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch('/api/profile/avatar', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${auth.token}` },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to upload avatar');
  }

  const result = await response.json();
  return result.avatarUrl;
}


export async function sortStationsByClickTrend(params: Record<string, string> = {}): Promise<RadioStation[]> {
  const stations = await getTopStations();
  return stations.sort((a, b) => b.clicktrend - a.clicktrend);
}

export async function sortStationsByListeners(params: Record<string, string> = {}): Promise<RadioStation[]> {
  const stations = await getTopStations();
  return stations.sort((a, b) => b.clickcount - a.clickcount);
}

export async function fetchStationByBitRate(params: Record<string, string> = {}): Promise<RadioStation[]> {
  const stations = await getTopStations();
  return stations.sort((a, b) => b.bitrate - a.bitrate);
}

export async function fetchStationByRandom(params: Record<string, string> = {}): Promise<RadioStation[]> {
  const stations = await getTopStations();
  return stations.sort(() => Math.random() - 0.5);
}

// ---------- Home page section helpers ----------

export const DISCOVER_GENRES = [
  'jazz', 'classical', 'electronic', 'ambient', 'chill', 'lofi',
  'rock', 'indie', 'pop', 'news', 'hip hop', 'country', 'metal',
  'reggae', 'soul', 'blues', 'folk', 'dance', 'techno', 'house',
  'drum and bass', 'world', 'latin', 'funk',
];

// Narrower pool, matching the vibe of the curated PINNED_STATIONS list —
// only used to backfill Editor's Picks if there aren't enough pinned
// stations to fill the row. Discover keeps the full DISCOVER_GENRES pool
// above since that section is meant to be broad/serendipitous.
const EDITOR_PICK_GENRES = [
  'electronic', 'house', 'techno', 'trance', 'chill', 'ambient',
  'dance', 'indie', 'alternative', 'downtempo',
];

const EDITOR_PICKS_TARGET = 8;

function isQualityStation(station: RadioStation): boolean {
  // Accept streams with no bitrate metadata (0) or at least 64 kbps, and recently verified online
  return station.lastcheckok === 1 && (station.bitrate === 0 || station.bitrate >= 64);
}

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// preferred is a bias, not a restriction — most of the time (70%) prefer a
// genre the caller says the user already likes, but still fall back to a
// fully random pick from the whole pool the rest of the time, so Discover
// keeps surfacing genres outside what someone's already liked instead of
// narrowing to just those.
function pickGenre(exclude: string[] = [], pool: string[] = DISCOVER_GENRES, preferred: string[] = []): string {
  const preferredAvailable = preferred.filter(g => !exclude.includes(g));
  if (preferredAvailable.length > 0 && Math.random() < 0.7) {
    return preferredAvailable[Math.floor(Math.random() * preferredAvailable.length)];
  }
  const available = pool.filter(g => !exclude.includes(g));
  return available[Math.floor(Math.random() * available.length)];
}

// extractPreferredGenres reads a user's liked stations' tags and returns
// whichever of DISCOVER_GENRES they actually overlap with — the signal
// pickGenre above uses to bias the Discover row. Empty if there are no
// liked stations or none of their tags match a known genre.
export function extractPreferredGenres(stations: RadioStation[]): string[] {
  const tagSet = new Set<string>();
  for (const station of stations) {
    (station.tags || '').split(',').forEach(tag => {
      const trimmed = tag.trim().toLowerCase();
      if (trimmed) tagSet.add(trimmed);
    });
  }
  return DISCOVER_GENRES.filter(genre => tagSet.has(genre));
}

async function fetchGenreStations(genre: string): Promise<RadioStation[]> {
  // Used to also pre-load and size-check every candidate's favicon in the
  // browser before returning anything — up to ~100 real image loads per
  // genre, each with a 3s worst-case timeout, done in parallel but still
  // bottlenecked by however many of them were slow or dead. That's a lot of
  // latency to spend on a quality gate that StationAvatar (the generated
  // fallback) already makes unnecessary: a broken/missing image now just
  // renders instantly as an avatar instead of a blank box, so there's no
  // need to pre-vet every candidate before a single card can render.
  const result = await fetchFromApi({ term: genre, mode: 'tag', limit: '100', min_bitrate: '64' });
  return fisherYatesShuffle(result.stations.filter(isQualityStation));
}

export async function fetchHomePageSections(preferredGenres: string[] = []): Promise<{
  featured: RadioStation[];
  popular: RadioStation[];
  discover: RadioStation[];
  featuredGenre: string;
  discoverGenre: string;
}> {
  // Editor's Picks is genuinely curated now — PINNED_STATIONS fills the row
  // first, and a genre fetch only backfills remaining slots (from a narrow,
  // taste-matched pool, not the broad Discover one) if the curated list is
  // too short. With enough pinned stations, no genre fetch happens at all.
  // Deliberately NOT biased by preferredGenres — Editor's Picks stays
  // exactly as curated regardless of what the viewer has liked.
  const needsBackfill = PINNED_STATIONS.length < EDITOR_PICKS_TARGET;
  const featuredGenre = needsBackfill ? pickGenre([], EDITOR_PICK_GENRES) : '';
  const discoverGenre = pickGenre(featuredGenre ? [featuredGenre] : [], DISCOVER_GENRES, preferredGenres);

  const [grouped, featuredResult, discoverResult] = await Promise.all([
    getTopStationsGrouped(),
    needsBackfill ? fetchGenreStations(featuredGenre).catch(() => [] as RadioStation[]) : Promise.resolve([] as RadioStation[]),
    fetchGenreStations(discoverGenre).catch(() => [] as RadioStation[]),
  ]);

  // grouped.popular is already favicon-checked server-side (PopCache only
  // keeps candidates with a reachable favicon, see webradio.PopCache) — no
  // need to re-vet it client-side too.
  const popular = grouped.popular.slice(0, 8);
  // trending isn't shown anywhere anymore, but its computation still feeds
  // the seen-set below so Discover doesn't repeat stations already shown.
  const trending = grouped.trending.slice(0, 8);

  const pinnedUuids = new Set(PINNED_STATIONS.map(s => s.stationuuid));
  let featured = [...PINNED_STATIONS];
  if (featured.length < EDITOR_PICKS_TARGET) {
    const backfillPool = featuredResult.length > 0 ? featuredResult : grouped.featured;
    const backfill = backfillPool.filter(s => !pinnedUuids.has(s.stationuuid));
    featured = [...featured, ...backfill].slice(0, EDITOR_PICKS_TARGET);
  }

  // Collect IDs already shown so Discover doesn't repeat them
  const seen = new Set<string>([
    ...featured.map(s => s.stationuuid),
    ...popular.map(s => s.stationuuid),
    ...trending.map(s => s.stationuuid),
  ]);

  const discoverPool = discoverResult.length > 0
    ? discoverResult.filter(s => !seen.has(s.stationuuid))
    : grouped.random.filter(s => !seen.has(s.stationuuid));

  return {
    featured,
    popular,
    discover: discoverPool.slice(0, 8),
    featuredGenre,
    discoverGenre,
  };
}

export async function fetchDiscoverSection(exclude: string[] = [], count: number = 8, preferredGenres: string[] = []): Promise<{
  stations: RadioStation[];
  genre: string;
}> {
  const genre = pickGenre(exclude, DISCOVER_GENRES, preferredGenres);
  try {
    return { stations: (await fetchGenreStations(genre)).slice(0, count), genre };
  } catch {
    return { stations: [], genre };
  }
}

// Mood-based discovery (OnWave#36) — fetches each tag in a mood's tag list
// in parallel (same mode=tag search fetchGenreStations already uses), pools
// and dedupes the results, and shuffles so the resulting queue mixes tags
// rather than running through one tag at a time.
export async function fetchMoodStations(tags: string[], count: number = 24): Promise<RadioStation[]> {
  const results = await Promise.allSettled(
    tags.map(tag => fetchFromApi({ term: tag, mode: 'tag', limit: '50', min_bitrate: '64' }))
  );

  const seen = new Set<string>();
  const pooled: RadioStation[] = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const station of result.value.stations) {
      if (!isQualityStation(station)) continue;
      const key = station.stationuuid || station.name;
      if (seen.has(key)) continue;
      seen.add(key);
      pooled.push(station);
    }
  }

  return fisherYatesShuffle(pooled).slice(0, count);
}

export async function fetchPBSShowsByDateRange(days: number = 7): Promise<PBSShow[]> {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + days);
  
  const params = new URLSearchParams({
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0]
  });

  // Frontend calls the Next.js API proxy route; proxy forwards to backend /pbs/shows/range.
  const response = await fetch(`/api/pbs/shows/range?${params}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch PBS shows: ${response.status} ${errorText || response.statusText}`);
  }

  const data = await response.json();

  const shows = Array.isArray(data) ? data : data?.shows;

  if (!Array.isArray(shows)) {
    console.error('Unexpected API response format:', data);
    throw new Error('Invalid response format from PBS shows endpoint');
  }

  return shows;
}

export interface LiveNowResult {
  internal: InternalShow[];
  external: PBSShow[];
}

// Merges OnWave-native live shows with external (PBS-scraped) shows
// currently live into one "everything live right now" answer — the Live
// tab renders both, and the Shows tab's Schedule view just needs the count
// for its "X live now" banner. Each half fails independently so one source
// being briefly unavailable doesn't blank out the other.
export async function fetchAllLiveNow(): Promise<LiveNowResult> {
  const [internalShows, externalShows] = await Promise.all([
    fetchAllShows().catch(() => [] as InternalShow[]),
    fetchPBSShowsByDateRange(30).catch(() => [] as PBSShow[]),
  ]);
  return {
    internal: internalShows.filter(s => s.status === 'live'),
    external: externalShows.filter(s => s.status === 'live'),
  };
}

export async function createReminder(reminderData: {
  show_name: string;
  show_date: string;
  show_start_time: string;
  reminder_minutes_before: number;
}) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    throw new Error('User not authenticated');
  }
  
  const auth = JSON.parse(token);
  const response = await fetch('/api/reminders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify(reminderData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    
    if (response.status === 409 || (errorData.message && errorData.message.includes('Duplicate entry'))) {
      throw new Error('You already have a reminder set for this show');
    }
    
    throw new Error(errorData.message || 'Failed to create reminder');
  }

  const result = await response.json();
  
  return {
    id: result.id,
    show_name: reminderData.show_name,
    show_date: reminderData.show_date,
    show_start_time: reminderData.show_start_time,
    reminder_minutes_before: reminderData.reminder_minutes_before,
    created_at: new Date().toISOString(),
  };
}

export async function getUserReminders() {
  const token = localStorage.getItem("token");
  
  if (!token) {
    throw new Error('User not authenticated');
  }
  
  const auth = JSON.parse(token);
  const response = await fetch(`/api/reminders`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${auth.token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    
    throw new Error(errorData.message || 'Failed to fetch reminders');
  }

  const result = await response.json();
  return result.reminders || [];
}

export async function deleteReminder(reminderId: string) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    throw new Error('User not authenticated');
  }
  
  const auth = JSON.parse(token);
  const response = await fetch(`/api/reminders/${reminderId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${auth.token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    
    throw new Error(errorData.message || 'Failed to delete reminder');
  }

  return response.ok;
}

export interface LikedStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  country: string;
  codec: string;
  bitrate: number;
  is_custom: boolean;
  created_at: string;
}

export function likedStationToRadioStation(liked: LikedStation): RadioStation {
  return {
    stationuuid: liked.stationuuid,
    name: liked.name,
    url: liked.url,
    url_resolved: liked.url_resolved || liked.url,
    homepage: '',
    favicon: liked.favicon,
    has_valid_favicon: !!liked.favicon,
    tags: liked.tags,
    country: liked.country,
    countrycode: '',
    state: '',
    language: '',
    languagecodes: '',
    bitrate: liked.bitrate,
    codec: liked.codec,
    votes: 0,
    clickcount: 0,
    clicktrend: 0,
    lastchangetime: '',
    lastchangetime_iso8601: '',
    lastchecktime: '',
    lastchecktime_iso8601: '',
    lastcheckok: 1,
    lastcheckoktime: '',
    lastcheckoktime_iso8601: '',
    lastlocalchecktime: '',
    lastlocalchecktime_iso8601: '',
    ssl_error: 0,
    has_extended_info: false,
    serveruuid: liked.stationuuid,
    changeuuid: '',
    iso_3166_2: '',
    hls: 0,
    is_custom: liked.is_custom,
  };
}

export async function fetchLikedStations(): Promise<LikedStation[]> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/liked-stations', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${auth.token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    throw new Error(errorData.message || 'Failed to fetch liked stations');
  }

  const result = await response.json();
  return result.stations || [];
}

export async function likeStation(station: RadioStation): Promise<void> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/liked-stations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      stationuuid: station.stationuuid,
      name: station.name,
      url: station.url,
      url_resolved: station.url_resolved,
      favicon: station.favicon,
      tags: station.tags,
      country: station.country,
      codec: station.codec,
      bitrate: station.bitrate,
      is_custom: station.is_custom || false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    throw new Error(errorData.message || 'Failed to like station');
  }
}

// Validates a candidate "bring your own" stream URL (OnWave#32) before it's
// saved — backed by project_r's internal/resolver, the same URL-resolution
// logic already used for search/pinned stations, now wired to an
// authenticated, rate-limited endpoint.
export async function resolveStationUrl(url: string): Promise<{ suggested_uuid: string; url_resolved: string; name: string; tags: string }> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/liked-stations/resolve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || "Couldn't verify that URL");
  }

  return response.json();
}

export async function unlikeStation(stationUuid: string): Promise<void> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch(`/api/liked-stations/${stationUuid}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${auth.token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    throw new Error(errorData.message || 'Failed to unlike station');
  }
}

export type BadgeScope = 'global' | 'station' | 'dj' | 'show';
export type BadgeAwardRule = 'on_join' | 'on_chat_participate';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  // An uploaded image, when set, takes display priority over icon — see
  // BadgeIcon.tsx. icon (text/emoji) stays as the fallback wherever this
  // is absent.
  icon_url?: string | null;
  description: string;
  issuer_id?: string | null;
  issuer_type?: 'dj' | 'station' | null;
  issuer_name?: string | null;
  scope: BadgeScope;
  show_issuer_id?: string | null;
  award_rule?: BadgeAwardRule | null;
  // Admin-only to set (see updateBadgeSplash) -- marks this badge special
  // enough to interrupt with a full splash announcement when awarded,
  // instead of the toast every other badge gets.
  announce_splash: boolean;
  created_at: string;
}

export interface Station {
  id: string;
  name: string;
  slug?: string | null;
  created_at: string;
}

export interface MyBadge extends Badge {
  is_new: boolean;
}

export async function fetchBadges(): Promise<Badge[]> {
  const response = await fetch('/api/badges');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch badges');
  }
  const result = await response.json();
  return result.badges || [];
}

export async function fetchMyBadges(): Promise<MyBadge[]> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/users/me/badges', {
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to fetch badges');
  }

  const result = await response.json();
  return result.badges || [];
}

// Clears the "new" indicator on every badge the caller currently holds —
// call once they've had a chance to see it (e.g. after loading /profile).
export async function markBadgesSeen(): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) return;

  const auth = JSON.parse(token);
  await fetch('/api/users/me/badges/seen', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${auth.token}` },
  }).catch(() => {});
}

// fetchManagedBadges returns the badges the caller can award/revoke — every
// badge for an admin, or just their own DJ badges plus any station they
// belong to otherwise.
export async function fetchManagedBadges(): Promise<Badge[]> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/badges/mine', {
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to fetch badges');
  }

  const result = await response.json();
  return result.badges || [];
}

export async function fetchMyStations(): Promise<Station[]> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/users/me/stations', {
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to fetch stations');
  }

  const result = await response.json();
  return result.stations || [];
}

// The public station directory — every station, not just the caller's own.
export async function fetchAllStations(): Promise<Station[]> {
  const response = await fetch('/api/stations');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch stations');
  }
  const result = await response.json();
  return result.stations || [];
}

export async function fetchUserStations(userId: string): Promise<Station[]> {
  // See fetchPublicProfile's comment -- same owner-preview exception applies.
  const response = await fetch(`/api/users/${userId}/stations`, { headers: optionalAuthHeaders() });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch stations');
  }
  const result = await response.json();
  return result.stations || [];
}

export async function createBadge(badge: {
  name: string;
  icon: string;
  description?: string;
  station_id?: string;
  scope?: BadgeScope;
  show_id?: string;
  award_rule?: BadgeAwardRule;
}): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/badges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify(badge),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to create badge');
  }
}

export async function uploadBadgeIcon(badgeId: string, file: File): Promise<string> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const formData = new FormData();
  formData.append('icon', file);

  const response = await fetch(`/api/badges/${badgeId}/icon`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${auth.token}` },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to upload badge icon');
  }

  const result = await response.json();
  return result.icon_url;
}

export async function awardBadge(email: string, badgeId: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/badges/award', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ email, badge_id: badgeId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to award badge');
  }
}

export async function revokeBadge(email: string, badgeId: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/badges/revoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ email, badge_id: badgeId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to revoke badge');
  }
}

// Admin-only (enforced server-side) -- marks a badge special enough to
// interrupt with a full splash announcement when awarded, instead of the
// toast every other badge gets.
export async function updateBadgeSplash(badgeId: string, announceSplash: boolean): Promise<void> {
  const authToken = requireAuthToken();
  const response = await fetch(`/api/badges/${badgeId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ announce_splash: announceSplash }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to update badge');
  }
}

// fetchBadgeLoadout / setBadgeLoadout manage a user's standing preference
// for which of their held badges to display in chat, and in what order —
// separate from award/revoke, which is about who holds a badge at all.
export async function fetchBadgeLoadout(): Promise<string[]> {
  const authToken = requireAuthToken();
  const response = await fetch('/api/users/me/badges/loadout', {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to fetch badge loadout');
  }
  const result = await response.json();
  return result.badge_ids || [];
}

export async function setBadgeLoadout(badgeIds: string[]): Promise<void> {
  const authToken = requireAuthToken();
  const response = await fetch('/api/users/me/badges/loadout', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ badge_ids: badgeIds }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to set badge loadout');
  }
}

// --- Live chat (M5) ---

export interface ChatBadge {
  id: string;
  name: string;
  icon: string;
  icon_url?: string | null;
}

export interface ChatMessage {
  id: string;
  show_id: string;
  user_id: string;
  username: string;
  body: string;
  created_at: string;
  badges?: ChatBadge[];
}

export async function fetchChatHistory(showId: string): Promise<ChatMessage[]> {
  const response = await fetch(`/api/shows/${showId}/chat/history`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch chat history');
  }
  const result = await response.json();
  return result.messages || [];
}

export async function sendChatMessage(showId: string, body: string): Promise<ChatMessage> {
  const authToken = requireAuthToken();
  const response = await fetch(`/api/shows/${showId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ body }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to send message');
  }
  return response.json();
}

export async function deleteChatMessage(showId: string, messageId: string): Promise<void> {
  const authToken = requireAuthToken();
  const response = await fetch(`/api/shows/${showId}/chat/${messageId}/delete`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to delete message');
  }
}

export async function muteChatUser(showId: string, userId: string, durationMinutes?: number): Promise<void> {
  const authToken = requireAuthToken();
  const response = await fetch(`/api/shows/${showId}/chat/mute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ user_id: userId, duration_minutes: durationMinutes }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to mute user');
  }
}

export async function unmuteChatUser(showId: string, userId: string): Promise<void> {
  const authToken = requireAuthToken();
  const response = await fetch(`/api/shows/${showId}/chat/unmute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to unmute user');
  }
}

export async function updateChatSettings(showId: string, profanityFilterEnabled: boolean): Promise<void> {
  const authToken = requireAuthToken();
  const response = await fetch(`/api/shows/${showId}/chat/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ profanity_filter_enabled: profanityFilterEnabled }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to update chat settings');
  }
}

export interface StationRequest {
  id: string;
  requester_id: string;
  name: string;
  description: string;
  requested_handle?: string | null;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface DJRequest {
  id: string;
  requester_id: string;
  message?: string | null;
  source: 'self_apply' | 'admin_grant';
  status: 'pending' | 'approved' | 'denied';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export async function createStationRequest(request: { name: string; description?: string; requested_handle?: string }): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/station-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to submit station request');
  }
}

export async function createDJRequest(request: { message?: string }): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/dj-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to submit DJ request');
  }
}

export async function fetchPendingStationRequests(): Promise<StationRequest[]> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/admin/station-requests', {
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to fetch station requests');
  }

  const result = await response.json();
  return result.station_requests || [];
}

export async function fetchPendingDJRequests(): Promise<DJRequest[]> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/admin/dj-requests', {
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to fetch DJ requests');
  }

  const result = await response.json();
  return result.dj_requests || [];
}

export async function approveStationRequest(id: string): Promise<string> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch(`/api/admin/station-requests/${id}/approve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to approve station request');
  }

  const result = await response.json();
  return result.station_id;
}

export async function denyStationRequest(id: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch(`/api/admin/station-requests/${id}/deny`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to deny station request');
  }
}

export async function approveDJRequest(id: string): Promise<string> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch(`/api/admin/dj-requests/${id}/approve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to approve DJ request');
  }

  const result = await response.json();
  return result.user_id;
}

export async function denyDJRequest(id: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch(`/api/admin/dj-requests/${id}/deny`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to deny DJ request');
  }
}

export async function grantDJByUsername(username: string): Promise<string> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/admin/dj-requests/grant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to grant DJ role');
  }

  const result = await response.json();
  return result.user_id;
}

export type FeedbackType = 'bug' | 'feature' | 'station_suggestion';

export interface FeedbackReport {
  id: string;
  user_id?: string;
  username?: string;
  type: FeedbackType;
  message: string;
  page_url?: string;
  user_agent?: string;
  status: 'open' | 'resolved';
  created_at: string;
}

// Deliberately usable when logged out — the floating feedback button
// appears on every page, including ones a guest can see before signing in.
// A token is attached when one exists so the report is linked to the
// submitter, but its absence isn't an error.
export async function submitFeedback(type: FeedbackType, message: string, pageUrl: string): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem("token");
  if (token) {
    try {
      headers['Authorization'] = `Bearer ${JSON.parse(token).token}`;
    } catch {
      // Malformed stored token — submit anonymously rather than failing.
    }
  }

  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type,
      message,
      page_url: pageUrl,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new Error('Too many reports submitted recently — please try again later.');
    }
    throw new Error(errorData.message || 'Failed to submit report');
  }
}

export async function fetchFeedbackReports(): Promise<FeedbackReport[]> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/admin/feedback', {
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to fetch feedback reports');
  }

  const result = await response.json();
  return result.reports || [];
}

export async function resolveFeedbackReport(id: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch(`/api/admin/feedback/${id}/resolve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to resolve report');
  }
}

export async function generateFoundingMemberInvite(): Promise<string> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/admin/founding-member-invites', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to generate invite');
  }

  const result = await response.json();
  return result.code;
}

export async function inviteStationMember(stationId: string, invite: { username?: string; email?: string }): Promise<string> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch(`/api/stations/${stationId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify(invite),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to invite member');
  }

  const result = await response.json();
  return result.message;
}

export async function updateStation(stationId: string, update: { name?: string; slug?: string }): Promise<string> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch(`/api/stations/${stationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to update station');
  }

  const result = await response.json();
  return result.message;
}

export async function removeStationMember(stationId: string, userId: string): Promise<string> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch(`/api/stations/${stationId}/members/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${auth.token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to remove member');
  }

  const result = await response.json();
  return result.message;
}

export interface Follow {
  target_type: 'station' | 'show' | 'program';
  target_id: string;
  name: string;
  created_at: string;
}

export async function fetchMyFollows(): Promise<Follow[]> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/users/me/follows', {
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to fetch follows');
  }

  const result = await response.json();
  return result.follows || [];
}

export async function followTarget(targetType: 'station' | 'show' | 'program', targetId: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/follows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
    body: JSON.stringify({ target_type: targetType, target_id: targetId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to follow');
  }
}

export async function unfollowTarget(targetType: 'station' | 'show' | 'program', targetId: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/follows/unfollow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
    body: JSON.stringify({ target_type: targetType, target_id: targetId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to unfollow');
  }
}

export interface ShowSummary {
  id: string;
  name: string;
  description: string;
  dj_id?: string | null;
  dj_name?: string | null;
  day_of_week?: number | null;
  one_off_date?: string | null;
  start_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'live' | 'ended' | 'terminated';
}

export interface StationMember {
  user_id: string;
  name: string;
  role: string;
}

export interface ScrapedShowSummary {
  name: string;
  dj?: string;
  day: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'live' | 'expired' | 'unknown';
  program_url?: string;
}

export interface StationDetail {
  id: string;
  name: string;
  slug?: string | null;
  follower_count: number;
  created_at: string;
  shows: ShowSummary[];
  scraped_shows: ScrapedShowSummary[];
  members: StationMember[];
  badges: Pick<Badge, 'id' | 'name' | 'icon' | 'description'>[];
}

export async function fetchStation(handle: string): Promise<StationDetail | null> {
  const response = await fetch(`/api/stations/${handle}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch station');
  }
  return response.json();
}

export async function fetchPublicProfile(userId: string): Promise<Profile | null> {
  // Sent when available, but never required -- an anonymous/logged-out
  // viewer still gets a real public profile fine. Only matters for the one
  // case the backend special-cases: the profile's own owner previewing
  // their own currently-private profile.
  const response = await fetch(`/api/users/${userId}/profile`, { headers: optionalAuthHeaders() });
  if (!response.ok) {
    if (response.status === 404) return null;
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch profile');
  }
  return response.json();
}

export async function fetchUserBadges(userId: string): Promise<Badge[]> {
  // See fetchPublicProfile's comment -- same owner-preview exception applies.
  const response = await fetch(`/api/users/${userId}/badges`, { headers: optionalAuthHeaders() });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch badges');
  }
  const result = await response.json();
  return result.badges || [];
}

// createClip uploads a ~30s webm recording (video or audio) captured by
// ClipButton's rolling buffer, attributing it to the currently logged-in
// user. See project_r#21.
export async function createClip(showId: string, blob: Blob, durationSeconds: number): Promise<Clip> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('User not authenticated');
  }
  const auth = JSON.parse(token);
  const formData = new FormData();
  formData.append('clip', blob, 'clip.webm');
  formData.append('duration_seconds', String(durationSeconds));

  const response = await fetch(`/api/shows/${showId}/clips`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${auth.token}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorText || 'Failed to save clip');
  }
  return response.json();
}

export async function fetchShowClips(showId: string): Promise<Clip[]> {
  const response = await fetch(`/api/shows/${showId}/clips`);
  if (!response.ok) return [];
  return response.json();
}

export async function fetchStationClips(handle: string): Promise<Clip[]> {
  const response = await fetch(`/api/stations/${handle}/clips`);
  if (!response.ok) return [];
  return response.json();
}

export async function fetchDJClips(userId: string): Promise<Clip[]> {
  const response = await fetch(`/api/users/${userId}/clips`);
  if (!response.ok) return [];
  return response.json();
}

export async function fetchAllShows(): Promise<InternalShow[]> {
  const response = await fetch('/api/shows');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch shows');
  }
  const result = await response.json();
  return result.shows || [];
}

export async function createShow(show: {
  name: string;
  description?: string;
  station_id?: string;
  day_of_week?: number;
  one_off_date?: string;
  start_time: string;
  duration_minutes?: number;
  tags?: string;
}): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/shows', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify(show),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to create show');
  }
}

export async function fetchShow(showId: string): Promise<InternalShow> {
  const response = await fetch(`/api/shows/${showId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch show');
  }
  return response.json();
}

// Gets-or-creates the chat room for a currently-live external (PBS-scraped)
// show and returns its show id — see project_r#30. Requires login (same as
// joining any other show's chat).
export async function joinExternalShowRoom(stationName: string, showName: string, startTime?: string, durationMinutes?: number): Promise<string> {
  const authToken = requireAuthToken();
  const response = await fetch('/api/shows/external-room', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ station_name: stationName, show_name: showName, start_time: startTime, duration_minutes: durationMinutes }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to open room');
  }
  const result = await response.json();
  return result.id;
}

// Opens a listen-together room (project_r#33) for any station — radio-
// browser or a user's own saved/BYO one (OnWave#32) — and returns its show
// id, reusing the same /shows/{id} watch page every other live show uses.
export async function createRoom(stationName: string, stationUrl: string, isPublic: boolean, tags?: string): Promise<string> {
  const authToken = requireAuthToken();
  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ station_name: stationName, station_url: stationUrl, is_public: isPublic, tags }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to open room');
  }
  const result = await response.json();
  return result.id;
}

// Every open public room — the Live tab's listing of rooms anyone can join.
export async function listPublicRooms(): Promise<InternalShow[]> {
  const response = await fetch('/api/rooms');
  if (!response.ok) {
    return [];
  }
  const result = await response.json();
  return result.rooms || [];
}

// Ends a room — only its opener or an admin may do this.
export async function closeRoom(roomId: string): Promise<void> {
  const authToken = requireAuthToken();
  const response = await fetch(`/api/rooms/${roomId}/close`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to close room');
  }
}

export interface GoLiveOptions {
  agreed_to_terms: boolean;
  own_license?: boolean;
  // Marks this broadcast as not carrying chat -- for a partner stream
  // whose own audience has no way to see or take part in it. See
  // project_r#32.
  no_interaction?: boolean;
  // Marks this broadcast as talk-only (no music) -- the music-licensing
  // acknowledgment doesn't apply. See project_r#42.
  no_music?: boolean;
  // Marks this broadcast as publishing a camera video track alongside
  // audio. See project_r#20.
  is_video?: boolean;
}

export interface GoLiveResult {
  show_id: string;
  room_name: string;
  token: string;
}

function requireAuthToken(): string {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('User not authenticated');
  }
  return JSON.parse(token).token;
}

// For an endpoint that's reachable anonymously but behaves differently for
// a recognized caller (e.g. the profile-privacy owner-exception on
// fetchPublicProfile/fetchUserBadges/fetchUserStations below) — never
// throws, since being logged out is a normal, expected case here, not an
// error. Returns {} (no Authorization header at all) rather than a header
// with an empty/invalid value when there's nothing usable stored.
function optionalAuthHeaders(): HeadersInit {
  try {
    const tokenString = localStorage.getItem('token');
    if (!tokenString) return {};
    return { 'Authorization': `Bearer ${JSON.parse(tokenString).token}` };
  } catch {
    return {};
  }
}

// goLive starts broadcasting on an existing scheduled show.
export async function goLive(showId: string, options: GoLiveOptions): Promise<GoLiveResult> {
  const authToken = requireAuthToken();
  const response = await fetch(`/api/shows/${showId}/go-live`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to go live');
  }
  return response.json();
}

// goLiveAdhoc creates a spontaneous show and starts broadcasting on it in
// one step — the "on the fly" path, as opposed to attaching to something
// already on the schedule. Leave station_id unset to go live as an
// independent DJ under your own name.
export async function goLiveAdhoc(options: GoLiveOptions & {
  name: string;
  description?: string;
  station_id?: string;
  tags?: string;
}): Promise<GoLiveResult> {
  const authToken = requireAuthToken();
  const response = await fetch('/api/shows/go-live/adhoc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to go live');
  }
  return response.json();
}

export interface JoinBroadcastResult {
  room_name: string;
  token: string;
}

// joinBroadcast returns a listen-only token for a currently-live show.
// Deliberately usable when logged out (project_r#19) -- listening to a
// live show shouldn't require an account, only chatting/following should.
// A token is attached when one exists so a logged-in listener's session
// is still attributable server-side, but its absence isn't an error.
export async function joinBroadcast(showId: string): Promise<JoinBroadcastResult> {
  const headers: Record<string, string> = {};
  const stored = localStorage.getItem('token');
  if (stored) {
    try {
      headers['Authorization'] = `Bearer ${JSON.parse(stored).token}`;
    } catch {
      // Malformed stored token -- join anonymously rather than failing.
    }
  }

  const response = await fetch(`/api/shows/${showId}/join`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || "This show isn't live right now");
  }
  return response.json();
}

// endBroadcast is the broadcaster's own graceful stop.
export async function endBroadcast(showId: string): Promise<void> {
  const authToken = requireAuthToken();
  const response = await fetch(`/api/shows/${showId}/end`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to end broadcast');
  }
}

// terminateBroadcast is the admin kill switch — ends someone else's live
// broadcast immediately, with a required reason stored for audit.
export async function terminateBroadcast(showId: string, reason: string): Promise<void> {
  const authToken = requireAuthToken();
  const response = await fetch(`/api/admin/shows/${showId}/terminate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to terminate broadcast');
  }
}

export async function deleteShow(showId: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch(`/api/shows/${showId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.message || 'Failed to delete show');
  }
}

export async function signInWithGoogle(idToken: string): Promise<void> {
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to sign in with Google');
  }

  const result = await response.json();
  localStorage.setItem('token', JSON.stringify({ token: result.token, userId: result.userId }));
}

// Always resolves with the backend's generic message, whether or not the
// email matched an account — that's deliberate anti-enumeration behavior
// on the backend, not something to work around here.
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const response = await fetch('/api/users/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || 'Failed to request a password reset');
  }
  return response.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const response = await fetch('/api/users/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || 'Failed to reset password');
  }
  return response.json();
}

export async function changeUsername(username: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/users/me/change-username', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to change username');
  }
}

export async function changeEmail(newEmail: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/users/me/change-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ new_email: newEmail }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to change email');
  }
}

export async function verifyEmailChange(verifyToken: string): Promise<void> {
  const response = await fetch('/api/users/verify-email-change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: verifyToken }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to confirm email change');
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/users/me/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to change password');
  }
}

export async function exportAccountData(): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/users/me/export', {
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to export data');
  }

  const data = await response.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'onwave-data-export.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface MemberRef {
  user_id: string;
  name: string;
}

export interface StationNeedingTransfer {
  station_id: string;
  station_name: string;
  other_members: MemberRef[];
}

export interface StationToArchive {
  station_id: string;
  station_name: string;
}

export interface DeletionPreview {
  stations_needing_transfer: StationNeedingTransfer[];
  stations_to_archive: StationToArchive[];
}

export async function fetchDeletionPreview(): Promise<DeletionPreview> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/users/me/deletion-preview', {
    headers: { 'Authorization': `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to load deletion preview');
  }

  return response.json();
}

export async function deleteAccount(confirmation: {
  currentPassword?: string;
  confirmationPhrase?: string;
  ownershipTransfers: { station_id: string; new_owner_user_id: string }[];
}): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error('User not authenticated');
  }

  const auth = JSON.parse(token);
  const response = await fetch('/api/users/me', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      current_password: confirmation.currentPassword,
      confirmation_phrase: confirmation.confirmationPhrase,
      ownership_transfers: confirmation.ownershipTransfers,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to delete account');
  }
}

// OnWave#40: a user's personal Butterchurn preset rotation. Presets are
// identified by name (butterchurn-presets' own key, e.g. "Unchained -
// Rewop") since the preset library itself is a client-side npm package with
// no separate numeric id -- this only remembers which names one particular
// account picked.
export interface InstalledPreset {
  preset_name: string;
  installed_at: string;
}

export async function fetchInstalledPresets(): Promise<InstalledPreset[]> {
  const authToken = requireAuthToken();
  const response = await fetch('/api/installed-presets', {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to fetch installed presets');
  }
  const data = await response.json();
  return data.presets ?? [];
}

export async function installPreset(presetName: string): Promise<void> {
  const authToken = requireAuthToken();
  const response = await fetch('/api/installed-presets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ preset_name: presetName }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to install preset');
  }
}

export async function uninstallPreset(presetName: string): Promise<void> {
  const authToken = requireAuthToken();
  const response = await fetch(`/api/installed-presets/${encodeURIComponent(presetName)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(errorData.error || 'Failed to uninstall preset');
  }
}