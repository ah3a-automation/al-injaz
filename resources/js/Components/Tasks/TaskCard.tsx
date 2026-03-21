import { TaskPriorityBadge } from '@/Components/Tasks/TaskPriorityBadge';
import type { Task } from '@/types';
import { isOverdue } from '@/utils/tasks';
import { Link } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import { Paperclip, ListTree } from 'lucide-react';

interface TaskCardProps {
    task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
    const { t, locale } = useLocale('tasks');
    const assignees = task.assignees ?? [];
    const overdue = isOverdue(task);
    const subCount = task.subtasks?.length ?? 0;

    return (
        <Link
            href={route('tasks.show', task.id)}
            className={`block rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                overdue ? 'border-destructive/50 ring-1 ring-destructive/20' : ''
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 font-medium leading-snug line-clamp-3">
                    {task.title}
                </span>
                <TaskPriorityBadge priority={task.priority} />
            </div>
            {task.due_at && (
                <p
                    className={`mt-2 text-xs tabular-nums ${overdue ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}
                >
                    {overdue ? `${t('status_overdue')} · ` : ''}
                    {new Date(task.due_at).toLocaleDateString(
                        locale === 'ar' ? 'ar-SA' : undefined
                    )}
                </p>
            )}
            {task.progress_percent > 0 && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${task.progress_percent}%` }}
                    />
                </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {subCount > 0 && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                        <ListTree className="h-3.5 w-3.5" aria-hidden />
                        {subCount}
                    </span>
                )}
                {task.media && task.media.length > 0 && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                        <Paperclip className="h-3.5 w-3.5" aria-hidden />
                        {task.media.length}
                    </span>
                )}
            </div>
            {assignees.length > 0 && (
                <div className="mt-2 flex -space-x-2 rtl:space-x-reverse">
                    {assignees.slice(0, 3).map((a) => (
                        <div
                            key={a.id}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-background bg-muted text-xs font-medium"
                            title={a.name}
                        >
                            {a.name.charAt(0).toUpperCase()}
                        </div>
                    ))}
                    {assignees.length > 3 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-background bg-muted text-xs">
                            +{assignees.length - 3}
                        </div>
                    )}
                </div>
            )}
        </Link>
    );
}
