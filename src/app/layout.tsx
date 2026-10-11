'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, UserCircle2, ListMusic, Bell, Radio, CalendarDays } from 'lucide-react';
import { Sora, Manrope } from 'next/font/google';
import React, { Suspense } from 'react';

import './globals.css';
import { AppLogo } from '@/components/AppLogo';
import { AppSidebar } from '@/components/AppSidebar';
import { TopBarSearch } from '@/components/TopBarSearch';
import { UserAvatar } from '@/components/UserAvatar';
import { RadioPlayer } from '@/components/RadioPlayer';
import { MaximizedPlayerDialog } from '@/components/MaximizedPlayerDialog';
import { PlayerProvider, usePlayer } from '@/contexts/PlayerContext';
import { useListenerBroadcast } from '@/contexts/ListenerBroadcastContext';
import { LiveBroadcastProvider } from '@/contexts/LiveBroadcastContext';
import { ListenerBroadcastProvider } from '@/contexts/ListenerBroadcastContext';
import { LiveBroadcastIndicator } from '@/components/live/LiveBroadcastIndicator';
import { LiveListenerMiniPlayer } from '@/components/live/LiveListenerMiniPlayer';
import { FeedbackButton } from '@/components/FeedbackButton';
import { RemindersProvider } from '@/contexts/RemindersContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { MobileDockProvider, useMobileDock } from '@/contexts/MobileDockContext';
import { InstallPromptProvider } from '@/contexts/InstallPromptContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { MobileBottomDock } from '@/components/MobileBottomDock';
import { ChunkErrorRecovery } from '@/components/ChunkErrorRecovery';
import { AmbientBackground } from '@/components/AmbientBackground';
import { BadgeAnnouncer } from '@/components/BadgeAnnouncer';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

const sora = Sora({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-sora' });
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-manrope' });

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Search },
  { href: '/live', label: 'Live', icon: Radio },
  { href: '/shows', label: 'Shows', icon: CalendarDays },
  { href: '/profile', label: 'Profile', icon: UserCircle2 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`}>
      <head>
        {/* viewport-fit=cover is required for env(safe-area-inset-*) to
            resolve to anything other than 0 -- without it, MobileBottomDock's
            safe-area padding (gesture-nav home indicator) is a no-op, and
            this file has no `export const viewport` to set it via Next's
            metadata API since it's a client component ('use client' above),
            which that API doesn't support. */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0A12" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OnWave" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <ChunkErrorRecovery />
        <ThemeProvider>
          <AmbientBackground />
          <InstallPromptProvider>
            <PlayerProvider>
              <LiveBroadcastProvider>
                <ListenerBroadcastProvider>
                  <RemindersProvider>
                    <NotificationProvider>
                      <MobileDockProvider>
                        <AppLayoutContent>{children}</AppLayoutContent>
                        <Toaster />
                        <BadgeAnnouncer />
                      </MobileDockProvider>
                    </NotificationProvider>
                  </RemindersProvider>
                </ListenerBroadcastProvider>
              </LiveBroadcastProvider>
            </PlayerProvider>
          </InstallPromptProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const player = usePlayer();
  const listener = useListenerBroadcast();
  const dock = useMobileDock();
  // The live-listener mini-player is hidden on the show's own page (same
  // page it'd otherwise duplicate), same check the component itself makes.
  const isLiveMiniPlayerVisible = !!listener.room && !!listener.currentShowId && pathname !== `/shows/${listener.currentShowId}`;

  return (
    <div className="flex min-h-screen">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
          {/* Sidebar is sm+ only (AppSidebar.tsx) -- below that there's no
              other way to get home or to the account menu, so the top bar
              carries both on mobile only. */}
          <Link href="/" aria-label="OnWave home" className="shrink-0 sm:hidden">
            <AppLogo iconOnly />
          </Link>
          {/* flex-1 goes on TopBarSearch's own className, not a wrapper --
              Suspense renders no DOM node of its own, so TopBarSearch's
              <form> is the actual flex item here. */}
          <Suspense fallback={<div className="h-10 max-w-xl flex-1 rounded-full bg-secondary/40" />}>
            <TopBarSearch className="max-w-xl flex-1" />
          </Suspense>
          <div className="ml-auto shrink-0 sm:hidden">
            <UserAvatar />
          </div>
        </header>

        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6 lg:p-8",
            // Desktop only (mutually-exclusive so exactly one `sm:!pb-*`
            // class is ever present — two conflicting `!important` classes
            // at the same breakpoint would leave the winner up to Tailwind's
            // build-order, not this ternary). The fixed player bar overlays
            // content instead of pushing it, so without this the bottom of
            // the page is unreachable behind it. Mobile's own bottom-of-screen
            // UI is a single dock (MobileBottomDock) that reports its true
            // rendered height below instead of guessing an offset here.
            isLiveMiniPlayerVisible
              ? "sm:!pb-16"
              : player.isPlayerBarOpen && !player.isMaximizedViewOpen && !player.isPlayerMinimized
                ? "sm:!pb-24"
                : "sm:!pb-4 md:!pb-6 lg:!pb-8"
          )}
          style={{ paddingBottom: dock.totalHeight }}
        >
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomDock navItems={navItems} />

      {/* Radio Player */}
      {player.isPlayerBarOpen && player.currentStation && (
        <RadioPlayer
          station={player.currentStation}
          className={player.isMaximizedViewOpen ? "invisible pointer-events-none" : undefined}
        />
      )}

      {player.isPlayerBarOpen && player.currentStation && player.isMaximizedViewOpen && (
        <MaximizedPlayerDialog station={player.currentStation} />
      )}

      <LiveListenerMiniPlayer />

      <LiveBroadcastIndicator />
      <FeedbackButton />
    </div>
  );
}
