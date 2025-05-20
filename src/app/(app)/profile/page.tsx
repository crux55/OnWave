
'use client';

import { UserCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <header className="mb-10 text-center">
        <UserCircle2 className="mx-auto h-20 w-20 text-accent mb-4" />
        <h1 className="text-5xl font-bold tracking-tight text-foreground">Your Profile</h1>
        <p className="text-xl text-muted-foreground mt-3">
          Manage your OnWave account and preferences.
        </p>
      </header>
      
      <Card className="shadow-xl">
        <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24 border-4 border-primary mb-4">
                <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="user profile"/>
                <AvatarFallback>
                    <UserCircle2 className="h-16 w-16 text-muted-foreground" />
                </AvatarFallback>
            </Avatar>
          <CardTitle className="text-3xl">Jane Doe</CardTitle>
          <CardDescription className="text-base">premium.user@example.com</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Account Details</h3>
            <p className="text-muted-foreground">Subscription: <span className="text-primary font-medium">Premium</span></p>
            <p className="text-muted-foreground">Member since: January 1, 2023</p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Preferences</h3>
            <p className="text-muted-foreground">Favorite Genre: Synthwave</p>
            <p className="text-muted-foreground">Theme: Light Mode (App Default)</p>
          </div>

          <div className="border-t pt-6">
            <Button variant="destructive" className="w-full sm:w-auto">Log Out</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
