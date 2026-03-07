import type { Task } from '@/types';
import { Link } from '@inertiajs/react';
import { isOverdue } from '@/utils/tasks';

interface TaskCardProps {
    task: Task;
}

const priorityClass: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
};

export function TaskCard({ task }: TaskCardProps) {
    const assignees = task.assignees ?? [];
    const overdue = isOverdue(task);

    return (
        <div className="rounded-md border border-border bg-card p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <Link
                    href={route('tasks.show', task.id)}
                    className="min-w-0 flex-1 font-medium truncate hover:underline"
                >
                    {task.title}
                </Link>
                <span
                    className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass[task.priority] ?? priorityClass.normal}`}
                >
                    {task.priority}
                </span>
            </div>
            {task.due_at && (
                <p className={`mt-1.5 text-xs ${overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                    {new Date(task.due_at).toLocaleDateString()}
                </p>
            )}
            {task.progress_percent > 0 && (
                <div className="mt-2 w-full bg-muted rounded-full h-1">
                    <div
                        className="bg-primary h-1 rounded-full"
                        style={{ width: `${task.progress_percent}%` }}
                    />
                </div>
            )}
            {assignees.length > 0 && (
                <div className="mt-2 flex -space-x-2">
                    {assignees.slice(0, 3).map((a) => (
                        <div
                            key={a.id}
                            className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium border border-background"
                            title={a.name}
                        >
                            {a.name.charAt(0).toUpperCase()}
                        </div>
                    ))}
                    {assignees.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border border-background">
                            +{assignees.length - 3}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
