import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { t } from '../i18n/translations';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar, Clock, User } from 'lucide-react';
import { useProjects, useTasks, useMilestones, useUsers } from '../api/useApi';

type StatusKey = 'backlog' | 'in_progress' | 'review' | 'done';

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { projects, loading: projectsLoading } = useProjects();
  const { tasks, loading: tasksLoading } = useTasks(projectId || '');
  const { milestones, loading: milestonesLoading } = useMilestones(projectId || '');
  const { users } = useUsers();

  const [groupedTasks, setGroupedTasks] = useState<Record<StatusKey, typeof tasks>>({
    backlog: [],
    in_progress: [],
    review: [],
    done: [],
  });

  useEffect(() => {
    const groups: Record<StatusKey, typeof tasks> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    };
    tasks.forEach((task) => {
      const key = (task.status as StatusKey) || 'backlog';
      groups[key].push(task);
    });
    setGroupedTasks(groups);
  }, [tasks]);

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
      <Tabs defaultValue="kanban" className="w-full">
        <TabsList>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="milestones">{t.milestones}</TabsTrigger>
        </TabsList>

        {/* Kanban */}
        <TabsContent value="kanban" className="mt-6">
          <div className="flex gap-6 overflow-x-auto pb-4">
            {columns.map((column) => (
              <div key={column.status} className="flex-1 min-w-[260px]">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{column.title}</h3>
                  <Badge variant="secondary">{groupedTasks[column.status].length}</Badge>
                </div>
                <div className="space-y-3">
                  {groupedTasks[column.status].map((task) => (
                    <Card key={task.id} className="border-foreground/10">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                          <Badge className="text-xs capitalize">
                            {task.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-foreground/60">
                          <Calendar className="h-3 w-3" />
                          <span>{task.dueDate || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-foreground/60">
                          <User className="h-3 w-3" />
                          <span>{getAssigneeName(task.assigneeId)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {groupedTasks[column.status].length === 0 && (
                    <div className="p-4 border-2 border-dashed border-foreground/10 rounded-lg text-center text-sm text-foreground/50">
                      No tasks in this column
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones" className="mt-6">
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <Card key={milestone.id} className="border-foreground/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {milestone.completed ? (
                        <CheckIcon />
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
            ))}
            {milestones.length === 0 && (
              <div className="text-center py-12 text-foreground/50">
                No milestones to display
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CheckIcon() {
  return <span className="inline-block h-6 w-6 rounded-full bg-emerald-500" />;
}
