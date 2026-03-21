import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { taskPriorityTranslationKey } from '@/lib/taskLabels';

const priorityClass: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    normal: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

export function TaskPriorityBadge({ priority }: { priority: Task['priority'] }) {
    const { t } = useLocale('tasks');
    const label = t(taskPriorityTranslationKey(priority));
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass[priority] ?? priorityClass.normal}`}
        >
            {label}
        </span>
    );
}
