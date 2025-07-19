import { useState } from 'react';
import type { PBSShow, SubscriptionRequest, SubscriptionResponse } from '@/lib/types';

export const useSubscriptions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribeToShow = async (show: PBSShow, type: 'subscribe' | 'remind'): Promise<SubscriptionResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
      const endpoint = type === 'subscribe' ? '/users/subscribe' : '/users/remind';
      
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error('User not authenticated');
      }
      
      const auth = JSON.parse(token);
      const params: SubscriptionRequest = {
        showId: show.id,
        showName: show.name,
        djName: show.dj,
        day: show.day,
        date: show.date,
        startTime: show.start_time,
        endTime: show.end_time,
      };

      const response = await fetch(`${apiHost}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to ${type}`);
      }

      const result: SubscriptionResponse = await response.json();
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Error ${type}ing to show`;
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    subscribeToShow,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
