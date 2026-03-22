import { UserCheck } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

export interface SupplierApprovalFunnelPayload {
    suppliers_pending_approval: number;
    suppliers_approved_this_month: number;
    suppliers_rejected_this_month: number;
    supplier_approval_rate: number | null;
}

export interface SupplierApprovalFunnelCardProps {
    data?: SupplierApprovalFunnelPayload | null;
}

const defaultPayload: SupplierApprovalFunnelPayload = {
    suppliers_pending_approval: 0,
    suppliers_approved_this_month: 0,
    suppliers_rejected_this_month: 0,
    supplier_approval_rate: null,
};

export function SupplierApprovalFunnelCard({ data }: SupplierApprovalFunnelCardProps) {
    const { t } = useLocale('dashboard');
    const d = data ?? defaultPayload;
    const ratePct =
        d.supplier_approval_rate !== null && d.supplier_approval_rate !== undefined
            ? `${(d.supplier_approval_rate * 100).toFixed(1)}%`
            : '—';

    return (
        <CardPanel title={t('supplier_approval_funnel_title')} icon={UserCheck} className="col-span-12 md:col-span-6 lg:col-span-6">
            <ul className="space-y-3 text-sm" dir="inherit">
                <li className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-text-muted">{t('suppliers_pending_approval')}</span>
                    <span className="tabular-nums font-semibold text-text-main">
                        {d.suppliers_pending_approval.toLocaleString()}
                    </span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-text-muted">{t('suppliers_approved_this_month')}</span>
                    <span className="tabular-nums font-semibold text-text-main">
                        {d.suppliers_approved_this_month.toLocaleString()}
                    </span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-text-muted">{t('suppliers_rejected_this_month')}</span>
                    <span className="tabular-nums font-semibold text-text-main">
                        {d.suppliers_rejected_this_month.toLocaleString()}
                    </span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-text-muted">{t('supplier_approval_rate')}</span>
                    <span className="tabular-nums font-semibold text-text-main">{ratePct}</span>
                </li>
            </ul>
            <p className="mt-3 text-xs text-text-muted">{t('supplier_approval_funnel_help')}</p>
            <Link href={route('suppliers.index')} className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline">
                {t('view_suppliers')}
            </Link>
        </CardPanel>
    );
}
