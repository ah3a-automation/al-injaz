import type { Task } from '@/types';
import { Link } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import { TaskCard } from './TaskCard';

const KANBAN_COLUMNS = [
    'backlog',
    'open',
    'in_progress',
    'review',
    'done',
    'cancelled',
] as const;

interface KanbanBoardProps {
    tasks: Task[];
    canReorder?: boolean;
}

export function KanbanBoard({ tasks, canReorder = false }: KanbanBoardProps) {
    const { t } = useLocale('tasks');

    const columnLabel = (status: (typeof KANBAN_COLUMNS)[number]): string => {
        const keys: Record<(typeof KANBAN_COLUMNS)[number], string> = {
            backlog: 'status_backlog',
            open: 'status_open',
            in_progress: 'status_in_progress',
            review: 'status_review',
            done: 'status_done',
            cancelled: 'status_cancelled',
        };
        return t(keys[status]);
    };

    const grouped = Object.fromEntries(
        KANBAN_COLUMNS.map((status) => [
            status,
            tasks
                .filter((x) => x.status === status)
                .sort(
                    (a, b) =>
                        (a.position ?? 0) - (b.position ?? 0) ||
                        String(a.id).localeCompare(String(b.id))
                ),
        ])
    ) as Record<(typeof KANBAN_COLUMNS)[number], Task[]>;

    return (
        <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t('kanban_due_filter_scope_note')}</p>
            <div className="flex gap-4 overflow-x-auto pb-4">
                {KANBAN_COLUMNS.map((status) => (
                    <div
                        key={status}
                        className="flex min-w-[280px] w-[280px] shrink-0 flex-col"
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-md border border-border bg-card px-3 py-2">
                            <span className="text-start text-sm font-medium">{columnLabel(status)}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                                {grouped[status].length}
                            </span>
                            <Link
                                href={route('tasks.create')}
                                className="text-xs text-primary hover:underline"
                            >
                                {t('kanban_add_task')}
                            </Link>
                        </div>
                        <div className="max-h-[calc(100vh-16rem)] flex-1 space-y-2 overflow-y-auto rounded-b-md border border-t-0 border-border bg-muted/30 p-2">
                            {grouped[status].length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    {t('kanban_column_empty')}
                                </p>
                            ) : (
                                grouped[status].map((task, i, arr) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        canReorder={canReorder}
                                        isFirst={i === 0}
                                        isLast={i === arr.length - 1}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
