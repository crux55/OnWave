'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { UserCircle2, Loader2, Award, FileText, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { fetchPublicProfile, fetchUserBadges, fetchUserStations, type Badge, type Station } from '@/lib/api';
import type { Profile } from '@/lib/types';

export default function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stations, setStations] = useState<Station[]>([]);

  const getAvatarUrl = (filename: string | undefined) => filename ? `${apiHost}${filename}` : undefined;

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
      <Card className="shadow-xl">
        <CardHeader className="items-center text-center border-b pb-6">
          <Avatar className="h-24 w-24 border-4 border-primary mb-4 shadow-md">
            <AvatarImage src={getAvatarUrl(profile.avatar)} alt="User Avatar" />
            <AvatarFallback>
              <UserCircle2 className="h-16 w-16 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl">{profile.name || 'OnWave User'}</CardTitle>
          {profile.location && <CardDescription>{profile.location}</CardDescription>}
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-8">
          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Bio
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed pl-2 border-l-2 border-primary/50">
              {profile.bio || "This user hasn't added a bio yet."}
            </p>
          </section>

          {badges.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" /> Badges
                </h3>
                <div className="flex flex-wrap gap-2">
                  {badges.map(badge => (
                    <div
                      key={badge.id}
                      title={badge.issuer_name ? `${badge.description} — awarded by ${badge.issuer_name}` : badge.description}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm"
                    >
                      <span>{badge.icon}</span>
                      <span className="font-medium text-foreground">{badge.name}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {stations.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Radio className="h-5 w-5 text-primary" /> Stations
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stations.map(station => (
                    <Link
                      key={station.id}
                      href={`/stations/${station.slug || station.id}`}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors"
                    >
                      <span className="font-medium text-foreground">{station.name}</span>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
