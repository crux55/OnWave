'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Radio, CalendarDays, Heart, UserCircle2, Info, type LucideIcon } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';

interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const MAIN_ITEMS: SidebarItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/live', label: 'Live', icon: Radio },
  { href: '/shows', label: 'Shows', icon: CalendarDays },
];

const LIBRARY_ITEMS: SidebarItem[] = [
  { href: '/liked', label: 'Liked Stations', icon: Heart },
  { href: '/profile', label: 'Profile', icon: UserCircle2 },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item, pathname }: { item: SidebarItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        'justify-center lg:justify-start',
        active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
      )}
    >
      <item.icon className={cn('h-5 w-5 shrink-0', active && 'text-accent')} />
      <span className="hidden lg:inline">{item.label}</span>
    </Link>
  );
}

// Desktop-app style left pane: icon rail on small desktops, full labelled
// pane from lg up. Hidden on phones, where MobileBottomDock takes over.
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r border-border bg-card/40 sm:flex lg:w-60">
      <Link href="/" aria-label="OnWave home" className="flex h-16 items-center justify-center px-2 lg:justify-start lg:px-4">
        <span className="lg:hidden"><AppLogo iconOnly /></span>
        <span className="hidden lg:block"><AppLogo iconOnly={false} /></span>
      </Link>

      <nav className="flex flex-col gap-1 px-2 lg:px-3" aria-label="Main">
        {MAIN_ITEMS.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="mx-4 my-4 border-t border-border" />

      <p className="hidden px-6 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:block">
        Your Library
      </p>
      <nav className="flex flex-col gap-1 px-2 lg:px-3" aria-label="Library">
        {LIBRARY_ITEMS.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-border p-2 lg:p-3">
        <SidebarLink item={{ href: '/about', label: 'About OnWave', icon: Info }} pathname={pathname} />
        <UserAvatar inSidebar />
      </div>
    </aside>
  );
}
