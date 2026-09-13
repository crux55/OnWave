'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchFromApi } from '@/lib/api';
import type { PBSShow, RadioStation } from '@/lib/types';

// The scraper's station_name doesn't always match radio-browser's naming —
// verified against the live API: "NTS 1"/"NTS 2" either mismatch to an
// unrelated station ("Northants 1") or return nothing, while "NTS Radio 1"/
// "NTS Radio 2" resolve correctly. Everything else matches its own name.
const STATION_SEARCH_TERM_OVERRIDES: Record<string, string> = {
  'NTS 1': 'NTS Radio 1',
  'NTS 2': 'NTS Radio 2',
};

// Picks the best playable stream for a station search result — prefers a
// direct stream over HLS (plain <audio> elements only play HLS natively in
// Safari, not Chrome/Firefox) and forces https so a redirect-based stream
// host (StreamTheWorld etc., which resolves http/https based on the scheme
// of the request) doesn't get blocked as mixed content on this https site.
function resolveBestStream(stations: RadioStation[]): RadioStation | null {
  const candidates = stations.filter(s => s.lastcheckok === 1);
  const best = candidates.find(s => !s.url_resolved?.includes('.m3u8')) || candidates[0] || stations[0] || null;
  if (!best) return null;
  const toHttps = (url: string | undefined) => url?.replace(/^http:\/\//i, 'https://');
  return { ...best, url: toHttps(best.url) ?? best.url, url_resolved: toHttps(best.url_resolved) ?? best.url_resolved };
}

// Resolves a single station name to a real playable stream — the
// single-station counterpart to useExternalLiveStreams below, for a page
// that already knows exactly which station it needs (the external-room
// watch page), rather than a list of live shows to resolve in bulk.
export function useResolvedStationStream(stationName: string | null | undefined): RadioStation | null {
  const [stream, setStream] = useState<RadioStation | null>(null);

  useEffect(() => {
    if (!stationName) {
      setStream(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const term = STATION_SEARCH_TERM_OVERRIDES[stationName] ?? stationName;
        const result = await fetchFromApi({ term });
        if (!cancelled) setStream(resolveBestStream(result.stations));
      } catch {
        if (!cancelled) setStream(null);
      }
    })();
    return () => { cancelled = true; };
  }, [stationName]);

  return stream;
}

// Given a list of currently-live external (PBS-scraped) shows, resolves
// each distinct station to a real playable stream via the catalog search —
// the scraper only ever records a station's name, not a stream URL. Shared
// by /live and /shows (Schedule tab) so both "tune in" a live external
// show the same way, looking each station up only once.
export function useExternalLiveStreams(liveShows: PBSShow[]) {
  const [stationStreams, setStationStreams] = useState<Record<string, RadioStation | null>>({});
  const lookupsStarted = useRef<Set<string>>(new Set());

  const stationNames = useMemo(() => {
    const names = new Set<string>();
    liveShows.forEach(s => { if (s.station_name) names.add(s.station_name); });
    return Array.from(names);
  }, [liveShows]);

  useEffect(() => {
    const namesToResolve = stationNames.filter(name => !lookupsStarted.current.has(name));
    if (namesToResolve.length === 0) return;
    namesToResolve.forEach(name => lookupsStarted.current.add(name));

    namesToResolve.forEach(async (name) => {
      try {
        const term = STATION_SEARCH_TERM_OVERRIDES[name] ?? name;
        const result = await fetchFromApi({ term });
        setStationStreams(prev => ({ ...prev, [name]: resolveBestStream(result.stations) }));
      } catch {
        setStationStreams(prev => ({ ...prev, [name]: null }));
      }
    });
  }, [stationNames]);

  return stationStreams;
}
