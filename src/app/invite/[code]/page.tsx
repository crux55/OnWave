'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';

// A founding-member invite doesn't have its own redemption UI — it just
// gates/pre-fills the existing Register tab (see login/page.tsx reading
// ?invite=), so an admin-generated invite link and a self-typed code both
// go through the exact same registration path.
export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/auth/login?invite=${encodeURIComponent(code)}`);
  }, [code, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <div className="absolute top-6 left-6">
        <AppLogo />
      </div>
      <Sparkles className="h-10 w-10 text-accent" />
      <p className="text-lg font-semibold text-foreground">You&apos;ve been invited to OnWave!</p>
      <p className="text-sm text-muted-foreground">Taking you to sign up...</p>
    </div>
  );
}
