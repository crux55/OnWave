'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp, Menu as MenuIcon, Play, Pause, Radio, type LucideIcon } from 'lucide-react';
import React, { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { usePlayer } from '@/contexts/PlayerContext';
import { useListenerBroadcast } from '@/contexts/ListenerBroadcastContext';
import { useMobileDock, type MobileDockTab } from '@/contexts/MobileDockContext';
import { useReportHeight } from '@/hooks/use-report-height';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface MobileBottomDockProps {
  navItems: NavItem[];
}

// Owns the whole bottom edge on mobile as one dock, replacing what used to
// be up to three independently `fixed` elements (nav, player bar, live
// mini-player) each hand-computing a bottom offset from a different subset
// of player/live state — which is exactly how they ended up stacked on top
// of each other. RadioPlayer and LiveListenerMiniPlayer stay mounted
// elsewhere (see layout.tsx) so there's still only one <audio> element and
// one LiveKit room subscription; this dock just decides, via
// MobileDockContext, whether their bar is the thing currently showing above
// the strip.
export function MobileBottomDock({ navItems }: MobileBottomDockProps) {
  const pathname = usePathname();
  const player = usePlayer();
  const listener = useListenerBroadcast();
  const dock = useMobileDock();

  const isLiveMiniPlayerVisible = !!listener.room && !!listener.currentShowId && pathname !== `/shows/${listener.currentShowId}`;
  const hasPlayerTab = player.isPlayerBarOpen && !player.isPlayerMinimized;
  const hasLiveTab = isLiveMiniPlayerVisible;

  // Auto-switch to whatever just started, without fighting a tab the user
  // deliberately picked on every re-render — only on the rising edge.
  const prevHasPlayerTab = useRef(hasPlayerTab);
  const prevHasLiveTab = useRef(hasLiveTab);
  useEffect(() => {
    if (hasPlayerTab && !prevHasPlayerTab.current) {
      dock.setActiveTab('player');
      dock.setMinimized(false);
    }
    prevHasPlayerTab.current = hasPlayerTab;
  }, [hasPlayerTab, dock]);
  useEffect(() => {
    if (hasLiveTab && !prevHasLiveTab.current) {
      dock.setActiveTab('live');
      dock.setMinimized(false);
    }
    prevHasLiveTab.current = hasLiveTab;
  }, [hasLiveTab, dock]);

  // If the active tab's content disappears (station stopped, left the live
  // show), fall back to Menu rather than showing an empty tab.
  useEffect(() => {
    if (dock.activeTab === 'player' && !hasPlayerTab) dock.setActiveTab('menu');
    if (dock.activeTab === 'live' && !hasLiveTab) dock.setActiveTab('menu');
  }, [dock, hasPlayerTab, hasLiveTab]);

  const reportDockHeight = useCallback((h: number) => dock.reportHeight('dock', h), [dock.reportHeight]);
  const selfRef = useReportHeight(true, reportDockHeight);

  const showMenuContent = dock.activeTab === 'menu' && !dock.minimized;

  const selectTab = (tab: MobileDockTab) => {
    if (dock.activeTab === tab) {
      dock.setMinimized(!dock.minimized);
    } else {
      dock.setActiveTab(tab);
      dock.setMinimized(false);
    }
  };

  return (
    <div
      ref={selfRef}
      className="sm:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col border-t bg-background"
      // Reserves the gesture-nav home-indicator area on phones that have one
      // (iPhone X+, most modern Android) -- without it, this fixed dock sits
      // partly behind that system UI instead of above it, and since
      // useReportHeight measures this element's real (border-box) height,
      // the reserved space is automatically included in dock.totalHeight,
      // which is what every scrollable page pads against (see layout.tsx).
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {showMenuContent && (
        <nav className="flex justify-around p-2">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              asChild
              className="flex flex-col items-center h-auto p-1 text-xs"
            >
              <Link href={item.href}>
                <item.icon className="h-5 w-5 mb-0.5" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      )}

      <div className="flex items-stretch h-14 border-t first:border-t-0">
        <button
          type="button"
          onClick={() => selectTab('menu')}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
            dock.activeTab === 'menu' ? 'text-accent' : 'text-muted-foreground'
          )}
        >
          <MenuIcon className="h-5 w-5" />
          Menu
          {dock.activeTab === 'menu' && (dock.minimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
        </button>

        {hasPlayerTab && (
          <button
            type="button"
            onClick={() => selectTab('player')}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
              dock.activeTab === 'player' ? 'text-accent' : 'text-muted-foreground'
            )}
          >
            {player.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            Player
            {dock.activeTab === 'player' && (dock.minimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
          </button>
        )}

        {hasLiveTab && (
          <button
            type="button"
            onClick={() => selectTab('live')}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
              dock.activeTab === 'live' ? 'text-accent' : 'text-muted-foreground'
            )}
          >
            <Radio className={cn('h-5 w-5 text-red-500', listener.connectionState === 'connected' && 'animate-pulse')} />
            Live
            {dock.activeTab === 'live' && (dock.minimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
          </button>
        )}
      </div>
    </div>
  );
}
