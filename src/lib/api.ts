import type { RadioStation, TopTag, PBSShow } from '@/lib/types';

export async function fetchFromApi(params: Record<string, string> = {}): Promise<RadioStation[]> {
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const queryString = new URLSearchParams(params).toString();
  const url = `${apiHost}/webradio/search${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch: ${response.status} ${errorText || response.statusText}`);
  }

  return response.json();
}

export async function getTopStations(): Promise<RadioStation[]> {
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const url = `${apiHost}/webradio/top`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch: ${response.status} ${errorText || response.statusText}`);
  }

  return response.json();
}

export async function fetchTopTags(): Promise<TopTag[]> {
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const url = `${apiHost}/webradio/toptags`;

  const response = await fetch(url);
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
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const auth = JSON.parse(token);
  const res = await fetch(`${apiHost}/users/me`, {
    headers: {
      Authorization: `Bearer ${auth.token}`,
    }
  });

  if (!res.ok) return null;
  return res.json();
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

export async function fetchPBSShowsByDateRange(days: number = 7): Promise<PBSShow[]> {
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  
  // Calculate start date (today) and end date (today + n days)
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + days);
  
  // Format dates as YYYY-MM-DD
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  const params = {
    start_date: startDateStr,
    end_date: endDateStr
  };
  
  const queryString = new URLSearchParams(params).toString();
  const url = `${apiHost}/pbs/shows/range?${queryString}`;

  console.log('Fetching PBS shows from:', url); // Debug log

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch PBS shows: ${response.status} ${errorText || response.statusText}`);
  }

  const data = await response.json();
  console.log('PBS shows API response:', data); // Debug log
  
  // Based on your Go response format, the shows are in the 'shows' property
  if (data && Array.isArray(data.shows)) {
    return data.shows;
  } else if (Array.isArray(data)) {
    return data;
  } else if (data && Array.isArray(data.data)) {
    return data.data;
  } else {
    console.warn('Unexpected PBS shows API response format:', data);
    return [];
  }
}