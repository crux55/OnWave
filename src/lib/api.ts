import type { RadioStation, TopTag, PBSShow, InternalShow, WebradioSearchResponse, TopStationsResponse, Profile } from '@/lib/types';
import { PINNED_STATIONS } from '@/lib/pinned-stations';

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

const DECADE_TAG_PATTERN = /^(19|20)?\d{2}s?$/i;

// rebalanceTopTags fixes the raw catalog's tag-frequency data being
// dominated by decade tags (70s, 1970, 80s, ...) — so many stations tag
// themselves by decade that genre tags get crowded out of a plain
// frequency sort. Decades stay (browsing "80s" radio is legitimate), just
// capped, with genre matches sorted to the front so they aren't drowned
// out by raw frequency.
export function rebalanceTopTags(tags: TopTag[], maxDecadeTags: number = 6, total: number = 30): TopTag[] {
  const decadeTags: TopTag[] = [];
  const otherTags: TopTag[] = [];
  for (const tag of tags) {
    if (DECADE_TAG_PATTERN.test(tag.name.trim())) {
      decadeTags.push(tag);
    } else {
      otherTags.push(tag);
    }
  }

  const genreSet = new Set(DISCOVER_GENRES);
  const genreMatches = otherTags.filter(tag => genreSet.has(tag.name.trim().toLowerCase()));
  const otherNonGenre = otherTags.filter(tag => !genreSet.has(tag.name.trim().toLowerCase()));

  return [...genreMatches, ...otherNonGenre, ...decadeTags.slice(0, maxDecadeTags)].slice(0, total);
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

const DISCOVER_GENRES = [
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
  const result = await fetchFromApi({ term: genre, limit: '60', min_bitrate: '64' });
  return fisherYatesShuffle(result.stations.filter(isQualityStation));
}

export async function fetchHomePageSections(preferredGenres: string[] = []): Promise<{
  featured: RadioStation[];
  popular: RadioStation[];
  trending: RadioStation[];
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

  const popular = grouped.popular.slice(0, 8);
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
    trending,
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

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  issuer_id?: string | null;
  issuer_type?: 'dj' | 'station' | null;
  issuer_name?: string | null;
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
  const response = await fetch(`/api/users/${userId}/stations`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch stations');
  }
  const result = await response.json();
  return result.stations || [];
}

export async function createBadge(badge: { name: string; icon: string; description?: string; station_id?: string }): Promise<void> {
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
  const response = await fetch(`/api/users/${userId}/profile`);
  if (!response.ok) {
    if (response.status === 404) return null;
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch profile');
  }
  return response.json();
}

export async function fetchUserBadges(userId: string): Promise<Badge[]> {
  const response = await fetch(`/api/users/${userId}/badges`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch badges');
  }
  const result = await response.json();
  return result.badges || [];
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