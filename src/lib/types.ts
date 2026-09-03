export interface RadioStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  has_valid_favicon: boolean;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  languagecodes: string;
  bitrate: number;
  codec: string;
  votes: number;
  clickcount: number;
  clicktrend: number;
  lastchangetime: string;
  lastchangetime_iso8601: string;
  lastchecktime: string;
  lastchecktime_iso8601: string;
  lastcheckok: number;
  lastcheckoktime: string;
  lastcheckoktime_iso8601: string;
  lastlocalchecktime: string;
  lastlocalchecktime_iso8601: string;
  ssl_error: number;
  geo_lat?: number | null;
  geo_long?: number | null;
  has_extended_info: boolean;
  serveruuid: string;
  changeuuid: string;
  iso_3166_2: string;
  hls: number;
};

export interface TopStationsResponse {
  featured: RadioStation[];
  popular: RadioStation[];
  trending: RadioStation[];
  random: RadioStation[];
}

export interface WebradioSearchFilters {
  min_bitrate: number;
  max_bitrate: number;
  min_clicks: number;
  max_clicks: number;
  min_trend: number;
  max_trend: number;
  codec?: string;
  country?: string;
  limit: number;
}

export interface WebradioSearchResponse {
  stations: RadioStation[];
  total: number;
  filters: WebradioSearchFilters;
}

export type TopTag = {
  name: string;
  stationcount: number;
};

// InternalShow is a station- or DJ-created show (as opposed to PBSShow,
// which is scraped). Recurring shows carry day_of_week + start_time; a
// one-off carries one_off_date instead.
export interface InternalShow {
  id: string;
  name: string;
  description: string;
  station_id?: string | null;
  station_name?: string | null;
  dj_id?: string | null;
  dj_name?: string | null;
  day_of_week?: number | null;
  one_off_date?: string | null;
  start_time: string;
  duration_minutes: number;
  created_at: string;
}

export interface PBSShow {
  id: number;
  name: string;
  dj: string;
  day: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: string;
  status: "upcoming" | "live" | "expired";
  program_url: string;
  station_name?: string;
  station_slug?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  role: 'regular' | 'dj';
  created_at: Date;
  updated_at: Date;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  location?: string;
  bio?: string;
  avatar?: string;
  website?: string;
  is_public: boolean;
  slug?: string;
  favorite_genre?: string;
  last_updated: Date;
}

export interface Token {
  user_id: string;
  email: string;
  role: string;
  is_admin: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  exp: string | Date;
  last_login: string | Date;
  is_founding_member: boolean;
  has_password: boolean;
}

export type JWT = {
  token: string;
  userId: string;
  message: string;
};

export interface Reminder {
  id: string;
  show_name: string;
  show_date: string;
  show_start_time: string;
  reminder_minutes_before: number;
  created_at: string;
}

export interface WebSocketNotification {
  type: 'show_reminder';
  title: string;
  message: string;
  show_name: string;
  show_time: string;
  timestamp: string;
}

export interface ReminderNotification {
  id: string;
  reminder: Reminder;
  triggered_at: string;
  shown_at?: string;
  dismissed_at?: string;
}

export type NotificationPermissionState = 'default' | 'granted' | 'denied';