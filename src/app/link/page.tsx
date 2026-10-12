'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tv, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/AppLogo';
import { fetchDeviceLinkInfo, approveDeviceLink, denyDeviceLink, type DeviceLinkInfo } from '@/lib/api';

type Step = 'checking-auth' | 'need-code' | 'looking-up' | 'ready' | 'deciding' | 'approved' | 'denied' | 'error';

// TV sign-in by QR code (docs/mobile/TV-QR-SIGN-IN.md, project_r): opened
// by scanning a code shown on an OnWave TV app, almost always from a
// phone's camera app -- mobile layout first, a narrow single-column card
// that never assumes a pointer or a wide screen.
function LinkPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get('code') || '';

  const [step, setStep] = useState<Step>('checking-auth');
  const [codeInput, setCodeInput] = useState(codeFromUrl);
  const [deviceInfo, setDeviceInfo] = useState<DeviceLinkInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      const dest = `/link${codeFromUrl ? `?code=${encodeURIComponent(codeFromUrl)}` : ''}`;
      router.replace(`/auth/login?redirect=${encodeURIComponent(dest)}`);
      return;
    }
    setStep(codeFromUrl ? 'looking-up' : 'need-code');
    // Only re-run this check if the URL's code actually changes -- not on
    // every render, and not keyed on `router` (a stable function reference
    // that doesn't need to retrigger this).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl]);

  useEffect(() => {
    if (step !== 'looking-up') return;
    let cancelled = false;
    fetchDeviceLinkInfo(codeFromUrl)
      .then((info) => {
        if (cancelled) return;
        setDeviceInfo(info);
        setStep('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(
          err.message === 'NOT_FOUND'
            ? "This code has expired or isn't valid. Go back to your TV and try scanning the code again."
            : "Couldn't look up this code. Try again."
        );
        setStep('error');
      });
    return () => {
      cancelled = true;
    };
  }, [step, codeFromUrl]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = codeInput.trim();
    if (!normalized) return;
    router.replace(`/link?code=${encodeURIComponent(normalized)}`);
  };

  const handleDecision = async (decision: 'approve' | 'deny') => {
    setStep('deciding');
    try {
      if (decision === 'approve') {
        await approveDeviceLink(codeFromUrl);
        setStep('approved');
      } else {
        await denyDeviceLink(codeFromUrl);
        setStep('denied');
      }
    } catch (err: any) {
      setErrorMessage(
        err.message === 'NOT_FOUND'
          ? "This code has expired. Go back to your TV and try scanning the code again."
          : err.message === 'ALREADY_DECIDED'
            ? 'This sign-in request was already handled.'
            : `Couldn't ${decision} this sign-in. Try again.`
      );
      setStep('error');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-6">
        <AppLogo />
      </div>
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <Tv className="mx-auto h-10 w-10 text-accent mb-3" />
          <CardTitle className="text-xl font-bold">Sign in on your TV</CardTitle>
          {step === 'ready' && deviceInfo && (
            <CardDescription>
              Only approve a code shown on your own TV.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {(step === 'checking-auth' || step === 'looking-up' || step === 'deciding') && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          )}

          {step === 'need-code' && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="tv-code">Code shown on your TV</Label>
                <Input
                  id="tv-code"
                  placeholder="ABCD-2345"
                  autoFocus
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!codeInput.trim()}>
                Continue
              </Button>
            </form>
          )}

          {step === 'ready' && deviceInfo && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card/40 p-4 text-center">
                <p className="text-sm text-muted-foreground">Sign in on</p>
                <p className="text-lg font-semibold text-foreground">{deviceInfo.device_name || 'this device'}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => handleDecision('deny')}>
                  Deny
                </Button>
                <Button className="flex-1" onClick={() => handleDecision('approve')}>
                  Approve
                </Button>
              </div>
            </div>
          )}

          {step === 'approved' && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-accent" />
              <p className="font-medium text-foreground">You&rsquo;re signed in on your TV.</p>
              <p className="text-sm text-muted-foreground">You can close this page.</p>
            </div>
          )}

          {step === 'denied' && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <XCircle className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-foreground">Sign-in request denied.</p>
              <p className="text-sm text-muted-foreground">You can close this page.</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-foreground">{errorMessage}</p>
              <Button variant="outline" onClick={() => { setStep('need-code'); setCodeInput(''); router.replace('/link'); }}>
                Enter a different code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LinkPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background" />}>
      <LinkPageContent />
    </React.Suspense>
  );
}
