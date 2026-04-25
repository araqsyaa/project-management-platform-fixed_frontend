const API_URL = 'http://localhost:8080/api';

const TOKEN_KEY = 'pm_token';
const USER_KEY = 'pm_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function storeUser(user: object) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): { id: number; name: string; email: string; role: string } | null {
  const s = localStorage.getItem(USER_KEY);
  return s ? JSON.parse(s) : null;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function notifyAuthExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pm-auth-expired'));
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const method = options?.method ?? 'GET';
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: options?.cache ?? (method === 'GET' ? 'no-store' : undefined),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      clearToken();
      notifyAuthExpired();
    }
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: ApiUser; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string, role?: string) =>
      request<{ user: ApiUser; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(
          role ? { name, email, password, role } : { name, email, password },
        ),
      }),
  },
  users: () => request<ApiUser[]>('/users'),
  teams: () => request<ApiTeam[]>('/teams'),
  projects: () => request<ApiProject[]>('/projects'),
  project: (id: string) => request<ApiProject>(`/projects/${id}`),
  createProject: (payload: { name: string; description?: string; teamId?: string; startDate?: string; endDate?: string }) =>
    request<ApiProject>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        description: payload.description ?? '',
        startDate: payload.startDate ?? null,
        endDate: payload.endDate ?? null,
        team: payload.teamId ? { id: Number(payload.teamId) } : undefined,
      }),
    }),
  tasks: () => request<ApiTask[]>('/tasks'),
  projectTasks: (projectId: string) => request<ApiTask[]>(`/projects/${projectId}/tasks`),
  milestones: (projectId: string) => request<ApiMilestone[]>(`/projects/${projectId}/milestones`),
  milestone: (id: string) => request<ApiMilestone>(`/milestones/${id}`),
  createMilestone: (projectId: string, payload: {
    name: string;
    description?: string;
    dueDate?: string;
    taskIds?: string[];
  }) =>
    request<ApiMilestone>(`/projects/${projectId}/milestones`, {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        description: payload.description ?? null,
        dueDate: payload.dueDate || null,
        taskIds: (payload.taskIds ?? []).map((id) => Number(id)),
      }),
    }),
  updateMilestone: (projectId: string, milestoneId: string, payload: {
    name: string;
    description?: string;
    dueDate?: string;
    taskIds?: string[];
  }) =>
    request<ApiMilestone>(`/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: payload.name,
        description: payload.description ?? null,
        dueDate: payload.dueDate || null,
        taskIds: (payload.taskIds ?? []).map((id) => Number(id)),
      }),
    }),
  deleteMilestone: (projectId: string, milestoneId: string) =>
    request<void>(`/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'DELETE',
    }),
  taskComments: (taskId: string) => request<ApiComment[]>(`/tasks/${taskId}/comments`),
  addComment: (taskId: string, content: string) =>
    request<ApiComment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  deleteComment: (taskId: string, commentId: string) =>
    request<void>(`/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    }),
  createTask: (payload: {
    projectId: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    assigneeId?: string;
    deadline?: string;
  }) =>
    request<ApiTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        description: payload.description ?? '',
        status: payload.status,
        priority: payload.priority,
        deadline: payload.deadline ?? null,
        project: { id: Number(payload.projectId) },
        assignee: payload.assigneeId ? { id: Number(payload.assigneeId) } : null,
      }),
    }),
  updateTask: (id: string, payload: {
    projectId: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    assigneeId?: string;
    deadline?: string;
  }) =>
    request<ApiTask>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: Number(id),
        title: payload.title,
        description: payload.description ?? '',
        status: payload.status,
        priority: payload.priority,
        deadline: payload.deadline ?? null,
        project: { id: Number(payload.projectId) },
        assignee: payload.assigneeId ? { id: Number(payload.assigneeId) } : null,
      }),
    }),
  deleteTask: (id: string) =>
    request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};

// API response types (backend format)
export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface ApiTeam {
  id: number;
  name: string;
  department?: string;
}

export interface ApiProject {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  team?: ApiTeam;
}

export interface ApiTask {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  deadline?: string;
  assignee?: ApiUser;
  milestone?: ApiMilestone;
  project?: { id: number };
}

export interface ApiMilestone {
  id: number;
  name: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
}

export interface ApiComment {
  id: number;
  content: string;
  createdAt: string;
  user?: { id: number; name: string; email?: string; avatar?: string } | null;
}

// Map backend role to frontend format
export function toFrontendRole(role: string): string {
  const map: Record<string, string> = {
    ADMIN: 'administrator',
    PROJECT_MANAGER: 'project_manager',
    TEAM_MEMBER: 'team_member',
    VIEWER: 'viewer',
    QA: 'team_member',
    DEVELOPER: 'team_member',
  };
  return map[role] || role.toLowerCase();
}
