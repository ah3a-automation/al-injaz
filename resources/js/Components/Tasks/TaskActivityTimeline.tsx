import { taskActivityTranslationKey } from '@/lib/taskLabels';
import { useLocale } from '@/hooks/useLocale';
import type { TaskHistoryEntry } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
    GitBranch,
    Link2,
    MessageSquare,
    Paperclip,
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
    if (event.includes('deleted')) {
        return Trash2;
    }
    return GitBranch;
}

function colorForEvent(event: string): string {
    if (event.includes('deleted')) {
        return 'border-destructive/40 bg-destructive/5 text-destructive';
    }
    if (event.includes('created') || event.includes('added')) {
        return 'border-primary/30 bg-primary/5 text-primary';
    }
    return 'border-border bg-muted/30 text-foreground';
}

export function TaskActivityTimeline({ history }: { history?: TaskHistoryEntry[] }) {
    const { t, locale } = useLocale('tasks');
    const dateLocale = locale === 'ar' ? ar : enUS;

    if (!history || history.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-muted/20 p-6 text-center">
                <p className="text-sm text-muted-foreground">{t('activity_empty')}</p>
                <p className="mt-2 text-xs text-muted-foreground">{t('activity_empty_hint')}</p>
            </div>
        );
    }

    const sorted = [...history].sort((a, b) => b.created_at.localeCompare(a.created_at));

    return (
        <ol className="relative border-s border-border ms-3 space-y-6 py-2 ps-6">
            {sorted.map((entry) => {
                const Icon = iconForEvent(entry.action);
                const when = formatDistanceToNow(new Date(entry.created_at), {
                    addSuffix: true,
                    locale: dateLocale,
                });
                const labelKey = taskActivityTranslationKey(entry.action);
                const label =
                    entry.description ||
                    (labelKey ? t(labelKey) : entry.action);
                return (
                    <li key={entry.id} className="relative">
                        <span
                            className={`absolute -start-[25px] flex h-8 w-8 items-center justify-center rounded-full border ${colorForEvent(entry.action)}`}
                        >
                            <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="space-y-1">
                            <p className="text-sm font-medium leading-snug">
                                {label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {entry.actor?.name ?? t('activity_system')}{' '}
                                <span className="tabular-nums">· {when}</span>
                            </p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
