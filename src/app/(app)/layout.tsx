
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Wand2, UserCircle2, X, ListMusic } from 'lucide-react';
import React from 'react';

import { AppLogo } from '@/components/AppLogo';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { RadioPlayer } from '@/components/RadioPlayer';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/recommendations', label: 'Explore', icon: Wand2 },
  { href: '/winamp', label: 'Winamp', icon: ListMusic },
  { href: '/profile', label: 'Profile', icon: UserCircle2 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const player = usePlayer();

  const mainContentPadding = player.isPlayerBarOpen
    ? player.isPlayerMinimized
      ? "pb-24 sm:pb-20" // Padding for minimized player
      : "pb-32 sm:pb-28" // Padding for maximized player
    : "pb-16 sm:pb-6"; // Padding when player is closed (mobile nav still there)


  return (
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
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t bg-background p-2">
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

      {player.isPlayerBarOpen && player.currentStation && (
        <div
          className={cn(
            "fixed z-40 bg-card shadow-lg border-t transition-all duration-300 ease-in-out",
            player.isPlayerMinimized
              ? "bottom-4 right-4 w-72 rounded-lg sm:mb-0 mb-16" // Minimized state: bottom-right corner, smaller
              : "bottom-0 left-0 right-0 sm:mb-0 mb-16" // Maximized state: full width at bottom
          )}
        >
          <div
            className={cn(
              "mx-auto",
              player.isPlayerMinimized ? "p-2" : "container p-3 max-w-screen-xl"
            )}
          >
            <div className={cn("flex items-center justify-between gap-2", player.isPlayerMinimized ? "flex-col items-stretch" : "gap-4")}>
              <div className={cn(player.isPlayerMinimized ? "w-full" : "flex-grow")}>
                <RadioPlayer station={player.currentStation} />
              </div>
              {!player.isPlayerMinimized && ( // Show close button only when maximized
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={player.closePlayerBar}
                  aria-label="Close player"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
