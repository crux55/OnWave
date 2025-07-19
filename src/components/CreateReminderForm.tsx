import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useReminders } from '@/contexts/RemindersContext';
import { Plus, Clock } from 'lucide-react';

export const CreateReminderForm: React.FC = () => {
  const [showName, setShowName] = useState('');
  const [showDate, setShowDate] = useState('');
  const [showTime, setShowTime] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState('15');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { addReminder } = useReminders();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!showName || !showDate || !showTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await addReminder({
        show_name: showName,
        show_date: showDate,
        show_start_time: showTime,
        reminder_minutes_before: parseInt(reminderMinutes),
      });

      // Reset form
      setShowName('');
      setShowDate('');
      setShowTime('');
      setReminderMinutes('15');

      toast({
        title: "Success!",
        description: `Reminder created for "${showName}"`,
      });
      
    } catch (error) {
      // Handle unauthorized error specially
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        toast({
          title: "Login Required",
          description: "Please log in to create reminders",
          action: (
            <a href="/auth/login" className="text-primary hover:underline">
              Login here
            </a>
          ),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to create reminder',
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Reminder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="showName">Show Name *</Label>
            <Input
              id="showName"
              value={showName}
              onChange={(e) => setShowName(e.target.value)}
              placeholder="Enter radio show name"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="showDate">Show Date *</Label>
              <Input
                id="showDate"
                type="date"
                value={showDate}
                onChange={(e) => setShowDate(e.target.value)}
                min={today}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="showTime">Show Time *</Label>
              <Input
                id="showTime"
                type="time"
                value={showTime}
                onChange={(e) => setShowTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminderMinutes">Remind me before</Label>
            <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
              <SelectTrigger>
                <SelectValue placeholder="Select reminder time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes before</SelectItem>
                <SelectItem value="10">10 minutes before</SelectItem>
                <SelectItem value="15">15 minutes before</SelectItem>
                <SelectItem value="30">30 minutes before</SelectItem>
                <SelectItem value="60">1 hour before</SelectItem>
                <SelectItem value="120">2 hours before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Creating Reminder...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Reminder
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
