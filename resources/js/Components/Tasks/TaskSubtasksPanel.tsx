import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { isOverdue } from '@/utils/tasks';
import { Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { TaskStatusBadge } from './TaskStatusBadge';

export function TaskSubtasksPanel({
    task,
    canCreateSubtask,
}: {
    task: Task;
    canCreateSubtask: boolean;
}) {
    const { t, locale } = useLocale('tasks');
    const subtasks = task.subtasks ?? [];
    const done = subtasks.filter((s) => s.status === 'done').length;

    return (
        <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 px-0 pt-0">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{t('section_subtasks')}</CardTitle>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                        {done}/{subtasks.length}
                    </span>
                </div>
                {canCreateSubtask && (
                    <Button size="sm" asChild>
                        <Link
                            href={`${route('tasks.create')}?parent_task_id=${task.id}`}
                            className="inline-flex items-center gap-1"
                        >
                            <Plus className="h-4 w-4" />
                            {t('subtask_add')}
                        </Link>
                    </Button>
                )}
            </CardHeader>
            <CardContent className="px-0">
                {subtasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('subtasks_empty')}</p>
                ) : (
                    <ul className="space-y-2">
                        {subtasks.map((st) => {
                            const od = isOverdue(st);
                            return (
                                <li
                                    key={st.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-3"
                                >
                                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                        <TaskStatusBadge status={st.status} />
                                        <Link
                                            href={route('tasks.show', st.id)}
                                            className="min-w-0 flex-1 truncate font-medium hover:underline"
                                        >
                                            {st.title}
                                        </Link>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        {st.due_at && (
                                            <span
                                                className={`text-xs tabular-nums ${od ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                                            >
                                                {new Date(st.due_at).toLocaleDateString(
                                                    locale === 'ar' ? 'ar-SA' : undefined
                                                )}
                                            </span>
                                        )}
                                        {st.assignees && st.assignees.length > 0 && (
                                            <div className="flex -space-x-2 rtl:space-x-reverse">
                                                {st.assignees.slice(0, 3).map((a) => (
                                                    <div
                                                        key={a.id}
                                                        className="flex h-6 w-6 items-center justify-center rounded-full border border-background bg-muted text-xs font-medium"
                                                        title={a.name}
                                                    >
                                                        {a.name.charAt(0).toUpperCase()}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {!canCreateSubtask && subtasks.length > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">{t('subtasks_readonly_hint')}</p>
                )}
            </CardContent>
        </Card>
    );
}
