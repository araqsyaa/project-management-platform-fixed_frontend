import React from 'react';
import { t } from '../i18n/translations';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FolderKanban, ListTodo, Flag, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useMilestones, useProjects, useTasks } from '../api/useApi';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { projects, loading } = useProjects();
  const { tasks } = useTasks();
  const firstProjectId = projects[0]?.id || '';
  const { milestones } = useMilestones(firstProjectId);

  const totalProjects = projects.length;
  const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'review').length;
  const upcomingMilestones = milestones.filter((milestone) => !milestone.completed).length;
  const activityFeed = tasks.slice(0, 4).map((task, index) => ({
    id: task.id,
    user: task.assigneeId ? `User #${task.assigneeId}` : 'Unassigned',
    action: 'is working on',
    target: task.title,
    timestamp: `${index + 1} task${index === 0 ? '' : 's'} ago`,
  }));

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
            >
              {t.viewAll}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityFeed.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-foreground/5 last:border-0 last:pb-0">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#6246EA20' }}>
                    <TrendingUp className="h-4 w-4" style={{ color: '#6246EA' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span>
                      {' '}{activity.action}{' '}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-foreground/50 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
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
              {projects.slice(0, 4).map((project) => (
                <div 
                  key={project.id} 
                  className="p-4 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#D1D1E9' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{project.title}</h4>
                    <span className="text-sm text-foreground/60">{project.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-background mb-2">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${project.progress}%`,
                        backgroundColor: '#6246EA'
                      }}
                    />
                  </div>
                  <p className="text-xs text-foreground/60">Due: {project.deadline}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
