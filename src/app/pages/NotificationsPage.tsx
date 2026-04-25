import React from 'react';
import { useNavigate } from 'react-router';
import { t } from '../i18n/translations';
import { Card, CardContent } from '../components/ui/card';
import { Bell, Flag, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useActivities } from '../api/useApi';

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'comment':
      return MessageSquare;
    case 'milestone':
      return Flag;
    case 'success':
      return CheckCircle2;
    default:
      return Bell;
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case 'comment':
      return '#2B2C34';
    case 'milestone':
      return '#6246EA';
    case 'success':
      return '#2CB67D';
    default:
      return '#6246EA';
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { activities, loading, error } = useActivities();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">{t.activityFeed}</h1>
          <p className="text-sm text-foreground/60 mt-2">
            Showing persisted task, milestone, and comment events from the backend activity stream.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <Card className="border-foreground/10">
            <CardContent className="p-12 text-center">
              <p className="text-foreground/60">Loading activity...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-foreground/10">
            <CardContent className="p-12 text-center">
              <p className="text-red-500">{error}</p>
            </CardContent>
          </Card>
        ) : activities.length === 0 ? (
          <Card className="border-foreground/10">
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-foreground/20" />
              <p className="text-foreground/60">No activity has been recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            const color = getActivityColor(activity.type);

            return (
              <Card
                key={activity.id}
                className="border-foreground/10 cursor-pointer transition-all hover:border-foreground/20"
                onClick={() => navigate(activity.targetPath)}
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
                        <h4 className="font-semibold">{activity.title}</h4>
                        <span className="text-xs text-foreground/50 whitespace-nowrap">
                          {formatTime(activity.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/70">{activity.message}</p>
                    </div>
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
