import React from 'react';
import { t } from '../i18n/translations';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FolderKanban, ListTodo, Flag, ArrowRight, Bell, MessageSquare, CheckCircle2, Settings, Download } from 'lucide-react';
import { useNavigate } from 'react-router';
import { buildProjectProgressMap, useActivities, useMilestones, useProjects, useTasks } from '../api/useApi';

function formatTimeAgo(timestamp: string) {
  const date = new Date(timestamp);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
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
    case 'project':
      return FolderKanban;
    case 'settings':
      return Settings;
    case 'export':
      return Download;
    case 'success':
      return CheckCircle2;
    default:
      return Bell;
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const firstProjectId = projects[0]?.id || '';
  const { milestones } = useMilestones(firstProjectId);
  const { activities, loading: activitiesLoading } = useActivities(4);
  const projectProgressMap = buildProjectProgressMap(tasks);

  const totalProjects = projects.length;
  const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'review').length;
  const upcomingMilestones = milestones.filter((milestone) => !milestone.completed).length;

  const activityData = [
    { name: 'Mon', tasks: 8 },
    { name: 'Tue', tasks: 12 },
    { name: 'Wed', tasks: 10 },
    { name: 'Thu', tasks: 15 },
    { name: 'Fri', tasks: 13 },
    { name: 'Sat', tasks: 5 },
    { name: 'Sun', tasks: 3 },
  ];

  const progressData = [
    { name: 'Week 1', completed: 20 },
    { name: 'Week 2', completed: 35 },
    { name: 'Week 3', completed: 45 },
    { name: 'Week 4', completed: 60 },
  ];

  const stats = [
    {
      title: t.totalProjects,
      value: totalProjects,
      icon: FolderKanban,
      color: '#6246EA',
    },
    {
      title: t.activeTasks,
      value: activeTasks,
      icon: ListTodo,
      color: '#2CB67D',
    },
    {
      title: t.upcomingMilestones,
      value: upcomingMilestones,
      icon: Flag,
      color: '#E45858',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">{t.dashboard}</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-foreground/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground/60">{stat.title}</p>
                    <p className="text-3xl mt-2">{stat.value}</p>
                  </div>
                  <div 
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: stat.color + '20' }}
                  >
                    <Icon className="h-6 w-6" style={{ color: stat.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-foreground/10">
          <CardHeader>
            <CardTitle>{t.recentActivity}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2C34" opacity={0.1} />
                <XAxis dataKey="name" stroke="#2B2C34" />
                <YAxis stroke="#2B2C34" />
                <Tooltip />
                <Bar dataKey="tasks" fill="#6246EA" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-foreground/10">
          <CardHeader>
            <CardTitle>{t.progress}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2C34" opacity={0.1} />
                <XAxis dataKey="name" stroke="#2B2C34" />
                <YAxis stroke="#2B2C34" />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#2CB67D" 
                  strokeWidth={2}
                  dot={{ fill: '#2CB67D', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed & Recent Projects */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-foreground/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t.activityFeed}</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              className="hover:bg-transparent"
              style={{ color: '#6246EA' }}
              onClick={() => navigate('/notifications')}
            >
              {t.viewAll}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activitiesLoading ? (
                <p className="text-sm text-foreground/60">Loading activity...</p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-foreground/60">No recent activity yet.</p>
              ) : (
                activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <button
                      key={activity.id}
                      type="button"
                      className="flex w-full items-start gap-3 pb-4 border-b border-foreground/5 last:border-0 last:pb-0 text-left"
                      onClick={() => navigate(activity.targetPath)}
                    >
                      <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#6246EA20' }}>
                        <Icon className="h-4 w-4" style={{ color: '#6246EA' }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-sm text-foreground/70 mt-1">{activity.message}</p>
                        <p className="text-xs text-foreground/50 mt-1">{formatTimeAgo(activity.createdAt)}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-foreground/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t.projects}</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              className="hover:bg-transparent hover:opacity-80"
              style={{ color: '#6246EA' }}
              onClick={() => navigate('/projects')}
            >
              {t.viewAll}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.slice(0, 4).map((project) => {
                const projectProgress = projectProgressMap[project.id] ?? 0;

                return (
                <div 
                  key={project.id} 
                  className="p-4 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#D1D1E9' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{project.title}</h4>
                    <span className="text-sm text-foreground/60">{projectProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-background mb-2">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${projectProgress}%`,
                        backgroundColor: '#6246EA'
                      }}
                    />
                  </div>
                  <p className="text-xs text-foreground/60">Due: {project.deadline}</p>
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
