'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Radio, Loader2, Users, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchStation, fetchMyFollows, followTarget, unfollowTarget, type StationDetail } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function StationPage() {
  const params = useParams<{ handle: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [station, setStation] = useState<StationDetail | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const handle = params.handle;
    if (!handle) return;

    setIsLoading(true);
    fetchStation(handle)
      .then(async (data) => {
        setStation(data);
        if (data && localStorage.getItem('token')) {
          const follows = await fetchMyFollows().catch(() => []);
          setIsFollowing(follows.some(f => f.target_type === 'station' && f.target_id === data.id));
        }
        setIsLoading(false);
      })
      .catch(() => {
        setStation(null);
        setIsLoading(false);
      });
  }, [params.handle]);

  const handleToggleFollow = async () => {
    if (!station) return;
    if (!localStorage.getItem('token')) {
      toast({
        title: 'Login Required',
        description: 'Please log in to follow stations',
        action: <a href="/auth/login" className="text-primary hover:underline">Login here</a>,
        variant: 'destructive',
      });
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
        <CardContent className="p-6 md:p-8">
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
        </CardContent>
      </Card>
    </div>
  );
}
