'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bug, Lightbulb, MessageCirclePlus, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { usePlayer } from '@/contexts/PlayerContext';
import { submitFeedback, type FeedbackType } from '@/lib/api';
import { cn } from '@/lib/utils';

// Rendered once in the root layout so it floats on every page, per
// project_r#27. Positioning tracks the same player-bar offset logic the
// mobile bottom nav already uses (layout.tsx) so it never sits on top of
// the persistent player bar.
export function FeedbackButton() {
  const player = usePlayer();
  const pathname = usePathname();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const body = message.trim();
    if (!body) return;
    setIsSubmitting(true);
    try {
      await submitFeedback(type, body, pathname);
      toast({ title: 'Thanks for the report!', description: "We'll take a look." });
      setMessage('');
      setOpen(false);
    } catch (error: any) {
      toast({ title: "Couldn't submit", description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const playerBarOpen = player.isPlayerBarOpen && !player.isMaximizedViewOpen;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        aria-label="Report a bug or suggest a feature"
        title="Report a bug or suggest a feature"
        className={cn(
          'fixed right-4 z-40 h-12 w-12 rounded-full shadow-lg transition-[bottom]',
          playerBarOpen
            ? player.isPlayerMinimized
              ? 'bottom-16 sm:bottom-4'
              : 'bottom-24 sm:bottom-4'
            : 'bottom-20 sm:bottom-4'
        )}
      >
        <MessageCirclePlus className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report a bug or suggest a feature</DialogTitle>
            <DialogDescription>
              Tell us what's wrong or what you'd like to see — this goes straight to the team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'bug' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setType('bug')}
              >
                <Bug className="mr-2 h-4 w-4" /> Bug
              </Button>
              <Button
                type="button"
                variant={type === 'feature' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setType('feature')}
              >
                <Lightbulb className="mr-2 h-4 w-4" /> Feature idea
              </Button>
            </div>

            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={type === 'bug' ? "What happened? What did you expect instead?" : "What would you like to see?"}
              maxLength={2000}
              rows={5}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isSubmitting || !message.trim()}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
