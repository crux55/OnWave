
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCircle2, LogIn } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export function UserAvatar() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth token
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const authData = JSON.parse(token);
          // Assuming your API returns user data in a similar format
          if (authData.userId || authData.id) {
            setCurrentUser({
              id: authData.userId || authData.id,
              email: authData.email || authData.user?.email || '',
              displayName: authData.displayName || authData.user?.displayName,
              photoURL: authData.photoURL || authData.user?.photoURL
            });
          }
        }
      } catch (error) {
        // Invalid token, clear it
        localStorage.removeItem('token');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

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
      <Link href="/profile" className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/10 transition-colors">
        <Avatar className="h-10 w-10 border-2 border-accent">
          <AvatarImage src={currentUser.photoURL || `https://placehold.co/100x100.png`} alt="User Avatar" data-ai-hint="user profile" />
          <AvatarFallback>
            {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : <UserCircle2 className="h-8 w-8 text-muted-foreground" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold text-foreground truncate max-w-[100px] sm:max-w-[150px]">
            {currentUser.displayName || 'User'}
          </p>
          <p className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-[150px]">
            {currentUser.email || 'View Profile'}
          </p>
        </div>
      </Link>
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
