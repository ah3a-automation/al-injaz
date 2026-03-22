import { BadgeCheck, ClipboardList, FileText, Users } from 'lucide-react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

const GRID_CARD_CLASS = 'col-span-12 md:col-span-3 lg:col-span-3';

export interface DashboardStatsProps {
    rfqsInProgress?: number;
    suppliersCount?: number;
    quotesReceived?: number;
    contractsActiveCount?: number;
}

const defaultStats = {
    rfqsInProgress: 0,
    suppliersCount: 0,
    quotesReceived: 0,
    contractsActiveCount: 0,
};

export function DashboardStats({
    rfqsInProgress = defaultStats.rfqsInProgress,
    suppliersCount = defaultStats.suppliersCount,
    quotesReceived = defaultStats.quotesReceived,
    contractsActiveCount = defaultStats.contractsActiveCount,
}: DashboardStatsProps) {
    const { t } = useLocale('dashboard');
    const stats: {
        labelKey: string;
        helpKey: string;
        value: string;
        icon: typeof FileText;
    }[] = [
        { labelKey: 'rfqs_in_progress', helpKey: 'rfqs_in_progress_help', value: String(rfqsInProgress), icon: FileText },
        { labelKey: 'suppliers_registered', helpKey: 'suppliers_registered_help', value: String(suppliersCount), icon: Users },
        { labelKey: 'quotes_received', helpKey: 'quotes_received_help', value: String(quotesReceived), icon: ClipboardList },
        {
            labelKey: 'contracts_active_only',
            helpKey: 'contracts_active_only_help',
            value: String(contractsActiveCount),
            icon: BadgeCheck,
        },
    ];

    return (
        <>
            {stats.map(({ labelKey, helpKey, value, icon: Icon }) => (
                <CardPanel key={labelKey} className={GRID_CARD_CLASS + ' flex flex-col gap-2 p-5'}>
                    <Icon className="h-5 w-5 text-text-muted" aria-hidden />
                    <span className="text-2xl font-semibold tracking-tight text-text-main">
                        {value}
                    </span>
                    <span className="text-sm text-text-muted" title={t(helpKey)}>
                        {t(labelKey)}
                    </span>
                </CardPanel>
            ))}
        </>
    );
}
