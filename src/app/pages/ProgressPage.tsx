import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { t } from '../i18n/translations';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { buildLifecycleProgressCards, useProjects, useTasks, useUsers } from '../api/useApi';

export default function ProgressPage() {
  const navigate = useNavigate();
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks();
  const { users, loading: usersLoading, error: usersError } = useUsers();

  const taskProgressItems = buildLifecycleProgressCards(tasks, projects, users, tasks.length || 1000);

  if (projectsLoading || tasksLoading || usersLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (projectsError || tasksError || usersError) {
    return <div className="p-8 text-red-500">Error: {projectsError || tasksError || usersError}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">{t.progress}</h1>
        <p className="text-sm text-foreground/60 mt-2">
          Task lifecycle progress from To Do to In Progress, Review, and Done.
        </p>
      </div>

      <Card className="border-foreground/10">
        <CardHeader>
          <CardTitle>All Task Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {taskProgressItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-foreground/60">
              No task progress available yet.
            </div>
          ) : (
            <div className="space-y-4">
              {taskProgressItems.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="w-full rounded-lg border border-foreground/10 p-4 text-left transition-colors hover:bg-secondary/40"
                  onClick={() => navigate(task.targetPath)}
                >
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-foreground/50">Task</p>
                      <p className="font-medium">{task.taskName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-foreground/50">Project</p>
                      <p className="font-medium">{task.projectName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-foreground/50">Assignee</p>
                      <p className="font-medium">{task.assigneeName}</p>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-foreground/50">Stage</p>
                        <Badge variant={task.stage === 'done' ? 'default' : 'secondary'} className="capitalize">
                          {task.stageLabel}
                        </Badge>
                      </div>
                      <ArrowRight className="h-4 w-4 text-foreground/40" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-foreground/60">
                    <span>{task.completedTasks} completed</span>
                    <span>{task.remainingTasks} remaining</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
