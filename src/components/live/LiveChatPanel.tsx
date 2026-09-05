'use client';

import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { Send, MoreVertical, Trash2, VolumeX, Settings, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import {
  fetchChatHistory,
  sendChatMessage,
  deleteChatMessage,
  muteChatUser,
  updateChatSettings,
  type ChatMessage,
} from '@/lib/api';
import type { InternalShow } from '@/lib/types';

interface DataMessage {
  type: 'chat_message' | 'chat_delete';
  message?: ChatMessage;
  id?: string;
}

const MUTE_OPTIONS: { label: string; minutes?: number }[] = [
  { label: '5 minutes', minutes: 5 },
  { label: '10 minutes', minutes: 10 },
  { label: '1 hour', minutes: 60 },
  { label: 'Rest of the show' },
];

interface LiveChatPanelProps {
  show: InternalShow;
  room: Room | null;
  isModerator: boolean;
  currentUserId?: string;
}

export function LiveChatPanel({ show, room, isModerator, currentUserId }: LiveChatPanelProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [profanityFilterEnabled, setProfanityFilterEnabled] = useState(show.profanity_filter_enabled);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatHistory(show.id).then(setMessages).catch(() => {});
  }, [show.id]);

  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const data: DataMessage = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'chat_message' && data.message) {
          setMessages(prev => [...prev, data.message!]);
        } else if (data.type === 'chat_delete' && data.id) {
          setMessages(prev => prev.filter(m => m.id !== data.id));
        }
      } catch {
        // Ignore malformed/foreign data payloads on the room's data channel.
      }
    };
    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const body = input.trim();
    if (!body) return;
    setIsSending(true);
    try {
      await sendChatMessage(show.id, body);
      setInput('');
    } catch (error: any) {
      toast({ title: "Couldn't send message", description: error.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteChatMessage(show.id, messageId);
    } catch (error: any) {
      toast({ title: 'Failed to delete message', description: error.message, variant: 'destructive' });
    }
  };

  const handleMute = async (userId: string, minutes?: number) => {
    try {
      await muteChatUser(show.id, userId, minutes);
      toast({ title: 'User muted' });
    } catch (error: any) {
      toast({ title: 'Failed to mute user', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleProfanityFilter = async (enabled: boolean) => {
    setProfanityFilterEnabled(enabled);
    try {
      await updateChatSettings(show.id, enabled);
    } catch (error: any) {
      setProfanityFilterEnabled(!enabled);
      toast({ title: 'Failed to update chat settings', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card/60">
      <div className="flex items-center justify-between border-b border-border p-3">
        <span className="text-sm font-semibold text-foreground">Chat</span>
        {isModerator && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="flex items-center justify-between">
                <Label htmlFor="profanity-filter" className="text-sm font-normal">Profanity filter</Label>
                <Switch id="profanity-filter" checked={profanityFilterEnabled} onCheckedChange={handleToggleProfanityFilter} />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2.5">
          {messages.map(message => (
            <div key={message.id} className="group flex items-start justify-between gap-2 text-sm">
              <p className="min-w-0 break-words">
                <span className="font-medium text-foreground">{message.username}</span>
                {message.badges?.map(badge => (
                  <span key={badge.id} title={badge.name} className="mx-1 inline-block">{badge.icon}</span>
                ))}
                <span className="text-muted-foreground">: </span>
                <span className="text-foreground/90">{message.body}</span>
              </p>
              {isModerator && message.user_id !== currentUserId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDelete(message.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete message
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <VolumeX className="mr-2 h-4 w-4" /> Mute {message.username}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {MUTE_OPTIONS.map(option => (
                          <DropdownMenuItem key={option.label} onClick={() => handleMute(message.user_id, option.minutes)}>
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="flex items-center gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !isSending) handleSend(); }}
          placeholder="Say something..."
          maxLength={500}
        />
        <Button size="icon" onClick={handleSend} disabled={isSending || !input.trim()}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
