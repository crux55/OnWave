// Mood-based discovery (OnWave#36): a small hardcoded mood -> tag-list
// mapping, matched against free text by keyword overlap. Deliberately not an
// LLM call — this covers the "describe a vibe, get a curated spread" use
// case at zero latency/cost, using tags already known to work against the
// existing mode=tag search (see DISCOVER_GENRES in lib/api.ts).
export interface Mood {
  id: string;
  label: string;
  emoji: string;
  keywords: string[];
  tags: string[];
}

export const MOODS: Mood[] = [
  {
    id: 'sunny-morning',
    label: 'Sunny Morning',
    emoji: '☀️',
    keywords: ['morning', 'breakfast', 'wake up', 'sunrise', 'sunny', 'coffee', 'happy morning'],
    tags: ['jazz', 'soul', 'funk', 'disco'],
  },
  {
    id: 'late-night-chill',
    label: 'Late Night Chill',
    emoji: '🌙',
    keywords: ['night', 'chill', 'relax', 'sleep', 'calm', 'unwind', 'late night', 'wind down'],
    tags: ['chill', 'ambient', 'lofi', 'downtempo'],
  },
  {
    id: 'deep-focus',
    label: 'Deep Focus',
    emoji: '🎯',
    keywords: ['focus', 'work', 'study', 'concentrate', 'coding', 'productivity', 'deep work'],
    tags: ['ambient', 'classical', 'chill', 'electronic'],
  },
  {
    id: 'party-mode',
    label: 'Party Mode',
    emoji: '🎉',
    keywords: ['party', 'dance', 'club', 'turn up', 'celebrate', 'weekend', 'dancing'],
    tags: ['dance', 'house', 'techno', 'electronic'],
  },
  {
    id: 'road-trip',
    label: 'Road Trip',
    emoji: '🚗',
    keywords: ['drive', 'driving', 'road trip', 'highway', 'adventure', 'travel', 'car'],
    tags: ['rock', 'indie', 'pop', 'country'],
  },
  {
    id: 'rainy-day',
    label: 'Rainy Day',
    emoji: '🌧️',
    keywords: ['rain', 'rainy', 'cozy', 'melancholy', 'gloomy', 'grey day', 'stormy'],
    tags: ['blues', 'folk', 'indie', 'ambient'],
  },
  {
    id: 'workout',
    label: 'Workout',
    emoji: '💪',
    keywords: ['gym', 'workout', 'run', 'running', 'exercise', 'pump up', 'cardio', 'training'],
    tags: ['electronic', 'dance', 'house', 'hip hop'],
  },
  {
    id: 'old-school-soul',
    label: 'Old School Soul',
    emoji: '🎷',
    keywords: ['throwback', 'retro', 'old school', 'vintage', 'classic', 'nostalgia'],
    tags: ['soul', 'funk', 'blues', 'jazz'],
  },
  {
    id: 'heartbreak',
    label: 'Heartbreak',
    emoji: '💔',
    keywords: ['sad', 'breakup', 'heartbreak', 'crying', 'lonely', 'blue', 'missing someone'],
    tags: ['blues', 'soul', 'folk', 'indie'],
  },
  {
    id: 'global-vibes',
    label: 'Global Vibes',
    emoji: '🌍',
    keywords: ['world', 'international', 'exotic', 'culture', 'global', 'abroad'],
    tags: ['world', 'latin', 'reggae', 'funk'],
  },
];

// Score every mood by how many of its keywords appear as a substring of the
// input, then take the best match. Free text is naturally loose ("happy
// morning making breakfast") — substring matching on short phrases catches
// that without needing real NLP. Ties/no-match fall back to a random mood so
// unrecognized text still produces a real result instead of an error.
export function matchMoodFromText(text: string): Mood {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return MOODS[Math.floor(Math.random() * MOODS.length)];

  let best: Mood | null = null;
  let bestScore = 0;
  for (const mood of MOODS) {
    const score = mood.keywords.filter(k => normalized.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = mood;
    }
  }
  return best || MOODS[Math.floor(Math.random() * MOODS.length)];
}
