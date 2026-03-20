import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Layers } from 'lucide-react';
import { Badge } from '@/Components/ui/badge';

interface CapabilityRow {
    categoryName: string;
    capabilityName: string;
    level?: string;
}

interface SupplierCapabilityMatrixCardProps {
    capabilities?: Array<{
        id: number;
        name: string;
        category?: { id: number; name: string } | null;
        pivot?: { proficiency_level?: string } | null;
    }>;
}

const LEVEL_LABELS: Record<string, string> = {
    basic: 'Basic',
    standard: 'Standard',
    advanced: 'Advanced',
    expert: 'Expert',
};

export default function SupplierCapabilityMatrixCard({ capabilities = [] }: SupplierCapabilityMatrixCardProps) {
    const rows: CapabilityRow[] = capabilities.map((c) => ({
        categoryName: c.category?.name ?? '—',
        capabilityName: c.name,
        level: c.pivot?.proficiency_level ? (LEVEL_LABELS[c.pivot.proficiency_level] ?? c.pivot.proficiency_level) : undefined,
    }));

    return (
        <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="h-4 w-4" />
                    Capability Matrix
                </CardTitle>
            </CardHeader>
            <CardContent>
                {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No capabilities assigned.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="pb-2 pr-4 font-medium">Category</th>
                                    <th className="pb-2 pr-4 font-medium">Capability</th>
                                    <th className="pb-2 font-medium">Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={i} className="border-b last:border-0">
                                        <td className="py-2 pr-4">{row.categoryName}</td>
                                        <td className="py-2 pr-4">{row.capabilityName}</td>
                                        <td className="py-2">
                                            {row.level ? <Badge variant="secondary">{row.level}</Badge> : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
