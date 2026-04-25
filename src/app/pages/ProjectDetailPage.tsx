import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link, useLocation } from 'react-router';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { t } from '../i18n/translations';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar, Clock, MessageSquare, Send, User, Plus, Pencil, Trash2 } from 'lucide-react';
import { getProjectProgress, useProjects, useTasks, useMilestones, useUsers } from '../api/useApi';
import { api, ApiComment, ApiTask, getStoredUser } from '../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

type StatusKey = 'backlog' | 'in_progress' | 'review' | 'done';
const TASK_CARD_TYPE = 'task-card';

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

interface FrontendComment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  userName: string;
}

interface FrontendMilestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
}

interface DraggedTaskItem {
  id: string;
  status: StatusKey;
  type: typeof TASK_CARD_TYPE;
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
  isUpdating,
}: {
  task: FrontendTask;
  assigneeName: string;
  onOpen: (task: FrontendTask) => void;
  onEdit: (task: FrontendTask) => void;
  onRemove: (taskId: string) => void;
  isUpdating: boolean;
}) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: TASK_CARD_TYPE,
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [task.id, task.status]);

  return (
    <div
      ref={dragRef}
    >
      <Card
        className={`border-foreground/10 cursor-pointer transition-all hover:border-foreground/20 ${
          isDragging ? 'opacity-40 scale-[0.98]' : ''
        } ${isUpdating ? 'pointer-events-none opacity-60' : ''}`}
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
    </div>
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
  onTaskDrop,
  updatingTaskId,
}: {
  title: string;
  status: StatusKey;
  tasks: FrontendTask[];
  getAssigneeName: (assigneeId: string) => string;
  onAddTaskClick: (initialStatus: StatusKey) => void;
  onTaskOpen: (task: FrontendTask) => void;
  onTaskEdit: (task: FrontendTask) => void;
  onTaskRemove: (taskId: string) => void;
  onTaskDrop: (taskId: string, nextStatus: StatusKey) => void;
  updatingTaskId: string | null;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
    accept: TASK_CARD_TYPE,
    drop: (item: DraggedTaskItem) => {
      if (item.status !== status) {
        onTaskDrop(item.id, status);
      }
    },
    canDrop: (item: DraggedTaskItem) => item.status !== status,
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }), [onTaskDrop, status]);

  return (
    <div
      ref={dropRef}
      className={`flex-1 min-w-[260px] rounded-lg p-2 transition-colors ${
        isOver && canDrop ? 'bg-[#6246EA]/10 ring-1 ring-[#6246EA]/30' : ''
      }`}
    >
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
            isUpdating={updatingTaskId === task.id}
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') === 'milestones' ? 'milestones' : 'kanban';
  const { projects, loading: projectsLoading } = useProjects();
  const { tasks: apiTasks, loading: tasksLoading, refresh: refreshTasks } = useTasks(projectId || '');
  const { milestones, loading: milestonesLoading, refresh: refreshMilestones } = useMilestones(projectId || '');
  const { users } = useUsers();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<FrontendTask[]>([]);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [milestoneItems, setMilestoneItems] = useState<FrontendMilestone[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FrontendTask | null>(null);
  const [newStatus, setNewStatus] = useState<StatusKey>('backlog');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [comments, setComments] = useState<FrontendComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const storedUser = getStoredUser();
  const currentUserId = user?.id || (storedUser ? String(storedUser.id) : '');

  useEffect(() => {
    if (!projectId) return;
    setTasks(apiTasks as FrontendTask[]);
  }, [apiTasks, projectId]);

  useEffect(() => {
    setMilestoneItems(milestones);
  }, [milestones]);

  useEffect(() => {
    const savedMilestone = (location.state as { savedMilestone?: FrontendMilestone } | null)?.savedMilestone;
    const deletedMilestoneId = (location.state as { deletedMilestoneId?: string } | null)?.deletedMilestoneId;

    if (!savedMilestone && !deletedMilestoneId) return;

    if (savedMilestone) {
      setMilestoneItems((prev) => {
        const withoutCurrent = prev.filter((milestone) => milestone.id !== savedMilestone.id);
        return [savedMilestone, ...withoutCurrent];
      });
    }

    if (deletedMilestoneId) {
      setMilestoneItems((prev) => prev.filter((milestone) => milestone.id !== deletedMilestoneId));
    }

    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

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

  useEffect(() => {
    if (!isAddOpen || !editingTask) {
      setComments([]);
      setNewComment('');
      return;
    }

    setCommentsLoading(true);
    api.taskComments(editingTask.id)
      .then((items) =>
        setComments(
          items.map((comment: ApiComment) => ({
            id: String(comment.id),
            content: comment.content,
            createdAt: comment.createdAt,
            userId: comment.user ? String(comment.user.id) : '',
            userName: comment.user?.name || 'Unknown user',
          })),
        ),
      )
      .catch((e) => {
        console.error(e);
        toast.error('Failed to load comments', {
          style: { backgroundColor: '#E45858', color: '#FFFFFE' },
        });
      })
      .finally(() => setCommentsLoading(false));
  }, [editingTask, isAddOpen]);

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
  const projectProgress = getProjectProgress(tasks, projectId);

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
        await refreshTasks();
        await refreshMilestones();
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
        await refreshTasks();
        await refreshMilestones();
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

  const handleMoveTask = async (taskId: string, nextStatus: StatusKey) => {
    if (!projectId) return;

    const taskToMove = tasks.find((task) => task.id === taskId);
    if (!taskToMove || taskToMove.status === nextStatus) {
      return;
    }

    const previousTasks = tasks;
    const optimisticTask = { ...taskToMove, status: nextStatus };

    setUpdatingTaskId(taskId);
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? optimisticTask : task)),
    );

    try {
      const updated = await api.updateTask(taskId, {
        projectId,
        title: taskToMove.title,
        description: taskToMove.description,
        status: nextStatus.toUpperCase(),
        priority: taskToMove.priority.toUpperCase(),
        assigneeId: taskToMove.assigneeId || undefined,
        deadline: taskToMove.dueDate || undefined,
      });

      const frontendTask = toFrontendTask(updated, projectId);
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? frontendTask : task)),
      );
      await refreshTasks();
      await refreshMilestones();
      toast.success(`Task moved to ${nextStatus.replace('_', ' ')}`, {
        style: { backgroundColor: '#2CB67D', color: '#FFFFFE' },
      });
    } catch (e) {
      console.error(e);
      setTasks(previousTasks);
      toast.error('Failed to move task', {
        style: { backgroundColor: '#E45858', color: '#FFFFFE' },
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Remove this task? This cannot be undone.')) return;
    try {
      await api.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      await refreshTasks();
      await refreshMilestones();
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

  const handleAddComment = async () => {
    if (!editingTask || !newComment.trim()) return;

    try {
      const created = await api.addComment(editingTask.id, newComment.trim());
      setComments((prev) => [
        ...prev,
        {
          id: String(created.id),
          content: created.content,
          createdAt: created.createdAt,
          userId: created.user ? String(created.user.id) : currentUserId,
          userName: created.user?.name || user?.name || storedUser?.name || 'You',
        },
      ]);
      setNewComment('');
      toast.success('Comment added', {
        style: { backgroundColor: '#2CB67D', color: '#FFFFFE' },
      });
    } catch (e) {
      console.error(e);
      toast.error('Failed to add comment', {
        style: { backgroundColor: '#E45858', color: '#FFFFFE' },
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!editingTask) return;

    try {
      await api.deleteComment(editingTask.id, commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      toast.success('Comment deleted', {
        style: { backgroundColor: '#2CB67D', color: '#FFFFFE' },
      });
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete comment', {
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
              <p className="text-2xl font-semibold">{projectProgress}%</p>
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
              width: `${projectProgress}%`,
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
            <DndProvider backend={HTML5Backend}>
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
                    onTaskDrop={handleMoveTask}
                    updatingTaskId={updatingTaskId}
                  />
                ))}
              </div>
            </DndProvider>
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
              {milestoneItems.map((milestone) => (
                <Link
                  key={milestone.id}
                  to={`/projects/${projectId}/milestones/${milestone.id}`}
                  className="block"
                >
                  <Card className="border-foreground/10 hover:border-foreground/20 transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {milestone.completed ? (
                            <span className="mt-1 inline-block h-6 w-6 rounded-full bg-emerald-500" />
                          ) : (
                            <Clock className="mt-1 h-6 w-6 shrink-0" style={{ color: '#6246EA' }} />
                          )}
                          <div className="space-y-1">
                            <h4 className="font-semibold">{milestone.title}</h4>
                            <p className="text-sm text-foreground/70">
                              {milestone.description || 'No description provided'}
                            </p>
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
              {milestoneItems.length === 0 && (
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
          <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? t.edit : t.addTask}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto pr-2 max-h-[calc(85vh-5rem)]">
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
              {editingTask && (
                <div className="border-t border-foreground/10 pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <h3 className="font-semibold">Comments</h3>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {commentsLoading ? (
                      <p className="text-sm text-foreground/60">Loading comments...</p>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-foreground/60">No comments yet. Start the discussion below.</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="rounded-lg border border-foreground/10 p-3 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{comment.userName}</p>
                              <p className="text-xs text-foreground/50">
                                {new Date(comment.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {comment.userId === currentUserId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="task-comment">Add comment</Label>
                    <Textarea
                      id="task-comment"
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment for the team"
                      className="border border-foreground/20"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Post comment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
}
