import { Scale } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

export interface GovernanceRiskPayload {
    contracts_stuck_in_draft: number;
    contracts_in_review_over_7_days: number;
    articles_pending_approval: number;
    open_negotiations: number;
}

export interface GovernanceRiskCardProps {
    data?: GovernanceRiskPayload | null;
}

const defaultPayload: GovernanceRiskPayload = {
    contracts_stuck_in_draft: 0,
    contracts_in_review_over_7_days: 0,
    articles_pending_approval: 0,
    open_negotiations: 0,
};

export function GovernanceRiskCard({ data }: GovernanceRiskCardProps) {
    const { t } = useLocale('dashboard');
    const d = data ?? defaultPayload;

    return (
        <CardPanel title={t('governance_risk_title')} icon={Scale} className="col-span-12 md:col-span-6 lg:col-span-6">
            <ul className="space-y-3 text-sm" dir="inherit">
                <li className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-text-muted">{t('contracts_stuck_in_draft')}</span>
                    <span className="tabular-nums font-semibold text-text-main">
                        {d.contracts_stuck_in_draft.toLocaleString()}
                    </span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-text-muted">{t('contracts_in_review_over_7_days')}</span>
                    <span className="tabular-nums font-semibold text-text-main">
                        {d.contracts_in_review_over_7_days.toLocaleString()}
                    </span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-text-muted">{t('articles_pending_approval')}</span>
                    <span className="tabular-nums font-semibold text-text-main">
                        {d.articles_pending_approval.toLocaleString()}
                    </span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-text-muted">{t('open_negotiations')}</span>
                    <span className="tabular-nums font-semibold text-text-main">
                        {d.open_negotiations.toLocaleString()}
                    </span>
                </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <Link href={route('contracts.index')} className="font-medium text-primary underline-offset-4 hover:underline">
                    {t('view_contracts')}
                </Link>
                <Link
                    href={route('contract-articles.index')}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                >
                    {t('view_contract_articles')}
                </Link>
            </div>
        </CardPanel>
    );
}
