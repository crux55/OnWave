import { FileText } from 'lucide-react';

interface ProfileBioSectionProps {
  bio?: string;
  emptyText: string;
  /** Own page passes an "Edit Profile" button; public page leaves this unset. */
  action?: React.ReactNode;
}

export function ProfileBioSection({ bio, emptyText, action }: ProfileBioSectionProps) {
  return (
    <section>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Bio
        </h3>
        {action}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-2 border-l-2 border-primary/50">
        {bio || emptyText}
      </p>
    </section>
  );
}
