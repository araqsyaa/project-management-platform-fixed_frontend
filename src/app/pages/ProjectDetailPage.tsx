import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { t } from '../i18n/translations';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Calendar, Clock, User, Plus, CheckCircle2, Edit } from 'lucide-react';
import { projects, tasks, milestones, users, Task, TaskStatus, Comment } from '../data/mockData';
import { toast } from 'sonner';

const TASK_TYPE = 'TASK';

interface DragItem {
  id: string;
  status: TaskStatus;
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: TASK_TYPE,
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const assignee = users.find(u => u.id === task.assigneeId);
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#E45858';
      case 'medium': return '#6246EA';
      case 'low': return '#2CB67D';
      default: return '#2B2C34';
    }
  };

  return (
    <div
      ref={drag}
      onClick={onClick}
      className="p-4 rounded-lg border border-foreground/10 bg-background cursor-pointer hover:shadow-md transition-shadow"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm flex-1">{task.title}</h4>
          <div className="flex items-center gap-2">
            <Badge 
              className="text-xs"
              style={{ 
                backgroundColor: getPriorityColor(task.priority) + '20',
                color: getPriorityColor(task.priority)
              }}
            >
              {t[task.priority as keyof typeof t] || task.priority}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              title={t.edit}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-foreground/60">
          <Calendar className="h-3 w-3" />
          <span>{task.dueDate}</span>
        </div>

        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-foreground/60" />
          <span className="text-xs text-foreground/60">{assignee?.name}</span>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ 
  status, 
  title, 
  tasks, 
  onDrop,
  onTaskClick,
  onAddTask
}: { 
  status: TaskStatus; 
  title: string; 
  tasks: Task[];
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}) {
  const [{ isOver }, drop] = useDrop<DragItem, unknown, { isOver: boolean }>({
    accept: TASK_TYPE,
    drop: (item) => {
      if (item.status !== status) {
        onDrop(item.id, status);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'backlog': return '#2B2C34';
      case 'in_progress': return '#6246EA';
      case 'review': return '#E45858';
      case 'done': return '#2CB67D';
      default: return '#2B2C34';
    }
  };

  return (
    <div
      ref={drop}
      className="flex-1 min-w-[280px]"
      style={{
        backgroundColor: isOver ? '#D1D1E9' : 'transparent',
        transition: 'background-color 0.2s'
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getStatusColor(status) }}
          />
          <h3 className="font-semibold">{title}</h3>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-7 w-7"
          onClick={() => onAddTask(status)}
          title={t.addTask}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onClick={() => onTaskClick(task)}
          />
        ))}
        {tasks.length === 0 && (
          <div 
            className="p-8 border-2 border-dashed border-foreground/10 rounded-lg text-center cursor-pointer hover:border-foreground/20 transition-colors"
            onClick={() => onAddTask(status)}
          >
            <p className="text-sm text-foreground/50">{t.addTask}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [projectTasks, setProjectTasks] = useState(tasks.filter(t => t.projectId === projectId));
  const [taskComments, setTaskComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('backlog');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editStatus, setEditStatus] = useState<TaskStatus>('backlog');
  const [editDueDate, setEditDueDate] = useState('');

  const project = projects.find(p => p.id === projectId);
  const projectMilestones = milestones.filter(m => m.projectId === projectId);

  if (!project) {
    return <div>Project not found</div>;
  }

  const handleTaskDrop = (taskId: string, newStatus: TaskStatus) => {
    setProjectTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
    toast.success(t.taskUpdated, {
      style: { backgroundColor: '#2CB67D', color: '#FFFFFE' }
    });
  };

  useEffect(() => {
    if (!selectedTask) return;

    setEditTitle(selectedTask.title);
    setEditDescription(selectedTask.description);
    setEditPriority(selectedTask.priority);
    setEditAssigneeId(selectedTask.assigneeId);
    setEditStatus(selectedTask.status);
    setEditDueDate(selectedTask.dueDate);
    setNewComment('');
  }, [selectedTask]);

  const handleSaveTaskEdits = () => {
    if (!selectedTask) return;

    setProjectTasks(prev =>
      prev.map(task =>
        task.id === selectedTask.id
          ? {
              ...task,
              title: editTitle,
              description: editDescription,
              priority: editPriority,
              assigneeId: editAssigneeId,
              status: editStatus,
              dueDate: editDueDate,
            }
          : task
      )
    );

    if (newComment.trim()) {
      const comment: Comment = {
        id: `comment-${Date.now()}`,
        taskId: selectedTask.id,
        userId: users[0].id,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
      };

      setTaskComments(prev => ({
        ...prev,
        [selectedTask.id]: [...(prev[selectedTask.id] || []), comment],
      }));
    }

    toast.success('Task updated visually', {
      style: { backgroundColor: '#2CB67D', color: '#FFFFFE' }
    });

    setSelectedTask(null);
    setNewComment('');
  };

  const handleAddTask = (status: TaskStatus) => {
    setNewTaskStatus(status);
    setIsAddTaskDialogOpen(true);
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) {
      toast.error('Task title is required', {
        style: { backgroundColor: '#E45858', color: '#FFFFFE' }
      });
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      description: newTaskDescription,
      status: newTaskStatus,
      priority: newTaskPriority as 'high' | 'medium' | 'low',
      assigneeId: newTaskAssignee || users[0].id,
      projectId: projectId || '',
      dueDate: newTaskDueDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    setProjectTasks(prev => [...prev, newTask]);
    setIsAddTaskDialogOpen(false);
    
    // Reset form
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority('medium');
    setNewTaskAssignee('');
    setNewTaskDueDate('');

    toast.success('Task created successfully', {
      style: { backgroundColor: '#2CB67D', color: '#FFFFFE' }
    });
  };

  const columns: { status: TaskStatus; title: string }[] = [
    { status: 'backlog', title: t.backlog },
    { status: 'in_progress', title: t.inProgress },
    { status: 'review', title: t.review },
    { status: 'done', title: t.done },
  ];

  // Calculate date-based positioning for Gantt chart
  const getGanttPositioning = () => {
    if (projectMilestones.length === 0) return [];

    // Parse dates and find min/max
    const dates = projectMilestones.map(m => new Date(m.dueDate));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const totalDays = Math.max(1, (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    return projectMilestones.map((milestone, index) => {
      const milestoneDate = new Date(milestone.dueDate);
      const daysFromStart = (milestoneDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
      const leftPercent = (daysFromStart / totalDays) * 80; // 80% of available space
      
      // Each milestone spans about 2 weeks (or 15% of the timeline)
      const widthPercent = Math.min(15, (14 / totalDays) * 80);

      return {
        milestone,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`
      };
    });
  };

  const ganttData = getGanttPositioning();

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Project Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl mb-2">{project.title}</h1>
            <p className="text-foreground/60">Client: {project.client}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-sm text-foreground/60">{t.progress}</p>
              <p className="text-2xl font-semibold">{project.progress}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-foreground/60">{t.deadline}</p>
              <p className="text-lg font-semibold">{project.deadline}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 rounded-full bg-secondary">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${project.progress}%`,
              backgroundColor: '#6246EA'
            }}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="kanban" className="w-full">
          <TabsList>
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
            <TabsTrigger value="milestones">{t.milestones}</TabsTrigger>
            <TabsTrigger value="gantt">{t.ganttChart}</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-6">
            <div className="flex gap-6 overflow-x-auto pb-4">
              {columns.map(column => (
                <KanbanColumn
                  key={column.status}
                  status={column.status}
                  title={column.title}
                  tasks={projectTasks.filter(t => t.status === column.status)}
                  onDrop={handleTaskDrop}
                  onTaskClick={setSelectedTask}
                  onAddTask={handleAddTask}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="milestones" className="mt-6">
            <div className="space-y-4">
              {projectMilestones.map((milestone) => (
                <Card key={milestone.id} className="border-foreground/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {milestone.completed ? (
                          <CheckCircle2 className="h-6 w-6" style={{ color: '#2CB67D' }} />
                        ) : (
                          <Clock className="h-6 w-6" style={{ color: '#6246EA' }} />
                        )}
                        <div>
                          <h4 className="font-semibold">{milestone.title}</h4>
                          <p className="text-sm text-foreground/60">Due: {milestone.dueDate}</p>
                        </div>
                      </div>
                      <Badge
                        style={{
                          backgroundColor: milestone.completed ? '#2CB67D20' : '#6246EA20',
                          color: milestone.completed ? '#2CB67D' : '#6246EA'
                        }}
                      >
                        {milestone.completed ? 'Completed' : 'In Progress'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="gantt" className="mt-6">
            <Card className="border-foreground/10">
              <CardHeader>
                <CardTitle>{t.timeline}</CardTitle>
                <p className="text-sm text-foreground/60">
                  Visual representation of project milestones based on their due dates
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {ganttData.map(({ milestone, left, width }) => (
                    <div key={milestone.id} className="flex items-center gap-4">
                      <div className="w-48 text-sm font-medium">{milestone.title}</div>
                      <div className="flex-1 h-12 relative bg-secondary/20 rounded">
                        <div 
                          className="absolute h-full rounded flex items-center px-3 text-xs font-medium text-white transition-all hover:opacity-90"
                          style={{
                            left,
                            width,
                            backgroundColor: milestone.completed ? '#2CB67D' : '#6246EA'
                          }}
                          title={`Due: ${milestone.dueDate}`}
                        >
                          {milestone.completed && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          <span className="truncate">{milestone.title}</span>
                        </div>
                      </div>
                      <div className="w-28 text-sm text-foreground/60">{milestone.dueDate}</div>
                    </div>
                  ))}
                  {projectMilestones.length === 0 && (
                    <div className="text-center py-12 text-foreground/50">
                      No milestones to display
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Task Edit Modal */}
        {selectedTask && (
          <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t.taskDetails}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-task-title">{t.projectTitle}</Label>
                  <Input
                    id="edit-task-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="border-foreground/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-task-description">{t.description}</Label>
                  <Textarea
                    id="edit-task-description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="border-foreground/20"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-status">{t.status}</Label>
                    <Select value={editStatus} onValueChange={(val) => setEditStatus(val as TaskStatus)}>
                      <SelectTrigger className="border-foreground/20">
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
                    <Label htmlFor="edit-task-priority">{t.priority}</Label>
                    <Select value={editPriority} onValueChange={(val) => setEditPriority(val as 'high' | 'medium' | 'low')}>
                      <SelectTrigger className="border-foreground/20">
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
                    <Label htmlFor="edit-task-assignee">{t.assignTo}</Label>
                    <Select value={editAssigneeId} onValueChange={setEditAssigneeId}>
                      <SelectTrigger className="border-foreground/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-due-date">{t.dueDate}</Label>
                    <Input
                      id="edit-task-due-date"
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="border-foreground/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-base">{t.comments}</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-foreground/10 rounded-md p-2 bg-background">
                    {(taskComments[selectedTask.id] || []).length === 0 ? (
                      <p className="text-xs text-foreground/60">No comments yet</p>
                    ) : (
                      (taskComments[selectedTask.id] || []).map((comment) => {
                        const author = users.find((u) => u.id === comment.userId);
                        return (
                          <div key={comment.id} className="rounded-md bg-foreground/5 p-2">
                            <p className="text-xs text-foreground/80">{author?.name || 'Unknown'}</p>
                            <p className="text-sm text-foreground">{comment.content}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={t.addComment}
                    rows={3}
                    className="border-foreground/20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setSelectedTask(null)}>
                    {t.cancel}
                  </Button>
                  <Button onClick={handleSaveTaskEdits}>{t.saveChanges}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Task Modal */}
        <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.addTask}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Task Title *</Label>
                <Input
                  id="task-title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                  className="border-foreground/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">{t.description}</Label>
                <Textarea
                  id="task-description"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Enter task description"
                  className="border-foreground/20"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-status">{t.status}</Label>
                  <Select value={newTaskStatus} onValueChange={(val) => setNewTaskStatus(val as TaskStatus)}>
                    <SelectTrigger className="border-foreground/20">
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
                  <Label htmlFor="task-priority">{t.priority}</Label>
                  <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                    <SelectTrigger className="border-foreground/20">
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
                  <Label htmlFor="task-assignee">{t.assignTo}</Label>
                  <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                    <SelectTrigger className="border-foreground/20">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-duedate">{t.dueDate}</Label>
                  <Input
                    id="task-duedate"
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="border-foreground/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddTaskDialogOpen(false)}
                  className="border-foreground/20"
                >
                  {t.cancel}
                </Button>
                <Button onClick={handleCreateTask}>{t.create}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}
