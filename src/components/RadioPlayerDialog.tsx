'use client';

import type { RadioStation } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioPlayer } from '@/components/RadioPlayer';

interface RadioPlayerDialogProps {
  station: RadioStation | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RadioPlayerDialog({ station, isOpen, onOpenChange }: RadioPlayerDialogProps) {
  if (!station) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 border-0 shadow-2xl bg-card overflow-hidden">
        {/* DialogHeader can be part of RadioPlayer itself if needed */}
        {/* <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl">{station.name}</DialogTitle>
          <DialogDescription>
            {station.genre} - {station.country}
          </DialogDescription>
        </DialogHeader> */}
        <RadioPlayer station={station} />
      </DialogContent>
    </Dialog>
  );
}
