import { UserCircle2 } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileHeaderProps {
  avatarUrl?: string;
  name: string;
  /** Own page passes the account email; public page passes location. */
  subtitle?: React.ReactNode;
  size?: 'lg' | 'md';
}

export function ProfileHeader({ avatarUrl, name, subtitle, size = 'lg' }: ProfileHeaderProps) {
  const avatarSize = size === 'lg' ? 'h-28 w-28' : 'h-24 w-24';
  const iconSize = size === 'lg' ? 'h-20 w-20' : 'h-16 w-16';

  return (
    <CardHeader className="items-center text-center border-b pb-6">
      <Avatar className={`${avatarSize} border-4 border-primary mb-4 shadow-md`}>
        <AvatarImage src={avatarUrl} alt="User Avatar" data-ai-hint="user profile picture" />
        <AvatarFallback>
          <UserCircle2 className={`${iconSize} text-muted-foreground`} />
        </AvatarFallback>
      </Avatar>
      <CardTitle className="text-3xl">{name || 'OnWave User'}</CardTitle>
      {subtitle && <CardDescription className="text-base">{subtitle}</CardDescription>}
    </CardHeader>
  );
}
