import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { BarChart3 } from 'lucide-react';

interface SupplierMetricsCardProps {
    invitedRfqs?: number;
    submittedQuotes?: number;
    awards?: number;
}

function Metric({ label, value }: { label: string; value: number | undefined }) {
    return (
        <div className="flex flex-col">
            <span className="text-2xl font-semibold">{value ?? '—'}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
        </div>
    );
}

export default function SupplierMetricsCard({
    invitedRfqs = 0,
    submittedQuotes = 0,
    awards = 0,
}: SupplierMetricsCardProps) {
    return (
        <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" />
                    Metrics
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <Metric label="Invited RFQs" value={invitedRfqs} />
                    <Metric label="Submitted Quotes" value={submittedQuotes} />
                    <Metric label="Awards" value={awards} />
                </div>
            </CardContent>
        </Card>
    );
}
