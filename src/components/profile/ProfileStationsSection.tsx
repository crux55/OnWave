import Link from 'next/link';
import { Radio } from 'lucide-react';
import type { Station } from '@/lib/api';

interface ProfileStationsSectionProps {
  stations: Station[];
  title?: string;
}

export function ProfileStationsSection({ stations, title = 'Stations' }: ProfileStationsSectionProps) {
  if (stations.length === 0) return null;

  return (
    <section>
      <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
        <Radio className="h-5 w-5 text-primary" /> {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {stations.map(station => (
          <Link
            key={station.id}
            href={`/stations/${station.slug || station.id}`}
            className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors"
          >
            <span className="font-medium text-foreground">{station.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
