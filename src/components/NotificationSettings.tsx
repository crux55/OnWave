'use client';

import React from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/NotificationContext';
import { useToast } from '@/hooks/use-toast';

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ className }) => {
  const { 
    requestNotificationPermission, 
    notificationPermission, 
    notifiedReminders, 
    clearNotifiedReminders 
  } = useNotifications();
  const { toast } = useToast();

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      toast({
        title: 'Notifications Enabled!',
        description: 'You\'ll now receive alerts for your show reminders.',
      });
    } else {
      toast({
        title: 'Notifications Blocked',
        description: 'Please enable notifications in your browser settings to receive reminder alerts.',
        variant: 'destructive',
      });
    }
  };

  const getPermissionIcon = () => {
    switch (notificationPermission) {
      case 'granted':
        return <Bell className="h-5 w-5 text-green-500" />;
      case 'denied':
        return <BellOff className="h-5 w-5 text-red-500" />;
      default:
        return <BellRing className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getPermissionStatus = () => {
    switch (notificationPermission) {
      case 'granted':
        return { text: 'Enabled', variant: 'default' as const };
      case 'denied':
        return { text: 'Blocked', variant: 'destructive' as const };
      default:
        return { text: 'Not Set', variant: 'secondary' as const };
    }
  };

  const status = getPermissionStatus();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getPermissionIcon()}
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage your reminder notifications and alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Browser Notifications</p>
            <p className="text-xs text-muted-foreground">
              Receive popup notifications for show reminders
            </p>
          </div>
          <Badge variant={status.variant}>{status.text}</Badge>
        </div>

        {notificationPermission === 'default' && (
          <Button 
            onClick={handleRequestPermission}
            className="w-full"
            variant="outline"
          >
            <Bell className="mr-2 h-4 w-4" />
            Enable Notifications
          </Button>
        )}

        {notificationPermission === 'denied' && (
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
            <p className="font-medium mb-1">Notifications are blocked</p>
            <p>To enable notifications:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Change notifications from "Block" to "Allow"</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        )}

        {notificationPermission === 'granted' && (
          <div className="text-sm text-green-700 dark:text-green-400 p-3 bg-green-50 dark:bg-green-950 rounded-md">
            <p className="font-medium mb-1">✓ Notifications are enabled</p>
            <p>You'll receive alerts when your show reminders are due.</p>
          </div>
        )}

        {notifiedReminders.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Recent Notifications</p>
              <Button 
                onClick={clearNotifiedReminders}
                variant="ghost" 
                size="sm"
              >
                Clear History
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {notifiedReminders.length} reminder{notifiedReminders.length !== 1 ? 's' : ''} triggered recently
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};