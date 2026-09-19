'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchCurrentUserProfile, updateTheme as updateThemeApi } from '@/lib/api';

// OnWave#43: a site-wide theme choice. 'dark' is the existing look and the
// default for every account that hasn't changed it; 'lava-lamp' adds a
// purely decorative, slow-moving blurred gradient background behind the
// app (see AmbientBackground.tsx) -- no tie to playback or time of day, by
// design, so it stays simple and predictable.
export const AVAILABLE_THEMES = [
  { id: 'dark', label: 'Dark', description: 'The current look — no ambient background.' },
  { id: 'lava-lamp', label: 'Lava Lamp', description: 'A soft, slow-moving blurred gradient behind the app.' },
] as const;

export type ThemeId = typeof AVAILABLE_THEMES[number]['id'];

const DEFAULT_THEME: ThemeId = 'dark';
// Purely a fast-first-paint cache so a returning user doesn't flash back to
// the default theme while the real (per-account) value is still loading —
// the account's own value below always wins once it resolves. Not the
// source of truth; see the "Persistence" decision on OnWave#43.
const THEME_CACHE_KEY = 'onwaveThemeCache';

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && AVAILABLE_THEMES.some(t => t.id === value);
}

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => Promise<void>;
  isSaving: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: async () => {},
  isSaving: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME; // SSR -- no localStorage
    try {
      const cached = localStorage.getItem(THEME_CACHE_KEY);
      return isThemeId(cached) ? cached : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reconciles with the real per-account value once it loads -- logged-out
  // (or a fetch failure) just keeps whatever the cache/default already
  // rendered, since there's no account value to reconcile against.
  useEffect(() => {
    let cancelled = false;
    fetchCurrentUserProfile().then(profile => {
      if (cancelled || !profile) return;
      if (isThemeId(profile.theme)) {
        setThemeState(profile.theme);
        try { localStorage.setItem(THEME_CACHE_KEY, profile.theme); } catch {}
      }
    });
    return () => { cancelled = true; };
  }, []);

  // The theme lives on <html> as a data attribute (not component state
  // alone) so plain CSS selectors in globals.css / AmbientBackground.tsx
  // can key off it without every themed element needing to read context.
  useEffect(() => {
    document.documentElement.dataset.onwaveTheme = theme;
  }, [theme]);

  const setTheme = useCallback(async (next: ThemeId) => {
    const previous = theme;
    setThemeState(next); // optimistic
    try { localStorage.setItem(THEME_CACHE_KEY, next); } catch {}
    setIsSaving(true);
    try {
      await updateThemeApi(next);
    } catch (error) {
      setThemeState(previous); // revert -- the account-level save didn't take
      try { localStorage.setItem(THEME_CACHE_KEY, previous); } catch {}
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isSaving }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
