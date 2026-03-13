import React, { useState } from 'react';
import { t } from '../i18n/translations';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import { useProjects, useTasks, useTeams } from '../api/useApi';

export default function ReportsPage() {
  const { projects, loading: projectsLoading } = useProjects();
  const { tasks } = useTasks();
  const { teams } = useTeams();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  const tasksByStatus = [
    { name: t.backlog, value: tasks.filter(t => t.status === 'backlog').length, color: '#2B2C34' },
    { name: t.inProgress, value: tasks.filter(t => t.status === 'in_progress').length, color: '#6246EA' },
    { name: t.review, value: tasks.filter(t => t.status === 'review').length, color: '#E45858' },
    { name: t.done, value: tasks.filter(t => t.status === 'done').length, color: '#2CB67D' },
  ];

  const tasksByPriority = [
    { name: t.high, value: tasks.filter(t => t.priority === 'high').length },
    { name: t.medium, value: tasks.filter(t => t.priority === 'medium').length },
    { name: t.low, value: tasks.filter(t => t.priority === 'low').length },
  ];

  const projectProgress = projects.map(p => ({
    name: p.title.length > 20 ? p.title.substring(0, 20) + '...' : p.title,
    progress: p.progress
  }));

  if (projectsLoading) return <div className="p-8">Loading...</div>;

  const completionTrend = [
    { week: 'Week 1', completed: 5, planned: 8 },
    { week: 'Week 2', completed: 12, planned: 15 },
    { week: 'Week 3', completed: 18, planned: 20 },
    { week: 'Week 4', completed: 25, planned: 25 },
  ];

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
            {projects.map(project => (
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
            <div className="text-3xl font-semibold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card className="border-foreground/10">
          <CardContent className="p-6">
            <div className="text-sm text-foreground/60 mb-2">{t.completedTasks}</div>
            <div className="text-3xl font-semibold" style={{ color: '#2CB67D' }}>
              {tasks.filter(t => t.status === 'done').length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-foreground/10">
          <CardContent className="p-6">
            <div className="text-sm text-foreground/60 mb-2">{t.activeTasks}</div>
            <div className="text-3xl font-semibold" style={{ color: '#6246EA' }}>
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-foreground/10">
          <CardContent className="p-6">
            <div className="text-sm text-foreground/60 mb-2">{t.efficiency}</div>
            <div className="text-3xl font-semibold" style={{ color: '#2CB67D' }}>
              87%
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
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tasksByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
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
                <XAxis dataKey="week" stroke="#2B2C34" />
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
                  dataKey="planned" 
                  stroke="#6246EA" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Planned"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}