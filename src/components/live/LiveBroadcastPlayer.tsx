'use client';

import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, RemoteTrack } from 'livekit-client';
import { Radio, Mic, MonitorUp, Volume2, VolumeX, ShieldAlert, Loader2, Video, VideoOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useLiveBroadcast } from '@/contexts/LiveBroadcastContext';
import { terminateBroadcast } from '@/lib/api';
import { ClipButton } from '@/components/live/ClipButton';
import type { InternalShow } from '@/lib/types';
import type { ListenerConnectionState } from '@/contexts/ListenerBroadcastContext';

interface LiveBroadcastPlayerProps {
  show: InternalShow;
  isAdmin: boolean;
  /** True when the current viewer is the one broadcasting this exact show (via LiveBroadcastContext). */
  isOwnBroadcast: boolean;
  /** The listener's shared Room connection (also used by LiveChatPanel) — unused when isOwnBroadcast. */
  listenerRoom?: Room | null;
  listenerConnectionState?: ListenerConnectionState;
}

export function LiveBroadcastPlayer({ show, isAdmin, isOwnBroadcast, listenerRoom, listenerConnectionState }: LiveBroadcastPlayerProps) {
  return isOwnBroadcast
    ? <BroadcasterView show={show} isAdmin={isAdmin} />
    : <ListenerView show={show} isAdmin={isAdmin} room={listenerRoom ?? null} connectionState={listenerConnectionState ?? 'connecting'} />;
}

function BroadcasterView({ show, isAdmin }: { show: InternalShow; isAdmin: boolean }) {
  const { micGain, desktopGain, hasDesktopAudio, videoStream, isCameraOn, setMicGain, setDesktopGain, toggleCamera, endBroadcasting } = useLiveBroadcast();
  const [isMuted, setIsMuted] = useState(false);
  const [lastMicGain, setLastMicGain] = useState(micGain || 1);
  const [isEnding, setIsEnding] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  const toggleMute = () => {
    if (isMuted) {
      setMicGain(lastMicGain);
      setIsMuted(false);
    } else {
      setLastMicGain(micGain);
      setMicGain(0);
      setIsMuted(true);
    }
  };

  const handleEnd = async () => {
    setIsEnding(true);
    try {
      await endBroadcasting();
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-red-600 hover:bg-red-600 text-white">LIVE</Badge>
          <span className="font-display text-lg font-semibold">{show.name}</span>
        </div>
        <span className="text-sm text-muted-foreground">{show.viewer_count} listening</span>
      </div>

      {videoStream && (
        <div className="relative">
          <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black aspect-video object-cover" />
          <Button
            size="icon"
            variant="secondary"
            onClick={toggleCamera}
            className="absolute bottom-2 right-2"
            title={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
          >
            {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground">You're broadcasting right now.</p>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Mic className="h-4 w-4 text-muted-foreground shrink-0" />
          <Slider value={[isMuted ? 0 : micGain * 100]} max={150} step={1} onValueChange={([v]) => { setIsMuted(false); setMicGain(v / 100); }} className="flex-1" />
          <Button size="icon" variant="ghost" onClick={toggleMute} className="shrink-0">
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
        {hasDesktopAudio && (
          <div className="flex items-center gap-3">
            <MonitorUp className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider value={[desktopGain * 100]} max={150} step={1} onValueChange={([v]) => setDesktopGain(v / 100)} className="flex-1" />
          </div>
        )}
      </div>

      <Button variant="destructive" onClick={handleEnd} disabled={isEnding} className="w-full">
        {isEnding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        End Broadcast
      </Button>
    </div>
  );
}

function ListenerView({ show, isAdmin, room, connectionState }: {
  show: InternalShow;
  isAdmin: boolean;
  room: Room | null;
  connectionState: ListenerConnectionState;
}) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [terminateReason, setTerminateReason] = useState('');
  const [isTerminating, setIsTerminating] = useState(false);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  useEffect(() => {
    if (!room) return;
    const handleTrack = (track: RemoteTrack) => {
      if (track.kind === 'audio' && audioRef.current) {
        track.attach(audioRef.current);
      } else if (track.kind === 'video' && videoRef.current) {
        track.attach(videoRef.current);
        setHasVideoTrack(true);
      }
    };
    const handleUnsubscribed = (track: RemoteTrack) => {
      if (track.kind === 'video') {
        track.detach();
        setHasVideoTrack(false);
      }
    };
    room.on(RoomEvent.TrackSubscribed, handleTrack);
    room.on(RoomEvent.TrackUnsubscribed, handleUnsubscribed);
    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrack);
      room.off(RoomEvent.TrackUnsubscribed, handleUnsubscribed);
    };
  }, [room]);

  const handleTerminate = async () => {
    setIsTerminating(true);
    try {
      await terminateBroadcast(show.id, terminateReason);
      toast({ title: 'Stream ended' });
    } catch (error: any) {
      toast({ title: 'Failed to end stream', description: error.message, variant: 'destructive' });
    } finally {
      setIsTerminating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-red-600 hover:bg-red-600 text-white">LIVE</Badge>
          <span className="font-display text-lg font-semibold">{show.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{show.viewer_count} listening</span>
          <ClipButton
            showId={show.id}
            mediaRef={show.is_video && hasVideoTrack ? videoRef : audioRef}
            isReady={connectionState === 'connected' && (!show.is_video || hasVideoTrack)}
          />
        </div>
      </div>

      {show.is_video && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={cn('w-full rounded-lg bg-black aspect-video object-cover', !hasVideoTrack && 'hidden')}
        />
      )}

      {(!show.is_video || !hasVideoTrack) && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-background/40 py-10">
          <Radio className={connectionState === 'connected' ? 'h-10 w-10 text-accent animate-pulse' : 'h-10 w-10 text-muted-foreground'} />
          <p className="text-sm text-muted-foreground">
            {connectionState === 'connecting' && 'Connecting...'}
            {connectionState === 'connected' && (show.is_video ? 'Waiting for video…' : 'Audio streaming live')}
            {connectionState === 'failed' && 'Connection lost'}
          </p>
        </div>
      )}

      <audio ref={audioRef} autoPlay />

      {isAdmin && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/40">
              <ShieldAlert className="mr-2 h-4 w-4" />
              End this stream now
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End this stream now?</AlertDialogTitle>
              <AlertDialogDescription>
                This immediately disconnects the broadcaster, distinct from a normal end. A reason is required and stored on the show for the record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
              placeholder="Reason for ending this stream..."
              value={terminateReason}
              onChange={e => setTerminateReason(e.target.value)}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleTerminate}
                disabled={!terminateReason.trim() || isTerminating}
                className="bg-destructive hover:bg-destructive/90"
              >
                End Stream
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
