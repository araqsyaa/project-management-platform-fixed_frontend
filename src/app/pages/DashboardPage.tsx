import React from 'react';
import { t } from '../i18n/translations';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FolderKanban, ListTodo, Flag, ArrowRight, Bell, MessageSquare, CheckCircle2, Settings, Download, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  buildProjectProgressMap,
  buildProjectProgressSummaryData,
  useActivities,
  useMilestones,
  useProjects,
  useTasks,
} from '../api/useApi';

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
  const projectProgressSummary = buildProjectProgressSummaryData(projects, tasks, 6);

  const totalProjects = projects.length;
  const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'review').length;
  const upcomingMilestones = milestones.filter((milestone) => !milestone.completed).length;

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
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 items-start">
        <Card className="border-foreground/10 h-fit self-start">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>{t.recentActivity}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-transparent"
                style={{ color: '#6246EA' }}
                onClick={() => navigate('/activities')}
              >
                {t.viewAll}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="flex h-[250px] items-center justify-center text-sm text-foreground/60">
                Loading activity...
              </div>
            ) : activities.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-sm text-foreground/60">
                No recent activity yet.
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <button
                      key={activity.id}
                      type="button"
                      className="flex w-full items-start gap-3 rounded-lg border border-foreground/10 p-3 text-left transition-colors hover:bg-secondary/40"
                      onClick={() => navigate(activity.targetPath)}
                    >
                      <div className="mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#6246EA20' }}>
                        <Icon className="h-4 w-4" style={{ color: '#6246EA' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="capitalize">{activity.type}</Badge>
                          <span className="text-xs text-foreground/50">{formatTimeAgo(activity.createdAt)}</span>
                        </div>
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-sm text-foreground/70 mt-1">{activity.message}</p>
                        <p className="text-xs text-foreground/50 mt-2">{activity.actorName}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-foreground/10 h-fit self-start">
          <CardHeader>
            <CardTitle>{t.progress}</CardTitle>
          </CardHeader>
          <CardContent>
            {projectProgressSummary.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-sm text-foreground/60">
                No project progress available yet.
              </div>
            ) : (
              <div className="space-y-4">
                {projectProgressSummary.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className="w-full rounded-lg border border-foreground/10 p-4 text-left transition-colors hover:bg-secondary/40"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-foreground/60">
                          {project.doneTasks} of {project.totalTasks} tasks done
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">{project.progress}%</p>
                        <p className="text-xs text-foreground/50">completion</p>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-secondary mb-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${project.progress}%`, backgroundColor: '#2CB67D' }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-foreground/50">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Deadline: {project.deadline || 'Not set'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div className="grid grid-cols-1 gap-6">
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
                const projectTasks = tasks.filter((task) => task.projectId === project.id);
                const activeProjectTasks = projectTasks.filter(
                  (task) => task.status === 'in_progress' || task.status === 'review',
                ).length;

                return (
                <div 
                  key={project.id} 
                  className="p-4 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#D1D1E9' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{project.title}</h4>
                    <Badge variant="secondary">{projectTasks.length} tasks</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground/60 mb-2">
                    <span>{activeProjectTasks} active</span>
                    <span>{projectProgress}% complete</span>
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
