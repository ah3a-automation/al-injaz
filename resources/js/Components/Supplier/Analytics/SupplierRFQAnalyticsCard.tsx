import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { useLocale } from '@/hooks/useLocale';

interface SupplierRFQAnalyticsCardProps {
    rfqsInvited?: number | null;
    quotesSubmitted?: number | null;
    awardsWon?: number | null;
    rfqsDeclined?: number | null;
}

const BAR_FILL = 'hsl(var(--primary))';

const TOOLTIP_KEYS: Record<string, string> = {
    Invited: 'profile_rfqs_invited',
    Submitted: 'profile_quotes_submitted',
    Awards: 'profile_awards',
    Declined: 'profile_rfqs_declined',
};

export default function SupplierRFQAnalyticsCard({
    rfqsInvited,
    quotesSubmitted,
    awardsWon,
    rfqsDeclined,
}: SupplierRFQAnalyticsCardProps) {
    const { t } = useLocale();

    const chartData = useMemo(
        () => [
            { name: 'Invited', value: rfqsInvited ?? 0 },
            { name: 'Submitted', value: quotesSubmitted ?? 0 },
            { name: 'Awards', value: awardsWon ?? 0 },
            { name: 'Declined', value: rfqsDeclined ?? 0 },
        ],
        [rfqsInvited, quotesSubmitted, awardsWon, rfqsDeclined]
    );

    const isPlaceholder = chartData.every((d) => d.value === 0);

    return (
        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="border-b border-border/40 px-4 py-2.5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    {t('profile_rfq_participation', 'supplier_portal')}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                {isPlaceholder ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
                        <p className="text-sm font-medium text-muted-foreground">
                            {t('profile_no_rfq_activity', 'supplier_portal')}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t('profile_invite_to_see_analytics', 'supplier_portal')}
                        </p>
                    </div>
                ) : (
                    <div className="h-[180px] w-full">
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                                    formatter={(value: number, _name: string, props: { payload?: { name: string } }) => {
                                        const key = props.payload?.name ?? '';
                                        const labelKey = TOOLTIP_KEYS[key];
                                        const label = labelKey ? t(labelKey, 'supplier_portal') : key;
                                        return [value, label];
                                    }}
                                />
                                <Bar dataKey="value" fill={BAR_FILL} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
