'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { UserCircle2, Loader2, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ClipsList } from '@/components/live/ClipsList';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileBioSection } from '@/components/profile/ProfileBioSection';
import { ProfileBadgesSection } from '@/components/profile/ProfileBadgesSection';
import { ProfileStationsSection } from '@/components/profile/ProfileStationsSection';
import { fetchPublicProfile, fetchUserBadges, fetchUserStations, fetchDJClips, updateProfile, type Badge, type Station } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Profile, Token } from '@/lib/types';

export default function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [isMakingPublic, setIsMakingPublic] = useState(false);

  useEffect(() => {
    const tokenString = localStorage.getItem('token');
    if (!tokenString) return;
    try {
      setCurrentUserId(jwt_decode<Token>(JSON.parse(tokenString).token).user_id);
    } catch {
      // Not logged in / bad token — this just means "not the owner" below.
    }
  }, []);

  const getAvatarUrl = (filename: string | undefined) => filename ? `${apiHost}${filename}` : undefined;
  // Backend allows the profile's own owner through even while it's
  // private (see getPublicProfileHandler) so this "View Public Profile"
  // link always shows something rather than a bare 404 — the frontend's
  // job is to make that state visible with the banner below rather than
  // let it look like the page is silently broken/misconfigured.
  const isOwnProfile = !!currentUserId && !!profile && currentUserId === profile.user_id;
  const isPrivate = !!profile && !profile.is_public;

  const handleMakePublic = async () => {
    if (!profile) return;
    setIsMakingPublic(true);
    try {
      // Full-form resubmission, not a partial one -- updateProfile's PATCH
      // endpoint overwrites every field from what's sent, so this has to
      // send back everything already on the profile (unchanged) alongside
      // the one real change (is_public), or it would blank out name/bio/
      // etc. exactly like the theme endpoint was built separately to avoid.
      await updateProfile({
        name: profile.name || '',
        location: profile.location || '',
        bio: profile.bio || '',
        website: profile.website || '',
        avatar: profile.avatar || '',
        is_public: true,
        slug: profile.slug || '',
        favorite_genre: profile.favorite_genre || '',
      });
      setProfile({ ...profile, is_public: true });
      toast({ title: 'Profile is now public' });
    } catch (error: any) {
      toast({ title: "Couldn't update profile", description: error.message, variant: 'destructive' });
    } finally {
      setIsMakingPublic(false);
    }
  };
  // Must be unconditional, before the isLoading early return below — a hook
  // called only once profile finishes loading changes the hook count
  // between renders, crashing with "Rendered more hooks than during the
  // previous render" (React error #310). ClipsList only invokes this once
  // profile is real.
  const fetchClips = useCallback(() => fetchDJClips(profile?.user_id ?? ''), [profile?.user_id]);

  useEffect(() => {
    const handle = params.userId;
    if (!handle) return;

    setIsLoading(true);
    fetchPublicProfile(handle)
      .catch(() => null)
      .then(async (profileData) => {
        setProfile(profileData);
        // The URL segment may be a slug rather than the raw user ID — once
        // resolved, badges/stations are fetched by the profile's canonical
        // user_id.
        const badgeData = profileData ? await fetchUserBadges(profileData.user_id).catch(() => []) : [];
        setBadges(badgeData);
        const stationData = profileData ? await fetchUserStations(profileData.user_id).catch(() => []) : [];
        setStations(stationData);
        setIsLoading(false);
      });
  }, [params.userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 text-accent animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <UserCircle2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground mb-6">This user doesn't exist or has no profile yet.</p>
        <Button onClick={() => router.push('/')}>Back Home</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      {isOwnProfile && isPrivate && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-foreground">
              Your profile is private — this is a preview of what it would look like to others. Only you can see it right now.
            </p>
          </div>
          <Button size="sm" onClick={handleMakePublic} disabled={isMakingPublic} className="shrink-0">
            {isMakingPublic ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Make Public
          </Button>
        </div>
      )}
      <Card className="shadow-xl">
        <ProfileHeader
          avatarUrl={getAvatarUrl(profile.avatar)}
          name={profile.name || 'OnWave User'}
          subtitle={profile.location}
          size="md"
        />
        <CardContent className="p-6 md:p-8 space-y-8">
          <ProfileBioSection bio={profile.bio} emptyText="This user hasn't added a bio yet." />

          {badges.length > 0 && (
            <>
              <Separator />
              <ProfileBadgesSection badges={badges} />
            </>
          )}

          {stations.length > 0 && (
            <>
              <Separator />
              <ProfileStationsSection stations={stations} />
            </>
          )}

          <Separator />
          <ClipsList fetcher={fetchClips} />
        </CardContent>
      </Card>
    </div>
  );
}
