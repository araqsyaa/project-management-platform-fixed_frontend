export type Role = 'administrator' | 'project_manager' | 'team_member' | 'viewer';
export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Team {
  id: string;
  name: string;
  department: string;
}

export interface TeamMember {
  userId: string;
  teamId: string;
}

export interface Project {
  id: string;
  title: string;
  teamId: string;
  progress: number;
  deadline: string;
  status: 'active' | 'completed' | 'on-hold';
  client?: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface WorkLog {
  id: string;
  taskId: string;
  userId: string;
  hours: number;
  date: string;
  description: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'task' | 'comment' | 'milestone' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// Mock data
export const users: User[] = [
  { id: '1', name: 'Anna Petrosyan', email: 'anna@example.com', role: 'administrator' },
  { id: '2', name: 'Armen Grigoryan', email: 'armen@example.com', role: 'project_manager' },
  { id: '3', name: 'Maria Sargsyan', email: 'maria@example.com', role: 'team_member' },
  { id: '4', name: 'Davit Hakobyan', email: 'davit@example.com', role: 'team_member' },
  { id: '5', name: 'Lusine Avetisyan', email: 'lusine@example.com', role: 'viewer' },
];

export const teams: Team[] = [
  { id: '1', name: 'Development Team', department: 'Engineering' },
  { id: '2', name: 'Design Team', department: 'Creative' },
  { id: '3', name: 'Marketing Team', department: 'Marketing' },
];

export const teamMembers: TeamMember[] = [
  { userId: '2', teamId: '1' },
  { userId: '3', teamId: '1' },
  { userId: '4', teamId: '1' },
  { userId: '3', teamId: '2' },
];

export const projects: Project[] = [
  {
    id: '1',
    title: 'E-Commerce Platform',
    teamId: '1',
    progress: 65,
    deadline: '2026-05-15',
    status: 'active',
    client: 'Tech Solutions Inc.',
  },
  {
    id: '2',
    title: 'Mobile App Redesign',
    teamId: '2',
    progress: 40,
    deadline: '2026-04-20',
    status: 'active',
    client: 'StartUp Co.',
  },
  {
    id: '3',
    title: 'Marketing Campaign',
    teamId: '3',
    progress: 85,
    deadline: '2026-03-25',
    status: 'active',
    client: 'Retail Chain',
  },
  {
    id: '4',
    title: 'Data Migration',
    teamId: '1',
    progress: 100,
    deadline: '2026-02-28',
    status: 'completed',
    client: 'Enterprise Corp.',
  },
];

export const milestones: Milestone[] = [
  {
    id: '1',
    projectId: '1',
    title: 'Backend API Complete',
    dueDate: '2026-03-20',
    completed: true,
  },
  {
    id: '2',
    projectId: '1',
    title: 'Frontend Development',
    dueDate: '2026-04-15',
    completed: false,
  },
  {
    id: '3',
    projectId: '1',
    title: 'Testing & QA',
    dueDate: '2026-05-10',
    completed: false,
  },
  {
    id: '4',
    projectId: '2',
    title: 'Design Mockups',
    dueDate: '2026-03-30',
    completed: true,
  },
];

export const tasks: Task[] = [
  {
    id: '1',
    projectId: '1',
    title: 'Implement user authentication',
    description: 'Set up JWT-based authentication system with refresh tokens',
    assigneeId: '3',
    status: 'done',
    priority: 'high',
    dueDate: '2026-03-15',
  },
  {
    id: '2',
    projectId: '1',
    title: 'Design database schema',
    description: 'Create normalized database schema for the application',
    assigneeId: '4',
    status: 'done',
    priority: 'high',
    dueDate: '2026-03-10',
  },
  {
    id: '3',
    projectId: '1',
    title: 'Build product catalog',
    description: 'Implement product listing with filters and search',
    assigneeId: '3',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-03-25',
  },
  {
    id: '4',
    projectId: '1',
    title: 'Shopping cart functionality',
    description: 'Add items to cart, update quantities, checkout flow',
    assigneeId: '4',
    status: 'in_progress',
    priority: 'medium',
    dueDate: '2026-04-01',
  },
  {
    id: '5',
    projectId: '1',
    title: 'Payment gateway integration',
    description: 'Integrate Stripe for payment processing',
    assigneeId: '3',
    status: 'review',
    priority: 'high',
    dueDate: '2026-04-10',
  },
  {
    id: '6',
    projectId: '1',
    title: 'Email notification system',
    description: 'Send order confirmations and shipping updates',
    assigneeId: '4',
    status: 'backlog',
    priority: 'medium',
    dueDate: '2026-04-20',
  },
  {
    id: '7',
    projectId: '2',
    title: 'User research',
    description: 'Conduct interviews with current app users',
    assigneeId: '3',
    status: 'done',
    priority: 'high',
    dueDate: '2026-03-05',
  },
  {
    id: '8',
    projectId: '2',
    title: 'Wireframes',
    description: 'Create low-fidelity wireframes for all screens',
    assigneeId: '3',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-03-18',
  },
];

export const comments: Comment[] = [
  {
    id: '1',
    taskId: '3',
    userId: '2',
    content: 'Please make sure to add pagination to the product list',
    createdAt: '2026-03-12T10:30:00Z',
  },
  {
    id: '2',
    taskId: '3',
    userId: '3',
    content: 'Will do, working on it now',
    createdAt: '2026-03-12T11:15:00Z',
  },
  {
    id: '3',
    taskId: '5',
    userId: '2',
    content: 'Has this been tested in the sandbox environment?',
    createdAt: '2026-03-12T14:00:00Z',
  },
];

export const attachments: Attachment[] = [
  {
    id: '1',
    taskId: '1',
    fileName: 'auth-flow-diagram.pdf',
    fileUrl: '#',
    uploadedBy: '3',
    uploadedAt: '2026-03-10T09:00:00Z',
  },
  {
    id: '2',
    taskId: '7',
    fileName: 'user-research-findings.docx',
    fileUrl: '#',
    uploadedBy: '3',
    uploadedAt: '2026-03-06T16:30:00Z',
  },
];

export const workLogs: WorkLog[] = [
  {
    id: '1',
    taskId: '3',
    userId: '3',
    hours: 4,
    date: '2026-03-12',
    description: 'Implemented product filtering',
  },
  {
    id: '2',
    taskId: '4',
    userId: '4',
    hours: 6,
    date: '2026-03-12',
    description: 'Cart state management',
  },
];

export const notifications: Notification[] = [
  {
    id: '1',
    userId: '1',
    type: 'task',
    title: 'New task assigned',
    message: 'You have been assigned to "Shopping cart functionality"',
    read: false,
    createdAt: '2026-03-12T09:00:00Z',
  },
  {
    id: '2',
    userId: '1',
    type: 'comment',
    title: 'New comment',
    message: 'Armen commented on "Build product catalog"',
    read: false,
    createdAt: '2026-03-12T10:30:00Z',
  },
  {
    id: '3',
    userId: '1',
    type: 'success',
    title: 'Milestone completed',
    message: 'Backend API Complete milestone has been marked as done',
    read: true,
    createdAt: '2026-03-11T15:00:00Z',
  },
  {
    id: '4',
    userId: '1',
    type: 'milestone',
    title: 'Upcoming deadline',
    message: 'Frontend Development milestone is due in 3 days',
    read: false,
    createdAt: '2026-03-12T08:00:00Z',
  },
];

export const activityFeed = [
  {
    id: '1',
    user: 'Maria Sargsyan',
    action: 'completed task',
    target: 'Implement user authentication',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    user: 'Armen Grigoryan',
    action: 'commented on',
    target: 'Build product catalog',
    timestamp: '4 hours ago',
  },
  {
    id: '3',
    user: 'Davit Hakobyan',
    action: 'moved task to Review',
    target: 'Payment gateway integration',
    timestamp: '6 hours ago',
  },
  {
    id: '4',
    user: 'Anna Petrosyan',
    action: 'created milestone',
    target: 'Testing & QA',
    timestamp: '1 day ago',
  },
];
