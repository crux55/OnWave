'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/AppLogo';
import { KeyRound, Loader2, ArrowLeft } from 'lucide-react';
import { requestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Always shown after submit, regardless of outcome — the backend's own
  // response is deliberately generic (anti-enumeration), and the frontend
  // shouldn't undermine that by distinguishing success/failure here either.
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
    } catch {
      // Deliberately swallowed — see the comment on `submitted` above.
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
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
          <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
          <CardDescription>
            Enter the email on your account and we&apos;ll send a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {submitted ? (
            <p className="text-sm text-muted-foreground text-center">
              If that email is registered, we&apos;ve sent a password reset link. It expires in 60 minutes.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting || !email.trim()} className="w-full py-3 text-base">
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Send reset link
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
