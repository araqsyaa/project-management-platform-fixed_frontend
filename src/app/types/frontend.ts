export type Role = 'administrator' | 'project_manager' | 'team_member' | 'viewer';

export interface FrontendUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface FrontendNotification {
  id: string;
  userId: string;
  type: 'task' | 'comment' | 'milestone' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
