import type { RadioStation } from '@/lib/types';

// Manually curated stations, shown directly on the home page regardless of
// whether they're in radio-browser.info's index or what the algorithmic
// genre rotation happens to pick. A promotion mechanism, not a search one.
function pinnedStation(overrides: Partial<RadioStation> & Pick<RadioStation, 'stationuuid' | 'name' | 'url' | 'tags' | 'country'>): RadioStation {
  return {
    url_resolved: overrides.url,
    homepage: '',
    favicon: '',
    has_valid_favicon: false,
    countrycode: '',
    state: '',
    language: '',
    languagecodes: '',
    bitrate: 192,
    codec: 'MP3',
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
    geo_lat: null,
    geo_long: null,
    has_extended_info: false,
    serveruuid: '',
    changeuuid: '',
    iso_3166_2: '',
    hls: 0,
    ...overrides,
  };
}

export const PINNED_STATIONS: RadioStation[] = [
  pinnedStation({
    stationuuid: 'pinned-deep-planet',
    name: 'Deep Planet (MixLive.net)',
    url: 'https://listen.openstream.co/6984/audio',
    tags: 'nu disco, funk, electronica',
    country: 'Ireland',
    homepage: 'https://mixlive.net/stream/deep-planet/',
  }),
];
