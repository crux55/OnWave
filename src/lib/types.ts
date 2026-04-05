import { string } from "zod";

export interface RadioStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
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

export type TopTag = {
  name: string;
  stationcount: number;
};

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
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  role: 'regular' | 'station' | 'dj';
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
  last_updated: Date;
}

export interface Token {
  user_id: string;
  email: string;
  role: string;
  created_at: string | Date;
  updated_at: string | Date;
  exp: string | Date;
  last_login: string | Date;
}

export type JWT = {
  token: string;
  userId: string;
  message: string;
};

export interface SubscriptionRequest {
  showId: number;
  showName: string;
  djName: string;
  day: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface SubscriptionResponse {
  id: string;
  userId: string;
  showId: number;
  type: 'subscribe' | 'remind';
  createdAt: string;
  message: string;
}

export interface Reminder {
  id: string;
  show_name: string;
  show_date: string;
  show_start_time: string;
  reminder_minutes_before: number;
  created_at: string;
}

export interface WebSocketNotification {
  type: 'reminder';
  message: string;
  show_name: string;
  show_date: string;
  show_start_time: string;
  minutes_until_show: number;
}

export interface ReminderNotification {
  id: string;
  reminder: Reminder;
  triggered_at: string;
  shown_at?: string;
  dismissed_at?: string;
}

export type NotificationPermissionState = 'default' | 'granted' | 'denied';