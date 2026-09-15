import { Award } from 'lucide-react';
import { BadgeIcon } from '@/components/BadgeIcon';
import type { Badge } from '@/lib/api';

interface ProfileBadgesSectionProps {
  badges: Array<Badge & { is_new?: boolean }>;
  /** Own page passes BadgeLoadoutSelector; public page leaves this unset. */
  footer?: React.ReactNode;
}

export function ProfileBadgesSection({ badges, footer }: ProfileBadgesSectionProps) {
  if (badges.length === 0) return null;

  return (
    <section>
      <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" /> Badges
      </h3>
      <div className="flex flex-wrap gap-2">
        {badges.map(badge => (
          <div
            key={badge.id}
            title={badge.issuer_name ? `${badge.description} — awarded by ${badge.issuer_name}` : badge.description}
            className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm"
          >
            <BadgeIcon badge={badge} size={18} />
            <span className="font-medium text-foreground">{badge.name}</span>
            {badge.is_new && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">
                New
              </span>
            )}
          </div>
        ))}
      </div>
      {footer && <div className="mt-3">{footer}</div>}
    </section>
  );
}
