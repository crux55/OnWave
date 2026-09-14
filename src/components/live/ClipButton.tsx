'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Scissors, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createClip } from '@/lib/api';

const BUFFER_SECONDS = 30;
const CHUNK_MS = 1000;

interface ClipButtonProps {
  showId: string;
  mediaRef: RefObject<HTMLMediaElement | null>;
  /** True once the element actually has live media flowing — captureStream() on an empty element produces nothing. */
  isReady: boolean;
}

/**
 * Continuously buffers the last ~30s of whatever's already playing in
 * mediaRef (no separate connection — just captureStream() on the same
 * element the listener is already hearing/watching), and on click,
 * packages that buffer and uploads it as a Clip. See project_r#21.
 */
export function ClipButton({ showId, mediaRef, isReady }: ClipButtonProps) {
  const { toast } = useToast();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [supported, setSupported] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    const el = mediaRef.current;
    if (!el || typeof (el as any).captureStream !== 'function') {
      setSupported(false);
      return;
    }

    let recorder: MediaRecorder;
    try {
      const stream: MediaStream = (el as any).captureStream();
      recorder = new MediaRecorder(stream);
    } catch {
      setSupported(false);
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size === 0) return;
      chunksRef.current.push(e.data);
      if (chunksRef.current.length > BUFFER_SECONDS) {
        chunksRef.current.shift();
      }
    };
    recorder.start(CHUNK_MS);
    recorderRef.current = recorder;

    return () => {
      recorder.stop();
      recorderRef.current = null;
      chunksRef.current = [];
    };
  }, [isReady, mediaRef]);

  if (!supported) return null;

  const handleClip = async () => {
    const chunks = chunksRef.current.slice();
    if (chunks.length === 0) {
      toast({ title: 'Nothing to clip yet', description: 'Give it a few seconds and try again.' });
      return;
    }
    setIsSaving(true);
    try {
      const blob = new Blob(chunks, { type: recorderRef.current?.mimeType || 'video/webm' });
      await createClip(showId, blob, chunks.length);
      toast({ title: 'Clip saved!', description: 'Find it on this show’s page.' });
    } catch (error: any) {
      toast({ title: 'Failed to save clip', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={handleClip}
      disabled={isSaving || !isReady}
      title="Save the last 30 seconds as a clip"
    >
      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
      Clip
    </Button>
  );
}
