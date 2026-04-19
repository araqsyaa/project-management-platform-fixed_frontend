import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router';
import { t } from '../i18n/translations';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar, Clock, User, Plus, Pencil, Trash2 } from 'lucide-react';
import { useProjects, useTasks, useMilestones, useUsers } from '../api/useApi';
import { api, ApiTask } from '../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

type StatusKey = 'backlog' | 'in_progress' | 'review' | 'done';

interface FrontendTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId: string;
  status: StatusKey;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
}

function toFrontendTask(t: ApiTask, projectId?: string): FrontendTask {
  const status = (t.status?.toLowerCase() as StatusKey) || 'backlog';
  const priority = (t.priority?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium';
  return {
    id: String(t.id),
    projectId: projectId || (t.project ? String(t.project.id) : ''),
    title: t.title,
    description: t.description || '',
    assigneeId: t.assignee ? String(t.assignee.id) : '',
    status,
    priority,
    dueDate: t.deadline || '',
  };
}

function TaskCard({
  task,
  assigneeName,
  onOpen,
  onEdit,
  onRemove,
}: {
  task: FrontendTask;
  assigneeName: string;
  onOpen: (task: FrontendTask) => void;
  onEdit: (task: FrontendTask) => void;
  onRemove: (taskId: string) => void;
}) {
  return (
    <Card
      className="border-foreground/10 cursor-pointer transition-colors hover:border-foreground/20"
      onClick={() => onOpen(task)}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm flex-1">{task.title}</h4>
          <div className="flex items-center gap-1 shrink-0">
            <Badge className="text-xs capitalize">{task.priority}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              title={t.edit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(task.id);
              }}
              title={t.delete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-foreground/60">
          <Calendar className="h-3 w-3" />
          <span>{task.dueDate || '-'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-foreground/60">
          <User className="h-3 w-3" />
          <span>{assigneeName}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Column({
  title,
  status,
  tasks,
  getAssigneeName,
  onAddTaskClick,
  onTaskOpen,
  onTaskEdit,
  onTaskRemove,
}: {
  title: string;
  status: StatusKey;
  tasks: FrontendTask[];
  getAssigneeName: (assigneeId: string) => string;
  onAddTaskClick: (initialStatus: StatusKey) => void;
  onTaskOpen: (task: FrontendTask) => void;
  onTaskEdit: (task: FrontendTask) => void;
  onTaskRemove: (taskId: string) => void;
}) {
  return (
    <div className="flex-1 min-w-[260px] rounded-lg p-2">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            assigneeName={getAssigneeName(task.assigneeId)}
            onOpen={onTaskOpen}
            onEdit={onTaskEdit}
            onRemove={onTaskRemove}
          />
        ))}
        {tasks.length === 0 && (
          <div
            className="p-4 border-2 border-dashed border-foreground/10 rounded-lg text-center text-sm text-foreground/50 cursor-pointer"
            onClick={() => onAddTaskClick(status)}
          >
            <Plus className="inline-block h-4 w-4 mr-1" />
            {t.addTask}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') === 'milestones' ? 'milestones' : 'kanban';
  const { projects, loading: projectsLoading } = useProjects();
  const { tasks: apiTasks, loading: tasksLoading } = useTasks(projectId || '');
  const { milestones, loading: milestonesLoading } = useMilestones(projectId || '');
  const { users } = useUsers();

  const [tasks, setTasks] = useState<FrontendTask[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FrontendTask | null>(null);
  const [newStatus, setNewStatus] = useState<StatusKey>('backlog');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    if (!projectId) return;
    const mapped = apiTasks.map((t) => toFrontendTask(t as ApiTask, projectId));
    setTasks(mapped);
  }, [apiTasks, projectId]);

  if (!projectId || projectsLoading || tasksLoading || milestonesLoading) {
    return <div className="p-8">Loading...</div>;
  }

  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return <div className="p-8">Project not found</div>;
  }

  const getAssigneeName = (assigneeId: string) =>
    users.find((u) => u.id === assigneeId)?.name || 'Unassigned';

  const columns: { status: StatusKey; title: string }[] = [
    { status: 'backlog', title: t.backlog },
    { status: 'in_progress', title: t.inProgress },
    { status: 'review', title: t.review },
    { status: 'done', title: t.done },
  ];

  const tasksByStatus: Record<StatusKey, FrontendTask[]> = {
    backlog: [],
    in_progress: [],
    review: [],
    done: [],
  };
  tasks.forEach((task) => {
    tasksByStatus[task.status].push(task);
  });

  const handleOpenAdd = () => {
    setEditingTask(null);
    setNewStatus('backlog');
    setNewTitle('');
    setNewDescription('');
    setNewPriority('medium');
    setNewAssigneeId('');
    setNewDueDate('');
    setIsAddOpen(true);
  };

  const handleEditTask = (task: FrontendTask) => {
    setEditingTask(task);
    setNewTitle(task.title);
    setNewDescription(task.description);
    setNewStatus(task.status);
    setNewPriority(task.priority);
    setNewAssigneeId(task.assigneeId);
    setNewDueDate(task.dueDate);
    setIsAddOpen(true);
  };

  const handleSaveTask = async () => {
    if (!projectId || !newTitle.trim()) return;
    if (editingTask) {
      try {
        const updated = await api.updateTask(editingTask.id, {
          projectId,
          title: newTitle,
          description: newDescription,
          status: newStatus.toUpperCase(),
          priority: newPriority.toUpperCase(),
          assigneeId: newAssigneeId || undefined,
          deadline: newDueDate || undefined,
        });
        const frontend = toFrontendTask(updated, projectId);
        setTasks((prev) =>
          prev.map((t) => (t.id === editingTask.id ? frontend : t)),
        );
        setIsAddOpen(false);
        setEditingTask(null);
        toast.success('Task updated', {
          style: { backgroundColor: '#2CB67D', color: '#FFFFFE' },
        });
      } catch (e) {
        console.error(e);
        toast.error('Failed to update task', {
          style: { backgroundColor: '#E45858', color: '#FFFFFE' },
        });
      }
    } else {
      try {
        const res = await api.createTask({
          projectId,
          title: newTitle,
          description: newDescription,
          status: newStatus.toUpperCase(),
          priority: newPriority.toUpperCase(),
          assigneeId: newAssigneeId || undefined,
          deadline: newDueDate || undefined,
        });
        const created = toFrontendTask(res, projectId);
        setTasks((prev) => [...prev, created]);
        setIsAddOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewPriority('medium');
        setNewAssigneeId('');
        setNewDueDate('');
        toast.success('Task created', {
          style: { backgroundColor: '#2CB67D', color: '#FFFFFE' },
        });
      } catch (e) {
        console.error(e);
        toast.error('Failed to create task', {
          style: { backgroundColor: '#E45858', color: '#FFFFFE' },
        });
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Remove this task? This cannot be undone.')) return;
    try {
      await api.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (editingTask?.id === taskId) {
        setIsAddOpen(false);
        setEditingTask(null);
      }
      toast.success('Task removed', {
        style: { backgroundColor: '#2CB67D', color: '#FFFFFE' },
      });
    } catch (e) {
      console.error(e);
      toast.error('Failed to remove task', {
        style: { backgroundColor: '#E45858', color: '#FFFFFE' },
      });
    }
  };

  return (
      <div className="space-y-6">
        {/* Project header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl mb-2">{project.title}</h1>
            {project.client && (
              <p className="text-foreground/60">Client: {project.client}</p>
            )}
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-sm text-foreground/60">{t.progress}</p>
              <p className="text-2xl font-semibold">{project.progress ?? 0}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-foreground/60">{t.deadline}</p>
              <p className="text-lg font-semibold">{project.deadline || '-'}</p>
            </div>
          </div>
        </div>

        {/* Simple progress bar */}
        <div className="w-full h-3 rounded-full bg-secondary">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${project.progress ?? 0}%`,
              backgroundColor: '#6246EA',
            }}
          />
        </div>

        {/* Tabs */}
        <Tabs
          value={tabFromUrl}
          onValueChange={(v) =>
            navigate(`/projects/${projectId}${v === 'milestones' ? '?tab=milestones' : ''}`)
          }
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
            <TabsTrigger value="milestones">{t.milestones}</TabsTrigger>
          </TabsList>

          {/* Kanban */}
          <TabsContent value="kanban" className="mt-6">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={handleOpenAdd}>
                <Plus className="h-4 w-4 mr-2" />
                {t.addTask}
              </Button>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4">
              {columns.map((column) => (
                <Column
                  key={column.status}
                  title={column.title}
                  status={column.status}
                  tasks={tasksByStatus[column.status]}
                  getAssigneeName={getAssigneeName}
                  onAddTaskClick={(status) => {
                    setEditingTask(null);
                    setNewStatus(status);
                    setNewTitle('');
                    setNewDescription('');
                    setNewPriority('medium');
                    setNewAssigneeId('');
                    setNewDueDate('');
                    setIsAddOpen(true);
                  }}
                  onTaskOpen={handleEditTask}
                  onTaskEdit={handleEditTask}
                  onTaskRemove={handleDeleteTask}
                />
              ))}
            </div>
          </TabsContent>

          {/* Milestones */}
          <TabsContent value="milestones" className="mt-6">
            <div className="flex justify-end mb-4">
              <Button size="sm" asChild>
                <Link to={`/projects/${projectId}/milestones/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.addMilestone}
                </Link>
              </Button>
            </div>
            <div className="space-y-4">
              {milestones.map((milestone) => (
                <Link
                  key={milestone.id}
                  to={`/projects/${projectId}/milestones/${milestone.id}`}
                  className="block"
                >
                  <Card className="border-foreground/10 hover:border-foreground/20 transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {milestone.completed ? (
                            <span className="inline-block h-6 w-6 rounded-full bg-emerald-500" />
                          ) : (
                            <Clock className="h-6 w-6" style={{ color: '#6246EA' }} />
                          )}
                          <div>
                            <h4 className="font-semibold">{milestone.title}</h4>
                            <p className="text-sm text-foreground/60">
                              Due: {milestone.dueDate || '-'}
                            </p>
                          </div>
                        </div>
                        <Badge
                          style={{
                            backgroundColor: milestone.completed ? '#2CB67D20' : '#6246EA20',
                            color: milestone.completed ? '#2CB67D' : '#6246EA',
                          }}
                        >
                          {milestone.completed ? 'Completed' : 'In Progress'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {milestones.length === 0 && (
                <div className="text-center py-12 text-foreground/50">
                  No milestones to display
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Add / Edit Task Modal */}
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditingTask(null);
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? t.edit : t.addTask}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Title</Label>
                <Input
                  id="task-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="border border-foreground/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-desc">{t.description}</Label>
                <Textarea
                  id="task-desc"
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="border border-foreground/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.status}</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as StatusKey)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backlog">{t.backlog}</SelectItem>
                      <SelectItem value="in_progress">{t.inProgress}</SelectItem>
                      <SelectItem value="review">{t.review}</SelectItem>
                      <SelectItem value="done">{t.done}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.priority}</Label>
                  <Select
                    value={newPriority}
                    onValueChange={(v) =>
                      setNewPriority(v as 'high' | 'medium' | 'low')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{t.high}</SelectItem>
                      <SelectItem value="medium">{t.medium}</SelectItem>
                      <SelectItem value="low">{t.low}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.assignTo}</Label>
                  <Select
                    value={newAssigneeId}
                    onValueChange={(v) => setNewAssigneeId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.dueDate}</Label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingTask(null);
                  }}
                >
                  {t.cancel}
                </Button>
                <Button onClick={handleSaveTask}>
                  {editingTask ? t.edit : t.create}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
}
