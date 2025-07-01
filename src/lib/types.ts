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