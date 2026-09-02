'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { ShieldCheck, ShieldAlert, Loader2, Check, X, UserPlus } from 'lucide-react';
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
  fetchPublicProfile,
  type StationRequest,
  type DJRequest,
} from '@/lib/api';
import type { Token } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

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

    Promise.all([fetchPendingStationRequests(), fetchPendingDJRequests()])
      .then(async ([stations, djs]) => {
        setStationRequests(stations);
        setDjRequests(djs);

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
        </CardContent>
      </Card>
    </div>
  );
}
