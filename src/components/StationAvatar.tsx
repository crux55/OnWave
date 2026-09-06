import { cn } from '@/lib/utils';

// A fixed, hand-picked palette (rather than arbitrary hashed hues) so every
// generated avatar still looks like it belongs to the app's own palette
// instead of a random, possibly muddy or clashing color.
const PALETTE = [
  'from-rose-500/70 to-rose-700/70',
  'from-orange-500/70 to-orange-700/70',
  'from-amber-500/70 to-amber-700/70',
  'from-lime-500/70 to-lime-700/70',
  'from-emerald-500/70 to-emerald-700/70',
  'from-teal-500/70 to-teal-700/70',
  'from-cyan-500/70 to-cyan-700/70',
  'from-blue-500/70 to-blue-700/70',
  'from-indigo-500/70 to-indigo-700/70',
  'from-violet-500/70 to-violet-700/70',
  'from-fuchsia-500/70 to-fuchsia-700/70',
  'from-pink-500/70 to-pink-700/70',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// "BBC Radio 1" -> "BR", "Kexp" -> "KE" — mirrors the initials-avatar
// convention from Slack/Discord/Spotify so a missing image reads as an
// intentional placeholder, not a broken one.
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

interface StationAvatarProps {
  name: string;
  /** Used instead of `name` for the color hash when present, so two
   *  different stations that happen to share a name (or a renamed station)
   *  still get a stable, distinct color. */
  seed?: string;
  className?: string;
}

export function StationAvatar({ name, seed, className }: StationAvatarProps) {
  const palette = PALETTE[hashString(seed || name) % PALETTE.length];
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-gradient-to-br font-display font-bold text-white',
        palette,
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
