import { AlertOctagon } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import type { CurrencyAmountRow } from '@/Components/dashboard/ContractValueCard';

export interface ExecutionRiskPayload {
    open_variations: number;
    variation_exposure: CurrencyAmountRow[];
    open_claims: number;
    open_notices: number;
}

export interface ContractExecutionRiskCardProps {
    data?: ExecutionRiskPayload | null;
}

const defaultPayload: ExecutionRiskPayload = {
    open_variations: 0,
    variation_exposure: [],
    open_claims: 0,
    open_notices: 0,
};

export function ContractExecutionRiskCard({ data }: ContractExecutionRiskCardProps) {
    const { t } = useLocale('dashboard');
    const d = data ?? defaultPayload;

    return (
        <CardPanel title={t('execution_risk_title')} icon={AlertOctagon} className="col-span-12 md:col-span-6 lg:col-span-6">
            <div className="space-y-4 text-sm" dir="inherit">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-text-muted">{t('open_variations')}</span>
                    <span className="tabular-nums font-semibold text-text-main">{d.open_variations.toLocaleString()}</span>
                </div>
                <div>
                    <p className="mb-1 text-xs text-text-muted">{t('variation_exposure')}</p>
                    {d.variation_exposure.length === 0 ? (
                        <p className="text-text-muted">—</p>
                    ) : (
                        <ul className="space-y-1">
                            {d.variation_exposure.map((row) => (
                                <li key={row.currency} className="flex justify-between gap-2 tabular-nums">
                                    <span className="text-text-muted">{row.currency}</span>
                                    <span className="font-medium">
                                        {Number(row.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-text-muted">{t('open_claims')}</span>
                    <span className="tabular-nums font-semibold text-text-main">{d.open_claims.toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-text-muted">{t('open_notices')}</span>
                    <span className="tabular-nums font-semibold text-text-main">{d.open_notices.toLocaleString()}</span>
                </div>
            </div>
            <Link href={route('contracts.index')} className="mt-3 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline">
                {t('view_contracts')}
            </Link>
        </CardPanel>
    );
}
