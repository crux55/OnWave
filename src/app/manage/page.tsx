'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Settings, Radio, Podcast, Heart, ChevronRight, Bell, X, Loader2, Mic2, Plus,
  ShieldCheck, Calendar, Upload, Download, Share,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BadgeIcon } from '@/components/BadgeIcon';
import { useToast } from '@/hooks/use-toast';
import { useReminders } from '@/contexts/RemindersContext';
import { NotificationSettings } from '@/components/NotificationSettings';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { useInstallPrompt } from '@/contexts/InstallPromptContext';
import { GoLiveDialog } from '@/components/live/GoLiveDialog';
import { BadgeLoadoutSelector } from '@/components/live/BadgeLoadoutSelector';
import { CreateStationRequestForm } from '@/components/CreateStationRequestForm';
import {
  fetchCurrentUserProfile, fetchLikedStations, fetchMyBadges, fetchManagedBadges, fetchMyStations, fetchMyFollows,
  createBadge, awardBadge, revokeBadge, uploadBadgeIcon, createShow, createDJRequest,
  type Badge, type MyBadge, type Station, type Follow,
} from '@/lib/api';
import type { Profile, Token } from '@/lib/types';
import { jwtDecode as jwt_decode } from 'jwt-decode';

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

function ManagePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { reminders, removeReminder } = useReminders();
  const install = useInstallPrompt();

  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'activity');
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.replace(`/manage?tab=${value}`, { scroll: false });
  };

  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);
  const [likedCount, setLikedCount] = useState<number | null>(null);
  const [myBadges, setMyBadges] = useState<MyBadge[]>([]);
  const [manageableBadges, setManageableBadges] = useState<Badge[]>([]);
  const [uploadingIconId, setUploadingIconId] = useState<string | null>(null);
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
  const [newShowTags, setNewShowTags] = useState('');
  const [newShowDay, setNewShowDay] = useState('2'); // Tuesday-ish default; '-1' means one-off
  const [newShowOneOffDate, setNewShowOneOffDate] = useState('');
  const [newShowTime, setNewShowTime] = useState('21:00');
  const [newShowDuration, setNewShowDuration] = useState('60');
  const [isCreatingShow, setIsCreatingShow] = useState(false);
  const [hasSubmittedStationRequest, setHasSubmittedStationRequest] = useState(false);
  const [djRequestMessage, setDjRequestMessage] = useState('');
  const [isSubmittingDJRequest, setIsSubmittingDJRequest] = useState(false);
  const [hasSubmittedDJRequest, setHasSubmittedDJRequest] = useState(false);

  useEffect(() => {
    const tokenString = localStorage.getItem('token');
    if (!tokenString) {
      setIsLoading(false);
      return;
    }

    let decodedToken: Token | null = null;
    try {
      const jwt = JSON.parse(tokenString);
      decodedToken = jwt_decode<Token>(jwt?.token || '');
      setToken(decodedToken);
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

    fetchLikedStations()
      .then(stations => setLikedCount(stations.length))
      .catch(() => setLikedCount(null));

    fetchMyFollows()
      .then(setMyFollows)
      .catch(() => setMyFollows([]));

    // Needed for BadgeLoadoutSelector in the Creator Tools tab.
    fetchMyBadges()
      .then(setMyBadges)
      .catch(() => setMyBadges([]));

    // Feeds the "Create a Show" station picker.
    fetchMyStations()
      .then(list => {
        setMyStations(list);
        if (list.length > 0) setCreateAsStationId(list[0].id);
        else if (decodedToken?.role === 'dj') setCreateAsStationId('self');
      })
      .catch(() => setMyStations([]));

    // Personal badges only — station-issued badges are managed on the
    // station's own page instead, so they're filtered out here.
    if (decodedToken?.role === 'dj') {
      fetchManagedBadges()
        .then(list => setManageableBadges(list.filter(b => b.issuer_type === 'dj')))
        .catch(() => setManageableBadges([]));
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !userProfile) {
      router.push('/auth/login');
    }
  }, [isLoading, userProfile, router]);

  const handleCreateBadge = async () => {
    if (!newBadgeName.trim() || !newBadgeIcon.trim()) return;
    setIsCreatingBadge(true);
    try {
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
        tags: newShowTags.trim() || undefined,
      });
      toast({ title: 'Show created', description: newShowName });
      setNewShowName('');
      setNewShowOneOffDate('');
      setNewShowTags('');
    } catch (error: any) {
      toast({ title: 'Failed to create show', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreatingShow(false);
    }
  };

  const handleCreateDJRequest = async () => {
    setIsSubmittingDJRequest(true);
    try {
      await createDJRequest({ message: djRequestMessage.trim() || undefined });
      toast({ title: 'Request submitted', description: 'An admin will review it shortly.' });
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

  const handleUploadBadgeIcon = async (badgeId: string, file: File) => {
    setUploadingIconId(badgeId);
    try {
      const iconUrl = await uploadBadgeIcon(badgeId, file);
      setManageableBadges(prev => prev.map(b => (b.id === badgeId ? { ...b, icon_url: iconUrl } : b)));
      toast({ title: 'Badge image updated' });
    } catch (error: any) {
      toast({ title: 'Failed to upload image', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingIconId(null);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    setDeletingReminderId(reminderId);
    try {
      await removeReminder(reminderId);
      toast({ title: 'Reminder Deleted', description: 'Your reminder has been successfully removed.' });
    } catch (error: any) {
      toast({ title: 'Delete Failed', description: error.message || 'Failed to delete reminder. Please try again.', variant: 'destructive' });
    } finally {
      setDeletingReminderId(null);
    }
  };

  const canManagePersonalBadges = token?.role === 'dj';
  const canCreateShow = myStations.length > 0 || token?.role === 'dj';

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
        <Settings className="mx-auto h-16 w-16 text-accent mb-4" />
        <h1 className="text-5xl font-bold tracking-tight text-foreground">Manage</h1>
        <p className="text-xl text-muted-foreground mt-3">
          Everything about using and creating on OnWave.
        </p>
      </header>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Your Account</CardTitle>
          <CardDescription>Activity, creator tools, and account settings.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="creator-tools">Creator Tools</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="space-y-8">
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

              <section>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> Show Reminders
                </h3>
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
              </section>
            </TabsContent>

            <TabsContent value="creator-tools" className="space-y-8">
              {token && !hasSubmittedStationRequest && (
                <section className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Radio className="h-5 w-5 text-accent" /> Create a Station
                  </h3>
                  <CreateStationRequestForm onSubmitted={() => setHasSubmittedStationRequest(true)} />
                </section>
              )}

              {token?.role === 'dj' && (
                <GoLiveDialog
                  trigger={
                    <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                      <Radio className="mr-2 h-4 w-4" /> Go Live
                    </Button>
                  }
                />
              )}

              {token?.role !== 'dj' && !hasSubmittedDJRequest && (
                <section className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Mic2 className="h-5 w-5 text-accent" /> Become a DJ
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    DJs can create shows and go live independently, with or without a station. Requests are reviewed by an admin.
                  </p>
                  <Input placeholder="Tell us why you want to DJ (optional)" value={djRequestMessage} onChange={e => setDjRequestMessage(e.target.value)} />
                  <Button size="sm" onClick={handleCreateDJRequest} disabled={isSubmittingDJRequest}>
                    {isSubmittingDJRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Request DJ Access
                  </Button>
                </section>
              )}

              {canManagePersonalBadges && (
                <section className="space-y-5 rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-accent" /> Manage Your Badges
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Badges you create and award yourself, as a DJ. Station badges are managed from the station's own page instead.
                    </p>
                  </div>

                  {myBadges.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Choose which badges to wear live</p>
                      <BadgeLoadoutSelector myBadges={myBadges} />
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Create a badge</p>
                    <div className="grid grid-cols-[80px_1fr] gap-2">
                      <Input placeholder="Icon" value={newBadgeIcon} onChange={e => setNewBadgeIcon(e.target.value)} maxLength={4} />
                      <Input placeholder="Name" value={newBadgeName} onChange={e => setNewBadgeName(e.target.value)} />
                    </div>
                    <Input placeholder="Description (optional)" value={newBadgeDescription} onChange={e => setNewBadgeDescription(e.target.value)} />
                    <Button size="sm" onClick={handleCreateBadge} disabled={isCreatingBadge || !newBadgeName.trim() || !newBadgeIcon.trim()}>
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
                          <div key={badge.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/40 p-2">
                            <BadgeIcon badge={badge} size={24} />
                            <label className="cursor-pointer text-muted-foreground/70 hover:text-foreground" title="Upload a badge image">
                              {uploadingIconId === badge.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingIconId === badge.id}
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadBadgeIcon(badge.id, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            <span className="flex-shrink-0 text-sm font-medium">{badge.name}</span>
                            <Input
                              placeholder="user@email.com"
                              value={awardEmail[badge.id] || ''}
                              onChange={e => setAwardEmail(prev => ({ ...prev, [badge.id]: e.target.value }))}
                              className="h-8 text-sm min-w-0 flex-1"
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
              )}

              {canCreateShow && (
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
                  <Input placeholder="Tags (e.g. jazz, chat show) — optional" value={newShowTags} onChange={e => setNewShowTags(e.target.value)} />
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
              )}
            </TabsContent>

            <TabsContent value="account" className="space-y-8">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" /> Notifications
                  </h3>
                  <ConnectionStatus />
                </div>
                <NotificationSettings />
              </section>

              {(install.canInstall || (install.isIOS && !install.isStandalone)) && (
                <>
                  <Separator />
                  <section>
                    <h3 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-3">
                      <Download className="h-5 w-5 text-primary" /> Install App
                    </h3>
                    {install.canInstall ? (
                      <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                        <p className="text-sm text-muted-foreground">
                          Install OnWave for a full-screen, app-like experience with no browser bar.
                        </p>
                        <Button onClick={install.promptInstall} className="shrink-0">
                          <Download className="mr-2 h-4 w-4" /> Install
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-md border p-3 text-sm text-muted-foreground">
                        <p className="flex items-center gap-1.5">
                          Tap <Share className="h-4 w-4 inline" /> Share, then <strong className="text-foreground">Add to Home Screen</strong>, to install OnWave for a full-screen, app-like experience.
                        </p>
                      </div>
                    )}
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ManagePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 text-accent animate-spin" />
      </div>
    }>
      <ManagePageInner />
    </Suspense>
  );
}
