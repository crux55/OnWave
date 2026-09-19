'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCircle2, Edit3, Loader2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';
import { fetchCurrentUserProfile, fetchMyBadges, fetchMyStations, markBadgesSeen, type MyBadge, type Station } from '@/lib/api';
import type { Profile, Token } from '@/lib/types';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
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
    <div className="container mx-auto py-8 max-w-3xl">
      <header className="mb-10 text-center">
        <UserCircle2 className="mx-auto h-20 w-20 text-accent mb-4" />
        <h1 className="text-5xl font-bold tracking-tight text-foreground">Your Profile</h1>
        <p className="text-xl text-muted-foreground mt-3">
          What other OnWave users see when they visit your page.
        </p>
      </header>

      <Card className="shadow-xl">
        <ProfileHeader
          avatarUrl={getAvatarUrl(userProfile.avatar)}
          name={userProfile.name || 'No Name Provided'}
          subtitle={token ? (token.email || 'No email provided') : 'No email provided'}
        />
        <CardContent className="p-6 md:p-8 space-y-8">
          <ProfileBioSection
            bio={userProfile.bio}
            emptyText="You haven't added a bio yet."
            action={
              <Button onClick={() => router.push('/profile/edit')}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            }
          />

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

          <Separator />

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Account Details</h3>
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
          </section>

          {token?.user_id && (
            <>
              <Separator />
              <section>
                <Link
                  href={`/profile/${userProfile.slug || token.user_id}`}
                  className="flex items-center justify-between gap-3 p-3 -mx-3 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <UserCircle2 className="h-5 w-5 text-primary" /> View Public Profile
                    <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${userProfile.is_public ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {userProfile.is_public ? 'Public' : 'Private'}
                    </span>
                  </h3>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
