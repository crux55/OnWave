import type { RadioStation, TopTag, PBSShow, WebradioSearchResponse, TopStationsResponse } from '@/lib/types';
import { PINNED_STATIONS } from '@/lib/pinned-stations';

export async function fetchFromApi(params: Record<string, string> = {}): Promise<WebradioSearchResponse> {
  const queryString = new URLSearchParams(params).toString();
  const url = `/api/webradio/search${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);
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

function pickGenre(exclude: string[] = [], pool: string[] = DISCOVER_GENRES): string {
  const available = pool.filter(g => !exclude.includes(g));
  return available[Math.floor(Math.random() * available.length)];
}

async function fetchGenreStations(genre: string): Promise<RadioStation[]> {
  const result = await fetchFromApi({ term: genre, limit: '60', min_bitrate: '64' });
  return fisherYatesShuffle(result.stations.filter(isQualityStation));
}

export async function fetchHomePageSections(): Promise<{
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
  const needsBackfill = PINNED_STATIONS.length < EDITOR_PICKS_TARGET;
  const featuredGenre = needsBackfill ? pickGenre([], EDITOR_PICK_GENRES) : '';
  const discoverGenre = pickGenre(featuredGenre ? [featuredGenre] : []);

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

export async function fetchDiscoverSection(exclude: string[] = [], count: number = 8): Promise<{
  stations: RadioStation[];
  genre: string;
}> {
  const genre = pickGenre(exclude);
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