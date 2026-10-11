import { UserCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileHeroProps {
  avatarUrl?: string;
  name: string;
  /** Small muted line under the name (email, location, a status pill, ...). */
  meta?: React.ReactNode;
  /** Right-aligned button row (Edit Profile, View Public Profile, Make Public, ...). */
  actions?: React.ReactNode;
}

export function ProfileHero({ avatarUrl, name, meta, actions }: ProfileHeroProps) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="h-28 w-full bg-gradient-to-br from-accent/40 via-accent-2/25 to-background sm:h-36" />
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="-mt-16 flex items-end gap-4 sm:-mt-20">
          <Avatar className="h-24 w-24 shrink-0 border-4 border-background shadow-lg sm:h-28 sm:w-28">
            <AvatarImage src={avatarUrl} alt={name} data-ai-hint="user profile picture" />
            <AvatarFallback>
              <UserCircle2 className="h-16 w-16 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 pb-1">
            <h1 className="truncate font-display text-2xl font-bold text-foreground sm:text-3xl">{name || 'OnWave User'}</h1>
            {meta && <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
