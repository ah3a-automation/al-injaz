import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { Bell } from 'lucide-react';

export function TaskRemindersCard({ task }: { task: Task }) {
    const { t, locale } = useLocale('tasks');
    const reminders = task.reminders ?? [];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <Bell className="h-4 w-4 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base">{t('section_reminders')}</CardTitle>
            </CardHeader>
            <CardContent>
                {reminders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('reminders_empty')}</p>
                ) : (
                    <ul className="space-y-3">
                        {reminders.map((r) => (
                            <li
                                key={r.id}
                                className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
                            >
                                <p className="font-medium">{r.user?.name ?? '—'}</p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(r.remind_at).toLocaleString(
                                        locale === 'ar' ? 'ar-SA' : undefined
                                    )}
                                </p>
                                {r.note ? (
                                    <p className="mt-1 text-xs">{r.note}</p>
                                ) : null}
                                {r.is_sent ? (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t('reminder_sent')}
                                    </p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
