import React, { useState } from 'react';
import { t } from '../i18n/translations';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { CheckCheck, Bell, MessageSquare, Flag, CheckCircle2, AlertCircle } from 'lucide-react';
import { FrontendNotification } from '../types/frontend';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<FrontendNotification[]>([]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task': return Bell;
      case 'comment': return MessageSquare;
      case 'milestone': return Flag;
      case 'success': return CheckCircle2;
      case 'error': return AlertCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task': return '#6246EA';
      case 'comment': return '#2B2C34';
      case 'milestone': return '#6246EA';
      case 'success': return '#2CB67D';
      case 'error': return '#E45858';
      default: return '#2B2C34';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">{t.notifications}</h1>
        <Button 
          variant="outline"
          onClick={markAllAsRead}
          className="border-foreground/20 hover:bg-transparent hover:opacity-80"
          style={{ color: '#6246EA' }}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          {t.markAllAsRead}
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card className="border-foreground/10">
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-foreground/20" />
              <p className="text-foreground/60">{t.noNotifications}</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const color = getNotificationColor(notification.type);
            
            return (
              <Card 
                key={notification.id}
                className={`border-foreground/10 cursor-pointer transition-all ${
                  notification.read ? 'opacity-60' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div 
                      className="p-3 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: color + '20' }}
                    >
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold">{notification.title}</h4>
                        <span className="text-xs text-foreground/50 whitespace-nowrap">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/70">{notification.message}</p>
                    </div>

                    {!notification.read && (
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                        style={{ backgroundColor: '#6246EA' }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
