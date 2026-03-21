import { taskActivityTranslationKey } from '@/lib/taskLabels';
import { useLocale } from '@/hooks/useLocale';
import type { TaskHistoryEntry } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
    Bell,
    GitBranch,
    Link2,
    MessageSquare,
    Paperclip,
    Pencil,
    PlusCircle,
    RefreshCw,
    Trash2,
    UserPlus,
} from 'lucide-react';

function iconForEvent(event: string) {
    if (event.includes('comment')) {
        return MessageSquare;
    }
    if (event.includes('link')) {
        return Link2;
    }
    if (event.includes('assignee')) {
        return UserPlus;
    }
    if (event.includes('attachment')) {
        return Paperclip;
    }
    if (event.includes('reminder')) {
        return Bell;
    }
    if (event.includes('deleted')) {
        return Trash2;
    }
    if (event.includes('status')) {
        return RefreshCw;
    }
    if (event.includes('created')) {
        return PlusCircle;
    }
    if (event.includes('updated')) {
        return Pencil;
    }
    return GitBranch;
}

function colorForEvent(event: string): string {
    if (event.includes('deleted') || event.includes('removed')) {
        return 'border-destructive/50 bg-destructive/10 text-destructive shadow-sm';
    }
    if (event.includes('comment')) {
        return 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300 shadow-sm';
    }
    if (event.includes('assignee')) {
        return 'border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300 shadow-sm';
    }
    if (event.includes('link')) {
        return 'border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-200 shadow-sm';
    }
    if (event.includes('attachment')) {
        return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 shadow-sm';
    }
    if (event.includes('reminder')) {
        return 'border-orange-500/35 bg-orange-500/10 text-orange-800 dark:text-orange-200 shadow-sm';
    }
    if (event.includes('status')) {
        return 'border-cyan-500/35 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 shadow-sm';
    }
    if (event.includes('created') || event.includes('added')) {
        return 'border-primary/40 bg-primary/10 text-primary shadow-sm';
    }
    if (event.includes('updated')) {
        return 'border-border bg-muted/50 text-foreground shadow-sm';
    }
    return 'border-border bg-muted/40 text-foreground shadow-sm';
}

export function TaskActivityTimeline({ history }: { history?: TaskHistoryEntry[] }) {
    const { t, locale } = useLocale('tasks');
    const dateLocale = locale === 'ar' ? ar : enUS;

    if (!history || history.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
                <p className="text-sm text-muted-foreground">{t('activity_empty')}</p>
                <p className="mt-2 text-xs text-muted-foreground">{t('activity_empty_hint')}</p>
            </div>
        );
    }

    const sorted = [...history].sort((a, b) => b.created_at.localeCompare(a.created_at));

    return (
        <ol className="space-y-0">
            {sorted.map((entry, index) => {
                const Icon = iconForEvent(entry.action);
                const when = formatDistanceToNow(new Date(entry.created_at), {
                    addSuffix: true,
                    locale: dateLocale,
                });
                const labelKey = taskActivityTranslationKey(entry.action);
                const label =
                    entry.description || (labelKey ? t(labelKey) : entry.action);
                const isLast = index === sorted.length - 1;

                return (
                    <li
                        key={entry.id}
                        className="flex gap-3 pb-5 last:pb-0"
                    >
                        <div className="relative flex w-8 shrink-0 flex-col items-center self-stretch">
                            {!isLast ? (
                                <span
                                    className="absolute top-8 bottom-0 z-0 w-px translate-x-[-50%] bg-primary/20 start-1/2"
                                    aria-hidden
                                />
                            ) : null}
                            <span
                                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background shadow-sm ${colorForEvent(entry.action)}`}
                            >
                                <Icon className="h-4 w-4" aria-hidden />
                            </span>
                        </div>
                        <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                            <p className="text-sm font-medium leading-snug text-foreground">
                                {label}
                            </p>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                <span className="font-medium text-foreground/90">
                                    {entry.actor?.name ?? t('activity_system')}
                                </span>
                                <span className="tabular-nums"> · {when}</span>
                            </p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
