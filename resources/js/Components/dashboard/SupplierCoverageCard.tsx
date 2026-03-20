import { Map } from 'lucide-react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

export function SupplierCoverageCard() {
    const { t } = useLocale();

    return (
        <CardPanel title={t('coverage_map', 'dashboard')} icon={Map}>
            <div className="flex h-[320px] items-center justify-center rounded-lg bg-brand-gold100 text-sm text-text-muted">
                {t('map_preview', 'dashboard')}
            </div>
        </CardPanel>
    );
}
