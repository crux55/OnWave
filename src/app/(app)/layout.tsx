
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Wand2, UserCircle2, ListMusic } from 'lucide-react';
import React from 'react';

import { AppLogo } from '@/components/AppLogo';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { RadioPlayer } from '@/components/RadioPlayer';
import { MaximizedPlayerDialog } from '@/components/MaximizedPlayerDialog';
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

  const getBottomPadding = () => {
    if (!player.isPlayerBarOpen || player.isMaximizedViewOpen) {
      return "pb-16 sm:pb-6"; // Padding when player is closed or maximized dialog is open
    }
    if (player.isPlayerMinimized) {
      return "pb-24 sm:pb-20"; // Padding for minimized player
    }
    return "pb-32 sm:pb-28"; // Padding for standard player bar
  };
  
  const mainContentPadding = getBottomPadding();

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

      {player.isPlayerBarOpen && player.currentStation && !player.isMaximizedViewOpen && (
        <RadioPlayer station={player.currentStation} />
      )}
      
      {player.isPlayerBarOpen && player.currentStation && player.isMaximizedViewOpen && (
        <MaximizedPlayerDialog station={player.currentStation} />
      )}
    </div>
  );
}
