import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const { connectionStatus, isConnected } = useWebSocket();

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: 'Connected',
          variant: 'default' as const,
          className: 'bg-green-500 text-white',
        };
      case 'connecting':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Connecting',
          variant: 'secondary' as const,
          className: 'bg-yellow-500 text-white',
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Error',
          variant: 'destructive' as const,
          className: 'bg-red-500 text-white',
        };
      default:
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Disconnected',
          variant: 'outline' as const,
          className: 'bg-gray-500 text-white',
        };
    }
  };

  const status = getStatusConfig();

  return (
    <Badge variant={status.variant} className={`flex items-center gap-1 ${status.className}`}>
      {status.icon}
      <span className="text-xs">{status.text}</span>
    </Badge>
  );
};
