'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, UserCircle2, ListMusic, Bell, Radio, CalendarDays } from 'lucide-react';
import { Sora, Manrope } from 'next/font/google';
import React from 'react';

import './globals.css';
import { AppLogo } from '@/components/AppLogo';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
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
import { MobileBottomDock } from '@/components/MobileBottomDock';
import { ChunkErrorRecovery } from '@/components/ChunkErrorRecovery';
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
        <InstallPromptProvider>
          <PlayerProvider>
            <LiveBroadcastProvider>
              <ListenerBroadcastProvider>
                <RemindersProvider>
                  <NotificationProvider>
                    <MobileDockProvider>
                      <AppLayoutContent>{children}</AppLayoutContent>
                      <Toaster />
                    </MobileDockProvider>
                  </NotificationProvider>
                </RemindersProvider>
              </ListenerBroadcastProvider>
            </LiveBroadcastProvider>
          </PlayerProvider>
        </InstallPromptProvider>
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
      <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="OnWave home">
            <AppLogo iconOnly={false} />
          </Link>
        </div>
        <nav className="hidden sm:flex items-center gap-1 rounded-full border border-border bg-card/40 p-1">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              asChild
              className="rounded-full text-sm"
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <UserAvatar />
        </div>
      </header>

      <MobileBottomDock navItems={navItems} />

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
        {children}
      </main>

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
