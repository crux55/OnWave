
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCircle2, Settings, LogOut } from 'lucide-react';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { fetchCurrentUserProfile } from '@/lib/api';
import type { Token } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export function UserAvatar() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const tokenString = localStorage.getItem('token');
      if (!tokenString) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      let decoded: Token | null = null;
      try {
        const jwt = JSON.parse(tokenString);
        decoded = jwt_decode<Token>(jwt?.token || '');
      } catch (error) {
        localStorage.removeItem('token');
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      if (!decoded?.user_id) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      setCurrentUser({ id: decoded.user_id, email: decoded.email });
      // Real name/avatar come from the profile record, not the JWT.
      fetchCurrentUserProfile()
        .then(profile => {
          if (!profile) return;
          setCurrentUser(prev => (prev ? { ...prev, displayName: profile.name, photoURL: profile.avatar ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}${profile.avatar}` : undefined } : prev));
        })
        .catch(() => {});
      setIsLoading(false);
    };

    checkAuth();
    window.addEventListener('authChange', checkAuth);
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('authChange', checkAuth);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('authChange'));
      setCurrentUser(null);
      toast({ title: 'Logged Out', description: 'You have been successfully signed out.' });
      router.push('/');
    } catch (error: any) {
      toast({ title: 'Logout Failed', description: error.message || 'Logout failed. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-2 h-[56px] w-[150px]">
        <Avatar className="h-10 w-10 border-2 border-accent">
          <AvatarFallback>
            <UserCircle2 className="h-8 w-8 text-muted-foreground animate-pulse" />
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
            <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
            <div className="h-3 w-12 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (currentUser) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/10 transition-colors">
            <Avatar className="h-10 w-10 border-2 border-accent">
              <AvatarImage src={currentUser.photoURL || `https://placehold.co/100x100.png`} alt="User Avatar" data-ai-hint="user profile" />
              <AvatarFallback>
                {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : <UserCircle2 className="h-8 w-8 text-muted-foreground" />}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground truncate max-w-[100px] sm:max-w-[150px]">
                {currentUser.displayName || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-[150px]">
                {currentUser.email || 'View Profile'}
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => router.push('/profile')}>
            <UserCircle2 className="mr-2 h-4 w-4" /> View Profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push('/manage')}>
            <Settings className="mr-2 h-4 w-4" /> Manage
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout} disabled={isLoggingOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link href="/auth/login" className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/10 transition-colors">
      <Avatar className="h-10 w-10 border-2 border-transparent">
        {/* Default AvatarFallback uses bg-muted, which is good */}
        <AvatarFallback>
          <UserCircle2 className="h-8 w-8 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-semibold text-foreground">Sign In</p>
        <p className="text-xs text-muted-foreground">Access your account</p>
      </div>
    </Link>
  );
}
