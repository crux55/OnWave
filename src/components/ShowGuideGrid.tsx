'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { PBSShow } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ShowGuideGridProps {
  shows: PBSShow[]; // already scoped to a single day
  isToday: boolean;
  onSelectShow: (show: PBSShow) => void;
}

const PX_PER_HOUR = 92;
const LABEL_WIDTH = 128;
const ROW_HEIGHT = 60;
const MIN_BLOCK_WIDTH = 44;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function blockGeometry(show: PBSShow) {
  const startMin = toMinutes(show.start_time);
  let endMin = toMinutes(show.end_time);
  // Shows that cross midnight (end <= start) get clipped to the end of this
  // day's row rather than wrapping — the portion after midnight belongs to
  // the following day's own fetch/row, so nothing is double-counted, this
  // just means the bar reads a little short for those.
  if (endMin <= startMin) endMin = 24 * 60;
  const left = (startMin / 60) * PX_PER_HOUR;
  const width = Math.max(((endMin - startMin) / 60) * PX_PER_HOUR, MIN_BLOCK_WIDTH);
  return { left, width };
}

// A real broadcast-guide timeline: stations as rows, hours across the top,
// a live "now" line — the layout the user picked over a flat list/agenda
// after comparing three mockups (see the published artifact this was
// designed from). Replaces rendering every show as an identically-sized
// card in one giant flat grid, which is unreadable past a couple dozen
// entries let alone the ~450 a full month's PBS fetch returns.
export function ShowGuideGrid({ shows, isToday, onSelectShow }: ShowGuideGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const stationRows = useMemo(() => {
    const byStation = new Map<string, PBSShow[]>();
    for (const show of shows) {
      const key = show.station_name || 'Unknown station';
      const list = byStation.get(key) ?? [];
      list.push(show);
      byStation.set(key, list);
    }
    return Array.from(byStation.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([station, list]) => [station, [...list].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))] as const);
  }, [shows]);

  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);
  const nowLeft = (nowMinutes / 60) * PX_PER_HOUR;

  // Center the current time in view on first load, rather than starting
  // scrolled all the way to midnight where nothing relevant is happening.
  useEffect(() => {
    if (!isToday || !scrollRef.current) return;
    const container = scrollRef.current;
    container.scrollLeft = Math.max(0, LABEL_WIDTH + nowLeft - container.clientWidth / 2);
  }, [isToday, nowLeft]);

  if (stationRows.length === 0) {
    return (
      <div className="rounded-xl border border-border py-16 text-center text-muted-foreground">
        No shows scheduled for this day.
      </div>
    );
  }

  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div ref={scrollRef} className="overflow-x-auto rounded-xl border border-border">
      <div className="relative" style={{ width: LABEL_WIDTH + hours.length * PX_PER_HOUR }}>
        {/* Hour header row */}
        <div className="sticky top-0 z-[3] flex border-b border-border bg-[hsl(240_16%_9%)]">
          <div className="sticky left-0 z-[3] shrink-0 border-r border-border bg-card" style={{ width: LABEL_WIDTH }} />
          {hours.map(h => (
            <div
              key={h}
              className="shrink-0 border-r border-border px-2 py-2.5 font-mono text-[11px] tabular-nums text-muted-foreground"
              style={{ width: PX_PER_HOUR }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Station rows */}
        {stationRows.map(([station, stationShows]) => (
          <div key={station} className="flex">
            <div
              className="sticky left-0 z-[2] flex shrink-0 items-center gap-2 truncate border-b border-r border-border bg-[hsl(240_16%_9%)] px-3 text-sm font-semibold"
              style={{ width: LABEL_WIDTH, height: ROW_HEIGHT }}
            >
              <span className="truncate">{station}</span>
            </div>
            <div
              className="relative shrink-0 border-b border-border"
              style={{
                width: hours.length * PX_PER_HOUR,
                height: ROW_HEIGHT,
                backgroundImage: `repeating-linear-gradient(to right, hsl(var(--border)) 0, hsl(var(--border)) 1px, transparent 1px, transparent ${PX_PER_HOUR}px)`,
              }}
            >
              {stationShows.map(show => {
                const { left, width } = blockGeometry(show);
                const isLive = show.status === 'live';
                const isExpired = show.status === 'expired';
                return (
                  <button
                    key={show.id}
                    type="button"
                    onClick={() => onSelectShow(show)}
                    title={`${show.name}${show.dj ? ` — ${show.dj}` : ''} (${show.start_time}–${show.end_time})`}
                    className={cn(
                      'absolute top-1.5 bottom-1.5 overflow-hidden rounded-lg border px-2 py-1 text-left transition-colors',
                      isLive && 'border-red-500/60 bg-red-500/20 hover:bg-red-500/30',
                      isExpired && 'border-border bg-muted/40 opacity-50 hover:opacity-75',
                      !isLive && !isExpired && 'border-accent/40 bg-accent/10 hover:bg-accent/20'
                    )}
                    style={{ left, width }}
                  >
                    <div className={cn(
                      'font-mono text-[10px] tabular-nums',
                      isLive ? 'text-red-300' : isExpired ? 'text-muted-foreground' : 'text-accent'
                    )}>
                      {show.start_time}
                      {isLive && ' · LIVE'}
                    </div>
                    <div className="truncate text-xs font-semibold text-foreground">{show.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {isToday && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-[4] w-0.5 bg-red-500 shadow-[0_0_8px_hsl(0_90%_62%)]"
            style={{ left: LABEL_WIDTH + nowLeft }}
          >
            <span className="absolute -top-[18px] -left-3.5 text-[9px] font-extrabold tracking-wide text-red-400">NOW</span>
          </div>
        )}
      </div>
    </div>
  );
}
