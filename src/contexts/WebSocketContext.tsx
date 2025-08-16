import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { WebSocketNotification } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connect: (userId: string) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const { toast } = useToast();

  const connect = useCallback((userId: string) => {
    if (ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionStatus('connecting');
    
    const wsHost = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
    const websocket = new WebSocket(`${wsHost}/ws?user_id=${userId}`);

    websocket.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    };

    websocket.onmessage = (event) => {
      try {
        const notification: WebSocketNotification = JSON.parse(event.data);
        
        if (notification.type === 'reminder') {
          toast({
            title: "Show Reminder! 🔔",
            description: `${notification.show_name} starts in ${notification.minutes_until_show} minutes`,
            duration: 5000,
          });
        }
      } catch (error) {
        // Silent fail for malformed messages
      }
    };

    websocket.onclose = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };

    websocket.onerror = (error) => {
      setConnectionStatus('error');
    };

    setWs(websocket);
  }, [toast]);

  const disconnect = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }
  }, [ws]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const value: WebSocketContextType = {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
