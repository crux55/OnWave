
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCircle2, ListMusic, Radio, Podcast, Users, FileText, Edit3, LogOut, Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getAuth, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { initializeAppIfNeeded } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';

// Initialize Firebase
initializeAppIfNeeded();
const auth = getAuth();

// Placeholder data - in a real app, this would come from an API or Firebase services
const userProfileData = {
  bio: 'Lover of synthwave, lo-fi beats, and discovering new radio waves. Always on the hunt for the next great tune!',
  subscription: 'Premium', // Example
  memberSince: 'January 1, 2023', // Example
  favoriteGenre: 'Synthwave', // Example
  theme: 'Dark Mode (App Default)',
  playlists: [
    { id: 'pl1', name: 'Late Night Coding Vibes' },
    { id: 'pl2', name: "Retro Drive '86" },
  ],
  followedStations: [
    { id: 'st1', name: 'Synthwave FM' },
    { id: 'st2', name: 'Chillhop Raccoon' },
  ],
  followedShows: [
    { id: 'sh1', name: 'Future Beats Show' },
  ],
  followedDJs: [
    { id: 'dj1', name: 'DJ Starlight' },
    { id: 'dj2', name: 'The Lofi Guru' },
  ],
};

interface ListItemProps {
  items: { id: string; name: string }[];
  emptyMessage: string;
  icon: React.ElementType;
}

const ProfileListSection: React.FC<ListItemProps> = ({ items, emptyMessage, icon: Icon }) => (
  <div className="space-y-3">
    {items.length > 0 ? (
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-md hover:bg-muted/60 transition-colors">
            <Icon className="h-5 w-5 text-accent flex-shrink-0" />
            <span className="text-sm text-foreground">{item.name}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="flex items-center gap-3 p-2 text-sm text-muted-foreground">
        <Icon className="h-5 w-5 text-muted-foreground/70 flex-shrink-0" />
        {emptyMessage}
      </p>
    )}
  </div>
);


export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        // If not logged in and trying to access /profile, replace current history entry
        // to avoid back-button loops.
        router.replace('/auth/login'); 
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      toast({
        title: 'Logged Out',
        description: 'You have been successfully signed out.',
      });
      router.push('/auth/login'); // Redirect to login page after logout
    } catch (error: any) {
      console.error('Logout Error:', error);
      toast({
        title: 'Logout Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 text-accent animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Profile...</p>
      </div>
    );
  }

  // This check now happens *after* isLoading is false.
  // If currentUser is still null at this point (and not loading),
  // it means the redirect from useEffect should have already occurred or is in process.
  // This section acts as a fallback UI or for states where redirect might be pending/failed.
  if (!currentUser) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">You need to be logged in to view this page.</p>
        <Button onClick={() => router.push('/auth/login')}>
          Go to Login
        </Button>
      </div>
    );
  }

  // Use actual user data if available, otherwise fall back to placeholders or profileData
  const displayName = currentUser.displayName || 'User';
  const displayEmail = currentUser.email || 'No email provided';
  const avatarUrl = currentUser.photoURL || `https://placehold.co/100x100.png`;


  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <header className="mb-10 text-center">
        <UserCircle2 className="mx-auto h-20 w-20 text-accent mb-4" />
        <h1 className="text-5xl font-bold tracking-tight text-foreground">Your Profile</h1>
        <p className="text-xl text-muted-foreground mt-3">
          Manage your OnWave account, preferences, and activity.
        </p>
      </header>
      
      <Card className="shadow-xl">
        <CardHeader className="items-center text-center border-b pb-6">
            <Avatar className="h-28 w-28 border-4 border-primary mb-4 shadow-md">
                <AvatarImage src={avatarUrl} alt="User Avatar" data-ai-hint="user profile picture" />
                <AvatarFallback>
                     {displayName ? displayName.charAt(0).toUpperCase() : <UserCircle2 className="h-20 w-20 text-muted-foreground" />}
                </AvatarFallback>
            </Avatar>
          <CardTitle className="text-3xl">{displayName}</CardTitle>
          <CardDescription className="text-base">{displayEmail}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-8">
          
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Bio
              </h3>
              <Button variant="ghost" size="sm" className="text-xs">
                <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit Bio
              </Button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-2 border-l-2 border-primary/50">
              {userProfileData.bio || "You haven't added a bio yet."}
            </p>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <ListMusic className="h-5 w-5 text-primary" /> My Playlists
            </h3>
            <ProfileListSection 
              items={userProfileData.playlists}
              emptyMessage="No playlists created yet. Start curating!"
              icon={ListMusic}
            />
          </section>

          <Separator />
          
          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3">Following</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Radio className="h-4 w-4" /> Stations
                </h4>
                <ProfileListSection 
                  items={userProfileData.followedStations}
                  emptyMessage="You're not following any stations yet."
                  icon={Radio}
                />
              </div>
              <div>
                <h4 className="text-md font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Podcast className="h-4 w-4" /> Shows
                </h4>
                <ProfileListSection 
                  items={userProfileData.followedShows}
                  emptyMessage="No shows followed yet. Explore and find some!"
                  icon={Podcast}
                />
              </div>
              <div>
                <h4 className="text-md font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" /> DJs
                </h4>
                <ProfileListSection 
                  items={userProfileData.followedDJs}
                  emptyMessage="Not following any DJs. Discover talent!"
                  icon={Users}
                />
              </div>
            </div>
          </section>
          
          <Separator />

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Account Details</h3>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Subscription: <span className="text-primary font-medium">{userProfileData.subscription}</span></p>
                <p className="text-muted-foreground">Member since: {userProfileData.memberSince}</p>
                {currentUser.metadata.creationTime && (
                  <p className="text-muted-foreground">Account Created: {new Date(currentUser.metadata.creationTime).toLocaleDateString()}</p>
                )}
                {currentUser.metadata.lastSignInTime && (
                   <p className="text-muted-foreground">Last Sign In: {new Date(currentUser.metadata.lastSignInTime).toLocaleString()}</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Preferences</h3>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Favorite Genre: {userProfileData.favoriteGenre}</p>
                <p className="text-muted-foreground">Theme: {userProfileData.theme}</p>
              </div>
            </div>
          </section>

          <Separator />

          <div className="pt-2">
            <Button 
              variant="destructive" 
              className="w-full sm:w-auto"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging Out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" /> Log Out
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

