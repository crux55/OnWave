'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BadgeIcon } from '@/components/BadgeIcon';
import type { MyBadge } from '@/lib/api';

interface BadgeSplashDialogProps {
  badge: MyBadge | null;
  onDismiss: () => void;
}

// Reserved for badges an admin has specifically marked announce_splash
// (see BadgeAnnouncer) -- every other badge award is a plain toast. This
// is meant to feel like a real moment, not routine UI chrome, so it
// deliberately doesn't share styling with the toast path.
export function BadgeSplashDialog({ badge, onDismiss }: BadgeSplashDialogProps) {
  return (
    <Dialog open={!!badge} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <DialogContent className="max-w-sm text-center" hideCloseButton>
        {badge && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-primary/30 ring-4 ring-accent/40">
              <BadgeIcon badge={badge} size={56} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">New Badge</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-foreground">{badge.name}</h2>
            </div>
            {badge.description && (
              <p className="text-sm text-muted-foreground">{badge.description}</p>
            )}
            <Button onClick={onDismiss} className="mt-2 w-full">Got it</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
