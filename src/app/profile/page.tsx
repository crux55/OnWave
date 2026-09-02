
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCircle2, Radio, Podcast, Users, FileText, Edit3, LogOut, Loader2, Bell, X, Heart, ChevronRight, Award, ShieldCheck, Plus, Calendar, Mic2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from "react";
import { fetchCurrentUserProfile, fetchLikedStations, fetchMyBadges, fetchManagedBadges, fetchMyStations, fetchMyFollows, createBadge, awardBadge, revokeBadge, markBadgesSeen, createShow, createStationRequest, createDJRequest, type Badge, type MyBadge, type Station, type Follow } from "@/lib/api";
import { JWT, Profile, Token, User } from '@/lib/types';
import { jwtDecode as jwt_decode } from "jwt-decode";
import { useReminders } from '@/contexts/RemindersContext';
import { NotificationSettings } from '@/components/NotificationSettings';
import { ConnectionStatus } from '@/components/ConnectionStatus';



const userProfileData = {
  subscription: 'Premium',
  favoriteGenre: 'Synthwave',
  theme: 'Dark Mode (App Default)',
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
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const { toast } = useToast();
  const { reminders, removeReminder } = useReminders();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);
  const [likedCount, setLikedCount] = useState<number | null>(null);
  const [myBadges, setMyBadges] = useState<MyBadge[]>([]);
  const [manageableBadges, setManageableBadges] = useState<Badge[]>([]);
  const [myStations, setMyStations] = useState<Station[]>([]);
  const [myFollows, setMyFollows] = useState<Follow[]>([]);
  const [createAsStationId, setCreateAsStationId] = useState<string>('');
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeIcon, setNewBadgeIcon] = useState('');
  const [newBadgeDescription, setNewBadgeDescription] = useState('');
  const [isCreatingBadge, setIsCreatingBadge] = useState(false);
  const [awardEmail, setAwardEmail] = useState<Record<string, string>>({});
  const [isAwarding, setIsAwarding] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [newShowName, setNewShowName] = useState('');
  const [newShowDay, setNewShowDay] = useState('2'); // Tuesday-ish default; '-1' means one-off
  const [newShowOneOffDate, setNewShowOneOffDate] = useState('');
  const [newShowTime, setNewShowTime] = useState('21:00');
  const [newShowDuration, setNewShowDuration] = useState('60');
  const [isCreatingShow, setIsCreatingShow] = useState(false);
  const [newStationName, setNewStationName] = useState('');
  const [newStationDescription, setNewStationDescription] = useState('');
  const [newStationHandle, setNewStationHandle] = useState('');
  const [isSubmittingStationRequest, setIsSubmittingStationRequest] = useState(false);
  const [hasSubmittedStationRequest, setHasSubmittedStationRequest] = useState(false);
  const [djRequestMessage, setDjRequestMessage] = useState('');
  const [isSubmittingDJRequest, setIsSubmittingDJRequest] = useState(false);
  const [hasSubmittedDJRequest, setHasSubmittedDJRequest] = useState(false);
  const getAvatarUrl = (filename: string | undefined) => {
  const url = filename ? `${apiHost}${filename}` : undefined;


    return url;
  };
  useEffect(() => {
    const tokenString = localStorage.getItem("token");
    if (!tokenString) {
      setIsLoading(false);
      return;
    }

    let decodedToken: Token | null = null;
    try {
      const jwt = JSON.parse(tokenString);
      decodedToken = jwt_decode<Token>(jwt?.token || "");
      setToken(decodedToken);
    } catch (error) {
      console.error("Error decoding token:", error);
    }

    fetchCurrentUserProfile()
      .then(data => {

        if (!data) {
          setUserProfile(null);
          setIsLoading(false);
          return;
        }
        setUserProfile(data);
        setIsLoading(false);
      })
      .catch(() => {
        setUserProfile(null);
        setIsLoading(false);
      });

    fetchLikedStations()
      .then(stations => setLikedCount(stations.length))
      .catch(() => setLikedCount(null));

    fetchMyFollows()
      .then(setMyFollows)
      .catch(() => setMyFollows([]));

    fetchMyBadges()
      .then(badges => {
        setMyBadges(badges);
        const newOnes = badges.filter(b => b.is_new);
        newOnes.forEach(b => {
          toast({ title: `New badge: ${b.icon} ${b.name}`, description: b.description || 'Check your profile to see it.' });
        });
        if (newOnes.length > 0) {
          markBadgesSeen();
        }
      })
      .catch(() => setMyBadges([]));

    // myStations still feeds the "Create a Show" station picker below —
    // station badge management itself lives on each station's own page now.
    fetchMyStations()
      .then(list => {
        setMyStations(list);
        if (list.length > 0) setCreateAsStationId(list[0].id);
        else if (decodedToken?.role === 'dj') setCreateAsStationId('self');
      })
      .catch(() => setMyStations([]));

    // Personal badges only — a DJ's own issued badges. Station-issued badges
    // are managed on the station's page instead, so they're filtered out
    // here even for an admin (who'd otherwise see every station's badges via
    // GET /badges/mine's admin-sees-all behavior).
    if (decodedToken?.role === 'dj') {
      fetchManagedBadges()
        .then(list => setManageableBadges(list.filter(b => b.issuer_type === 'dj')))
        .catch(() => setManageableBadges([]));
    }
  }, []);

  // Not logged in once loading settles — go straight to login instead of
  // showing an interstitial "Access Denied" screen.
  useEffect(() => {
    if (!isLoading && !userProfile) {
      router.push('/auth/login');
    }
  }, [isLoading, userProfile, router]);

  const handleCreateBadge = async () => {
    if (!newBadgeName.trim() || !newBadgeIcon.trim()) return;
    setIsCreatingBadge(true);
    try {
      // No station_id — badges created here are always personal/DJ-issued.
      // Station badges are created from the station's own page instead.
      await createBadge({
        name: newBadgeName.trim(),
        icon: newBadgeIcon.trim(),
        description: newBadgeDescription.trim(),
      });
      toast({ title: 'Badge created', description: newBadgeName });
      setNewBadgeName('');
      setNewBadgeIcon('');
      setNewBadgeDescription('');
      const updated = await fetchManagedBadges();
      setManageableBadges(updated.filter(b => b.issuer_type === 'dj'));
    } catch (error: any) {
      toast({ title: 'Failed to create badge', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreatingBadge(false);
    }
  };

  const handleCreateShow = async () => {
    if (!newShowName.trim() || !newShowTime) return;
    if (newShowDay === '-1' && !newShowOneOffDate) return;
    setIsCreatingShow(true);
    try {
      await createShow({
        name: newShowName.trim(),
        station_id: createAsStationId && createAsStationId !== 'self' ? createAsStationId : undefined,
        day_of_week: newShowDay === '-1' ? undefined : parseInt(newShowDay, 10),
        one_off_date: newShowDay === '-1' ? newShowOneOffDate : undefined,
        start_time: `${newShowTime}:00`,
        duration_minutes: parseInt(newShowDuration, 10) || 60,
      });
      toast({ title: 'Show created', description: newShowName });
      setNewShowName('');
      setNewShowOneOffDate('');
    } catch (error: any) {
      toast({ title: 'Failed to create show', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreatingShow(false);
    }
  };

  const handleCreateStationRequest = async () => {
    if (!newStationName.trim()) return;
    setIsSubmittingStationRequest(true);
    try {
      await createStationRequest({
        name: newStationName.trim(),
        description: newStationDescription.trim(),
        requested_handle: newStationHandle.trim() || undefined,
      });
      toast({ title: 'Request submitted', description: "An admin will review it shortly." });
      setNewStationName('');
      setNewStationDescription('');
      setNewStationHandle('');
      setHasSubmittedStationRequest(true);
    } catch (error: any) {
      toast({ title: 'Failed to submit request', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmittingStationRequest(false);
    }
  };

  const handleCreateDJRequest = async () => {
    setIsSubmittingDJRequest(true);
    try {
      await createDJRequest({ message: djRequestMessage.trim() || undefined });
      toast({ title: 'Request submitted', description: "An admin will review it shortly." });
      setDjRequestMessage('');
      setHasSubmittedDJRequest(true);
    } catch (error: any) {
      toast({ title: 'Failed to submit request', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmittingDJRequest(false);
    }
  };

  const handleAward = async (badgeId: string) => {
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

  const handleRevoke = async (badgeId: string) => {
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




  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('authChange'));
      setUserProfile(null);
      toast({
        title: 'Logged Out',
        description: 'You have been successfully signed out.',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Logout Failed',
        description: error.message || 'Logout failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    setDeletingReminderId(reminderId);
    try {
      await removeReminder(reminderId);
      toast({
        title: 'Reminder Deleted',
        description: 'Your reminder has been successfully removed.',
      });
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete reminder. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingReminderId(null);
    }
  };

  // Personal badges only — station badges are managed on the station's own
  // page now, gated by that station's membership instead of this.
  const canManagePersonalBadges = token?.role === 'dj';
  // Still gates the "Create a Show" section below, which does span both DJs
  // and station members.
  const canCreateShow = myStations.length > 0 || token?.role === 'dj';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 text-accent animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Profile...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 text-accent animate-spin" />
      </div>
    );
  }


  if (userProfile) {
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
              <AvatarImage
                src={getAvatarUrl(userProfile?.avatar)}
                alt="User Avatar"
                data-ai-hint="user profile picture"
              />
              <AvatarFallback>
                <UserCircle2 className="h-20 w-20 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl">{userProfile.name || "No Name Provided"}</CardTitle>
            <CardDescription className="text-base">
              {token ? (token.email || "No email provided") : "No email provided"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-8">

            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Bio
                </h3>
                <Button
                  onClick={() => router.push('/profile/edit')}
                  className="mt-4"
                >
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-2 border-l-2 border-primary/50">
                {userProfile.bio || "You haven't added a bio yet."}
              </p>
            </section>

            {myBadges.length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" /> Badges
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {myBadges.map(badge => (
                      <div
                        key={badge.id}
                        title={badge.issuer_name ? `${badge.description} — awarded by ${badge.issuer_name}` : badge.description}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm"
                      >
                        <span>{badge.icon}</span>
                        <span className="font-medium text-foreground">{badge.name}</span>
                        {badge.is_new && (
                          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">
                            New
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {myStations.length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Radio className="h-5 w-5 text-primary" /> My Stations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {myStations.map(station => (
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

            {token && !hasSubmittedStationRequest && (
              <>
                <Separator />
                <section className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Radio className="h-5 w-5 text-accent" /> Create a Station
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Requests are reviewed by an admin before your station goes live.
                  </p>
                  <Input placeholder="Station name" value={newStationName} onChange={e => setNewStationName(e.target.value)} />
                  <Input placeholder="Description" value={newStationDescription} onChange={e => setNewStationDescription(e.target.value)} />
                  <Input placeholder="Requested handle (optional)" value={newStationHandle} onChange={e => setNewStationHandle(e.target.value)} />
                  <Button
                    size="sm"
                    onClick={handleCreateStationRequest}
                    disabled={isSubmittingStationRequest || !newStationName.trim()}
                  >
                    {isSubmittingStationRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Request a Station
                  </Button>
                </section>
              </>
            )}

            {token?.role !== 'dj' && !hasSubmittedDJRequest && (
              <>
                <Separator />
                <section className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Mic2 className="h-5 w-5 text-accent" /> Become a DJ
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    DJs can create shows and go live independently, with or without a station. Requests are reviewed by an admin.
                  </p>
                  <Input placeholder="Tell us why you want to DJ (optional)" value={djRequestMessage} onChange={e => setDjRequestMessage(e.target.value)} />
                  <Button
                    size="sm"
                    onClick={handleCreateDJRequest}
                    disabled={isSubmittingDJRequest}
                  >
                    {isSubmittingDJRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Request DJ Access
                  </Button>
                </section>
              </>
            )}

            <Separator />

            <section>
              <Link
                href="/liked"
                className="flex items-center justify-between gap-3 p-3 -mx-3 rounded-md hover:bg-muted/30 transition-colors"
              >
                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" /> Liked Stations
                  {likedCount !== null && (
                    <span className="text-sm font-normal text-muted-foreground">({likedCount})</span>
                  )}
                </h3>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
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

            <Separator />

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">Following</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Radio className="h-4 w-4" /> Stations
                  </h4>
                  {myFollows.filter(f => f.target_type === 'station').length > 0 ? (
                    <ul className="space-y-2">
                      {myFollows.filter(f => f.target_type === 'station').map(f => (
                        <li key={f.target_id}>
                          <Link
                            href={`/stations/${f.target_id}`}
                            className="flex items-center gap-3 p-2 bg-muted/30 rounded-md hover:bg-muted/60 transition-colors"
                          >
                            <Radio className="h-5 w-5 text-accent flex-shrink-0" />
                            <span className="text-sm text-foreground">{f.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="flex items-center gap-3 p-2 text-sm text-muted-foreground">
                      <Radio className="h-5 w-5 text-muted-foreground/70 flex-shrink-0" />
                      You're not following any stations yet.
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="text-md font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Podcast className="h-4 w-4" /> Shows
                  </h4>
                  <ProfileListSection
                    items={myFollows.filter(f => f.target_type === 'show').map(f => ({ id: f.target_id, name: f.name }))}
                    emptyMessage="No shows followed yet. Explore and find some!"
                    icon={Podcast}
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
                  <p className="text-muted-foreground">
                    Member since: {token && token.created_at ? new Date(token.created_at).toLocaleDateString() : "Unknown"}
                  </p>

                  <p className="text-muted-foreground">
                    Account Created: {token && token.created_at ? new Date(token.created_at).toLocaleDateString() : "Unknown"}
                  </p>


               <div className="space-y-3">
                {reminders.length > 0 ? (
                  <ul className="space-y-2">
                    {reminders.map(reminder => (
                      <li key={reminder.id} className="flex items-center justify-between gap-3 p-2 bg-muted/30 rounded-md hover:bg-muted/60 transition-colors group">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Bell className="h-5 w-5 text-accent flex-shrink-0" />
                          <span className="text-sm text-foreground truncate">
                            {reminder.show_name} - {new Date(reminder.show_date).toLocaleDateString()} at {new Date(`2000-01-01T${reminder.show_start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => handleDeleteReminder(reminder.id)}
                          disabled={deletingReminderId === reminder.id}
                        >
                          {deletingReminderId === reminder.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                          ) : (
                            <X className="h-4 w-4 text-destructive hover:text-destructive/80" />
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="flex items-center gap-3 p-2 text-sm text-muted-foreground">
                    <Bell className="h-5 w-5 text-muted-foreground/70 flex-shrink-0" />
                    No show reminders set. Add some to never miss your favorites!
                  </p>
                )}
                </div>
                 <p className="text-muted-foreground">Favorite Genre: No info yet</p>
                  <p className="text-muted-foreground">Theme: Default</p>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Show Reminders
              </h3>
              <ProfileListSection
                items={reminders.map(reminder => ({
                  id: reminder.id,
                  name: `${reminder.show_name} - ${new Date(reminder.show_date).toLocaleDateString()} at ${new Date(`2000-01-01T${reminder.show_start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                }))}
                emptyMessage="No show reminders set. Add some to never miss your favorites!"
                icon={Bell}
              />
            </section>

            <Separator />

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> Notifications
                </h3>
                <ConnectionStatus />
              </div>
              <NotificationSettings />
            </section>

            {canManagePersonalBadges && (
              <>
                <Separator />
                <section className="space-y-5 rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-accent" /> Manage Your Badges
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Badges you create and award yourself, as a DJ. Station badges are managed from the station's own page instead.
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

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Award or revoke a badge</p>
                    {manageableBadges.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No badges yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {manageableBadges.map(badge => (
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
                              onClick={() => handleAward(badge.id)}
                              disabled={isAwarding === badge.id || !awardEmail[badge.id]?.trim()}
                            >
                              {isAwarding === badge.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Award'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRevoke(badge.id)}
                              disabled={isRevoking === badge.id || !awardEmail[badge.id]?.trim()}
                            >
                              {isRevoking === badge.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Revoke'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {canCreateShow && (
              <>
                <Separator />
                <section className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-accent" /> Create a Show
                  </h3>
                  {myStations.length > 0 && (
                    <Select value={createAsStationId} onValueChange={setCreateAsStationId}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Create as..." />
                      </SelectTrigger>
                      <SelectContent>
                        {myStations.map(station => (
                          <SelectItem key={station.id} value={station.id}>{station.name}</SelectItem>
                        ))}
                        {token?.role === 'dj' && (
                          <SelectItem value="self">Myself (DJ)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {createAsStationId && createAsStationId !== 'self'
                      ? `Creating for ${myStations.find(s => s.id === createAsStationId)?.name || 'your station'}. It'll appear on that station's page.`
                      : 'Creating under your own DJ name.'}
                  </p>
                  <Input placeholder="Show name" value={newShowName} onChange={e => setNewShowName(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={newShowDay} onValueChange={setNewShowDay}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sundays</SelectItem>
                        <SelectItem value="1">Mondays</SelectItem>
                        <SelectItem value="2">Tuesdays</SelectItem>
                        <SelectItem value="3">Wednesdays</SelectItem>
                        <SelectItem value="4">Thursdays</SelectItem>
                        <SelectItem value="5">Fridays</SelectItem>
                        <SelectItem value="6">Saturdays</SelectItem>
                        <SelectItem value="-1">One-off date</SelectItem>
                      </SelectContent>
                    </Select>
                    {newShowDay === '-1' ? (
                      <Input type="date" value={newShowOneOffDate} onChange={e => setNewShowOneOffDate(e.target.value)} />
                    ) : (
                      <Input type="time" value={newShowTime} onChange={e => setNewShowTime(e.target.value)} />
                    )}
                  </div>
                  {newShowDay === '-1' && (
                    <Input type="time" value={newShowTime} onChange={e => setNewShowTime(e.target.value)} />
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={15}
                      step={15}
                      value={newShowDuration}
                      onChange={e => setNewShowDuration(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCreateShow}
                    disabled={isCreatingShow || !newShowName.trim() || !newShowTime || (newShowDay === '-1' && !newShowOneOffDate)}
                  >
                    {isCreatingShow ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Create Show
                  </Button>
                </section>
              </>
            )}

            {token?.is_admin && (
              <>
                <Separator />
                <section>
                  <Link
                    href="/admin"
                    className="flex items-center justify-between gap-3 p-3 -mx-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-accent" /> Admin Review Queue
                    </h3>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                </section>
              </>
            )}

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
}