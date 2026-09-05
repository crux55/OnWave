'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { fetchBadgeLoadout, setBadgeLoadout, type MyBadge } from '@/lib/api';

const MAX_LOADOUT = 5;

interface BadgeLoadoutSelectorProps {
  myBadges: MyBadge[];
}

// Lets a user pick which of their held badges to wear in live chat, and in
// what order — eligibility for any given stream (global/station/dj/show
// scope) is filtered server-side at render time, this is just the standing
// preference.
export function BadgeLoadoutSelector({ myBadges }: BadgeLoadoutSelectorProps) {
  const { toast } = useToast();
  const [loadout, setLoadout] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBadgeLoadout()
      .then(setLoadout)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const toggleBadge = (badgeId: string) => {
    setLoadout(prev => {
      if (prev.includes(badgeId)) {
        return prev.filter(id => id !== badgeId);
      }
      if (prev.length >= MAX_LOADOUT) {
        toast({ title: `You can wear at most ${MAX_LOADOUT} badges at once` });
        return prev;
      }
      return [...prev, badgeId];
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setBadgeLoadout(loadout);
      toast({ title: 'Chat badge loadout saved' });
    } catch (error: any) {
      toast({ title: 'Failed to save loadout', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || myBadges.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div>
        <h4 className="text-sm font-medium text-foreground">Chat badges</h4>
        <p className="text-xs text-muted-foreground">
          Pick up to {MAX_LOADOUT} badges to wear in chat — only shown where they're actually eligible (e.g. a station badge only shows in that station's streams).
        </p>
      </div>

      {loadout.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {loadout.map((badgeId, i) => {
            const badge = myBadges.find(b => b.id === badgeId);
            if (!badge) return null;
            return (
              <button
                key={badgeId}
                onClick={() => toggleBadge(badgeId)}
                className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs"
              >
                <span className="text-muted-foreground">{i + 1}.</span>
                <span>{badge.icon}</span>
                <span className="font-medium">{badge.name}</span>
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {myBadges.filter(b => !loadout.includes(b.id)).map(badge => (
          <button
            key={badge.id}
            onClick={() => toggleBadge(badge.id)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm"
          >
            <span>{badge.icon}</span>
            <span className="text-foreground">{badge.name}</span>
          </button>
        ))}
      </div>

      <Button size="sm" onClick={handleSave} disabled={isSaving}>
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save
      </Button>
    </div>
  );
}
