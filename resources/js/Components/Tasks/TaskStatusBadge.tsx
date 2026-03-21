import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { taskStatusTranslationKey } from '@/lib/taskLabels';

const statusClass: Record<string, string> = {
    backlog: 'bg-muted text-muted-foreground',
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
    in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    review: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
    done: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

export function TaskStatusBadge({ status }: { status: Task['status'] }) {
    const { t } = useLocale('tasks');
    const label = t(taskStatusTranslationKey(status));
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[status] ?? statusClass.backlog}`}
        >
            {label}
        </span>
    );
}
