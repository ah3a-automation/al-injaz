import AppLayout from '@/Layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, BarChart3, Bell, RefreshCw, Shield, Star, Wallet } from 'lucide-react';

interface RankingFactor {
    key: string;
    label: string;
    value: number;
    weight: number;
    impact: number;
}

interface SupplierData {
    id: string;
    supplier_code: string;
    legal_name_en: string;
    status: string;
    risk_score: number | null;
    risk_level: string;
    compliance_score: number;
    ranking_score: number;
    ranking_tier?: string;
    ranking_factors?: RankingFactor[];
    suspension_reason: string | null;
    blacklist_reason: string | null;
}

interface AlertItem {
    type: string;
    days_remaining?: number;
}

interface ComplianceData {
    status: string;
    cr: { valid: boolean; expiry_date: string | null; status: string };
    vat: { valid: boolean; expiry_date: string | null; status: string };
    insurance: { valid: boolean; expiry_date: string | null; status: string };
    certifications: Array<{ name: string; expiry_date: string | null; status: string }>;
    documents_expired: Array<{ type: string; expiry_date: string | null }>;
}

interface CapacityData {
    total_awarded_value: number;
    max_contract_value: number | null;
    credit_limit: number | null;
    utilization_percent: number | null;
    over_capacity: boolean;
    status: string;
}

interface ShowProps {
    supplier: SupplierData;
    compliance: ComplianceData;
    capacity: CapacityData;
    alerts: AlertItem[];
    on_watchlist: boolean;
    can?: { recalculate_ranking?: boolean };
}

function statusLabel(s: string): string {
    return s.replace(/_/g, ' ');
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

function alertLabel(type: string, days?: number): string {
    const labels: Record<string, string> = {
        cr_expiring: `CR expiring in ${days ?? 0} days`,
        vat_expired: 'VAT expired',
        insurance_expiring: 'Insurance expiring soon',
        insurance_expired: 'Insurance expired',
        certification_expiring: 'Certification expiring soon',
        certification_expired: 'Certification expired',
        document_expired: 'Document expired',
    };
    return labels[type] ?? type.replace(/_/g, ' ');
}

function tierLabel(tier: string): string {
    return tier.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function tierClass(tier: string): string {
    switch (tier) {
        case 'preferred': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
        case 'approved': return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
        case 'watchlist': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
        case 'restricted': return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30';
        default: return 'bg-muted text-muted-foreground';
    }
}

export default function SupplierIntelligenceShow({ supplier, compliance, capacity, alerts = [], on_watchlist = false, can = {} }: ShowProps) {
    return (
        <AppLayout>
            <Head title={`Supplier Intelligence — ${supplier.legal_name_en}`} />
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={route('supplier-intelligence.index')} aria-label="Back">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">{supplier.legal_name_en}</h1>
                            <p className="text-muted-foreground text-sm">
                                {supplier.supplier_code} · {statusLabel(supplier.status)}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {on_watchlist ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.delete(route('supplier-watchlist.destroy', supplier.id))}
                            >
                                <Star className="mr-2 h-4 w-4 fill-amber-500 text-amber-500" />
                                Remove from watchlist
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.post(route('supplier-watchlist.store', supplier.id))}
                            >
                                <Star className="mr-2 h-4 w-4" />
                                Add to watchlist
                            </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('suppliers.show', supplier.id)}>Supplier profile</Link>
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => router.post(route('suppliers.recalculate-risk', supplier.id))}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Recalculate risk
                        </Button>
                        {can.recalculate_ranking && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.post(route('supplier-intelligence.recalculate-ranking', supplier.id))}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Recalculate ranking
                            </Button>
                        )}
                    </div>
                </div>

                {alerts.length > 0 && (
                    <Card className="rounded-xl border-amber-500/50 bg-amber-500/5 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
                                <Bell className="h-4 w-4" />
                                Compliance alerts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-1 text-sm">
                                {alerts.map((a, i) => (
                                    <li key={i}>{alertLabel(a.type, a.days_remaining)}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="rounded-xl border shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <BarChart3 className="h-4 w-4" />
                                Risk score
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-3xl font-bold">{supplier.risk_score ?? '—'}</p>
                                <span className={`rounded border px-2 py-0.5 text-sm font-medium capitalize ${riskLevelClass(supplier.risk_level)}`}>
                                    {supplier.risk_level}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">0 = low risk, 100 = high risk</p>
                            <div className="flex flex-wrap items-center gap-4 pt-2 text-sm">
                                <span><strong>Compliance score:</strong> {supplier.compliance_score} / 100</span>
                                <span><strong>Ranking score:</strong> {supplier.ranking_score.toFixed(1)}</span>
                                {supplier.ranking_tier && (
                                    <span
                                        className={`rounded border px-2 py-0.5 text-xs font-medium capitalize ${tierClass(supplier.ranking_tier)}`}
                                        title="Ranking tier: 90+ preferred, 75+ approved, 50+ watchlist, &lt;50 restricted"
                                    >
                                        {tierLabel(supplier.ranking_tier)}
                                    </span>
                                )}
                            </div>
                            {supplier.ranking_factors && supplier.ranking_factors.length > 0 && (
                                <div className="mt-3 rounded-lg border bg-muted/20 p-3 text-xs">
                                    <p className="mb-2 font-medium">Top scoring factors</p>
                                    <ul className="space-y-1">
                                        {supplier.ranking_factors.slice(0, 5).map((f, i) => (
                                            <li key={i} className="flex justify-between gap-4">
                                                <span>{f.label}</span>
                                                <span className="tabular-nums">{f.value}% → {f.impact.toFixed(1)} pts</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {(supplier.suspension_reason || supplier.blacklist_reason) && (
                                <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                                    {supplier.suspension_reason && (
                                        <p><span className="font-medium">Suspension reason:</span> {supplier.suspension_reason}</p>
                                    )}
                                    {supplier.blacklist_reason && (
                                        <p><span className="font-medium">Blacklist reason:</span> {supplier.blacklist_reason}</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-xl border shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Wallet className="h-4 w-4" />
                                Financial capacity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-lg font-semibold">
                                Total awarded: {capacity.total_awarded_value.toLocaleString()} SAR
                            </p>
                            {capacity.max_contract_value != null && (
                                <p className="text-sm">Max contract value: {capacity.max_contract_value.toLocaleString()} SAR</p>
                            )}
                            {capacity.utilization_percent != null && (
                                <p className="text-sm">Utilization: {capacity.utilization_percent}%</p>
                            )}
                            <Badge variant={capacity.over_capacity ? 'destructive' : 'secondary'}>
                                {capacity.status.replace('_', ' ')}
                            </Badge>
                        </CardContent>
                    </Card>
                </div>

                <Card className="rounded-xl border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Shield className="h-4 w-4" />
                            Compliance tracker
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            CR, VAT, insurance, certifications, and document expiry.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Badge variant={compliance.status === 'non_compliant' ? 'destructive' : compliance.status === 'expiring_soon' ? 'secondary' : 'default'}>
                            Overall: {compliance.status.replace('_', ' ')}
                        </Badge>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-lg border p-3">
                                <p className="font-medium text-sm">CR</p>
                                <p className="text-muted-foreground text-xs">Expiry: {compliance.cr.expiry_date ?? '—'}</p>
                                <Badge variant="outline" className="mt-1">{compliance.cr.status}</Badge>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="font-medium text-sm">VAT</p>
                                <p className="text-muted-foreground text-xs">Expiry: {compliance.vat.expiry_date ?? '—'}</p>
                                <Badge variant="outline" className="mt-1">{compliance.vat.status}</Badge>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="font-medium text-sm">Insurance</p>
                                <p className="text-muted-foreground text-xs">Expiry: {compliance.insurance.expiry_date ?? '—'}</p>
                                <Badge variant="outline" className="mt-1">{compliance.insurance.status}</Badge>
                            </div>
                        </div>
                        {compliance.certifications.length > 0 && (
                            <div>
                                <p className="mb-2 font-medium text-sm">Certifications</p>
                                <ul className="space-y-1 text-sm">
                                    {compliance.certifications.map((c, i) => (
                                        <li key={i} className="flex items-center justify-between rounded border px-2 py-1">
                                            <span>{c.name}</span>
                                            <Badge variant="outline">{c.status}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {compliance.documents_expired.length > 0 && (
                            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                                <p className="font-medium text-sm text-destructive">Expired documents</p>
                                <ul className="mt-1 list-disc pl-4 text-sm text-muted-foreground">
                                    {compliance.documents_expired.map((d, i) => (
                                        <li key={i}>{d.type} ({d.expiry_date})</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
