'use client';

import { useState } from 'react';
import { Radio, Loader2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createStationRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CreateStationRequestFormProps {
  /** Called after a successful submit — e.g. to close a containing dialog. */
  onSubmitted?: () => void;
}

// Shared between Profile's inline "Create a Station" section and Shows'
// directory CTA (in a Dialog) — same request flow, same admin-review copy,
// just embedded differently per page.
export function CreateStationRequestForm({ onSubmitted }: CreateStationRequestFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [handle, setHandle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createStationRequest({
        name: name.trim(),
        description: description.trim(),
        requested_handle: handle.trim() || undefined,
      });
      toast({ title: 'Request submitted', description: 'An admin will review it shortly.' });
      setName('');
      setDescription('');
      setHandle('');
      setHasSubmitted(true);
      onSubmitted?.();
    } catch (error: any) {
      toast({ title: 'Failed to submit request', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Radio className="h-4 w-4 text-accent" /> Request submitted — an admin will review it shortly.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Requests are reviewed by an admin before your station goes live.
      </p>
      <Input placeholder="Station name" value={name} onChange={e => setName(e.target.value)} />
      <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
      <Input placeholder="Requested handle (optional)" value={handle} onChange={e => setHandle(e.target.value)} />
      <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
        Request a Station
      </Button>
    </div>
  );
}
