'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { createRoom } from '@/lib/api';
import type { RadioStation } from '@/lib/types';

// Any logged-in user can open a listen-together room for any station —
// public (shows on the Live tab) or private (share the link with friends).
// See project_r#33.
export function CreateRoomDialog({ station, trigger }: { station: RadioStation; trigger: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    const streamUrl = station.url_resolved || station.url;
    if (!streamUrl) return;
    setIsCreating(true);
    try {
      const roomId = await createRoom(station.name, streamUrl, isPublic, tags.trim() || undefined);
      setOpen(false);
      router.push(`/shows/${roomId}`);
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        toast({
          title: 'Login Required',
          description: 'Please log in to start a room',
          action: <a href="/auth/login" className="text-primary hover:underline">Login here</a>,
          variant: 'destructive',
        });
      } else {
        toast({ title: "Couldn't start room", description: error.message, variant: 'destructive' });
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" /> Start a Room
          </DialogTitle>
          <DialogDescription>
            Listen to <strong>{station.name}</strong> together with chat alongside it. Share the link with friends, or let anyone on the site find it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={!isPublic ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setIsPublic(false)}
          >
            Private (link only)
          </Button>
          <Button
            type="button"
            variant={isPublic ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setIsPublic(true)}
          >
            Public (Live tab)
          </Button>
        </div>

        <Input
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="Tags (optional) — e.g. jazz, chat show"
        />

        <DialogFooter>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Start Room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
