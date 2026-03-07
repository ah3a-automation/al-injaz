import type { Task } from '@/types';
import { Link } from '@inertiajs/react';
import { TaskCard } from './TaskCard';

const KANBAN_COLUMNS = [
    'backlog',
    'open',
    'in_progress',
    'review',
    'done',
    'cancelled',
] as const;

const COLUMN_LABELS: Record<(typeof KANBAN_COLUMNS)[number], string> = {
    backlog: 'Backlog',
    open: 'Open',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    cancelled: 'Cancelled',
};

interface KanbanBoardProps {
    tasks: Task[];
}

export function KanbanBoard({ tasks }: KanbanBoardProps) {
    const grouped = Object.fromEntries(
        KANBAN_COLUMNS.map((status) => [
            status,
            tasks.filter((t) => t.status === status),
        ])
    ) as Record<(typeof KANBAN_COLUMNS)[number], Task[]>;

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((status) => (
                <div
                    key={status}
                    className="flex min-w-[280px] w-[280px] flex-col shrink-0"
                >
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-md border border-border bg-card px-3 py-2">
                        <span className="font-medium text-sm">
                            {COLUMN_LABELS[status]}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                            {grouped[status].length}
                        </span>
                        <Link
                            href={route('tasks.create')}
                            className="text-xs text-primary hover:underline"
                        >
                            Add task
                        </Link>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-16rem)] rounded-b-md border border-t-0 border-border bg-muted/30 p-2">
                        {grouped[status].length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                No tasks
                            </p>
                        ) : (
                            grouped[status].map((task) => (
                                <TaskCard key={task.id} task={task} />
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
