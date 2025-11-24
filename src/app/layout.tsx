
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Wand2, UserCircle2, ListMusic, Bell, Radio } from 'lucide-react';
import React from 'react';

import './globals.css';
import { AppLogo } from '@/components/AppLogo';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { RadioPlayer } from '@/components/RadioPlayer';
import { MaximizedPlayerDialog } from '@/components/MaximizedPlayerDialog';
import { ShowTicker } from '@/components/ShowTicker';
import { PlayerProvider, usePlayer } from '@/contexts/PlayerContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { TickerProvider, useTicker } from '@/contexts/TickerContext';
import { RemindersProvider } from '@/contexts/RemindersContext';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/shows', label: 'Shows', icon: Radio },
  // { href: '/recommendations', label: 'Explore', icon: Wand2 },
  // { href: '/profile', label: 'Profile', icon: UserCircle2 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PlayerProvider>
          <TickerProvider>
            <RemindersProvider>
              <AppLayoutContent>{children}</AppLayoutContent>
            </RemindersProvider>
          </TickerProvider>
        </PlayerProvider>
      </body>
    </html>
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const player = usePlayer();
  const { isTickerVisible } = useTicker();

  const getBottomPadding = () => {
    const tickerHeight = isTickerVisible ? 12 : 0; // 48px = h-12
    
    if (!player.isPlayerBarOpen || player.isMaximizedViewOpen) {
      return isTickerVisible ? "pb-28 sm:pb-18" : "pb-16 sm:pb-6"; // Padding when player is closed or maximized dialog is open
    }
    if (player.isPlayerMinimized) {
      return isTickerVisible ? "pb-36 sm:pb-32" : "pb-24 sm:pb-20"; // Padding for minimized player + ticker
    }
    return isTickerVisible ? "pb-44 sm:pb-40" : "pb-32 sm:pb-28"; // Padding for standard player bar + ticker
  };
  
  const mainContentPadding = getBottomPadding();

  return (
    <WebSocketProvider>
      <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <AppLogo iconOnly={false} />
        </div>
        <nav className="hidden sm:flex items-center gap-2">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              asChild
              className="text-sm"
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
              ? isTickerVisible ? "bottom-24" : "bottom-12" // Above minimized player + ticker or just player
              : isTickerVisible ? "bottom-32" : "bottom-20" // Above standard player + ticker or just player
            : isTickerVisible ? "bottom-12" : "bottom-0" // Above ticker only or at bottom
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

      <main className={cn("flex-1 overflow-y-auto p-4 md:p-6 lg:p-8", mainContentPadding)}>
        {children}
      </main>

      {/* Show Ticker - always shown at the bottom */}
      {isTickerVisible && (
        <ShowTicker 
          className={cn(
            player.isPlayerBarOpen && !player.isMaximizedViewOpen 
              ? player.isPlayerMinimized 
                ? "bottom-12" // Above minimized player
                : "bottom-20" // Above standard player
              : "bottom-0" // At the very bottom when no player
          )}
        />
      )}

      {/* Radio Player - positioned above ticker */}
      {player.isPlayerBarOpen && player.currentStation && !player.isMaximizedViewOpen && (
        <RadioPlayer 
          station={player.currentStation} 
          className="bottom-12" // Always 12px above ticker
        />
      )}
      
      {player.isPlayerBarOpen && player.currentStation && player.isMaximizedViewOpen && (
        <MaximizedPlayerDialog station={player.currentStation} />
      )}
    </div>
    </WebSocketProvider>
  );
}
