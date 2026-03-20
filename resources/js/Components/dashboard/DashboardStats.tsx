import { BadgeCheck, ClipboardList, FileText, Users } from 'lucide-react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

const GRID_CARD_CLASS = 'col-span-12 md:col-span-3 lg:col-span-3';

export interface DashboardStatsProps {
    rfqsActive?: number;
    suppliersCount?: number;
    quotesReceived?: number;
    contractsAwarded?: number;
}

const defaultStats = {
    rfqsActive: 0,
    suppliersCount: 0,
    quotesReceived: 0,
    contractsAwarded: 0,
};

export function DashboardStats({
    rfqsActive = defaultStats.rfqsActive,
    suppliersCount = defaultStats.suppliersCount,
    quotesReceived = defaultStats.quotesReceived,
    contractsAwarded = defaultStats.contractsAwarded,
}: DashboardStatsProps) {
    const { t } = useLocale();
    const stats = [
        { labelKey: 'rfqs_active', value: String(rfqsActive), icon: FileText },
        { labelKey: 'suppliers_registered', value: String(suppliersCount), icon: Users },
        { labelKey: 'quotes_received', value: String(quotesReceived), icon: ClipboardList },
        { labelKey: 'contracts_awarded', value: String(contractsAwarded), icon: BadgeCheck },
    ];

    return (
        <>
            {stats.map(({ labelKey, value, icon: Icon }) => (
                <CardPanel key={labelKey} className={GRID_CARD_CLASS + ' flex flex-col gap-2 p-5'}>
                    <Icon className="h-5 w-5 text-text-muted" aria-hidden />
                    <span className="text-2xl font-semibold tracking-tight text-text-main">
                        {value}
                    </span>
                    <span className="text-sm text-text-muted">
                        {t(labelKey, 'dashboard')}
                    </span>
                </CardPanel>
            ))}
        </>
    );
}
