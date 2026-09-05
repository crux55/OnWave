'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Mic, MonitorUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLiveBroadcast } from '@/contexts/LiveBroadcastContext';
import { goLive, goLiveAdhoc } from '@/lib/api';

interface GoLiveDialogProps {
  trigger: React.ReactNode;
  /** When set, an on-the-fly broadcast is created under this station rather than the caller's own DJ identity. */
  stationId?: string;
  /** Shows the caller could attach to instead of starting something new — omit or pass empty for on-the-fly only. */
  scheduledShows?: { id: string; name: string }[];
}

type Step = 'setup' | 'terms' | 'audio';

export function GoLiveDialog({ trigger, stationId, scheduledShows = [] }: GoLiveDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { startBroadcasting } = useLiveBroadcast();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('setup');
  const [attachMode, setAttachMode] = useState<'existing' | 'new'>(scheduledShows.length > 0 ? 'existing' : 'new');
  const [selectedShowId, setSelectedShowId] = useState(scheduledShows[0]?.id ?? '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [ownLicense, setOwnLicense] = useState(false);
  const [micGain, setMicGain] = useState(100);
  const [desktopGain, setDesktopGain] = useState(100);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [desktopStream, setDesktopStream] = useState<MediaStream | null>(null);
  const [isRequestingAudio, setIsRequestingAudio] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const reset = () => {
    micStream?.getTracks().forEach(t => t.stop());
    desktopStream?.getTracks().forEach(t => t.stop());
    setStep('setup');
    setName('');
    setDescription('');
    setAgreedToTerms(false);
    setOwnLicense(false);
    setMicGain(100);
    setDesktopGain(100);
    setMicStream(null);
    setDesktopStream(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    setOpen(next);
  };

  const canProceedFromSetup = attachMode === 'existing' ? !!selectedShowId : name.trim().length > 0;

  const requestMic = async () => {
    setIsRequestingAudio(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
    } catch (error: any) {
      toast({ title: 'Microphone access denied', description: error.message, variant: 'destructive' });
    } finally {
      setIsRequestingAudio(false);
    }
  };

  const requestDesktopAudio = async () => {
    setIsRequestingAudio(true);
    try {
      // getDisplayMedia requires video:true even when only audio is wanted —
      // the video track is discarded immediately, only audio gets mixed in.
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      stream.getVideoTracks().forEach(t => t.stop());
      if (stream.getAudioTracks().length === 0) {
        toast({
          title: 'No system audio shared',
          description: 'Pick "Share tab/window audio" in the share dialog, or skip this — mic-only works fine.',
          variant: 'destructive',
        });
        return;
      }
      setDesktopStream(stream);
    } catch (error: any) {
      // User cancelling the share picker throws too — not a real error, just skip silently.
      if (error?.name !== 'NotAllowedError') {
        toast({ title: 'Could not capture desktop audio', description: error.message, variant: 'destructive' });
      }
    } finally {
      setIsRequestingAudio(false);
    }
  };

  const handleStart = async () => {
    if (!micStream) return;
    setIsStarting(true);
    try {
      const result = attachMode === 'existing'
        ? await goLive(selectedShowId, { agreed_to_terms: agreedToTerms, own_license: ownLicense })
        : await goLiveAdhoc({
            name: name.trim(),
            description: description.trim() || undefined,
            station_id: stationId,
            agreed_to_terms: agreedToTerms,
            own_license: ownLicense,
          });

      await startBroadcasting({
        showId: result.show_id,
        token: result.token,
        micStream,
        desktopStream,
        initialMicGain: micGain / 100,
        initialDesktopGain: desktopGain / 100,
      });

      setOpen(false);
      router.push(`/shows/${result.show_id}`);
    } catch (error: any) {
      toast({ title: 'Failed to go live', description: error.message, variant: 'destructive' });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === 'setup' && (
          <>
            <DialogHeader>
              <DialogTitle>Go Live</DialogTitle>
              <DialogDescription>Attach to something already on the schedule, or start right now.</DialogDescription>
            </DialogHeader>

            {scheduledShows.length > 0 && (
              <RadioGroup value={attachMode} onValueChange={v => setAttachMode(v as 'existing' | 'new')} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="attach-existing" />
                  <Label htmlFor="attach-existing">Go live for a scheduled show</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="attach-new" />
                  <Label htmlFor="attach-new">Start a new broadcast now</Label>
                </div>
              </RadioGroup>
            )}

            {attachMode === 'existing' && scheduledShows.length > 0 ? (
              <Select value={selectedShowId} onValueChange={setSelectedShowId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a show" />
                </SelectTrigger>
                <SelectContent>
                  {scheduledShows.map(show => (
                    <SelectItem key={show.id} value={show.id}>{show.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="live-name">Title</Label>
                  <Input id="live-name" value={name} onChange={e => setName(e.target.value)} placeholder="What are you broadcasting?" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="live-description">Description (optional)</Label>
                  <Textarea id="live-description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setStep('terms')} disabled={!canProceedFromSetup}>Next</Button>
            </DialogFooter>
          </>
        )}

        {step === 'terms' && (
          <>
            <DialogHeader>
              <DialogTitle>Before you go live</DialogTitle>
              <DialogDescription>
                Confirm this each time you broadcast — OnWave maintains a site-wide license, but you're responsible
                for what you play.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox id="agree-terms" checked={agreedToTerms} onCheckedChange={v => setAgreedToTerms(v === true)} />
                <Label htmlFor="agree-terms" className="font-normal leading-snug">
                  I agree to OnWave's content and conduct rules for this broadcast.
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox id="own-license" checked={ownLicense} onCheckedChange={v => setOwnLicense(v === true)} />
                <Label htmlFor="own-license" className="font-normal leading-snug">
                  This broadcast is covered under our own separate license (optional).
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep('setup')}>Back</Button>
              <Button onClick={() => setStep('audio')} disabled={!agreedToTerms}>Next</Button>
            </DialogFooter>
          </>
        )}

        {step === 'audio' && (
          <>
            <DialogHeader>
              <DialogTitle>Audio sources</DialogTitle>
              <DialogDescription>Mic is required. Desktop audio is optional — lets you play music from your own player.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Microphone</span>
                </div>
                {micStream ? (
                  <span className="text-xs text-accent">Connected</span>
                ) : (
                  <Button size="sm" variant="secondary" onClick={requestMic} disabled={isRequestingAudio}>
                    {isRequestingAudio && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Allow mic
                  </Button>
                )}
              </div>
              {micStream && (
                <div className="space-y-1.5 px-1">
                  <Label className="text-xs text-muted-foreground">Mic volume</Label>
                  <Slider value={[micGain]} max={150} step={1} onValueChange={([v]) => setMicGain(v)} />
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <MonitorUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Desktop audio</span>
                </div>
                {desktopStream ? (
                  <span className="text-xs text-accent">Connected</span>
                ) : (
                  <Button size="sm" variant="secondary" onClick={requestDesktopAudio} disabled={isRequestingAudio}>
                    {isRequestingAudio && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Share audio
                  </Button>
                )}
              </div>
              {desktopStream && (
                <div className="space-y-1.5 px-1">
                  <Label className="text-xs text-muted-foreground">Desktop volume</Label>
                  <Slider value={[desktopGain]} max={150} step={1} onValueChange={([v]) => setDesktopGain(v)} />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Desktop audio capture isn't available on Safari or mobile browsers — mic-only works everywhere.
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep('terms')} disabled={isStarting}>Back</Button>
              <Button onClick={handleStart} disabled={!micStream || isStarting}>
                {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Broadcasting
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
