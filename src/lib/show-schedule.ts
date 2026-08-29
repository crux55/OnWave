import type { InternalShow } from './types';

// Recurring shows (day_of_week + start_time) don't have a stored date —
// this computes the next calendar occurrence so they can be sorted and
// displayed alongside PBS's dated schedule. One-off shows just use their
// stored date directly.
export function nextOccurrence(show: InternalShow): Date {
  const [h, m] = show.start_time.split(':').map(Number);

  if (show.one_off_date) {
    const d = new Date(`${show.one_off_date}T00:00:00`);
    d.setHours(h, m, 0, 0);
    return d;
  }

  const now = new Date();
  const result = new Date(now);
  result.setHours(h, m, 0, 0);
  const dow = show.day_of_week ?? 0;
  let diff = (dow - now.getDay() + 7) % 7;
  if (diff === 0 && result.getTime() < now.getTime()) diff = 7;
  result.setDate(now.getDate() + diff);
  return result;
}

export function showStatus(show: InternalShow): 'live' | 'upcoming' | 'expired' {
  const occurrence = nextOccurrence(show);
  const end = new Date(occurrence.getTime() + show.duration_minutes * 60000);
  const now = new Date();
  if (show.one_off_date && end.getTime() < now.getTime()) return 'expired';
  if (now >= occurrence && now <= end) return 'live';
  return 'upcoming';
}
