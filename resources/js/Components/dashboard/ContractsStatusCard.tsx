import { FileSignature } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';

export interface ContractsStatusPayload {
    contracts_pending_review: number;
    contracts_awaiting_signature: number;
    contracts_active: number;
    contracts_pipeline_count: number;
}

export interface ContractsStatusCardProps {
    data?: ContractsStatusPayload | null;
}

const defaultPayload: ContractsStatusPayload = {
    contracts_pending_review: 0,
    contracts_awaiting_signature: 0,
    contracts_active: 0,
    contracts_pipeline_count: 0,
};

export function ContractsStatusCard({ data }: ContractsStatusCardProps) {
    const { t } = useLocale('dashboard');
    const d = data ?? defaultPayload;

    const pendingHref = route('contracts.index', { status: 'ready_for_review' });
    const signatureHref = route('contracts.index', { status: 'pending_signature' });
    const activeHref = route('contracts.index', { status: 'active' });
    const pipelineHref = route('contracts.index');

    return (
        <CardPanel title={t('contracts_status_title')} icon={FileSignature} className="h-full">
            <div className="flex flex-col gap-3" dir="inherit">
                <Link
                    href={pendingHref}
                    className={cn(
                        'rounded-lg border border-border-soft p-3 transition-colors hover:bg-muted/40',
                        d.contracts_pending_review > 0 && 'border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/25'
                    )}
                >
                    <p
                        className={cn(
                            'text-xl font-semibold tabular-nums',
                            d.contracts_pending_review > 0
                                ? 'text-amber-800 dark:text-amber-200'
                                : 'text-text-main'
                        )}
                    >
                        {d.contracts_pending_review.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-muted">{t('contracts_pending_review')}</p>
                </Link>
                <Link href={signatureHref} className="rounded-lg border border-border-soft p-3 transition-colors hover:bg-muted/40">
                    <p className="text-xl font-semibold tabular-nums text-text-main">
                        {d.contracts_awaiting_signature.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-muted">{t('contracts_awaiting_signature')}</p>
                </Link>
                <Link href={activeHref} className="rounded-lg border border-border-soft p-3 transition-colors hover:bg-muted/40">
                    <p className="text-xl font-semibold tabular-nums text-text-main">{d.contracts_active.toLocaleString()}</p>
                    <p className="text-xs text-text-muted">{t('contracts_active')}</p>
                </Link>
                <Link
                    href={pipelineHref}
                    className="rounded-lg border border-border-soft p-3 transition-colors hover:bg-muted/40"
                    title={t('contracts_pipeline_help')}
                >
                    <p className="text-xl font-semibold tabular-nums text-text-main">
                        {d.contracts_pipeline_count.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-muted">{t('contracts_pipeline_count')}</p>
                </Link>
            </div>
        </CardPanel>
    );
}
