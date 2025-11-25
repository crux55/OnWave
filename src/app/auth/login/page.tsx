
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLogo } from '@/components/AppLogo';
import { Loader2, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


const commonPasswordSchema = z.string().min(6, { message: "Password must be at least 6 characters." });

const signInFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: commonPasswordSchema,
});
type SignInFormValues = z.infer<typeof signInFormSchema>;

const registerFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: commonPasswordSchema,
  confirmPassword: commonPasswordSchema,
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"], // Path of error
});
type RegisterFormValues = z.infer<typeof registerFormSchema>;


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [registerMessage, setRegisterMessage] = useState("");
  const [loginMessage, setLoginMessage] = useState("");


  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: { email: '', password: ''},
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', username: '' },
  });

  // const handleGoogleSignIn = async () => {
  //   setIsLoadingGoogle(true);
  //   try {
  //     const result = await signInWithPopup(auth, googleProvider);
  //     const user = result.user;
  //     toast({
  //       title: 'Sign In Successful!',
  //       description: `Welcome back, ${user.displayName || user.email}!`,
  //     });
  //     router.push('/');
  //   } catch (error: any) {
  //     console.error('Google Sign-In Error:', error);
  //     toast({
  //       title: 'Sign In Failed',
  //       description: error.message || 'An unexpected error occurred. Please try again.',
  //       variant: 'destructive',
  //     });
  //   } finally {
  //     setIsLoadingGoogle(false);
  //   }
  // };

    const handleRegister = async (data: RegisterFormValues) => {
    setRegisterMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setRegisterMessage("Registration successful!");
        const result = await res.json();
        return { user: result };
      } else {
        const err = await res.text();
        setRegisterMessage(`Registration failed: ${err}`);
        throw new Error(err);
      }
    } catch (err) {
      setRegisterMessage("Registration failed: Network error");
      throw err;
    }
  };

  // Login handler
  const handleLogin = async (data: SignInFormValues) => {
    setLoginMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        setLoginMessage(`Login successful! User ID: ${result.userId}`);
        return { user: result }; // mimic userCredential for onSignInSubmit
      } else {
        const err = await res.text();
        setLoginMessage(`Login failed: ${err}`);
        throw new Error(err);
      }
    } catch (err: any) {
      setLoginMessage("Login failed: Network error");
      throw err;
    }
  };

  const onSignInSubmit: SubmitHandler<SignInFormValues> = async (data) => {
    setIsLoadingEmail(true);
    try {
      const userCredential = await handleLogin(data);
      const user = userCredential.user;
      console.log('Logged in user:', user);
      localStorage.setItem('token', JSON.stringify(user));
      toast({
        title: 'Sign In Successful!',
        description: `Welcome back, ${user.displayName || user.email}!`,
      });
      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Sign In Failed',
        description: error.code === 'auth/invalid-credential' ? 'Invalid email or password.' : (error.message || 'Sign in failed. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingEmail(false);
    }
  };
  
  const onRegisterSubmit: SubmitHandler<RegisterFormValues> = async (data) => {
    setIsLoadingEmail(true);
    try {
      const userCredential = await handleRegister(data);
      const user = userCredential.user;
      // Optionally, update profile here if you collect more info like display name
      // await updateProfile(user, { displayName: "New User" }); 
      toast({
        title: 'Registration Successful!',
        description: `Welcome, ${user.email}! You're now signed in.`,
      });
      router.push('/'); 
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Try signing in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger one.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const isOverallLoading = isLoadingGoogle || isLoadingEmail;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-6 left-6">
        <AppLogo />
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <LogIn className="mx-auto h-10 w-10 text-accent mb-3" />
          <CardTitle className="text-2xl font-bold">Welcome to OnWave</CardTitle>
          <CardDescription>
            {activeTab === "signin" ? "Sign in to access your waves." : "Create an account to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={() => {}} 
            disabled={true}
            variant="outline"
            className="w-full py-3 text-base border-input hover:bg-accent/10"
          >
            {isLoadingGoogle ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 381.7 512 244 512 110.3 512 0 398.8 0 256S110.3 0 244 0c69.8 0 130.8 28.1 174.9 73.2L370.3 141.1C339.2 112.4 295.3 95.2 244 95.2c-79.9 0-146.2 65.2-146.2 145.5S164.1 396.2 244 396.2c46.4 0 80.4-19.1 103.2-40.3 19.5-18.1 32.4-44.1 36.1-78.1H244V261.8h244z"></path>
              </svg>
            )}
            Sign In with Google
          </Button>
          
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="pt-4">
              <form onSubmit={signInForm.handleSubmit(onSignInSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email-signin">Email</Label>
                  <Input 
                    id="email-signin" 
                    type="email" 
                    placeholder="you@example.com" 
                    {...signInForm.register("email")}
                    className={cn(signInForm.formState.errors.email && "border-destructive focus-visible:ring-destructive")}
                    disabled={isOverallLoading} 
                  />
                  {signInForm.formState.errors.email && <p className="text-xs text-destructive pt-1">{signInForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password-signin">Password</Label>
                  <Input 
                    id="password-signin" 
                    type="password" 
                    placeholder="••••••••" 
                    {...signInForm.register("password")}
                    className={cn(signInForm.formState.errors.password && "border-destructive focus-visible:ring-destructive")}
                    disabled={isOverallLoading} 
                  />
                  {signInForm.formState.errors.password && <p className="text-xs text-destructive pt-1">{signInForm.formState.errors.password.message}</p>}
                </div>
                <Button type="submit" disabled={isOverallLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base">
                  {isLoadingEmail && activeTab === "signin" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Sign In
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register" className="pt-4">
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email-register">Email</Label>
                  <Input 
                    id="email-register" 
                    type="email" 
                    placeholder="you@example.com" 
                    {...registerForm.register("email")} 
                    className={cn(registerForm.formState.errors.email && "border-destructive focus-visible:ring-destructive")}
                    disabled={isOverallLoading}
                  />
                  {registerForm.formState.errors.email && <p className="text-xs text-destructive pt-1">{registerForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password-register">Password</Label>
                  <Input 
                    id="password-register" 
                    type="password" 
                    placeholder="Create a password (min. 6 characters)" 
                    {...registerForm.register("password")} 
                    className={cn(registerForm.formState.errors.password && "border-destructive focus-visible:ring-destructive")}
                    disabled={isOverallLoading}
                  />
                  {registerForm.formState.errors.password && <p className="text-xs text-destructive pt-1">{registerForm.formState.errors.password.message}</p>}
                </div>
                 <div className="space-y-1">
                  <Label htmlFor="confirmPassword-register">Confirm Password</Label>
                  <Input 
                    id="confirmPassword-register" 
                    type="password" 
                    placeholder="Confirm your password" 
                    {...registerForm.register("confirmPassword")} 
                    className={cn(registerForm.formState.errors.confirmPassword && "border-destructive focus-visible:ring-destructive")}
                    disabled={isOverallLoading}
                  />
                  {registerForm.formState.errors.confirmPassword && <p className="text-xs text-destructive pt-1">{registerForm.formState.errors.confirmPassword.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="username-register">Username</Label>
                  <Input 
                    id="username-register" 
                    type="text" 
                    placeholder="Choose a username" 
                    {...registerForm.register("username")} 
                    className={cn(registerForm.formState.errors.username && "border-destructive focus-visible:ring-destructive")}
                    disabled={isOverallLoading}
                  />
                  {registerForm.formState.errors.username && <p className="text-xs text-destructive pt-1">{registerForm.formState.errors.username.message}</p>}
                </div>
                <Button type="submit" disabled={isOverallLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base">
                   {isLoadingEmail && activeTab === "register" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 text-center pt-2 pb-6">
           <p className="px-8 text-center text-xs text-muted-foreground">
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
