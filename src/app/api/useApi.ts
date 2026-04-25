import { useState, useEffect } from 'react';
import { api, ApiProject, ApiTask, ApiUser, ApiTeam } from './client';

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

export function useProjects() {
  const [data, setData] = useState<ReturnType<typeof mapProject>[]>([]);
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
  const [data, setData] = useState<ReturnType<typeof mapTask>[]>([]);
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
