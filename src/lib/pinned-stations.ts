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
  pinnedStation({
    stationuuid: 'pinned-sbs-chill',
    name: 'SBS Chill',
    url: 'https://sbs-ice.streamguys1.com/sbschill',
    tags: 'chillout, ambient, downtempo',
    country: 'Australia',
    homepage: 'https://www.sbs.com.au/radio/chill',
    favicon: 'https://www.sbs.com.au/_next/static/img/language/app-icon_128x128-18ef105.png',
    codec: 'AAC+',
    bitrate: 97,
  }),
  pinnedStation({
    stationuuid: 'pinned-kexp',
    name: 'KEXP',
    url: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3',
    tags: 'indie, alternative, eclectic',
    country: 'United States',
    homepage: 'https://www.kexp.org/',
    codec: 'MP3',
    bitrate: 128,
  }),
  // These two only serve over http:// — an <audio> element on this https
  // site gets its request auto-upgraded to https by the browser and the
  // connection fails since the upstream host never had TLS. Routed through
  // our own backend's stream-proxy (internal/streamproxy on project_r),
  // which fetches the http:// stream server-side and re-serves it over
  // https from our own domain.
  pinnedStation({
    stationuuid: 'pinned-mixlive-ie',
    name: 'MixLive.ie - InsomniaFM',
    url: '/api/stream-proxy/mixlive-insomniafm',
    tags: 'progressive trance',
    country: 'Ireland',
    homepage: 'https://www.mixlive.ie/',
    codec: 'MP3',
    bitrate: 128,
  }),
  pinnedStation({
    stationuuid: 'pinned-bbc-radio1-dance',
    name: 'BBC Radio 1 Dance',
    url: '/api/stream-proxy/bbc-radio1-dance',
    tags: 'dance, electronic, edm, dj mixes',
    country: 'United Kingdom',
    homepage: 'https://www.bbc.co.uk/sounds/play/live/bbc_radio_one_dance',
    favicon: 'https://cdn-profiles.tunein.com/s347238/images/logod.png',
    codec: 'AAC',
    bitrate: 0,
  }),
];
