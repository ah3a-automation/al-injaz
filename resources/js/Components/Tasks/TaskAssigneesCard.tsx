import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { Shield, Users } from 'lucide-react';

function roleLabel(
    t: (key: string) => string,
    role: string
): string {
    const map: Record<string, string> = {
        responsible: 'role_responsible',
        reviewer: 'role_reviewer',
        watcher: 'role_watcher',
    };
    const key = map[role];
    return key ? t(key) : role;
}

export function TaskAssigneesCard({ task }: { task: Task }) {
    const { t } = useLocale('tasks');
    const assignees = task.assignees ?? [];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Users className="h-4 w-4" aria-hidden />
                </span>
                <CardTitle className="text-base">{t('section_assignment')}</CardTitle>
            </CardHeader>
            <CardContent>
                {assignees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('assignees_empty')}</p>
                ) : (
                    <ul className="space-y-3">
                        {assignees.map((a) => (
                            <li key={a.id} className="flex items-start gap-3">
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold"
                                    aria-hidden
                                >
                                    {a.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium leading-tight">
                                        {a.name}
                                    </p>
                                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                        <Shield className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                                        <span>{roleLabel(t, a.pivot.role)}</span>
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
