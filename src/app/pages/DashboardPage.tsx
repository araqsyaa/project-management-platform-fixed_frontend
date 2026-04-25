import React from 'react';
import { t } from '../i18n/translations';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FolderKanban, ListTodo, Flag, ArrowRight, Bell, MessageSquare, CheckCircle2, Settings, Download, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  buildLifecycleProgressCards,
  buildProjectProgressMap,
  useActivities,
  useMilestones,
  useProjects,
  useTasks,
  useUsers,
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

function formatStatusStage(status: string) {
  switch (status) {
    case 'backlog':
      return 'To Do';
    case 'in_progress':
      return 'In Progress';
    case 'review':
      return 'Review';
    case 'done':
      return 'Done';
    default:
      return status;
  }
}

function formatDueDate(dateString: string) {
  if (!dateString) return 'Not set';
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const { users } = useUsers();
  const firstProjectId = projects[0]?.id || '';
  const { milestones } = useMilestones(firstProjectId);
  const { activities, loading: activitiesLoading } = useActivities(4);
  const projectProgressMap = buildProjectProgressMap(tasks);
  const lifecycleProgressCards = buildLifecycleProgressCards(tasks, projects, users, 4);
  const tasksDueSoon = tasks
    .filter((task) => task.dueDate && task.status !== 'done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4)
    .map((task) => ({
      ...task,
      projectName: projects.find((project) => project.id === task.projectId)?.title || 'Unknown Project',
      assigneeName: users.find((user) => user.id === task.assigneeId)?.name || 'Unassigned',
    }));

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

      <Card className="border-foreground/10">
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 items-start">
        <Card className="border-foreground/10 h-fit self-start">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{t.projects}</CardTitle>
                <p className="text-sm text-foreground/60 mt-1">Project progress by completed tasks</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-transparent"
                style={{ color: '#6246EA' }}
                onClick={() => navigate('/projects')}
              >
                {t.viewAll}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {projects.slice(0, 4).map((project) => {
                const projectProgress = projectProgressMap[project.id] ?? 0;
                const projectTasks = tasks.filter((task) => task.projectId === project.id);
                const activeProjectTasks = projectTasks.filter(
                  (task) => task.status === 'in_progress' || task.status === 'review',
                ).length;

                return (
                <div 
                  key={project.id} 
                  className="rounded-lg border border-foreground/10 bg-secondary/20 p-4 cursor-pointer hover:bg-secondary/40 transition-colors"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-foreground/50">Project</p>
                      <h4 className="font-medium">{project.title}</h4>
                    </div>
                    <Badge variant="secondary">{projectTasks.length} tasks</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-foreground/50">Progress</p>
                      <p className="font-medium">{projectProgress}%</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-foreground/50">Active Tasks</p>
                      <p className="font-medium">{activeProjectTasks}</p>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-background mb-3">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${projectProgress}%`, backgroundColor: '#6246EA' }}
                    />
                  </div>
                  <p className="text-xs text-foreground/60">Due: {project.deadline || 'Not set'}</p>
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-foreground/10 h-fit self-start">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{t.progress}</CardTitle>
                <p className="text-sm text-foreground/60 mt-1">Task-level completion and active work</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-transparent"
                style={{ color: '#6246EA' }}
                onClick={() => navigate('/progress')}
              >
                {t.viewAll}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lifecycleProgressCards.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-sm text-foreground/60">
                No task progress available yet.
              </div>
            ) : (
              <div className="space-y-4">
                {lifecycleProgressCards.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="w-full rounded-lg border border-foreground/10 p-4 text-left transition-colors hover:bg-secondary/40"
                    onClick={() => navigate(task.targetPath)}
                  >
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-foreground/50">Task</p>
                        <p className="font-medium">{task.taskName}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-foreground/50">Project</p>
                        <p className="font-medium">{task.projectName}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-foreground/50">Assignee</p>
                        <p className="font-medium">{task.assigneeName}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-foreground/50">Stage</p>
                        <Badge variant={task.stage === 'done' ? 'default' : 'secondary'} className="capitalize">
                          {task.stageLabel}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-foreground/60">
                      <span>{task.completedTasks} completed</span>
                      <span>{task.remainingTasks} remaining</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-foreground/10">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Tasks Due Soon</CardTitle>
                <p className="text-sm text-foreground/60 mt-1">Upcoming deadlines that still need attention</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-transparent"
                style={{ color: '#6246EA' }}
                onClick={() => navigate('/projects')}
              >
                {t.viewAll}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasksDueSoon.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-sm text-foreground/60">
                No upcoming task deadlines right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2">
                {tasksDueSoon.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="rounded-lg border border-foreground/10 p-4 text-left transition-colors hover:bg-secondary/40"
                    onClick={() => navigate(`/projects/${task.projectId}`)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-foreground/60">{task.projectName}</p>
                      </div>
                      <Clock className="h-4 w-4 text-foreground/40 mt-0.5" />
                    </div>
                    <div className="space-y-1 text-sm text-foreground/60">
                      <p>Assignee: {task.assigneeName}</p>
                      <p>Stage: {formatStatusStage(task.status)}</p>
                      <p>Due: {formatDueDate(task.dueDate)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
