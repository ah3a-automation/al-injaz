import { Coins } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

export interface CurrencyAmountRow {
    currency: string;
    amount: string;
}

export interface ContractValueCardProps {
    active_contracts_value?: CurrencyAmountRow[] | null;
    pipeline_contracts_value?: CurrencyAmountRow[] | null;
}

function formatRows(rows: CurrencyAmountRow[] | null | undefined): CurrencyAmountRow[] {
    return rows ?? [];
}

export function ContractValueCard({ active_contracts_value, pipeline_contracts_value }: ContractValueCardProps) {
    const { t } = useLocale('dashboard');
    const active = formatRows(active_contracts_value);
    const pipeline = formatRows(pipeline_contracts_value);

    return (
        <CardPanel title={t('contract_value_title')} icon={Coins} className="col-span-12 md:col-span-6 lg:col-span-6">
            <div className="grid gap-6 sm:grid-cols-2" dir="inherit">
                <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                        {t('active_contracts_value_label')}
                    </p>
                    {active.length === 0 ? (
                        <p className="text-sm text-text-muted">—</p>
                    ) : (
                        <ul className="space-y-1 text-sm">
                            {active.map((row) => (
                                <li key={row.currency} className="flex justify-between gap-2 tabular-nums">
                                    <span className="text-text-muted">{row.currency}</span>
                                    <span className="font-medium text-text-main">
                                        {Number(row.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                        {t('pipeline_contracts_value_label')}
                    </p>
                    {pipeline.length === 0 ? (
                        <p className="text-sm text-text-muted">—</p>
                    ) : (
                        <ul className="space-y-1 text-sm">
                            {pipeline.map((row) => (
                                <li key={row.currency} className="flex justify-between gap-2 tabular-nums">
                                    <span className="text-text-muted">{row.currency}</span>
                                    <span className="font-medium text-text-main">
                                        {Number(row.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            <p className="mt-4 text-xs text-text-muted">{t('contract_value_help')}</p>
            <Link href={route('contracts.index')} className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline">
                {t('view_contracts')}
            </Link>
        </CardPanel>
    );
}
