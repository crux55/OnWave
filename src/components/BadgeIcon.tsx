import { useState } from 'react';
import { getUploadedFileUrl } from '@/lib/utils';
import type { Badge } from '@/lib/api';

interface BadgeIconProps {
  badge: Pick<Badge, 'icon' | 'icon_url' | 'name'>;
  /** px, applies to both dimensions when icon_url is used. */
  size?: number;
  className?: string;
  title?: string;
}

// An uploaded image takes priority over the text/emoji icon everywhere a
// badge renders — icon stays as the fallback both for badges that never
// had an image and if the image ever fails to load.
export function BadgeIcon({ badge, size = 20, className, title }: BadgeIconProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const url = getUploadedFileUrl(badge.icon_url);

  if (url && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny, self-hosted uploads; next/image's overhead isn't worth it here.
      <img
        src={url}
        alt={badge.name}
        title={title}
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: 4, display: 'inline-block' }}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return <span className={className} title={title}>{badge.icon}</span>;
}
