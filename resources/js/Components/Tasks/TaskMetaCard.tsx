import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { Link } from '@inertiajs/react';
import { CalendarClock, FolderKanban, User } from 'lucide-react';

export function TaskMetaCard({ task }: { task: Task }) {
    const { t, locale } = useLocale('tasks');

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t('section_meta')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <FolderKanban className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-muted-foreground">
                            {t('field_project')}
                        </span>
                        <div className="mt-0.5">
                            {task.project ? (
                                <Link
                                    href={route('projects.show', task.project.id)}
                                    className="font-medium text-primary hover:underline"
                                >
                                    {task.project.name}
                                </Link>
                            ) : (
                                <span>—</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <User className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-muted-foreground">
                            {t('field_creator')}
                        </span>
                        <p className="mt-0.5">{task.creator?.name ?? '—'}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <CalendarClock className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-muted-foreground">
                            {t('field_created_at')}
                        </span>
                        <p className="mt-0.5 tabular-nums">
                            {new Date(task.created_at).toLocaleString(
                                locale === 'ar' ? 'ar-SA' : undefined
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <CalendarClock className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-muted-foreground">
                            {t('field_updated_at')}
                        </span>
                        <p className="mt-0.5 tabular-nums">
                            {new Date(task.updated_at).toLocaleString(
                                locale === 'ar' ? 'ar-SA' : undefined
                            )}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
