import { BarChart3 } from 'lucide-react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

export interface SupplierIntelligenceRow {
    supplier: string;
    score: number;
    projects: number;
}

export interface SupplierIntelligenceData {
    top_suppliers_by_score?: SupplierIntelligenceRow[];
    average_supplier_score?: number;
    high_risk_suppliers?: Array<{ supplier: string; score: number }>;
    suppliers_by_region?: Array<{ region: string; count: number }>;
}

export interface SupplierIntelligenceCardProps {
    data?: SupplierIntelligenceData | null;
}

const defaultRows: SupplierIntelligenceRow[] = [];

export function SupplierIntelligenceCard({ data }: SupplierIntelligenceCardProps) {
    const topSuppliers = data?.top_suppliers_by_score ?? defaultRows;
    const avgScore = data?.average_supplier_score ?? 0;
    const { t } = useLocale();

    return (
        <CardPanel title={t('supplier_intelligence_title', 'dashboard')} icon={BarChart3}>
            <div className="mb-4 rounded-lg bg-brand-gold100 px-3 py-2">
                <span className="text-sm text-text-muted">
                    {t('avg_supplier_score', 'dashboard')}
                </span>
                <p className="text-xl font-semibold text-text-main">
                    {typeof avgScore === 'number' ? avgScore.toFixed(1) : '—'}
                </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border-soft">
                <table className="w-full text-sm">
                    <thead className="border-b border-border-soft bg-surface text-text-main font-semibold">
                        <tr>
                            <th className="p-3 text-start">{t('col_supplier', 'dashboard')}</th>
                            <th className="p-3 text-start">{t('col_score', 'dashboard')}</th>
                            <th className="p-3 text-start">{t('col_projects', 'dashboard')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topSuppliers.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-text-muted">
                                    {t('no_data', 'dashboard')}
                                </td>
                            </tr>
                        ) : (
                            topSuppliers.map((row, i) => (
                                <tr
                                    key={i}
                                    className="border-t border-border-soft bg-white hover:bg-brand-gold100"
                                >
                                    <td className="p-3 font-medium text-text-main">
                                        {row.supplier}
                                    </td>
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
