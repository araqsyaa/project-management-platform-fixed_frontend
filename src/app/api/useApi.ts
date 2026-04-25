import { useState, useEffect } from 'react';
import { api, ApiActivity, ApiProject, ApiTask, ApiUser, ApiTeam } from './client';
import { FrontendActivity } from '../types/frontend';

export type FrontendProject = ReturnType<typeof mapProject>;
export type FrontendTask = ReturnType<typeof mapTask>;

// Map API types to frontend-compatible format
function mapProject(p: ApiProject) {
  return {
    id: String(p.id),
    title: p.name,
    teamId: p.team ? String(p.team.id) : '',
    progress: 0,
    deadline: p.endDate || '',
    status: 'active' as const,
    client: '',
  };
}

function mapUser(u: ApiUser) {
  const roleMap: Record<string, string> = {
    ADMIN: 'administrator',
    PROJECT_MANAGER: 'project_manager',
    TEAM_MEMBER: 'team_member',
    VIEWER: 'viewer',
  };
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: (roleMap[u.role] || 'team_member') as 'administrator' | 'project_manager' | 'team_member' | 'viewer',
    avatar: u.avatar,
  };
}

function mapTask(t: ApiTask, projectId?: string) {
  return {
    id: String(t.id),
    projectId: projectId || (t.project ? String(t.project.id) : ''),
    title: t.title,
    description: t.description || '',
    assigneeId: t.assignee ? String(t.assignee.id) : '',
    status: (t.status?.toLowerCase().replace('_', '_') || 'backlog') as 'backlog' | 'in_progress' | 'review' | 'done',
    priority: (t.priority?.toLowerCase() || 'medium') as 'high' | 'medium' | 'low',
    dueDate: t.deadline || '',
  };
}

function mapActivity(activity: ApiActivity): FrontendActivity {
  return {
    id: String(activity.id),
    type: (activity.type || 'task') as FrontendActivity['type'],
    title: activity.title,
    message: activity.message,
    createdAt: activity.createdAt,
    actorName: activity.user?.name || 'System',
    targetPath: activity.targetPath || '/projects',
  };
}

export function buildProjectProgressMap(tasks: Pick<FrontendTask, 'projectId' | 'status'>[]) {
  const totals = new Map<string, { total: number; completed: number }>();

  tasks.forEach((task) => {
    if (!task.projectId) return;

    const current = totals.get(task.projectId) ?? { total: 0, completed: 0 };
    current.total += 1;
    if (task.status === 'done') {
      current.completed += 1;
    }
    totals.set(task.projectId, current);
  });

  return Array.from(totals.entries()).reduce<Record<string, number>>((acc, [projectId, counts]) => {
    acc[projectId] = counts.total > 0
      ? Math.round((counts.completed / counts.total) * 100)
      : 0;
    return acc;
  }, {});
}

export function buildProjectProgressChartData(
  projects: Pick<FrontendProject, 'id' | 'title'>[],
  tasks: Pick<FrontendTask, 'projectId' | 'status'>[],
  maxProjects = 6,
) {
  const progressMap = buildProjectProgressMap(tasks);

  return projects
    .map((project) => ({
      name: project.title.length > 18 ? `${project.title.slice(0, 18)}...` : project.title,
      progress: progressMap[project.id] ?? 0,
    }))
    .sort((a, b) => b.progress - a.progress || a.name.localeCompare(b.name))
    .slice(0, maxProjects);
}

export function buildProjectProgressSummaryData(
  projects: Pick<FrontendProject, 'id' | 'title' | 'deadline'>[],
  tasks: Pick<FrontendTask, 'projectId' | 'status'>[],
  maxProjects = 6,
) {
  return projects
    .map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id);
      const doneTasks = projectTasks.filter((task) => task.status === 'done').length;
      const totalTasks = projectTasks.length;
      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      return {
        id: project.id,
        title: project.title,
        deadline: project.deadline,
        doneTasks,
        totalTasks,
        progress,
      };
    })
    .sort((a, b) => b.progress - a.progress || b.totalTasks - a.totalTasks || a.title.localeCompare(b.title))
    .slice(0, maxProjects);
}

export function buildRecentActivityChartData(
  activities: Pick<FrontendActivity, 'createdAt'>[],
  days = 7,
) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    return {
      key: date.toISOString().slice(0, 10),
      name: formatter.format(date),
      actions: 0,
    };
  });

  const bucketMap = buckets.reduce<Record<string, { name: string; actions: number }>>((acc, bucket) => {
    acc[bucket.key] = { name: bucket.name, actions: bucket.actions };
    return acc;
  }, {});

  activities.forEach((activity) => {
    const activityDate = new Date(activity.createdAt);
    if (Number.isNaN(activityDate.getTime())) return;
    const key = activityDate.toISOString().slice(0, 10);
    if (bucketMap[key]) {
      bucketMap[key].actions += 1;
    }
  });

  return buckets.map((bucket) => ({
    name: bucketMap[bucket.key].name,
    actions: bucketMap[bucket.key].actions,
  }));
}

export function getProjectProgress(
  tasks: Pick<FrontendTask, 'projectId' | 'status'>[],
  projectId?: string,
) {
  if (!projectId) return 0;
  return buildProjectProgressMap(tasks)[projectId] ?? 0;
}

export function useProjects() {
  const [data, setData] = useState<FrontendProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = () => {
    setLoading(true);
    setError(null);
    return api.projects()
      .then((list) => setData(list.map(mapProject)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  return { projects: data, loading, error, refresh: loadProjects };
}

export function useUsers() {
  const [data, setData] = useState<ReturnType<typeof mapUser>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = () => {
    setLoading(true);
    setError(null);
    return api.users()
      .then((list) => setData(list.map(mapUser)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  return { users: data, loading, error, refresh: loadUsers };
}

export function useTeams() {
  const [data, setData] = useState<ApiTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = () => {
    setLoading(true);
    setError(null);
    return api.teams()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void loadTeams();
  }, []);

  return { teams: data, loading, error, refresh: loadTeams };
}

export function useTasks(projectId?: string) {
  const [data, setData] = useState<FrontendTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = () => {
    setLoading(true);
    setError(null);
    const request = projectId ? api.projectTasks(projectId) : api.tasks();

    return request
      .then((list) => {
        setData(list.map((t) => mapTask(t, projectId)));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void loadTasks();
  }, [projectId]);

  return { tasks: data, loading, error, refresh: loadTasks };
}

export function useMilestones(projectId: string) {
  const [data, setData] = useState<{
    id: string;
    projectId: string;
    title: string;
    description: string;
    dueDate: string;
    completed: boolean;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMilestones = () => {
    if (!projectId) {
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    setError(null);
    return api.milestones(projectId)
      .then((list) =>
        setData(
          list.map((m) => ({
            id: String(m.id),
            projectId,
            title: m.name,
            description: m.description || '',
            dueDate: m.dueDate || '',
            completed: m.completed,
          }))
        )
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void loadMilestones();
  }, [projectId]);

  return { milestones: data, loading, error, refresh: loadMilestones };
}

export function useActivities(limit?: number) {
  const [data, setData] = useState<FrontendActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = () => {
    setLoading(true);
    setError(null);
    return api.activities(limit)
      .then((list) => setData(list.map(mapActivity)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void loadActivities();
  }, [limit]);

  return { activities: data, loading, error, refresh: loadActivities };
}
