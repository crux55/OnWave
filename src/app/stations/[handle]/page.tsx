'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { Radio, Loader2, Users, Heart, Calendar, Bell, UserCircle2, Clock, Award, Plus, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { fetchStation, fetchMyFollows, followTarget, unfollowTarget, createBadge, awardBadge, revokeBadge, type StationDetail, type Follow, type ScrapedShowSummary } from '@/lib/api';
import type { Token } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute}${period}`;
}

function formatSchedule(show: { day_of_week?: number | null; one_off_date?: string | null; start_time: string }): string {
  const time = formatTime(show.start_time);
  if (show.day_of_week !== undefined && show.day_of_week !== null) {
    return `${DAY_NAMES[show.day_of_week]}s ${time}`;
  }
  if (show.one_off_date) {
    return `${new Date(show.one_off_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${time}`;
  }
  return time;
}

function scrapedStatusColor(status: ScrapedShowSummary['status']): string {
  switch (status) {
    case 'live': return 'bg-red-500 text-white';
    case 'upcoming': return 'bg-green-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
}

export default function StationPage() {
  const params = useParams<{ handle: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [station, setStation] = useState<StationDetail | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [followedShowIds, setFollowedShowIds] = useState<Set<string>>(new Set());
  const [togglingShowId, setTogglingShowId] = useState<string | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [newBadgeIcon, setNewBadgeIcon] = useState('');
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeDescription, setNewBadgeDescription] = useState('');
  const [isCreatingBadge, setIsCreatingBadge] = useState(false);
  const [awardEmail, setAwardEmail] = useState<Record<string, string>>({});
  const [isAwarding, setIsAwarding] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  const loadStation = (handle: string) => {
    setIsLoading(true);
    fetchStation(handle)
      .then(async (data) => {
        setStation(data);
        if (data && localStorage.getItem('token')) {
          const follows: Follow[] = await fetchMyFollows().catch(() => []);
          setIsFollowing(follows.some(f => f.target_type === 'station' && f.target_id === data.id));
          setFollowedShowIds(new Set(follows.filter(f => f.target_type === 'program').map(f => f.target_id)));
        }
        setIsLoading(false);
      })
      .catch(() => {
        setStation(null);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    const handle = params.handle;
    if (!handle) return;

    const tokenString = localStorage.getItem('token');
    if (tokenString) {
      try {
        const jwt = JSON.parse(tokenString);
        setToken(jwt_decode<Token>(jwt?.token || ''));
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    loadStation(handle);
  }, [params.handle]);

  const requireLogin = (message: string) => {
    toast({
      title: 'Login Required',
      description: message,
      action: <a href="/auth/login" className="text-primary hover:underline">Login here</a>,
      variant: 'destructive',
    });
  };

  const handleToggleFollow = async () => {
    if (!station) return;
    if (!localStorage.getItem('token')) {
      requireLogin('Please log in to follow stations');
      return;
    }

    setIsToggling(true);
    try {
      if (isFollowing) {
        await unfollowTarget('station', station.id);
        setIsFollowing(false);
        setStation({ ...station, follower_count: station.follower_count - 1 });
      } else {
        await followTarget('station', station.id);
        setIsFollowing(true);
        setStation({ ...station, follower_count: station.follower_count + 1 });
      }
    } catch (error: any) {
      toast({ title: 'Something went wrong', description: error.message, variant: 'destructive' });
    } finally {
      setIsToggling(false);
    }
  };

  const handleToggleShowFollow = async (showId: string) => {
    if (!localStorage.getItem('token')) {
      requireLogin('Please log in to follow shows');
      return;
    }

    setTogglingShowId(showId);
    const alreadyFollowing = followedShowIds.has(showId);
    try {
      if (alreadyFollowing) {
        await unfollowTarget('program', showId);
      } else {
        await followTarget('program', showId);
      }
      setFollowedShowIds(prev => {
        const next = new Set(prev);
        if (alreadyFollowing) next.delete(showId); else next.add(showId);
        return next;
      });
    } catch (error: any) {
      toast({ title: 'Something went wrong', description: error.message, variant: 'destructive' });
    } finally {
      setTogglingShowId(null);
    }
  };

  const handleCreateBadge = async () => {
    if (!station || !newBadgeName.trim() || !newBadgeIcon.trim()) return;
    setIsCreatingBadge(true);
    try {
      await createBadge({
        name: newBadgeName.trim(),
        icon: newBadgeIcon.trim(),
        description: newBadgeDescription.trim(),
        station_id: station.id,
      });
      toast({ title: 'Badge created', description: newBadgeName });
      setNewBadgeName('');
      setNewBadgeIcon('');
      setNewBadgeDescription('');
      loadStation(station.id);
    } catch (error: any) {
      toast({ title: 'Failed to create badge', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreatingBadge(false);
    }
  };

  const handleAwardBadge = async (badgeId: string) => {
    const email = awardEmail[badgeId]?.trim();
    if (!email) return;
    setIsAwarding(badgeId);
    try {
      await awardBadge(email, badgeId);
      toast({ title: 'Badge awarded', description: `${email} now has this badge.` });
      setAwardEmail(prev => ({ ...prev, [badgeId]: '' }));
    } catch (error: any) {
      toast({ title: 'Failed to award badge', description: error.message, variant: 'destructive' });
    } finally {
      setIsAwarding(null);
    }
  };

  const handleRevokeBadge = async (badgeId: string) => {
    const email = awardEmail[badgeId]?.trim();
    if (!email) return;
    setIsRevoking(badgeId);
    try {
      await revokeBadge(email, badgeId);
      toast({ title: 'Badge revoked', description: `Removed from ${email}.` });
      setAwardEmail(prev => ({ ...prev, [badgeId]: '' }));
    } catch (error: any) {
      toast({ title: 'Failed to revoke badge', description: error.message, variant: 'destructive' });
    } finally {
      setIsRevoking(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 text-accent animate-spin" />
      </div>
    );
  }

  if (!station) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <Radio className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Station Not Found</h2>
        <p className="text-muted-foreground mb-6">This station doesn't exist.</p>
        <Button onClick={() => router.push('/')}>Back Home</Button>
      </div>
    );
  }

  const canManageStationBadges = !!(token?.is_admin || station.members.some(m => m.user_id === token?.user_id));

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card className="shadow-xl">
        <CardHeader className="items-center text-center border-b pb-6">
          <div className="h-24 w-24 rounded-full border-4 border-primary mb-4 shadow-md bg-muted flex items-center justify-center">
            <Radio className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl">{station.name}</CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {station.follower_count} {station.follower_count === 1 ? 'follower' : 'followers'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-8">
          <Button
            className="w-full"
            variant={isFollowing ? 'secondary' : 'default'}
            onClick={handleToggleFollow}
            disabled={isToggling}
          >
            {isToggling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Heart className={`mr-2 h-4 w-4 ${isFollowing ? 'fill-current' : ''}`} />
            )}
            {isFollowing ? 'Following' : 'Follow'}
          </Button>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Shows
            </h3>
            {station.shows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shows scheduled yet.</p>
            ) : (
              <div className="space-y-2">
                {station.shows.map(show => (
                  <div key={show.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{show.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatSchedule(show)}
                        {show.dj_name && ` — with ${show.dj_name}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-shrink-0"
                      onClick={() => handleToggleShowFollow(show.id)}
                      disabled={togglingShowId === show.id}
                    >
                      {togglingShowId === show.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bell className={`h-4 w-4 ${followedShowIds.has(show.id) ? 'fill-current text-accent' : ''}`} />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {station.scraped_shows.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Broadcast Schedule
                </h3>
                <div className="space-y-2">
                  {station.scraped_shows.map((show, i) => (
                    <div key={`${show.name}-${show.date}-${show.start_time}-${i}`} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{show.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {show.day} {formatTime(show.start_time)}–{formatTime(show.end_time)}
                          {show.dj && ` — with ${show.dj}`}
                        </p>
                      </div>
                      <Badge className={`flex-shrink-0 text-xs ${scrapedStatusColor(show.status)}`}>
                        {show.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" /> Badges
            </h3>
            {station.badges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No badges yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {station.badges.map(badge => (
                  <div
                    key={badge.id}
                    title={badge.description}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm"
                  >
                    <span>{badge.icon}</span>
                    <span className="font-medium text-foreground">{badge.name}</span>
                  </div>
                ))}
              </div>
            )}

            {canManageStationBadges && (
              <div className="space-y-5 rounded-lg border border-accent/30 bg-accent/5 p-4 mt-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-accent" /> Manage This Station's Badges
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    As a member of {station.name}, you can create badges and award or revoke them.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Create a badge</p>
                  <div className="grid grid-cols-[80px_1fr] gap-2">
                    <Input placeholder="Icon" value={newBadgeIcon} onChange={e => setNewBadgeIcon(e.target.value)} maxLength={4} />
                    <Input placeholder="Name" value={newBadgeName} onChange={e => setNewBadgeName(e.target.value)} />
                  </div>
                  <Input placeholder="Description (optional)" value={newBadgeDescription} onChange={e => setNewBadgeDescription(e.target.value)} />
                  <Button
                    size="sm"
                    onClick={handleCreateBadge}
                    disabled={isCreatingBadge || !newBadgeName.trim() || !newBadgeIcon.trim()}
                  >
                    {isCreatingBadge ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Create Badge
                  </Button>
                </div>

                {station.badges.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Award or revoke a badge</p>
                    <div className="space-y-2">
                      {station.badges.map(badge => (
                        <div key={badge.id} className="flex items-center gap-2 rounded-md border border-border bg-card/40 p-2">
                          <span className="text-lg">{badge.icon}</span>
                          <span className="flex-shrink-0 text-sm font-medium">{badge.name}</span>
                          <Input
                            placeholder="user@email.com"
                            value={awardEmail[badge.id] || ''}
                            onChange={e => setAwardEmail(prev => ({ ...prev, [badge.id]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAwardBadge(badge.id)}
                            disabled={isAwarding === badge.id || !awardEmail[badge.id]?.trim()}
                          >
                            {isAwarding === badge.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Award'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRevokeBadge(badge.id)}
                            disabled={isRevoking === badge.id || !awardEmail[badge.id]?.trim()}
                          >
                            {isRevoking === badge.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Revoke'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <UserCircle2 className="h-5 w-5 text-primary" /> DJs
            </h3>
            {station.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {station.members.map(member => (
                  <div key={member.user_id} className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm text-foreground">
                    {member.name || 'Unnamed'}
                  </div>
                ))}
              </div>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
