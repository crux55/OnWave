'use client';

import { useEffect, useState } from 'react';
import { Hand, Maximize2, Cast, Award, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TIPS = [
  {
    icon: Hand,
    title: 'Swipe to explore',
    body: "When you're browsing a mood or a full list of stations, don't just tap through — swipe up or down like a feed. Flick fast to skip, or drag slower to look before you commit.",
  },
  {
    icon: Maximize2,
    title: 'Go fullscreen',
    body: 'Tap the player bar at the bottom to open a real fullscreen visualizer, with its own preset controls and a library of looks to star as favorites.',
  },
  {
    icon: Cast,
    title: 'Cast anywhere',
    body: "Playing on your phone but want it on the big screen? Hit the cast icon in the player to send audio — and the visualizer — to any TV or speaker on your network.",
  },
  {
    icon: Award,
    title: 'Earn badges along the way',
    body: "Follow shows, join chats, go live, and you'll start collecting badges — some just for showing up, some a lot more special. Check your profile to see what you've got.",
  },
];

const STORAGE_KEY = 'onwaveQuickTipsSeen';

// Deliberately not the same content as this page's own feature grid above
// it (Search/Heart/Mic2/etc.) -- that's prose explaining WHAT you can do
// here; this is a few non-obvious HOW-you-actually-use-it interactions
// (swipe gestures, where fullscreen lives, casting) that a static
// description doesn't really convey. Shown once, right on the page a new
// user already lands on right after signup -- no need for a separate
// global "first visit ever" check.
export function QuickTipsDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== 'true') setOpen(true);
    } catch {
      // Storage unavailable -- just skip the tips rather than error out.
    }
  }, []);

  const finish = () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
  };

  const tip = TIPS[step];
  const isLast = step === TIPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) finish(); }}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <tip.icon className="h-7 w-7" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">{tip.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{tip.body}</p>
          </div>

          <div className="flex items-center gap-1.5">
            {TIPS.map((_, i) => (
              <span
                key={i}
                className={cn('h-1.5 w-1.5 rounded-full', i === step ? 'bg-accent' : 'bg-muted')}
              />
            ))}
          </div>

          <div className="flex w-full items-center justify-between gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={finish}>
              Skip
            </Button>
            <Button size="sm" onClick={() => (isLast ? finish() : setStep(s => s + 1))}>
              {isLast ? 'Got it' : 'Next'}
              {!isLast && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
