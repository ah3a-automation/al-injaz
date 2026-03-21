import { TaskPriorityBadge } from '@/Components/Tasks/TaskPriorityBadge';
import { TaskStatusBadge } from '@/Components/Tasks/TaskStatusBadge';
import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { isOverdue } from '@/utils/tasks';
import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

interface TaskPageHeaderProps {
    task: Task;
    actions: ReactNode;
}

export function TaskPageHeader({ task, actions }: TaskPageHeaderProps) {
    const { t } = useLocale('tasks');
    const overdue = isOverdue(task);
    const pct = Math.min(100, Math.max(0, task.progress_percent));

    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    {task.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                    <TaskStatusBadge status={task.status} />
                    <TaskPriorityBadge priority={task.priority} />
                    {overdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {t('status_overdue')}
                        </span>
                    )}
                </div>
                <div className="max-w-xl space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{t('field_progress')}</span>
                        <span className="tabular-nums font-medium text-foreground">
                            {pct}%
                        </span>
                    </div>
                    <div
                        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={t('field_progress')}
                    >
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </div>
    );
}
