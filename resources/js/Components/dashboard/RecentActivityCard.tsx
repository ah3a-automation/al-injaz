import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

export interface RecentActivityCardProps {
    items?: string[] | null;
}

const defaultItems: string[] = [];

export function RecentActivityCard({ items }: RecentActivityCardProps) {
    const list = items && items.length > 0 ? items : defaultItems;
    const { t } = useLocale();

    return (
        <CardPanel title={t('recent_activity', 'dashboard')}>
            <ul className="space-y-3">
                {list.length === 0 ? (
                    <li className="text-sm text-text-muted">
                        {t('no_activity', 'dashboard')}
                    </li>
                ) : (
                    list.map((text, i) => (
                        <li
                            key={i}
                            className="flex items-center gap-3 border-b border-border-soft pb-3 last:border-0 last:pb-0 text-sm text-text-main"
                        >
                            <span className="h-2 w-2 shrink-0 rounded-full bg-brand-gold" />
                            {text}
                        </li>
                    ))
                )}
            </ul>
        </CardPanel>
    );
}
