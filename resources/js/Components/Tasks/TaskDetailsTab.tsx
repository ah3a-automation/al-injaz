import { Label } from '@/Components/ui/label';
import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { isOverdue } from '@/utils/tasks';
import { Link } from '@inertiajs/react';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskStatusBadge } from './TaskStatusBadge';

export function TaskDetailsTab({ task }: { task: Task }) {
    const { t, locale } = useLocale('tasks');
    const overdue = isOverdue(task);
    const tags = task.tags ?? [];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
                {overdue && (
                    <span className="inline-flex rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                        {t('status_overdue')}
                    </span>
                )}
            </div>

            <div>
                <Label className="text-muted-foreground">{t('field_description')}</Label>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {task.description?.trim() ? task.description : t('no_description')}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <Label className="text-muted-foreground">{t('field_progress')}</Label>
                    <div className="mt-2 flex items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-muted">
                            <div
                                className="h-2 rounded-full bg-primary transition-all"
                                style={{ width: `${task.progress_percent}%` }}
                            />
                        </div>
                        <span className="text-sm font-medium tabular-nums">
                            {task.progress_percent}%
                        </span>
                    </div>
                </div>
                <div>
                    <Label className="text-muted-foreground">{t('field_visibility')}</Label>
                    <p className="mt-2 text-sm capitalize">{task.visibility}</p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <Label className="text-muted-foreground">{t('field_due_date')}</Label>
                    <p
                        className={`mt-2 text-sm ${overdue ? 'font-medium text-destructive' : ''}`}
                    >
                        {task.due_at
                            ? new Date(task.due_at).toLocaleDateString(
                                  locale === 'ar' ? 'ar-SA' : undefined
                              )
                            : '—'}
                    </p>
                </div>
                <div>
                    <Label className="text-muted-foreground">{t('field_start_date')}</Label>
                    <p className="mt-2 text-sm">
                        {task.start_at
                            ? new Date(task.start_at).toLocaleDateString(
                                  locale === 'ar' ? 'ar-SA' : undefined
                              )
                            : '—'}
                    </p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <Label className="text-muted-foreground">{t('field_reminder_at')}</Label>
                    <p className="mt-2 text-sm">
                        {task.reminder_at
                            ? new Date(task.reminder_at).toLocaleString(
                                  locale === 'ar' ? 'ar-SA' : undefined
                              )
                            : '—'}
                    </p>
                </div>
                <div>
                    <Label className="text-muted-foreground">{t('field_source')}</Label>
                    <p className="mt-2 text-sm capitalize">{task.source}</p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <Label className="text-muted-foreground">{t('field_estimated_hours')}</Label>
                    <p className="mt-2 text-sm tabular-nums">
                        {task.estimated_hours != null ? `${task.estimated_hours} h` : '—'}
                    </p>
                </div>
                <div>
                    <Label className="text-muted-foreground">{t('field_actual_hours')}</Label>
                    <p className="mt-2 text-sm tabular-nums">
                        {task.actual_hours != null ? `${task.actual_hours} h` : '—'}
                    </p>
                </div>
            </div>

            {tags.length > 0 && (
                <div>
                    <Label className="text-muted-foreground">{t('field_tags')}</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <Label className="text-muted-foreground">{t('field_project')}</Label>
                <p className="mt-2 text-sm">
                    {task.project ? (
                        <Link
                            href={route('projects.show', task.project.id)}
                            className="text-primary hover:underline"
                        >
                            {task.project.name}
                        </Link>
                    ) : (
                        '—'
                    )}
                </p>
            </div>

            {task.completed_at && (
                <div>
                    <Label className="text-muted-foreground">{t('field_completed_at')}</Label>
                    <p className="mt-2 text-sm">
                        {new Date(task.completed_at).toLocaleString(
                            locale === 'ar' ? 'ar-SA' : undefined
                        )}
                    </p>
                </div>
            )}

            {task.dependencies && task.dependencies.length > 0 && (
                <div>
                    <Label className="text-muted-foreground">{t('section_dependencies')}</Label>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                        {task.dependencies.map((d) => (
                            <li key={d.id}>
                                <Link
                                    href={route('tasks.show', d.id)}
                                    className="text-primary hover:underline"
                                >
                                    {d.title}
                                </Link>
                                {d.status ? (
                                    <span className="ms-2 text-xs text-muted-foreground">
                                        ({d.status})
                                    </span>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
