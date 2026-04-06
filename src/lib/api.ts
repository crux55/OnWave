import type { RadioStation, TopTag, PBSShow, WebradioSearchResponse, TopStationsResponse } from '@/lib/types';

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

export async function fetchHomePageSections(): Promise<{
  featured: RadioStation[];
  popular: RadioStation[];
  trending: RadioStation[];
  discover: RadioStation[];
  discoverGenre: string;
}> {
  const grouped = await getTopStationsGrouped();

  // Use the backend's pre-sorted, pre-deduplicated categories directly.
  // Slice to 4 cards per section; fall back gracefully if a category is empty.
  const featured = grouped.featured.slice(0, 4);
  const popular = grouped.popular.slice(0, 4);
  const trending = grouped.trending.slice(0, 4);

  // Collect IDs already shown so Discover doesn't repeat them
  const seen = new Set<string>([
    ...featured.map(s => s.stationuuid),
    ...popular.map(s => s.stationuuid),
    ...trending.map(s => s.stationuuid),
  ]);

  // Discover: try a random genre first, fall back to backend's random category
  const genre = DISCOVER_GENRES[Math.floor(Math.random() * DISCOVER_GENRES.length)];
  let discoverPool: RadioStation[] = [];
  try {
    const result = await fetchFromApi({ term: genre, limit: '60', min_bitrate: '64' });
    discoverPool = result.stations
      .filter(isQualityStation)
      .filter(s => !seen.has(s.stationuuid));
  } catch {
    // Fallback: use the backend's random category, excluding already-shown stations
    discoverPool = grouped.random.filter(s => !seen.has(s.stationuuid));
  }

  return {
    featured,
    popular,
    trending,
    discover: fisherYatesShuffle(discoverPool).slice(0, 4),
    discoverGenre: genre,
  };
}

export async function fetchDiscoverSection(): Promise<{
  stations: RadioStation[];
  genre: string;
}> {
  const genre = DISCOVER_GENRES[Math.floor(Math.random() * DISCOVER_GENRES.length)];
  try {
    const result = await fetchFromApi({ term: genre, limit: '60', min_bitrate: '64' });
    const filtered = result.stations.filter(isQualityStation);
    return {
      stations: fisherYatesShuffle(filtered).slice(0, 4),
      genre,
    };
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