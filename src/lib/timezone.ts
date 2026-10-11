// Converts a wall-clock "HH:MM" on a given calendar date, in a given IANA
// timezone, into the real instant it represents -- DST-aware, using only
// Intl (which ships a full tz database) rather than a new dependency.
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  const guessUtcMs = Date.UTC(y, mo - 1, d, h, mi);
  const offsetMinutes = tzOffsetMinutes(timeZone, new Date(guessUtcMs));
  return new Date(guessUtcMs - offsetMinutes * 60000);
}

// Minutes to subtract from a UTC-ms reading of `timeZone`'s own wall clock
// to get true UTC -- i.e. localWallClock - offset = UTC. Found by
// formatting the same instant in `timeZone`, then diffing against that
// instant's actual UTC value; correct across DST transitions without
// hardcoding any offset table.
function tzOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtcMs = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return (asUtcMs - at.getTime()) / 60000;
}

// Scraped shows (PBS FM, KEXP, NTS, ...) store start_time/end_time as the
// OWNING STATION's own local wall clock, not the viewer's -- the backend's
// CalculateCurrentStatus already accounts for this when deciding
// live/upcoming/expired, but the frontend needs the same conversion before
// plotting a show against the viewer's own "now" (see ShowGuideGrid).
const DEFAULT_SHOW_TIMEZONE = 'Australia/Melbourne'; // matches the backend's own fallback

export interface ZonedShowTimes {
  date: string; // an ISO date or datetime string; only the "YYYY-MM-DD" prefix is used
  start_time: string; // "HH:MM" in `timezone`
  end_time: string; // "HH:MM" in `timezone`
  timezone?: string;
}

// Resolves a show's start/end to real instants, in the station's own
// timezone, correctly spanning midnight if end_time <= start_time.
// Returns null if `date` is missing/unparseable.
export function resolveShowInstants(show: ZonedShowTimes): { start: Date; end: Date } | null {
  const dateStr = show.date?.split('T')[0];
  if (!dateStr) return null;
  const tz = show.timezone || DEFAULT_SHOW_TIMEZONE;
  const start = zonedTimeToUtc(dateStr, show.start_time, tz);
  let end = zonedTimeToUtc(dateStr, show.end_time, tz);
  if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
