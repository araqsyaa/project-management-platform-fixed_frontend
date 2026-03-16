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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
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
  dueDate?: string;
  completed: boolean;
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
