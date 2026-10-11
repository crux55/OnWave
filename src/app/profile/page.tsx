'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCircle2, Edit3, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';
import { fetchCurrentUserProfile, fetchMyBadges, fetchMyStations, markBadgesSeen, type MyBadge, type Station } from '@/lib/api';
import type { Profile, Token } from '@/lib/types';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileBioSection } from '@/components/profile/ProfileBioSection';
import { ProfileBadgesSection } from '@/components/profile/ProfileBadgesSection';
import { ProfileStationsSection } from '@/components/profile/ProfileStationsSection';

export default function ProfilePage() {
  const router = useRouter();
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [myBadges, setMyBadges] = useState<MyBadge[]>([]);
  const [myStations, setMyStations] = useState<Station[]>([]);

  const getAvatarUrl = (filename: string | undefined) => (filename ? `${apiHost}${filename}` : undefined);

  useEffect(() => {
    const tokenString = localStorage.getItem('token');
    if (!tokenString) {
      setIsLoading(false);
      return;
    }

    try {
      const jwt = JSON.parse(tokenString);
      setToken(jwt_decode<Token>(jwt?.token || ''));
    } catch (error) {
      console.error('Error decoding token:', error);
    }

    fetchCurrentUserProfile()
      .then(data => {
        setUserProfile(data || null);
        setIsLoading(false);
      })
      .catch(() => {
        setUserProfile(null);
        setIsLoading(false);
      });

    fetchMyBadges()
      .then(badges => {
        setMyBadges(badges);
        // Notifying (toast or splash, depending on the badge) is
        // BadgeAnnouncer's job now, mounted globally so it fires wherever
        // the user happens to be, not just if/when they visit this page.
        // Still marking seen here, though -- this page is what actually
        // shows the "New" ribbon (ProfileBadgesSection), so it's the right
        // place to clear it once shown, same as before.
        const newOnes = badges.filter(b => b.is_new);
        if (newOnes.length > 0) {
          markBadgesSeen();
        }
      })
      .catch(() => setMyBadges([]));

    fetchMyStations()
      .then(setMyStations)
      .catch(() => setMyStations([]));
  }, []);

  // Not logged in once loading settles — go straight to login instead of
  // showing an interstitial "Access Denied" screen.
  useEffect(() => {
    if (!isLoading && !userProfile) {
      router.push('/auth/login');
    }
  }, [isLoading, userProfile, router]);

  if (isLoading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <ProfileHero
        avatarUrl={getAvatarUrl(userProfile.avatar)}
        name={userProfile.name || 'No Name Provided'}
        meta={token?.email || 'No email provided'}
        actions={
          <>
            <Button onClick={() => router.push('/profile/edit')}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/profile/${userProfile.slug || token?.user_id}`} className="flex items-center gap-2">
                <UserCircle2 className="h-4 w-4" /> View Public Profile
                <span className={`rounded-full px-2 py-0.5 text-xs font-normal ${userProfile.is_public ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {userProfile.is_public ? 'Public' : 'Private'}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <ProfileBioSection bio={userProfile.bio} emptyText="You haven't added a bio yet." />

          {myBadges.length > 0 && (
            <>
              <Separator />
              <ProfileBadgesSection badges={myBadges} />
            </>
          )}

          {myStations.length > 0 && (
            <>
              <Separator />
              <ProfileStationsSection stations={myStations} title="My Stations" />
            </>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-6">
          <h3 className="text-lg font-semibold text-foreground">Account Details</h3>
          <div className="space-y-1 text-sm">
            {token?.is_founding_member && (
              <p className="text-muted-foreground">
                Status: <span className="text-primary font-medium">Founding Member</span>
              </p>
            )}
            <p className="text-muted-foreground">
              Member since: {token && token.created_at ? new Date(token.created_at).toLocaleDateString() : 'Unknown'}
            </p>
            {userProfile.location && (
              <p className="text-muted-foreground">Location: {userProfile.location}</p>
            )}
            {userProfile.website && (
              <p className="text-muted-foreground">
                Website: <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{userProfile.website}</a>
              </p>
            )}
            <p className="text-muted-foreground">Favorite Genre: {userProfile.favorite_genre || 'Not set'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
