import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/NotificationContext';
import { Wifi, WifiOff } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const { isWsConnected } = useNotifications();

  const status = isWsConnected
    ? {
        icon: <Wifi className="h-3 w-3" />,
        text: 'Connected',
        variant: 'default' as const,
        className: 'bg-green-500 text-white',
      }
    : {
        icon: <WifiOff className="h-3 w-3" />,
        text: 'Disconnected',
        variant: 'outline' as const,
        className: 'bg-gray-500 text-white',
      };

  return (
    <Badge variant={status.variant} className={`flex items-center gap-1 ${status.className}`}>
      {status.icon}
      <span className="text-xs">{status.text}</span>
    </Badge>
  );
};
