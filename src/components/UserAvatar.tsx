import { UserCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function UserAvatar() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Avatar className="h-10 w-10 border-2 border-accent">
        <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="user profile" />
        <AvatarFallback>
          <UserCircle2 className="h-8 w-8 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div className="group-data-[collapsible=icon]:hidden">
        <p className="text-sm font-semibold text-foreground">Jane Doe</p>
        <p className="text-xs text-muted-foreground">Premium User</p>
      </div>
    </div>
  );
}
