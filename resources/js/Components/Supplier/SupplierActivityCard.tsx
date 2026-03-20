import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Activity } from 'lucide-react';

interface ActivityItem {
    id: string;
    label: string;
    date?: string;
}

interface SupplierActivityCardProps {
    items?: ActivityItem[];
}

export default function SupplierActivityCard({ items = [] }: SupplierActivityCardProps) {
    const defaultItems: ActivityItem[] = [
        { id: '1', label: 'Supplier registered', date: undefined },
        { id: '2', label: 'RFQ invited', date: undefined },
        { id: '3', label: 'Quotation submitted', date: undefined },
        { id: '4', label: 'Supplier approved', date: undefined },
    ];
    const list = items.length > 0 ? items : defaultItems;

    return (
        <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4" />
                    Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {list.map((item) => (
                        <li key={item.id} className="flex items-start gap-3 border-l-2 border-muted pl-3">
                            <span className="text-sm">{item.label}</span>
                            {item.date && (
                                <span className="text-xs text-muted-foreground">{item.date}</span>
                            )}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
