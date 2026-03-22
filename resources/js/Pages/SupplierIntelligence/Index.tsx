import AppLayout from '@/Layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, BarChart3, RefreshCw, Shield, TrendingUp, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useLocale } from '@/hooks/useLocale';

interface SupplierItem {
    id: string;
    supplier_code: string;
    legal_name_en: string;
    status: string;
    rank: number;
    score: number;
    ranking_score: number | null;
    ranking_tier: string | null;
    risk_score: number | null;
    risk_level: string;
    compliance_status: string;
    compliance_score: number;
    utilization_percent: number | null;
    response_rate: number | null;
    award_rate: number | null;
    on_watchlist?: boolean;
}

interface IndexProps {
    suppliers: SupplierItem[];
    summary: {
        total_suppliers: number;
        high_risk_count: number;
        expiring_soon_count: number;
        over_capacity_count: number;
    };
    filter: string;
    can: { recalculate: boolean; recalculate_ranking?: boolean };
}

const FILTER_DEFS = [
    { value: 'all', key: 'intelligence_filter_all' },
    { value: 'high_risk', key: 'intelligence_filter_high_risk' },
    { value: 'non_compliant', key: 'intelligence_filter_non_compliant' },
    { value: 'over_capacity', key: 'intelligence_filter_over_capacity' },
    { value: 'suspended', key: 'intelligence_filter_suspended' },
    { value: 'blacklisted', key: 'intelligence_filter_blacklisted' },
] as const;

const COMPLIANCE_KEYS: Record<string, string> = {
    compliant: 'intelligence_compliance_compliant',
    expiring_soon: 'intelligence_compliance_expiring_soon',
    non_compliant: 'intelligence_compliance_non_compliant',
};

function complianceLabel(s: string, t: (key: string) => string): string {
    const k = COMPLIANCE_KEYS[s];
    if (!k) return s;
    const out = t(k);
    return out === k ? s : out;
}

function riskLevelClass(level: string): string {
    switch (level) {
        case 'critical':
            return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30';
        case 'high':
            return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30';
        case 'medium':
            return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
        case 'low':
        default:
            return 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30';
    }
}

function riskBadgeVariant(risk: number | null): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (risk === null) return 'outline';
    if (risk >= 70) return 'destructive';
    if (risk >= 40) return 'secondary';
    return 'default';
}

export default function SupplierIntelligenceIndex({ suppliers, summary, filter, can }: IndexProps) {
    const { t } = useLocale('suppliers');
    const filters = useMemo(
        () => FILTER_DEFS.map((f) => ({ value: f.value, label: t(f.key) })),
        [t]
    );

    return (
        <AppLayout>
            <Head title="Supplier Intelligence" />
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Supplier Intelligence</h1>
                        <p className="text-muted-foreground text-sm">
                            Risk score, compliance, financial capacity, and ranking.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('suppliers.index')}>Suppliers</Link>
                        </Button>
                        {can.recalculate && (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => router.post(route('supplier-intelligence.recalculate-all'))}
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Recalculate risk scores
                                </Button>
                                {can.recalculate_ranking && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.post(route('supplier-intelligence.recalculate-all-ranking'))}
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Recalculate ranking scores
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="rounded-xl border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total suppliers</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{summary.total_suppliers}</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">High risk (≥61)</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{summary.high_risk_count}</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Compliance expiring soon</CardTitle>
                            <Shield className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{summary.expiring_soon_count}</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Over capacity</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{summary.over_capacity_count}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-wrap gap-2">
                    {filters.map((f) => (
                        <Button
                            key={f.value}
                            variant={filter === f.value ? 'default' : 'outline'}
                            size="sm"
                            asChild
                        >
                            <Link href={route('supplier-intelligence.index', { filter: f.value })}>
                                {f.label}
                            </Link>
                        </Button>
                    ))}
                </div>

                <Card className="rounded-xl border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Supplier ranking
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Ranked by composite score (compliance, risk, capacity, performance).
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="pb-2 text-left font-medium">Rank</th>
                                        <th className="pb-2 text-left font-medium">Supplier</th>
                                        <th className="pb-2 text-left font-medium">Status</th>
                                        <th className="pb-2 text-right font-medium">Ranking</th>
                                        <th className="pb-2 text-right font-medium">Risk</th>
                                        <th className="pb-2 text-left font-medium">Risk level</th>
                                        <th className="pb-2 text-left font-medium">Compliance</th>
                                        <th className="pb-2 text-right font-medium">Compliance score</th>
                                        <th className="pb-2 text-right font-medium">Utilization</th>
                                        <th className="pb-2 text-right font-medium">Response</th>
                                        <th className="pb-2 text-right font-medium">Award rate</th>
                                        <th className="pb-2 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suppliers.map((s) => (
                                        <tr key={s.id} className="border-b last:border-0">
                                            <td className="py-3 font-mono">{s.rank}</td>
                                            <td className="py-3">
                                                <Link
                                                    href={route('supplier-intelligence.show', s.id)}
                                                    className="font-medium text-primary hover:underline"
                                                >
                                                    {s.legal_name_en}
                                                </Link>
                                                <span className="ml-1 text-muted-foreground">({s.supplier_code})</span>
                                            </td>
                                            <td className="py-3">
                                                <Badge variant="outline">{s.status.replace(/_/g, ' ')}</Badge>
                                            </td>
                                            <td className="py-3 text-right">
                                                <span className="font-mono" title="Composite score">{s.score.toFixed(1)}</span>
                                                {s.ranking_tier && (
                                                    <span
                                                        className={`ml-1.5 rounded border px-1.5 py-0.5 text-xs capitalize ${
                                                            s.ranking_tier === 'preferred' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' :
                                                            s.ranking_tier === 'approved' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400' :
                                                            s.ranking_tier === 'watchlist' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                                                            'bg-red-500/15 text-red-700 dark:text-red-400'
                                                        }`}
                                                        title={s.ranking_score != null ? `Ranking score: ${s.ranking_score.toFixed(1)}` : undefined}
                                                    >
                                                        {s.ranking_tier}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 text-right">
                                                <Badge variant={riskBadgeVariant(s.risk_score)}>
                                                    {s.risk_score ?? '—'}
                                                </Badge>
                                            </td>
                                            <td className="py-3">
                                                <span className={`rounded border px-1.5 py-0.5 text-xs font-medium capitalize ${riskLevelClass(s.risk_level)}`}>
                                                    {s.risk_level}
                                                </span>
                                            </td>
                                            <td className="py-3">{complianceLabel(s.compliance_status, t)}</td>
                                            <td className="py-3 text-right font-mono">{s.compliance_score}</td>
                                            <td className="py-3 text-right">
                                                {s.utilization_percent != null ? `${s.utilization_percent}%` : '—'}
                                            </td>
                                            <td className="py-3 text-right">
                                                {s.response_rate != null ? `${s.response_rate}%` : '—'}
                                            </td>
                                            <td className="py-3 text-right">
                                                {s.award_rate != null ? `${s.award_rate}%` : '—'}
                                            </td>
                                            <td className="py-3 text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={route('supplier-intelligence.show', s.id)}>View</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {suppliers.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">No suppliers to rank.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
