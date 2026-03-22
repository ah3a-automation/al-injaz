import { FileText } from 'lucide-react';
import { CardPanel } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

export interface PipelineCounts {
    draft: number;
    sent: number;
    quotes_received: number;
    evaluation: number;
    awarded: number;
}

const defaultPipeline: PipelineCounts = {
    draft: 0,
    sent: 0,
    quotes_received: 0,
    evaluation: 0,
    awarded: 0,
};

const stageLabels: { key: keyof PipelineCounts; translationKey: string }[] = [
    { key: 'draft', translationKey: 'status_draft' },
    { key: 'sent', translationKey: 'status_sent' },
    { key: 'quotes_received', translationKey: 'status_quotes' },
    { key: 'evaluation', translationKey: 'status_evaluation' },
    { key: 'awarded', translationKey: 'status_awarded' },
];

export interface RFQPipelineCardProps {
    pipeline?: PipelineCounts | null;
    /** 0–100: issued RFQs with at least one submitted/revised quote */
    rfqResponseRate?: number | null;
}

export function RFQPipelineCard({ pipeline: pipelineProp, rfqResponseRate }: RFQPipelineCardProps) {
    const pipeline = pipelineProp ?? defaultPipeline;
    const { t } = useLocale('dashboard');
    const stages = stageLabels.map(({ key, translationKey }) => ({
        label: t(translationKey),
        count: pipeline[key],
    }));
    const total = stages.reduce((sum, s) => sum + s.count, 0);
    const rate = typeof rfqResponseRate === 'number' && !Number.isNaN(rfqResponseRate) ? Math.min(100, Math.max(0, rfqResponseRate)) : 0;

    return (
        <CardPanel title={t('rfq_pipeline')} icon={FileText}>
            <div className="space-y-3">
                {stages.map(({ label, count }) => {
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                        <div key={label} className="flex items-center gap-3">
                            <span className="w-36 shrink-0 text-sm text-text-muted">{label}</span>
                            <div className="min-w-0 flex-1">
                                <div className="h-2 overflow-hidden rounded-full bg-brand-gold100">
                                    <div
                                        className="h-full rounded-full bg-brand-gold transition-all"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                            <span className="w-8 shrink-0 text-right text-sm font-medium text-text-main">
                                {count}
                            </span>
                        </div>
                    );
                })}
            </div>
            <p className="mt-3 text-xs text-text-muted">{t('total_rfqs', 'dashboard', { count: total })}</p>

            <div className="mt-4 border-t border-border-soft pt-4" dir="inherit">
                <p className="text-sm font-medium text-text-main">{t('rfq_response_rate_label')}</p>
                <p className="mt-1 text-xs text-text-muted">{t('rfq_response_rate_help')}</p>
                <div className="mt-2 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-brand-gold100">
                            <div
                                className="h-full rounded-full bg-emerald-600 transition-all dark:bg-emerald-500"
                                style={{ width: `${rate}%` }}
                            />
                        </div>
                    </div>
                    <span className="w-12 shrink-0 text-end text-sm font-semibold tabular-nums text-text-main">
                        {rate}%
                    </span>
                </div>
            </div>
        </CardPanel>
    );
}
