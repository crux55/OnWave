'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/AppLogo';
import { KeyRound, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { resetPassword } from '@/lib/api';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-6 left-6">
        <AppLogo />
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <KeyRound className="mx-auto h-10 w-10 text-accent mb-3" />
          <CardTitle className="text-2xl font-bold">Set a new password</CardTitle>
          {!success && <CardDescription>Choose a new password for your account.</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
          {!token ? (
            <p className="text-sm text-destructive text-center">
              This reset link is missing its token — please use the link from your email, or request a new one.
            </p>
          ) : success ? (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground text-center">
              <CheckCircle2 className="h-4 w-4 text-accent" /> Password updated — redirecting you to sign in...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="w-full py-3 text-base">
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Update password
              </Button>
            </form>
          )}
          <Link href="/auth/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </React.Suspense>
  );
}
