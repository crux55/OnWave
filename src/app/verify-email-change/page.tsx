'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { verifyEmailChange } from '@/lib/api';

function VerifyEmailChangeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMessage('Missing confirmation token.');
      return;
    }

    verifyEmailChange(token)
      .then(() => setStatus('success'))
      .catch((error: any) => {
        setStatus('error');
        setErrorMessage(error.message || 'This link is invalid or has expired.');
      });
  }, [searchParams]);

  return (
    <Card className="w-full max-w-md shadow-xl text-center">
      <CardHeader>
        {status === 'loading' && <Loader2 className="mx-auto h-10 w-10 text-accent mb-3 animate-spin" />}
        {status === 'success' && <CheckCircle2 className="mx-auto h-10 w-10 text-primary mb-3" />}
        {status === 'error' && <XCircle className="mx-auto h-10 w-10 text-destructive mb-3" />}
        <CardTitle>
          {status === 'loading' && 'Confirming your email...'}
          {status === 'success' && 'Email updated'}
          {status === 'error' && 'Confirmation failed'}
        </CardTitle>
        <CardDescription>
          {status === 'success' && 'Your account email has been updated.'}
          {status === 'error' && errorMessage}
        </CardDescription>
      </CardHeader>
      {status !== 'loading' && (
        <CardContent>
          <Button onClick={() => router.push('/profile')} className="w-full">
            Go to Profile
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export default function VerifyEmailChangePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Suspense fallback={<Loader2 className="h-10 w-10 text-accent animate-spin" />}>
        <VerifyEmailChangeContent />
      </Suspense>
    </div>
  );
}
