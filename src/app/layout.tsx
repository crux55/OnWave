'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, UserCircle2, ListMusic, Bell, Radio, Users } from 'lucide-react';
import { Sora, Manrope } from 'next/font/google';
import React from 'react';

import './globals.css';
import { AppLogo } from '@/components/AppLogo';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { RadioPlayer } from '@/components/RadioPlayer';
import { MaximizedPlayerDialog } from '@/components/MaximizedPlayerDialog';
import { PlayerProvider, usePlayer } from '@/contexts/PlayerContext';
import { RemindersProvider } from '@/contexts/RemindersContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

const sora = Sora({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-sora' });
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-manrope' });

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/shows', label: 'Shows', icon: Radio },
  { href: '/stations', label: 'Stations', icon: Users },
  // { href: '/profile', label: 'Profile', icon: UserCircle2 },
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
        <PlayerProvider>
          <RemindersProvider>
            <NotificationProvider>
              <AppLayoutContent>{children}</AppLayoutContent>
              <Toaster />
            </NotificationProvider>
          </RemindersProvider>
        </PlayerProvider>
      </body>
    </html>
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const player = usePlayer();

  return (
      <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <AppLogo iconOnly={false} />
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

      {/* Mobile Bottom Navigation */}
      <nav 
        className={cn(
          "sm:hidden fixed left-0 right-0 z-30 flex justify-around border-t bg-background p-2",
          player.isPlayerBarOpen && !player.isMaximizedViewOpen 
            ? player.isPlayerMinimized 
              ? "bottom-12" // Above minimized player
              : "bottom-20" // Above standard player
            : "bottom-0" // At bottom when no player
        )}
      >
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

      <main
        className={cn(
          "flex-1 overflow-y-auto p-4 md:p-6 lg:p-8",
          // The fixed player bar overlays content instead of pushing it —
          // without this, the bottom of the page is unreachable behind it.
          player.isPlayerBarOpen && !player.isMaximizedViewOpen && !player.isPlayerMinimized && "pb-28 sm:pb-24"
        )}
      >
        {children}
      </main>

      {/* Radio Player */}
      {player.isPlayerBarOpen && player.currentStation && (
        <RadioPlayer 
          station={player.currentStation} 
          className={player.isMaximizedViewOpen ? "bottom-0 invisible pointer-events-none" : "bottom-0"}
        />
      )}
      
      {player.isPlayerBarOpen && player.currentStation && player.isMaximizedViewOpen && (
        <MaximizedPlayerDialog station={player.currentStation} />
      )}
    </div>
  );
}
