import { Banknote } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import type { SharedPageProps } from '@/types';

export interface CurrencyAmountRow {
    currency: string;
    amount: string;
}

export interface InvoicePipelineSection {
    count: number;
    amounts: CurrencyAmountRow[];
}

export interface InvoicePipelinePayload {
    invoices_pending_approval: InvoicePipelineSection;
    invoices_approved_unpaid: InvoicePipelineSection;
    invoices_total_outstanding: InvoicePipelineSection;
}

export interface InvoicePipelineCardProps {
    data?: InvoicePipelinePayload | null;
}

function formatMoney(amount: string, currency: string, locale: string): string {
    const ccy = currency && currency.length === 3 ? currency : 'SAR';
    try {
        return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: ccy,
            maximumFractionDigits: 2,
        }).format(Number(amount));
    } catch {
        return `${amount} ${ccy}`;
    }
}

export function InvoicePipelineCard({ data }: InvoicePipelineCardProps) {
    const { t } = useLocale('dashboard');
    const { locale } = usePage().props as SharedPageProps;
    const loc = locale === 'ar' ? 'ar' : 'en';

    const d = data;
    const contractsHref = route('contracts.index');

    const renderAmounts = (rows: CurrencyAmountRow[]) => (
        <ul className="mt-1 space-y-0.5 text-sm text-text-muted">
            {rows.length === 0 ? (
                <li>—</li>
            ) : (
                rows.map((row) => (
                    <li key={row.currency} className="tabular-nums">
                        {formatMoney(row.amount, row.currency, loc)}
                    </li>
                ))
            )}
        </ul>
    );

    if (d === undefined || d === null) {
        return (
            <CardPanel title={t('invoice_pipeline_title')} icon={Banknote}>
                <p className="text-sm text-text-muted">{t('no_data')}</p>
            </CardPanel>
        );
    }

    return (
        <CardPanel title={t('invoice_pipeline_title')} icon={Banknote} className="h-full">
            <div className="space-y-4 text-start" dir="inherit">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('invoices_pending_approval_label')}
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-text-main">
                        {d.invoices_pending_approval.count.toLocaleString()}
                    </p>
                    {renderAmounts(d.invoices_pending_approval.amounts)}
                </div>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('invoices_approved_unpaid_label')}
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-text-main">
                        {d.invoices_approved_unpaid.count.toLocaleString()}
                    </p>
                    {renderAmounts(d.invoices_approved_unpaid.amounts)}
                </div>
                <div className="rounded-md border border-border-soft bg-muted/30 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('invoices_total_outstanding_label')}
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-text-main">
                        {d.invoices_total_outstanding.count.toLocaleString()}
                    </p>
                    {renderAmounts(d.invoices_total_outstanding.amounts)}
                </div>
                <Link href={contractsHref} className="inline-block text-sm text-primary underline-offset-4 hover:underline">
                    {t('view_contracts')}
                </Link>
            </div>
        </CardPanel>
    );
}
