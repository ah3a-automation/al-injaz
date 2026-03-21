import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { Link } from '@inertiajs/react';

export function TaskMetaCard({ task }: { task: Task }) {
    const { t, locale } = useLocale('tasks');

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t('section_meta')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                        {t('field_project')}
                    </span>
                    {task.project ? (
                        <Link
                            href={route('projects.show', task.project.id)}
                            className="text-primary hover:underline"
                        >
                            {task.project.name}
                        </Link>
                    ) : (
                        <span>—</span>
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                        {t('field_creator')}
                    </span>
                    <span>{task.creator?.name ?? '—'}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                        {t('field_created_at')}
                    </span>
                    <span className="tabular-nums">
                        {new Date(task.created_at).toLocaleString(
                            locale === 'ar' ? 'ar-SA' : undefined
                        )}
                    </span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                        {t('field_updated_at')}
                    </span>
                    <span className="tabular-nums">
                        {new Date(task.updated_at).toLocaleString(
                            locale === 'ar' ? 'ar-SA' : undefined
                        )}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
