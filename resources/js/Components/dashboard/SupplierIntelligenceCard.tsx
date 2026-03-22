import { BarChart3 } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

export interface SupplierIntelligenceRow {
    supplier: string;
    score: number;
    projects: number;
}

export interface HighRiskSupplierRow {
    id: string;
    supplier: string;
    score: number;
}

export interface SupplierIntelligenceData {
    top_suppliers_by_score?: SupplierIntelligenceRow[];
    average_supplier_score?: number;
    high_risk_suppliers?: HighRiskSupplierRow[];
    suppliers_by_region?: Array<{ region: string; count: number }>;
}

export interface SupplierIntelligenceCardProps {
    data?: SupplierIntelligenceData | null;
}

const defaultRows: SupplierIntelligenceRow[] = [];

export function SupplierIntelligenceCard({ data }: SupplierIntelligenceCardProps) {
    const topSuppliers = data?.top_suppliers_by_score ?? defaultRows;
    const highRisk = data?.high_risk_suppliers ?? [];
    const avgScore = data?.average_supplier_score ?? 0;
    const { t } = useLocale('dashboard');

    return (
        <CardPanel title={t('supplier_intelligence_title')} icon={BarChart3}>
            <div className="mb-4 rounded-lg bg-brand-gold100 px-3 py-2">
                <span className="text-sm text-text-muted">{t('avg_supplier_score')}</span>
                <p className="text-xl font-semibold text-text-main">
                    {typeof avgScore === 'number' ? avgScore.toFixed(1) : '—'}
                </p>
            </div>

            {highRisk.length > 0 && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">{t('high_risk_suppliers_title')}</p>
                    <ul className="mt-2 space-y-2">
                        {highRisk.map((row) => (
                            <li key={row.id}>
                                <Link
                                    href={route('suppliers.show', row.id)}
                                    className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-amber-950 underline-offset-2 hover:underline dark:text-amber-50"
                                >
                                    <span className="font-medium">{row.supplier}</span>
                                    <span className="tabular-nums text-amber-800 dark:text-amber-200">
                                        {t('risk_score_label', 'dashboard', { score: row.score })}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-border-soft">
                <table className="w-full text-sm">
                    <thead className="border-b border-border-soft bg-surface font-semibold text-text-main">
                        <tr>
                            <th className="p-3 text-start">{t('col_supplier')}</th>
                            <th className="p-3 text-start">{t('col_score')}</th>
                            <th className="p-3 text-start">{t('col_projects')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topSuppliers.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-text-muted">
                                    {t('no_data')}
                                </td>
                            </tr>
                        ) : (
                            topSuppliers.map((row, i) => (
                                <tr
                                    key={i}
                                    className="border-t border-border-soft bg-white hover:bg-brand-gold100"
                                >
                                    <td className="p-3 font-medium text-text-main">{row.supplier}</td>
                                    <td className="p-3 text-text-muted">{row.score}</td>
                                    <td className="p-3 text-text-muted">{row.projects}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </CardPanel>
    );
}
