import React, { useEffect, useState } from 'react';
import { t } from '../i18n/translations';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { api, ApiMilestone } from '../api/client';
import { useProjects, useTasks, useTeams, useUsers } from '../api/useApi';

type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';
type ReportTaskRow = {
  taskId: string;
  title: string;
  project: string;
  assignee: string;
  status: string;
  priority: string;
  deadline: string;
  team: string;
};

type ReportSummaryRow = {
  label: string;
  value: string;
};

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

function isUpcoming(dateString: string, daysAhead = 14) {
  if (!dateString) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysAhead;
}

function buildIntegerTicks(maxValue: number) {
  const upperBound = Math.max(1, maxValue);
  return Array.from({ length: upperBound }, (_, index) => index + 1);
}

function formatStatusLabel(status: string) {
  return status.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPriorityLabel(priority: string) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDisplayValue(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function csvEscape(value: string | number) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadFile(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { projects, loading: projectsLoading, error: projectsError, refresh: refreshProjects } = useProjects();
  const { tasks, loading: tasksLoading, error: tasksError, refresh: refreshTasks } = useTasks();
  const { teams, loading: teamsLoading, error: teamsError, refresh: refreshTeams } = useTeams();
  const { users, loading: usersLoading, error: usersError, refresh: refreshUsers } = useUsers();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [milestones, setMilestones] = useState<(ApiMilestone & { projectId: string })[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const [milestonesError, setMilestonesError] = useState<string | null>(null);

  useEffect(() => {
    if (projectsLoading) return;
    if (projectsError) {
      setMilestonesLoading(false);
      setMilestonesError(projectsError);
      return;
    }

    if (projects.length === 0) {
      setMilestones([]);
      setMilestonesLoading(false);
      return;
    }

    setMilestonesLoading(true);
    setMilestonesError(null);

    Promise.all(
      projects.map((project) =>
        api.milestones(project.id).then((items) =>
          items.map((milestone) => ({
            ...milestone,
            projectId: project.id,
          })),
        ),
      ),
    )
      .then((allMilestones) => setMilestones(allMilestones.flat()))
      .catch((error) => setMilestonesError(error.message))
      .finally(() => setMilestonesLoading(false));
  }, [projects, projectsError, projectsLoading]);

  useEffect(() => {
    const reloadReportsData = () => {
      void refreshProjects();
      void refreshTasks();
      void refreshTeams();
      void refreshUsers();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reloadReportsData();
      }
    };

    window.addEventListener('focus', reloadReportsData);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', reloadReportsData);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshProjects, refreshTasks, refreshTeams, refreshUsers]);

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
  const filteredMilestones = milestones.filter((milestone) => filteredProjectIds.has(milestone.projectId));
  const completedTasksCount = filteredTasks.filter((task) => task.status === 'done').length;
  const activeTasksCount = filteredTasks.filter(
    (task) => task.status === 'in_progress' || task.status === 'review',
  ).length;
  const overdueTasksCount = filteredTasks.filter((task) =>
    isOverdue(task.dueDate, task.status as TaskStatus),
  ).length;
  const taskCompletionRate = filteredTasks.length
    ? Math.round((completedTasksCount / filteredTasks.length) * 100)
    : 0;
  const completedMilestonesCount = filteredMilestones.filter((milestone) => milestone.completed).length;
  const milestoneCompletionRate = filteredMilestones.length
    ? Math.round((completedMilestonesCount / filteredMilestones.length) * 100)
    : 0;
  const upcomingMilestonesCount = filteredMilestones.filter(
    (milestone) => !milestone.completed && isUpcoming(milestone.dueDate),
  ).length;

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
  const priorityMax = tasksByPriority.reduce(
    (maxValue, item) => Math.max(maxValue, item.value),
    0,
  );
  const priorityTicks = buildIntegerTicks(priorityMax);
  const workloadData = [
    ...users.map((user) => {
      const assignedTasks = filteredTasks.filter((task) => task.assigneeId === user.id);
      const completedAssignedTasks = assignedTasks.filter((task) => task.status === 'done').length;

      return {
        name: user.name,
        assigned: assignedTasks.length,
        completed: completedAssignedTasks,
      };
    }).filter((item) => item.assigned > 0),
    {
      name: 'Unassigned',
      assigned: filteredTasks.filter((task) => !task.assigneeId).length,
      completed: filteredTasks.filter((task) => !task.assigneeId && task.status === 'done').length,
    },
  ].filter((item) => item.assigned > 0);

  const projectProgress = filteredProjects.map((project) => {
    const projectTasks = filteredTasks.filter((task) => task.projectId === project.id);
    const completedProjectTasks = projectTasks.filter((task) => task.status === 'done').length;
    const computedProgress = projectTasks.length
      ? Math.round((completedProjectTasks / projectTasks.length) * 100)
      : 0;

    return {
      name: project.title.length > 20 ? `${project.title.substring(0, 20)}...` : project.title,
      completedProgress: computedProgress,
      remainingProgress: Math.max(0, 100 - computedProgress),
      totalTasks: projectTasks.length,
      completedTasks: completedProjectTasks,
    };
  });

  const completionTrendMap = filteredTasks
    .filter((task) => task.dueDate)
    .reduce<Record<string, {
      deadline: string;
      tasksCompleted: number;
      tasksDue: number;
      sortKey: string;
    }>>((acc, task) => {
      const key = toBucketKey(task.dueDate);
      if (!acc[key]) {
        acc[key] = {
          deadline: formatBucketLabel(task.dueDate),
          tasksCompleted: 0,
          tasksDue: 0,
          sortKey: key,
        };
      }

      acc[key].tasksDue += 1;
      if (task.status === 'done') {
        acc[key].tasksCompleted += 1;
      }

      return acc;
    }, {});

  const completionTrend = Object.values(completionTrendMap).sort(
    (a, b) => a.sortKey.localeCompare(b.sortKey),
  ).map((bucket) => ({
    deadline: bucket.deadline,
    tasksCompleted: bucket.tasksCompleted,
    tasksDue: bucket.tasksDue,
  }));

  const projectFilterLabel = selectedProject === 'all'
    ? 'All Projects'
    : filteredProjects[0]?.title || selectedProject;
  const teamFilterLabel = selectedTeam === 'all'
    ? 'All Teams'
    : teams.find((team) => String(team.id) === selectedTeam)?.name || selectedTeam;

  const reportTaskRows: ReportTaskRow[] = filteredTasks.map((task) => {
    const project = filteredProjects.find((item) => item.id === task.projectId);
    const user = users.find((item) => item.id === task.assigneeId);
    const team = teams.find((item) => item.id === project?.teamId);

    return {
      taskId: task.id,
      title: task.title,
      project: formatDisplayValue(project?.title, 'Unknown Project'),
      assignee: formatDisplayValue(user?.name, 'Unassigned'),
      status: formatStatusLabel(task.status),
      priority: formatPriorityLabel(task.priority),
      deadline: formatDisplayValue(task.dueDate, 'Not set'),
      team: formatDisplayValue(team?.name, 'Unassigned Team'),
    };
  });

  const reportSummaryRows: ReportSummaryRow[] = [
    { label: 'Projects in scope', value: String(filteredProjects.length) },
    { label: 'Tasks in scope', value: String(filteredTasks.length) },
    { label: 'Completed tasks', value: String(completedTasksCount) },
    { label: 'Active tasks', value: String(activeTasksCount) },
    { label: 'Overdue tasks', value: String(overdueTasksCount) },
    { label: 'Task completion rate', value: `${taskCompletionRate}%` },
    { label: 'Milestone completion', value: `${milestoneCompletionRate}%` },
  ];

  const reportAssigneeRows = workloadData.map((item) => ({
    assignee: item.name,
    assigned: String(item.assigned),
    completed: String(item.completed),
  }));

  const handleExportCsv = () => {
    const rows = [
      ['Task ID', 'Title', 'Project', 'Assignee', 'Status', 'Priority', 'Deadline', 'Team'],
      ...reportTaskRows.map((row) => [
        row.taskId,
        row.title,
        row.project,
        row.assignee,
        row.status,
        row.priority,
        row.deadline,
        row.team,
      ]),
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    downloadFile(csv, 'project-management-report.csv', 'text/csv;charset=utf-8;');
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addLine = (
      text: string,
      fontSize = 11,
      fontStyle: 'normal' | 'bold' = 'normal',
      color: [number, number, number] = [43, 44, 52],
    ) => {
      doc.setFont('helvetica', fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, contentWidth);
      const height = lines.length * (fontSize + 4);
      ensureSpace(height);
      doc.text(lines, margin, y);
      y += height;
    };

    const addGap = (size = 10) => {
      y += size;
    };

    const addSectionTitle = (title: string) => {
      addGap(6);
      doc.setDrawColor(98, 70, 234);
      doc.setLineWidth(1.2);
      ensureSpace(24);
      doc.line(margin, y, margin + contentWidth, y);
      y += 16;
      addLine(title, 14, 'bold');
      addGap(2);
    };

    const addSummaryGrid = (rows: ReportSummaryRow[]) => {
      const columnGap = 16;
      const cardWidth = (contentWidth - columnGap) / 2;
      const cardHeight = 54;

      for (let index = 0; index < rows.length; index += 2) {
        ensureSpace(cardHeight + 10);

        const pair = rows.slice(index, index + 2);
        pair.forEach((row, pairIndex) => {
          const x = margin + pairIndex * (cardWidth + columnGap);
          doc.setFillColor(248, 248, 252);
          doc.setDrawColor(224, 226, 234);
          doc.roundedRect(x, y, cardWidth, cardHeight, 8, 8, 'FD');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(95, 99, 110);
          doc.text(row.label, x + 12, y + 18);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.setTextColor(43, 44, 52);
          doc.text(row.value, x + 12, y + 40);
        });

        y += cardHeight + 10;
      }
    };

    const addTable = (headers: string[], rows: string[][], columnWidths: number[]) => {
      const headerHeight = 24;
      const rowPaddingY = 8;
      const rowFontSize = 10;

      const drawHeader = () => {
        ensureSpace(headerHeight + 8);
        let currentX = margin;
        doc.setFillColor(43, 44, 52);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);

        headers.forEach((header, index) => {
          const width = columnWidths[index];
          doc.rect(currentX, y, width, headerHeight, 'F');
          doc.text(header, currentX + 6, y + 16);
          currentX += width;
        });

        y += headerHeight;
      };

      drawHeader();

      rows.forEach((row, rowIndex) => {
        const wrappedCells = row.map((cell, index) =>
          doc.splitTextToSize(cell, columnWidths[index] - 12),
        );
        const rowHeight = Math.max(
          ...wrappedCells.map((lines) => lines.length * (rowFontSize + 2) + rowPaddingY * 2),
          28,
        );

        if (y + rowHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
          drawHeader();
        }

        let currentX = margin;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(rowFontSize);
        doc.setTextColor(43, 44, 52);

        wrappedCells.forEach((cellLines, index) => {
          const width = columnWidths[index];
          doc.setFillColor(rowIndex % 2 === 0 ? 255 : 248);
          doc.setDrawColor(224, 226, 234);
          doc.rect(currentX, y, width, rowHeight, 'FD');
          doc.text(cellLines, currentX + 6, y + rowPaddingY + 10);
          currentX += width;
        });

        y += rowHeight;
      });
    };

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(43, 44, 52);
    doc.setFontSize(20);
    doc.text('Project Management Report', margin, y);
    y += 24;

    addLine(`Generated on ${new Date().toLocaleString()}`, 11, 'normal', [95, 99, 110]);
    addLine(`Project filter: ${projectFilterLabel}`, 11, 'normal', [95, 99, 110]);
    addLine(`Team filter: ${teamFilterLabel}`, 11, 'normal', [95, 99, 110]);
    addGap(8);

    addSectionTitle('Summary');
    addSummaryGrid(reportSummaryRows);

    addSectionTitle('Tasks by Assignee');
    if (reportAssigneeRows.length === 0) {
      addLine('No task assignments available for the current filters.');
    } else {
      addTable(
        ['Assignee', 'Assigned', 'Completed'],
        reportAssigneeRows.map((row) => [row.assignee, row.assigned, row.completed]),
        [contentWidth * 0.58, contentWidth * 0.21, contentWidth * 0.21],
      );
    }

    addSectionTitle('Task List');
    if (reportTaskRows.length === 0) {
      addLine('No tasks available for the current filters.');
    } else {
      addTable(
        ['ID', 'Title', 'Project', 'Assignee', 'Status', 'Priority', 'Deadline'],
        reportTaskRows.map((row) => [
          row.taskId,
          row.title,
          row.project,
          row.assignee,
          row.status,
          row.priority,
          row.deadline,
        ]),
        [32, 120, 110, 95, 70, 58, 57],
      );
    }

    doc.save('project-management-report.pdf');
  };

  if (projectsLoading || tasksLoading || teamsLoading || usersLoading || milestonesLoading) return <div className="p-8">Loading...</div>;
  if (projectsError || tasksError || teamsError || usersError || milestonesError) {
    return <div className="p-8 text-red-500">Error: {projectsError || tasksError || teamsError || usersError || milestonesError}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">{t.reports}</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="border-foreground/20 hover:bg-transparent hover:opacity-80"
            style={{ color: '#E45858' }}
            onClick={handleExportPdf}
          >
            <FileText className="mr-2 h-4 w-4" />
            {t.exportToPDF}
          </Button>
          <Button 
            variant="outline"
            className="border-foreground/20 hover:bg-transparent hover:opacity-80"
            style={{ color: '#6246EA' }}
            onClick={handleExportCsv}
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

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Project Summary</h2>
        </div>

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
              <div className="text-xs text-foreground/50 mt-2">
                {taskCompletionRate}% task completion rate
              </div>
            </CardContent>
          </Card>
          <Card className="border-foreground/10">
            <CardContent className="p-6">
              <div className="text-sm text-foreground/60 mb-2">{t.activeTasks}</div>
              <div className="text-3xl font-semibold" style={{ color: '#6246EA' }}>
                {activeTasksCount}
              </div>
              <div className="text-xs text-foreground/50 mt-2">
                {overdueTasksCount} overdue task{overdueTasksCount === 1 ? '' : 's'}
              </div>
            </CardContent>
          </Card>
          <Card className="border-foreground/10">
            <CardContent className="p-6">
              <div className="text-sm text-foreground/60 mb-2">Milestone Completion</div>
              <div className="text-3xl font-semibold" style={{ color: '#6246EA' }}>{milestoneCompletionRate}%</div>
              <div className="text-xs text-foreground/50 mt-2">
                {upcomingMilestonesCount} upcoming milestone{upcomingMilestonesCount === 1 ? '' : 's'} in next 14 days
              </div>
            </CardContent>
          </Card>
        </div>

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
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Task Distribution</h2>
          <p className="text-sm text-foreground/60">
            Compare how work is spread across priorities and how each selected project is progressing.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
        <Card className="border-foreground/10">
          <CardHeader>
            <CardTitle>Tasks by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tasksByPriority}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2C34" opacity={0.1} />
                <XAxis dataKey="name" stroke="#2B2C34" />
                <YAxis
                  stroke="#2B2C34"
                  allowDecimals={false}
                  domain={[0, Math.max(1, priorityMax)]}
                  ticks={priorityTicks}
                />
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
                <Bar
                  dataKey="completedProgress"
                  stackId="progress"
                  fill="#2CB67D"
                  radius={[0, 0, 0, 0]}
                  name="Completed %"
                />
                <Bar
                  dataKey="remainingProgress"
                  stackId="progress"
                  fill="#D1D5DB"
                  radius={[0, 8, 8, 0]}
                  name="Remaining %"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Team Workload</h2>
          <p className="text-sm text-foreground/60">
            Track who carries the current workload and how delivery volume changes across deadlines.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
        <Card className="border-foreground/10">
          <CardHeader>
            <CardTitle>Tasks by Assignee</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2C34" opacity={0.1} />
                <XAxis type="number" stroke="#2B2C34" allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#2B2C34" width={120} />
                <Tooltip />
                <Bar dataKey="assigned" fill="#6246EA" radius={[0, 8, 8, 0]} name="Assigned tasks" />
                <Bar dataKey="completed" fill="#2CB67D" radius={[0, 8, 8, 0]} name="Completed tasks" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-foreground/10">
          <CardHeader>
            <CardTitle>Delivery Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2C34" opacity={0.1} />
                <XAxis dataKey="deadline" stroke="#2B2C34" />
                <YAxis stroke="#2B2C34" allowDecimals={false} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="tasksCompleted" 
                  stroke="#2CB67D" 
                  strokeWidth={2}
                  name="Tasks completed"
                />
                <Line 
                  type="monotone" 
                  dataKey="tasksDue" 
                  stroke="#6246EA" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Tasks due"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </div>
      </section>
    </div>
  );
}
