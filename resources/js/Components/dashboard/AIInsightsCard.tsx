import { Sparkles } from 'lucide-react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

export interface ProcurementInsightItem {
    key: string;
    count: number;
}

export interface ProcurementInsightsPayload {
    items: ProcurementInsightItem[];
    all_on_track: boolean;
}

export interface AIInsightsCardProps {
    procurementInsights?: ProcurementInsightsPayload | null;
}

export function AIInsightsCard({ procurementInsights }: AIInsightsCardProps) {
    const { t } = useLocale('dashboard');

    if (procurementInsights === undefined || procurementInsights === null) {
        return (
            <CardPanel
                title={t('procurement_insights_title')}
                icon={Sparkles}
                className="border-border-soft bg-brand-gold100/50"
            >
                <p className="text-sm text-text-muted">{t('no_data')}</p>
            </CardPanel>
        );
    }

    if (procurementInsights.all_on_track) {
        return (
            <CardPanel
                title={t('procurement_insights_title')}
                icon={Sparkles}
                className="border-border-soft bg-brand-gold100/50"
            >
                <p className="text-sm text-text-main">{t('insights_all_on_track')}</p>
            </CardPanel>
        );
    }

    return (
        <CardPanel
            title={t('procurement_insights_title')}
            icon={Sparkles}
            className="border-border-soft bg-brand-gold100/50"
        >
            <ul className="space-y-2">
                {procurementInsights.items.map((item) => (
                    <li
                        key={item.key}
                        className="flex gap-2 text-sm text-text-main before:shrink-0 before:content-['•'] before:text-brand-gold"
                    >
                        {t(item.key, 'dashboard', { count: item.count })}
                    </li>
                ))}
            </ul>
        </CardPanel>
    );
}
