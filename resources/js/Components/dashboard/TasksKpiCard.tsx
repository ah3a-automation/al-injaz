import { CheckSquare } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';

export interface TasksKpiPayload {
    org_overdue_tasks: number;
    org_tasks_due_today: number;
    my_overdue_tasks: number;
    my_tasks_due_today: number;
    open_tasks_total: number;
}

export interface TasksKpiCardProps {
    data?: TasksKpiPayload | null;
}

const defaultPayload: TasksKpiPayload = {
    org_overdue_tasks: 0,
    org_tasks_due_today: 0,
    my_overdue_tasks: 0,
    my_tasks_due_today: 0,
    open_tasks_total: 0,
};

export function TasksKpiCard({ data }: TasksKpiCardProps) {
    const { t } = useLocale('dashboard');
    const d = data ?? defaultPayload;
    const orgOverdueHref = route('tasks.index', { status: 'overdue' });
    const orgDueTodayHref = route('tasks.index', { due: 'today' });
    const overdueHref = route('tasks.index', { status: 'overdue', assignee: 'me' });
    const dueTodayHref = route('tasks.index', { assignee: 'me', due: 'today' });
    const openHref = route('tasks.index');

    return (
        <CardPanel title={t('tasks_kpi_title')} icon={CheckSquare} className="col-span-12">
            <div className="space-y-6" dir="inherit">
                <div>
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
                        {t('tasks_org_section')}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Link
                            href={orgOverdueHref}
                            className={cn(
                                'rounded-lg border border-border-soft p-4 transition-colors hover:bg-muted/40',
                                d.org_overdue_tasks > 0 &&
                                    'border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/25'
                            )}
                        >
                            <p
                                className={cn(
                                    'text-2xl font-semibold tabular-nums',
                                    d.org_overdue_tasks > 0
                                        ? 'text-amber-800 dark:text-amber-200'
                                        : 'text-text-main'
                                )}
                            >
                                {d.org_overdue_tasks.toLocaleString()}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">{t('org_overdue_tasks')}</p>
                        </Link>
                        <Link
                            href={orgDueTodayHref}
                            className="rounded-lg border border-border-soft p-4 transition-colors hover:bg-muted/40"
                        >
                            <p className="text-2xl font-semibold tabular-nums text-text-main">
                                {d.org_tasks_due_today.toLocaleString()}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">{t('org_tasks_due_today')}</p>
                        </Link>
                        <Link href={openHref} className="rounded-lg border border-border-soft p-4 transition-colors hover:bg-muted/40">
                            <p className="text-2xl font-semibold tabular-nums text-text-main">
                                {d.open_tasks_total.toLocaleString()}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">{t('open_tasks_total')}</p>
                        </Link>
                    </div>
                </div>
                <div>
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
                        {t('tasks_my_section')}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Link
                            href={overdueHref}
                            className={cn(
                                'rounded-lg border border-border-soft p-4 transition-colors hover:bg-muted/40',
                                d.my_overdue_tasks > 0 &&
                                    'border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/25'
                            )}
                        >
                            <p
                                className={cn(
                                    'text-2xl font-semibold tabular-nums',
                                    d.my_overdue_tasks > 0
                                        ? 'text-amber-800 dark:text-amber-200'
                                        : 'text-text-main'
                                )}
                            >
                                {d.my_overdue_tasks.toLocaleString()}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">{t('my_overdue_tasks')}</p>
                        </Link>
                        <Link
                            href={dueTodayHref}
                            className="rounded-lg border border-border-soft p-4 transition-colors hover:bg-muted/40"
                        >
                            <p className="text-2xl font-semibold tabular-nums text-text-main">
                                {d.my_tasks_due_today.toLocaleString()}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">{t('my_tasks_due_today')}</p>
                        </Link>
                    </div>
                </div>
            </div>
        </CardPanel>
    );
}
