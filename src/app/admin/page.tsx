'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { ShieldCheck, ShieldAlert, Loader2, Check, X, UserPlus, Sparkles, Copy, Bug, Lightbulb, MessageCircle, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  fetchPendingStationRequests,
  fetchPendingDJRequests,
  approveStationRequest,
  denyStationRequest,
  approveDJRequest,
  denyDJRequest,
  grantDJByUsername,
  generateFoundingMemberInvite,
  fetchPublicProfile,
  fetchFeedbackReports,
  resolveFeedbackReport,
  fetchBadges,
  updateBadgeSplash,
  type StationRequest,
  type DJRequest,
  type FeedbackReport,
  type Badge as BadgeData,
} from '@/lib/api';
import type { Token } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { BadgeIcon } from '@/components/BadgeIcon';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

function requesterLabel(names: Record<string, string>, requesterId: string): string {
  return names[requesterId] || `User ${requesterId.slice(0, 8)}`;
}

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<Token | null>(null);
  const [stationRequests, setStationRequests] = useState<StationRequest[]>([]);
  const [djRequests, setDjRequests] = useState<DJRequest[]>([]);
  const [requesterNames, setRequesterNames] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [grantUsername, setGrantUsername] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [feedbackReports, setFeedbackReports] = useState<FeedbackReport[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [togglingSplashId, setTogglingSplashId] = useState<string | null>(null);

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

    if (!decodedToken?.is_admin) {
      setIsLoading(false);
      return;
    }

    Promise.all([fetchPendingStationRequests(), fetchPendingDJRequests(), fetchFeedbackReports(), fetchBadges()])
      .then(async ([stations, djs, reports, badgeList]) => {
        setStationRequests(stations);
        setDjRequests(djs);
        setFeedbackReports(reports);
        setBadges(badgeList);

        const requesterIds = Array.from(new Set([...stations.map(s => s.requester_id), ...djs.map(d => d.requester_id)]));
        const profiles = await Promise.all(requesterIds.map(id => fetchPublicProfile(id).catch(() => null)));
        const names: Record<string, string> = {};
        requesterIds.forEach((id, i) => {
          if (profiles[i]?.name) names[id] = profiles[i]!.name;
        });
        setRequesterNames(names);
        setIsLoading(false);
      })
      .catch((error: any) => {
        toast({ title: 'Failed to load review queue', description: error.message, variant: 'destructive' });
        setIsLoading(false);
      });
  }, []);

  const handleApproveStation = async (id: string) => {
    setProcessingId(id);
    try {
      await approveStationRequest(id);
      setStationRequests(prev => prev.filter(r => r.id !== id));
      toast({ title: 'Station approved' });
    } catch (error: any) {
      toast({ title: 'Failed to approve', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDenyStation = async (id: string) => {
    setProcessingId(id);
    try {
      await denyStationRequest(id);
      setStationRequests(prev => prev.filter(r => r.id !== id));
      toast({ title: 'Station request denied' });
    } catch (error: any) {
      toast({ title: 'Failed to deny', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveDJ = async (id: string) => {
    setProcessingId(id);
    try {
      await approveDJRequest(id);
      setDjRequests(prev => prev.filter(r => r.id !== id));
      toast({ title: 'DJ request approved' });
    } catch (error: any) {
      toast({ title: 'Failed to approve', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDenyDJ = async (id: string) => {
    setProcessingId(id);
    try {
      await denyDJRequest(id);
      setDjRequests(prev => prev.filter(r => r.id !== id));
      toast({ title: 'DJ request denied' });
    } catch (error: any) {
      toast({ title: 'Failed to deny', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleGrantDJ = async () => {
    if (!grantUsername.trim()) return;
    setIsGranting(true);
    try {
      await grantDJByUsername(grantUsername.trim());
      toast({ title: 'DJ role granted', description: `${grantUsername.trim()} can now create shows and go live.` });
      setGrantUsername('');
    } catch (error: any) {
      toast({ title: 'Failed to grant DJ role', description: error.message, variant: 'destructive' });
    } finally {
      setIsGranting(false);
    }
  };

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);
    try {
      const code = await generateFoundingMemberInvite();
      setGeneratedInviteLink(`${window.location.origin}/invite/${code}`);
    } catch (error: any) {
      toast({ title: 'Failed to generate invite', description: error.message, variant: 'destructive' });
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(generatedInviteLink);
    toast({ title: 'Copied to clipboard' });
  };

  const handleToggleSplash = async (badgeId: string, next: boolean) => {
    setTogglingSplashId(badgeId);
    // Optimistic -- reverted in the catch block below on failure.
    setBadges(prev => prev.map(b => (b.id === badgeId ? { ...b, announce_splash: next } : b)));
    try {
      await updateBadgeSplash(badgeId, next);
    } catch (error: any) {
      setBadges(prev => prev.map(b => (b.id === badgeId ? { ...b, announce_splash: !next } : b)));
      toast({ title: 'Failed to update badge', description: error.message, variant: 'destructive' });
    } finally {
      setTogglingSplashId(null);
    }
  };

  const handleResolveFeedback = async (id: string) => {
    setResolvingId(id);
    try {
      await resolveFeedbackReport(id);
      setFeedbackReports(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
    } catch (error: any) {
      toast({ title: 'Failed to resolve report', description: error.message, variant: 'destructive' });
    } finally {
      setResolvingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 text-accent animate-spin" />
      </div>
    );
  }

  if (!token?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Not Authorized</h2>
        <p className="text-muted-foreground mb-6">This page is only available to admins.</p>
        <Button onClick={() => router.push('/')}>Back Home</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Card className="shadow-xl">
        <CardHeader className="border-b pb-6">
          <CardTitle className="text-3xl flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-accent" /> Admin Review Queue
          </CardTitle>
          <CardDescription>Pending station and DJ requests.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-8">
          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3">Station Requests</h3>
            {stationRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending station requests.</p>
            ) : (
              <div className="space-y-2">
                {stationRequests.map(req => (
                  <div key={req.id} className="rounded-md border border-border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{req.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested by {requesterLabel(requesterNames, req.requester_id)}
                          {req.requested_handle && ` — handle: ${req.requested_handle}`}
                        </p>
                        {req.description && <p className="text-sm text-muted-foreground mt-1">{req.description}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveStation(req.id)}
                          disabled={processingId === req.id}
                        >
                          {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDenyStation(req.id)}
                          disabled={processingId === req.id}
                        >
                          {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3">DJ Requests</h3>
            {djRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending DJ requests.</p>
            ) : (
              <div className="space-y-2">
                {djRequests.map(req => (
                  <div key={req.id} className="rounded-md border border-border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{requesterLabel(requesterNames, req.requester_id)}</p>
                        {req.message && <p className="text-sm text-muted-foreground mt-1">{req.message}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveDJ(req.id)}
                          disabled={processingId === req.id}
                        >
                          {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDenyDJ(req.id)}
                          disabled={processingId === req.id}
                        >
                          {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-accent" /> Bug Reports, Feature Ideas &amp; Station Suggestions
            </h3>
            {feedbackReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet.</p>
            ) : (
              <div className="space-y-2">
                {feedbackReports.map(report => (
                  <div
                    key={report.id}
                    className={cn(
                      'rounded-md border border-border bg-muted/30 p-3',
                      report.status === 'resolved' && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          {report.type === 'bug' ? (
                            <Bug className="h-3.5 w-3.5 text-destructive" />
                          ) : report.type === 'station_suggestion' ? (
                            <Radio className="h-3.5 w-3.5 text-accent" />
                          ) : (
                            <Lightbulb className="h-3.5 w-3.5 text-accent" />
                          )}
                          {report.username || 'Anonymous'}
                          {report.page_url && <span className="font-normal text-muted-foreground">— {report.page_url}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">{report.message}</p>
                      </div>
                      {report.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-shrink-0"
                          onClick={() => handleResolveFeedback(report.id)}
                          disabled={resolvingId === report.id}
                        >
                          {resolvingId === report.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          <section className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-accent" /> Grant DJ Role Directly
            </h3>
            <p className="text-xs text-muted-foreground">
              Skips the application — the user still has to accept the broadcast terms before going live.
            </p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="username"
                value={grantUsername}
                onChange={e => setGrantUsername(e.target.value)}
                className="h-9 text-sm flex-1 min-w-0"
              />
              <Button
                size="sm"
                onClick={handleGrantDJ}
                disabled={isGranting || !grantUsername.trim()}
              >
                {isGranting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                Grant
              </Button>
            </div>
          </section>

          <Separator />

          <section className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Generate Founding-Member Invite
            </h3>
            <p className="text-xs text-muted-foreground">
              A one-time link — whoever registers with it becomes a founding member permanently, free on anything that becomes a paid feature later. Send it yourself; nothing here sends it for you.
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleGenerateInvite} disabled={isGeneratingInvite}>
                {isGeneratingInvite ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                Generate invite link
              </Button>
            </div>
            {generatedInviteLink && (
              <div className="flex items-center gap-2">
                <Input readOnly value={generatedInviteLink} className="h-9 text-sm flex-1 min-w-0" />
                <Button size="sm" variant="outline" onClick={handleCopyInviteLink}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Badge Splash Announcements</h3>
            <p className="text-xs text-muted-foreground">
              On for a badge means every award interrupts with a full splash screen instead of the usual toast — reserve this for genuinely special badges, not every one a station or DJ creates.
            </p>
            {badges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No badges yet.</p>
            ) : (
              <div className="space-y-2">
                {badges.map(badge => (
                  <div key={badge.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/40 p-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <BadgeIcon badge={badge} size={24} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{badge.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{badge.issuer_name || 'Global'}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Label htmlFor={`splash-${badge.id}`} className="text-xs font-normal text-muted-foreground">
                        Splash
                      </Label>
                      <Switch
                        id={`splash-${badge.id}`}
                        checked={badge.announce_splash}
                        disabled={togglingSplashId === badge.id}
                        onCheckedChange={(checked) => handleToggleSplash(badge.id, checked)}
                      />
                    </div>
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
