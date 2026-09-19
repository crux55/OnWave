'use client';

import { useEffect, useState } from 'react';
import { Loader2, Star } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { StationAvatar } from '@/components/StationAvatar';
import { fetchInstalledPresets, installPreset, uninstallPreset } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PresetLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Lets the caller (MaximizedPlayerDialog) keep useButterchurn's rotation
  // in sync live as presets are starred/unstarred, without this dialog
  // needing to know anything about Butterchurn itself.
  onInstalledChange: (names: string[]) => void;
  // OnWave#41's auto-cycle setting lives here now, not as its own always-
  // visible icon in the maximized player's control row — it's an opt-in
  // most people won't touch often, so it belongs behind the same "more
  // preset options" popup as starring presets, not fighting for space
  // (and fading in and out) alongside play/pause every time.
  autoCycleEnabled: boolean;
  onToggleAutoCycle: () => void;
}

// OnWave#40: browse the full Butterchurn preset pack and star/unstar which
// ones make up a personal rotation. Reuses StationAvatar's generated-
// initials placeholder for each preset's thumbnail rather than live-
// rendering one — the same "lightweight, not a real render" tradeoff
// search results already make for station art.
export function PresetLibraryDialog({ open, onOpenChange, onInstalledChange, autoCycleEnabled, onToggleAutoCycle }: PresetLibraryDialogProps) {
  const { toast } = useToast();
  const [allNames, setAllNames] = useState<string[] | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const [presetsModule, installedList] = await Promise.all([
          import('butterchurn-presets'),
          fetchInstalledPresets().catch((err: any) => {
            // Logged out, or a transient failure -- the library is still
            // browsable, just nothing shows as starred yet. Toggling a
            // star will surface its own error via the toast below.
            if (err?.message !== 'UNAUTHORIZED') console.error('Failed to load installed presets:', err);
            return [];
          }),
        ]);
        if (cancelled) return;
        const mod: any = (presetsModule as any).default || presetsModule;
        const names = Object.keys(mod.getPresets()).sort();
        setAllNames(names);
        setInstalled(new Set(installedList.map((p) => p.preset_name)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const toggleInstalled = async (name: string) => {
    const wasInstalled = installed.has(name);
    setPendingName(name);
    // Optimistic -- reverted in the catch block below on failure.
    setInstalled((prev) => {
      const next = new Set(prev);
      if (wasInstalled) next.delete(name); else next.add(name);
      onInstalledChange([...next]);
      return next;
    });
    try {
      if (wasInstalled) await uninstallPreset(name);
      else await installPreset(name);
    } catch (error: any) {
      setInstalled((prev) => {
        const next = new Set(prev);
        if (wasInstalled) next.add(name); else next.delete(name);
        onInstalledChange([...next]);
        return next;
      });
      if (error?.message === 'UNAUTHORIZED') {
        toast({ title: 'Log in to save presets to your account', variant: 'destructive' });
      } else {
        toast({ title: wasInstalled ? "Couldn't remove preset" : "Couldn't install preset", variant: 'destructive' });
      }
    } finally {
      setPendingName(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Preset Library</DialogTitle>
          <DialogDescription>
            {installed.size > 0
              ? `${installed.size} starred — only these cycle in the player. Unstar them all to go back to the full pack.`
              : 'Star a few presets to build your own rotation. Nothing starred yet, so every preset in the pack cycles by default.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 px-3 py-2.5">
          <Label htmlFor="auto-cycle-toggle" className="text-sm font-normal text-foreground">
            Auto-cycle presets every 30s
          </Label>
          <Switch id="auto-cycle-toggle" checked={autoCycleEnabled} onCheckedChange={onToggleAutoCycle} />
        </div>
        <Separator />

        <div className="-mx-1 overflow-y-auto px-1">
          {isLoading || !allNames ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {allNames.map((name) => {
                const isInstalled = installed.has(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleInstalled(name)}
                    disabled={pendingName === name}
                    className={cn(
                      'group relative flex flex-col overflow-hidden rounded-lg border text-left transition-colors',
                      isInstalled ? 'border-accent' : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    <div className="relative aspect-square w-full">
                      <StationAvatar name={name} className="text-lg" />
                      <div
                        className={cn(
                          'absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white',
                          isInstalled && 'bg-accent text-accent-foreground'
                        )}
                      >
                        {pendingName === name
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Star className={cn('h-3.5 w-3.5', isInstalled && 'fill-current')} />}
                      </div>
                    </div>
                    <p className="truncate px-2 py-1.5 text-xs text-foreground">{name}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
