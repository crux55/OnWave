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
import { useMobileDock } from '@/contexts/MobileDockContext';
import { submitFeedback, type FeedbackType } from '@/lib/api';

// Rendered once in the root layout so it floats on every page, per
// project_r#27. On mobile, sits just above MobileBottomDock using its
// reported real height (the same single source of truth `main`'s padding
// uses) instead of re-deriving player state itself — that hand-copied
// duplication was how this button used to fall out of sync with whatever
// was actually showing at the bottom of the screen. Desktop is unaffected.
export function FeedbackButton() {
  const dock = useMobileDock();
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

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        aria-label="Report a bug or suggest a feature"
        title="Report a bug or suggest a feature"
        className="fixed right-4 z-40 h-12 w-12 rounded-full shadow-lg transition-[bottom] bottom-[var(--feedback-bottom)] sm:!bottom-4"
        style={{ ['--feedback-bottom' as string]: `${dock.totalHeight + 16}px` }}
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
