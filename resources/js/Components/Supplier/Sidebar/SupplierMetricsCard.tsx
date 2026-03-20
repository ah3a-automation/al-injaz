import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { BarChart3 } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface SupplierMetricsCardProps {
    rfqInvitedCount?: number;
    quotesSubmittedCount?: number;
    awardsCount?: number;
}

function Metric({ label, value }: { label: string; value: number | undefined }) {
    return (
        <div className="flex flex-col">
            <span className="text-lg font-semibold tabular-nums text-foreground">{value ?? '—'}</span>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
    );
}

export default function SupplierMetricsCard({
    rfqInvitedCount = 0,
    quotesSubmittedCount = 0,
    awardsCount = 0,
}: SupplierMetricsCardProps) {
    const { t } = useLocale();
    const empty = rfqInvitedCount === 0 && quotesSubmittedCount === 0 && awardsCount === 0;

    return (
        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="border-b border-border/40 px-4 py-2.5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    {t('profile_metrics_card_title', 'supplier_portal')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
                <div className="grid grid-cols-3 gap-2">
                    <Metric label={t('profile_rfqs_invited', 'supplier_portal')} value={rfqInvitedCount} />
                    <Metric label={t('profile_quotes_submitted', 'supplier_portal')} value={quotesSubmittedCount} />
                    <Metric label={t('profile_awards', 'supplier_portal')} value={awardsCount} />
                </div>
                {empty && (
                    <p className="text-xs text-muted-foreground">
                        {t('profile_analytics_after_rfq', 'supplier_portal')}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
