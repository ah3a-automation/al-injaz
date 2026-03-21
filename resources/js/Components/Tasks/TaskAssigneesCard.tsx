import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';

export function TaskAssigneesCard({ task }: { task: Task }) {
    const { t } = useLocale('tasks');
    const assignees = task.assignees ?? [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t('section_assignment')}</CardTitle>
            </CardHeader>
            <CardContent>
                {assignees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('assignees_empty')}</p>
                ) : (
                    <ul className="space-y-3">
                        {assignees.map((a) => (
                            <li key={a.id} className="flex items-center gap-3">
                                <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium"
                                    aria-hidden
                                >
                                    {a.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{a.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                        {a.pivot.role}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
