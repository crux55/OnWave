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
  
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + days);
  
  const params = {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0]
  };
  
  const queryString = new URLSearchParams(params).toString();
  const url = `${apiHost}/pbs/shows/range?${queryString}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch PBS shows: ${response.status} ${errorText || response.statusText}`);
  }

  const data = await response.json();
  
  if (data?.shows && Array.isArray(data.shows)) {
    return data.shows;
  }
  
  if (Array.isArray(data)) {
    return data;
  }
  
  if (data?.data && Array.isArray(data.data)) {
    return data.data;
  }
  
  return [];
}

// Reminder API functions
export async function createReminder(reminderData: {
  show_name: string;
  show_date: string;
  show_start_time: string;
  reminder_minutes_before: number;
}) {
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const token = localStorage.getItem("token");
  
  if (!token) {
    throw new Error('User not authenticated');
  }
  
  const auth = JSON.parse(token);
  const response = await fetch(`${apiHost}/reminders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify(reminderData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Handle unauthorized error
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    
    // Handle duplicate reminder error specifically
    if (response.status === 409 || (errorData.message && errorData.message.includes('Duplicate entry'))) {
      throw new Error('You already have a reminder set for this show');
    }
    
    throw new Error(errorData.message || 'Failed to create reminder');
  }

  const result = await response.json();
  
  // Transform the API response to match our Reminder type
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
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const token = localStorage.getItem("token");
  
  if (!token) {
    throw new Error('User not authenticated');
  }
  
  const auth = JSON.parse(token);
  const response = await fetch(`${apiHost}/reminders`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${auth.token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Handle unauthorized error
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    
    throw new Error(errorData.message || 'Failed to fetch reminders');
  }

  const result = await response.json();
  return result.reminders || [];
}

export async function deleteReminder(reminderId: string) {
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const token = localStorage.getItem("token");
  
  if (!token) {
    throw new Error('User not authenticated');
  }
  
  const auth = JSON.parse(token);
  const response = await fetch(`${apiHost}/reminders/${reminderId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${auth.token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Handle unauthorized error
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    
    throw new Error(errorData.message || 'Failed to delete reminder');
  }

  return response.ok;
}