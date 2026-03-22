import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { usePage } from '@inertiajs/react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import type { SharedPageProps } from '@/types';

export interface RecentActivityItem {
    text: string;
    at: string | null;
}

export interface RecentActivityCardProps {
    items?: RecentActivityItem[] | string[] | null;
}

const defaultItems: RecentActivityItem[] = [];

function normalizeItems(items: RecentActivityItem[] | string[] | null | undefined): RecentActivityItem[] {
    if (!items || items.length === 0) {
        return defaultItems;
    }
    if (typeof items[0] === 'string') {
        return (items as string[]).map((text) => ({ text, at: null }));
    }
    return items as RecentActivityItem[];
}

export function RecentActivityCard({ items }: RecentActivityCardProps) {
    const list = normalizeItems(items);
    const { t } = useLocale('dashboard');
    const { locale } = usePage().props as SharedPageProps;
    const dateLocale = locale === 'ar' ? ar : enUS;

    return (
        <CardPanel title={t('recent_activity')}>
            <ul className="space-y-3">
                {list.length === 0 ? (
                    <li className="text-sm text-text-muted">{t('no_activity')}</li>
                ) : (
                    list.map((item, i) => (
                        <li
                            key={i}
                            className="flex flex-col gap-1 border-b border-border-soft pb-3 text-start last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                            dir="inherit"
                        >
                            <div className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-gold" aria-hidden />
                                <span className="text-sm text-text-main">{item.text}</span>
                            </div>
                            {item.at ? (
                                <time
                                    className="shrink-0 text-xs text-text-muted sm:mt-0.5"
                                    dateTime={item.at}
                                    title={new Date(item.at).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                                >
                                    {formatDistanceToNow(new Date(item.at), { addSuffix: true, locale: dateLocale })}
                                </time>
                            ) : null}
                        </li>
                    ))
                )}
            </ul>
        </CardPanel>
    );
}
