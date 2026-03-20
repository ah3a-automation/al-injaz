import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { BarChart3 } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

interface SupplierRFQAnalyticsCardProps {
    rfqsInvited?: number;
    quotesSubmitted?: number;
    awardsWon?: number;
    rfqsDeclined?: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(221 83% 53%)', 'hsl(var(--destructive))'];

export default function SupplierRFQAnalyticsCard({
    rfqsInvited = 0,
    quotesSubmitted = 0,
    awardsWon = 0,
    rfqsDeclined = 0,
}: SupplierRFQAnalyticsCardProps) {
    const data = [
        { name: 'Invited', value: rfqsInvited, fill: COLORS[0] },
        { name: 'Submitted', value: quotesSubmitted, fill: COLORS[1] },
        { name: 'Awards', value: awardsWon, fill: COLORS[2] },
        { name: 'Declined', value: rfqsDeclined, fill: COLORS[3] },
    ];

    const isPlaceholder = rfqsInvited === 0 && quotesSubmitted === 0 && awardsWon === 0 && rfqsDeclined === 0;

    return (
        <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" />
                    RFQ Participation
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                                formatter={(value: number) => [value, '']}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {isPlaceholder && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        Analytics will appear after RFQ activity.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
