'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio, Wand2, Settings, Home } from 'lucide-react';

import { AppLogo } from '@/components/AppLogo';
import { UserAvatar } from '@/components/UserAvatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Browse Stations', icon: Home },
  { href: '/recommendations', label: 'AI Recommendations', icon: Wand2 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state: sidebarState } = useSidebar();

  return (
    <>
      <Sidebar variant="sidebar" collapsible="icon" side="left">
        <SidebarHeader className="p-0">
            <div className="flex items-center justify-between p-2">
              <AppLogo iconOnly={sidebarState === 'collapsed'} />
              <SidebarTrigger className="md:hidden" />
            </div>
        </SidebarHeader>
        <Separator />
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className={cn(
                      sidebarState === 'collapsed' && "justify-center"
                    )}
                  >
                    <item.icon />
                    <span className={cn(sidebarState === 'collapsed' && "sr-only")}>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <Separator />
        <SidebarFooter>
          <UserAvatar />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:justify-end">
           <div className="md:hidden">
             <AppLogo iconOnly={true} />
           </div>
           <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
