import { Trophy } from 'lucide-react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

export interface SupplierRankingRow {
    supplier: string;
    score: number;
    projects: number;
    avg_quote_rank: number;
}

export interface SupplierRankingCardProps {
    rows?: SupplierRankingRow[] | null;
}

const placeholderRows: SupplierRankingRow[] = [
    { supplier: '—', score: 0, projects: 0, avg_quote_rank: 0 },
];

export function SupplierRankingCard({ rows }: SupplierRankingCardProps) {
    const data = rows && rows.length > 0 ? rows : placeholderRows;
    const { t } = useLocale();

    return (
        <CardPanel title={t('supplier_ranking', 'dashboard')} icon={Trophy}>
            <div className="overflow-hidden rounded-xl border border-border-soft">
                <table className="w-full text-sm">
                    <thead className="border-b border-border-soft bg-surface text-text-main font-semibold">
                        <tr>
                            <th className="p-3 text-start">{t('col_supplier', 'dashboard')}</th>
                            <th className="p-3 text-start">{t('col_score', 'dashboard')}</th>
                            <th className="p-3 text-start">{t('col_projects', 'dashboard')}</th>
                            <th className="p-3 text-start">{t('col_avg_rank', 'dashboard')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr
                                key={i}
                                className="border-t border-border-soft bg-white hover:bg-brand-gold100"
                            >
                                <td className="p-3 font-medium text-text-main">
                                    {row.supplier}
                                </td>
                                <td className="p-3 text-text-muted">{row.score}</td>
                                <td className="p-3 text-text-muted">{row.projects}</td>
                                <td className="p-3 text-text-muted">
                                    {row.avg_quote_rank > 0 ? row.avg_quote_rank.toFixed(1) : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CardPanel>
    );
}
