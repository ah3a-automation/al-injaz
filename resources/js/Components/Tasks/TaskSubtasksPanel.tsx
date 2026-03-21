import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { isOverdue } from '@/utils/tasks';
import { Link } from '@inertiajs/react';
import { ArrowRight, ListTodo, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
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
    const [draftTitle, setDraftTitle] = useState('');

    const createHref = useMemo(() => {
        const p = new URLSearchParams({ parent_task_id: task.id });
        if (draftTitle.trim()) {
            p.set('title', draftTitle.trim());
        }
        return `${route('tasks.create')}?${p.toString()}`;
    }, [task.id, draftTitle]);

    const fullFormHref = `${route('tasks.create')}?parent_task_id=${task.id}`;

    return (
        <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-x-2 gap-y-2 space-y-0 px-0 pb-2 pt-0">
                <div className="flex min-w-0 items-center gap-2">
                    <CardTitle className="text-lg">{t('section_subtasks')}</CardTitle>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                        {done}/{subtasks.length}
                    </span>
                </div>
                {canCreateSubtask && (
                    <Button size="sm" variant="outline" asChild>
                        <Link
                            href={fullFormHref}
                            className="inline-flex items-center gap-1"
                        >
                            <Plus className="h-4 w-4" />
                            {t('subtask_add')}
                        </Link>
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-3 px-0">
                {canCreateSubtask && (
                    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
                        <Label
                            htmlFor="subtask-inline-title"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            {t('subtask_inline_placeholder')}
                        </Label>
                        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                            <Input
                                id="subtask-inline-title"
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                placeholder={t('subtask_inline_placeholder')}
                                className="min-h-9 min-w-0 flex-1"
                                dir="auto"
                            />
                            <Button size="sm" asChild className="h-9 shrink-0 gap-1 sm:self-auto">
                                <Link href={createHref} className="inline-flex items-center justify-center">
                                    {t('subtask_add')}
                                    <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}

                {subtasks.length === 0 ? (
                    <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-muted/15 px-4 py-6 text-center">
                        <ListTodo
                            className="h-9 w-9 text-muted-foreground"
                            strokeWidth={1.25}
                            aria-hidden
                        />
                        <p className="mt-2 text-sm font-medium text-foreground">
                            {t('subtasks_empty_title')}
                        </p>
                        <p className="mt-1 max-w-sm text-xs leading-snug text-muted-foreground">
                            {t('subtasks_empty_hint')}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {subtasks.map((st) => {
                            const od = isOverdue(st);
                            return (
                                <li
                                    key={st.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-2.5"
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
                    <p className="text-xs text-muted-foreground">{t('subtasks_readonly_hint')}</p>
                )}
            </CardContent>
        </Card>
    );
}
