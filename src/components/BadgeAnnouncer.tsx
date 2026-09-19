'use client';

import { useEffect, useState } from 'react';
import { fetchMyBadges, type MyBadge } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { BadgeSplashDialog } from '@/components/BadgeSplashDialog';

// Which badge ids have already been announced this session -- module-level
// so it survives navigation/remounts within the SPA (this component is
// mounted once, globally, but tracking it here rather than in component
// state means a re-check interval firing doesn't re-announce a badge it
// already showed moments ago). A hard reload resets it; worst case an
// unseen badge announces once more, which is harmless.
const announcedIds = new Set<string>();

const RECHECK_INTERVAL_MS = 60000;

// Mounted once at the app root (see layout.tsx) rather than only on the
// profile page, which used to be the only place a new badge ever surfaced
// at all -- meaning a user who didn't happen to visit their own profile
// could be awarded a badge and never find out. Deliberately doesn't mark
// badges seen itself (that stays the profile page's job, via
// markBadgesSeen) -- ProfileBadgesSection shows its own "New" ribbon off
// the same is_new flag, and clearing it here before the user ever sees
// that ribbon would be a regression, not an improvement.
export function BadgeAnnouncer() {
  const { toast } = useToast();
  const [splashQueue, setSplashQueue] = useState<MyBadge[]>([]);

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      fetchMyBadges()
        .then(badges => {
          if (cancelled) return;
          const fresh = badges.filter(b => b.is_new && !announcedIds.has(b.id));
          if (fresh.length === 0) return;
          fresh.forEach(b => announcedIds.add(b.id));

          fresh.filter(b => !b.announce_splash).forEach(b => {
            toast({ title: `New badge: ${b.icon} ${b.name}`, description: b.description || 'Check your profile to see it.' });
          });

          const splashOnes = fresh.filter(b => b.announce_splash);
          if (splashOnes.length > 0) {
            setSplashQueue(prev => [...prev, ...splashOnes]);
          }
        })
        .catch(() => {}); // logged out, or a transient failure -- nothing to announce
    };

    check();
    // Catches a badge awarded while the app stays open on one tab (an
    // admin awarding one live, say) without needing a full reload.
    const interval = setInterval(check, RECHECK_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [toast]);

  const currentSplash = splashQueue[0] ?? null;
  const dismissSplash = () => setSplashQueue(prev => prev.slice(1));

  return <BadgeSplashDialog badge={currentSplash} onDismiss={dismissSplash} />;
}
