import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Gauge } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface SupplierPerformanceScorecardProps {
    responseRate?: number | null;
    awardRate?: number | null;
    onTimeDeliveryRate?: number | null;
    qualityScore?: number | null;
}

function ScoreBar({ label, value }: { label: string; value: number | undefined }) {
    const pct = value != null ? Math.min(100, Math.max(0, value)) : 0;
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums text-foreground">{value != null ? `${value}%` : '—'}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

export default function SupplierPerformanceScorecard({
    responseRate,
    awardRate,
    onTimeDeliveryRate,
    qualityScore,
}: SupplierPerformanceScorecardProps) {
    const { t } = useLocale();
    const allEmpty = responseRate == null && awardRate == null && onTimeDeliveryRate == null && qualityScore == null;

    return (
        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="border-b border-border/40 px-4 py-2.5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    {t('profile_performance', 'supplier_portal')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
                <ScoreBar label={t('profile_response_rate', 'supplier_portal')} value={responseRate ?? undefined} />
                <ScoreBar label={t('profile_award_rate', 'supplier_portal')} value={awardRate ?? undefined} />
                <ScoreBar label={t('profile_on_time_submission', 'supplier_portal')} value={onTimeDeliveryRate ?? undefined} />
                <ScoreBar label={t('profile_quality_score', 'supplier_portal')} value={qualityScore ?? undefined} />
                {allEmpty && (
                    <p className="text-xs text-muted-foreground">
                        {t('profile_analytics_after_rfq', 'supplier_portal')}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
