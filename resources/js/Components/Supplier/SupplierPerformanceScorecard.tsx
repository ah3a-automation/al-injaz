import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Gauge } from 'lucide-react';

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
                <span className="font-medium">{value != null ? `${value}%` : '—'}</span>
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
    const allEmpty = responseRate == null && awardRate == null && onTimeDeliveryRate == null && qualityScore == null;

    return (
        <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="h-4 w-4" />
                    Performance Scorecard
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <ScoreBar label="Response Rate" value={responseRate ?? undefined} />
                <ScoreBar label="Award Rate" value={awardRate ?? undefined} />
                <ScoreBar label="On-Time Submission" value={onTimeDeliveryRate ?? undefined} />
                <ScoreBar label="Quality Score" value={qualityScore ?? undefined} />
                {allEmpty && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        Analytics will appear after RFQ activity.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
