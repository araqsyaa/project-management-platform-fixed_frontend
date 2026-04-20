import React, { useEffect, useState } from 'react';
import { t } from '../i18n/translations';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import { useProjects, useTasks, useTeams } from '../api/useApi';

type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';

function formatBucketLabel(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function toBucketKey(dateString: string) {
  return dateString.slice(0, 7);
}

function isOverdue(dateString: string, status: TaskStatus) {
  if (!dateString || status === 'done') return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(dateString);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

export default function ReportsPage() {
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks();
  const { teams, loading: teamsLoading, error: teamsError } = useTeams();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  const availableProjects = projects.filter(
    (project) => selectedTeam === 'all' || project.teamId === selectedTeam,
  );

  useEffect(() => {
    if (
      selectedProject !== 'all' &&
      !availableProjects.some((project) => project.id === selectedProject)
    ) {
      setSelectedProject('all');
    }
  }, [availableProjects, selectedProject]);

  const filteredProjects = availableProjects.filter(
    (project) => selectedProject === 'all' || project.id === selectedProject,
  );
  const filteredProjectIds = new Set(filteredProjects.map((project) => project.id));
  const filteredTasks = tasks.filter((task) => filteredProjectIds.has(task.projectId));
  const completedTasksCount = filteredTasks.filter((task) => task.status === 'done').length;
  const activeTasksCount = filteredTasks.filter(
    (task) => task.status === 'in_progress' || task.status === 'review',
  ).length;
  const overdueTasksCount = filteredTasks.filter((task) =>
    isOverdue(task.dueDate, task.status as TaskStatus),
  ).length;
  const efficiency = filteredTasks.length
    ? Math.round((completedTasksCount / filteredTasks.length) * 100)
    : 0;

  const tasksByStatus = [
    { name: t.backlog, value: filteredTasks.filter((task) => task.status === 'backlog').length, color: '#2B2C34' },
    { name: t.inProgress, value: filteredTasks.filter((task) => task.status === 'in_progress').length, color: '#6246EA' },
    { name: t.review, value: filteredTasks.filter((task) => task.status === 'review').length, color: '#E45858' },
    { name: t.done, value: completedTasksCount, color: '#2CB67D' },
  ];

  const tasksByPriority = [
    { name: t.high, value: filteredTasks.filter((task) => task.priority === 'high').length },
    { name: t.medium, value: filteredTasks.filter((task) => task.priority === 'medium').length },
    { name: t.low, value: filteredTasks.filter((task) => task.priority === 'low').length },
  ];

  const projectProgress = filteredProjects.map((project) => {
    const projectTasks = filteredTasks.filter((task) => task.projectId === project.id);
    const completedProjectTasks = projectTasks.filter((task) => task.status === 'done').length;
    const computedProgress = projectTasks.length
      ? Math.round((completedProjectTasks / projectTasks.length) * 100)
      : 0;

    return {
      name: project.title.length > 20 ? `${project.title.substring(0, 20)}...` : project.title,
      progress: computedProgress,
    };
  });

  const completionTrendMap = filteredTasks
    .filter((task) => task.dueDate)
    .reduce<Record<string, { deadline: string; completed: number; total: number; sortKey: string }>>((acc, task) => {
      const key = toBucketKey(task.dueDate);
      if (!acc[key]) {
        acc[key] = {
          deadline: formatBucketLabel(task.dueDate),
          completed: 0,
          total: 0,
          sortKey: key,
        };
      }

      acc[key].total += 1;
      if (task.status === 'done') {
        acc[key].completed += 1;
      }

      return acc;
    }, {});

  const completionTrend = Object.values(completionTrendMap).sort(
    (a, b) => a.sortKey.localeCompare(b.sortKey),
  );

  if (projectsLoading || tasksLoading || teamsLoading) return <div className="p-8">Loading...</div>;
  if (projectsError || tasksError || teamsError) {
    return <div className="p-8 text-red-500">Error: {projectsError || tasksError || teamsError}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">{t.reports}</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-foreground/20 hover:bg-transparent hover:opacity-80"
            style={{ color: '#2CB67D' }}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t.exportToExcel}
          </Button>
          <Button 
            variant="outline"
            className="border-foreground/20 hover:bg-transparent hover:opacity-80"
            style={{ color: '#E45858' }}
          >
            <FileText className="mr-2 h-4 w-4" />
            {t.exportToPDF}
          </Button>
          <Button 
            variant="outline"
            className="border-foreground/20 hover:bg-transparent hover:opacity-80"
            style={{ color: '#6246EA' }}
          >
            <Download className="mr-2 h-4 w-4" />
            {t.exportToCSV}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48 border-foreground/20">
            <SelectValue placeholder="Filter by Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {availableProjects.map(project => (
              <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="w-48 border-foreground/20">
            <SelectValue placeholder="Filter by Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map(team => (
              <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6">
        <Card className="border-foreground/10">
          <CardContent className="p-6">
            <div className="text-sm text-foreground/60 mb-2">{t.totalProjects}</div>
            <div className="text-3xl font-semibold">{filteredProjects.length}</div>
          </CardContent>
        </Card>
        <Card className="border-foreground/10">
          <CardContent className="p-6">
            <div className="text-sm text-foreground/60 mb-2">{t.completedTasks}</div>
            <div className="text-3xl font-semibold" style={{ color: '#2CB67D' }}>
              {completedTasksCount}
            </div>
          </CardContent>
        </Card>
        <Card className="border-foreground/10">
          <CardContent className="p-6">
            <div className="text-sm text-foreground/60 mb-2">{t.activeTasks}</div>
            <div className="text-3xl font-semibold" style={{ color: '#6246EA' }}>
              {activeTasksCount}
            </div>
          </CardContent>
        </Card>
        <Card className="border-foreground/10">
          <CardContent className="p-6">
            <div className="text-sm text-foreground/60 mb-2">{t.efficiency}</div>
            <div className="text-3xl font-semibold" style={{ color: '#2CB67D' }}>{efficiency}%</div>
            <div className="text-xs text-foreground/50 mt-2">
              {overdueTasksCount} overdue task{overdueTasksCount === 1 ? '' : 's'} in current scope
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-foreground/10">
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
              <div className="space-y-3 self-start pt-2">
                {tasksByStatus.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm font-medium" style={{ color: entry.color }}>
                        {entry.name}
                      </span>
                    </div>
                    <span className="text-sm text-foreground/60">{entry.value}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tasksByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tasksByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-foreground/10">
          <CardHeader>
            <CardTitle>Tasks by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tasksByPriority}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2C34" opacity={0.1} />
                <XAxis dataKey="name" stroke="#2B2C34" />
                <YAxis stroke="#2B2C34" />
                <Tooltip />
                <Bar dataKey="value" fill="#6246EA" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-foreground/10">
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectProgress} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2C34" opacity={0.1} />
                <XAxis type="number" domain={[0, 100]} stroke="#2B2C34" />
                <YAxis dataKey="name" type="category" stroke="#2B2C34" width={150} />
                <Tooltip />
                <Bar dataKey="progress" fill="#2CB67D" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-foreground/10">
          <CardHeader>
            <CardTitle>{t.burndownChart}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2C34" opacity={0.1} />
                <XAxis dataKey="deadline" stroke="#2B2C34" />
                <YAxis stroke="#2B2C34" />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#2CB67D" 
                  strokeWidth={2}
                  name="Completed"
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#6246EA" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Tasks with deadline"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
