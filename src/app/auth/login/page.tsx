
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChromeIcon, Loader2, LogIn } from 'lucide-react'; // Using ChromeIcon as a generic browser/Google icon
import { initializeAppIfNeeded } from '@/lib/firebase/client';
import { getAuth, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

// Initialize Firebase
const firebaseApp = initializeAppIfNeeded();
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('Google Sign-In Successful:', user);
      toast({
        title: 'Sign In Successful!',
        description: `Welcome back, ${user.displayName || user.email}!`,
      });
      // TODO: Redirect to a protected page or home page
      // For now, redirecting to home. In a real app, you'd likely set up an auth context
      // and then redirect based on that, or to where the user was trying to go.
      router.push('/'); 
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      toast({
        title: 'Sign In Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <LogIn className="mx-auto h-12 w-12 text-accent mb-4" />
          <CardTitle className="text-3xl font-bold">Welcome to OnWave</CardTitle>
          <CardDescription>Sign in to continue to your music.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={handleGoogleSignIn} 
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 381.7 512 244 512 110.3 512 0 398.8 0 256S110.3 0 244 0c69.8 0 130.8 28.1 174.9 73.2L370.3 141.1C339.2 112.4 295.3 95.2 244 95.2c-79.9 0-146.2 65.2-146.2 145.5S164.1 396.2 244 396.2c46.4 0 80.4-19.1 103.2-40.3 19.5-18.1 32.4-44.1 36.1-78.1H244V261.8h244z"></path>
                </svg>
                Sign In with Google
              </>
            )}
          </Button>
          
          {/* Placeholder for email/password or other sign-in methods */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
           <p className="text-center text-sm text-muted-foreground">
            Email & password sign-in coming soon!
          </p>

        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 text-center">
           <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <a
              href="/terms" // Replace with your actual terms URL
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy" // Replace with your actual privacy URL
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
