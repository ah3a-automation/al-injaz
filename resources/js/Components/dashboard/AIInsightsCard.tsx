import { Sparkles } from 'lucide-react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

const insightKeys = ['ai_insight_1', 'ai_insight_2', 'ai_insight_3'] as const;

export function AIInsightsCard() {
    const { t } = useLocale();

    return (
        <CardPanel
            title={t('ai_insights_title', 'dashboard')}
            icon={Sparkles}
            className="border-border-soft bg-brand-gold100/50"
        >
            <ul className="space-y-2">
                {insightKeys.map((key) => (
                    <li
                        key={key}
                        className="flex gap-2 text-sm text-text-main before:shrink-0 before:content-['•'] before:text-brand-gold"
                    >
                        {t(key, 'dashboard')}
                    </li>
                ))}
            </ul>
        </CardPanel>
    );
}
