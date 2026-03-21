import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { Link } from '@inertiajs/react';
import { Bell, Copy, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export function TaskRemindersCard({ task }: { task: Task }) {
    const { t, locale } = useLocale('tasks');
    const reminders = task.reminders ?? [];

    const copyRemindAt = (iso: string) => {
        const text = new Date(iso).toLocaleString(
            locale === 'ar' ? 'ar-SA' : undefined
        );
        void navigator.clipboard.writeText(text).then(
            () => {
                toast.success(t('reminder_copied'));
            },
            () => {
                /* clipboard may fail silently in insecure contexts */
            }
        );
    };

    return (
        <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
                <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Bell className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                        <CardTitle className="text-base">{t('section_reminders')}</CardTitle>
                        <CardDescription className="text-xs">
                            {t('reminder_edit_hint')}
                        </CardDescription>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 gap-1" asChild>
                    <Link href={route('tasks.edit', task.id)}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        {t('title_edit')}
                    </Link>
                </Button>
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
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium">{r.user?.name ?? '—'}</p>
                                        <p className="text-xs text-muted-foreground tabular-nums">
                                            {new Date(r.remind_at).toLocaleString(
                                                locale === 'ar' ? 'ar-SA' : undefined
                                            )}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                        aria-label={t('reminder_copy')}
                                        onClick={() => copyRemindAt(r.remind_at)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                {r.note ? (
                                    <p className="mt-1 text-xs text-foreground/90">{r.note}</p>
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
