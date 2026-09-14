'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Radio, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { submitFeedback } from '@/lib/api';

// A lightweight submission/inbox mechanism, not a self-serve add — the
// owner still reviews and hand-adds anything worth curating (see
// project_r#5's decision that a full curation CRUD isn't worth building at
// this frequency). Reuses the existing feedback inbox rather than standing
// up separate infrastructure. See OnWave#31.
export function SuggestStationDialog({ trigger }: { trigger: React.ReactNode }) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const stationName = name.trim();
    if (!stationName) return;
    setIsSubmitting(true);
    try {
      const message = [
        `Station: ${stationName}`,
        url.trim() ? `URL: ${url.trim()}` : null,
        notes.trim() ? `Notes: ${notes.trim()}` : null,
      ].filter(Boolean).join('\n');
      await submitFeedback('station_suggestion', message, pathname);
      toast({ title: 'Thanks for the suggestion!', description: "We'll take a look." });
      setName('');
      setUrl('');
      setNotes('');
      setOpen(false);
    } catch (error: any) {
      toast({ title: "Couldn't submit", description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-accent" /> Suggest a Station
          </DialogTitle>
          <DialogDescription>
            Found a station that deserves a spot on the home page? Let us know and we'll take a look.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Station name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Deep Planet" autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Stream or homepage URL (optional)</label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Why you like it (optional)</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={1000} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
