import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/Textarea';
import { Badge } from '@/Components/ui/badge';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { BarChart2, CheckCircle2, ChevronRight } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { ApprovalStatusPanel } from '@/Components/ApprovalStatusPanel';

interface ComparisonProps {
    rfq: {
        id: string;
        rfq_number: string;
        status: string;
        currency: string;
        submission_deadline: string | null;
        recommendation_status: string;
        recommendation_notes: string | null;
        recommended_supplier_id: string | null;
    };
    project: { id: string; name: string; code: string | null } | null;
    package: { id: string; name: string; package_no: string | null } | null;
    supplierComparisons: Array<{
        supplier_id: string;
        supplier_name: string;
        supplier_code: string;
        invitation_status: string;
        on_vendor_list: boolean | null;
        quote_submitted: boolean;
        quote_status: string | null;
        quoted_total: number | null;
        quoted_items_count: number | null;
        clarification_count: number;
        is_recommended: boolean;
    }>;
    recommendedSupplier: { id: string; legal_name_en: string; supplier_code: string } | null;
    recommendedBy: { id: number; name: string } | null;
    recommendedAt: string | null;
    can: {
        recommend: boolean;
        submit_recommendation_for_approval?: boolean;
        approve_recommendation?: boolean;
    };
    recommendationApprovedByName?: string | null;
    recommendationApprovedAt?: string | null;
    recommendationRejectedByName?: string | null;
    recommendationRejectedAt?: string | null;
    recommendationApprovalNotes?: string | null;
    recommendationCanSubmit?: boolean;
    recommendationCanApprove?: boolean;
    recommendationCanReject?: boolean;
}

function formatCurrency(value: number, currency: string): string {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'SAR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

function SummaryItem({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground text-start">{label}</p>
            <p className="text-sm font-medium text-start">{value ?? '—'}</p>
        </div>
    );
}

function QuoteStatusBadge({
    status,
    submitted,
}: {
    status: string | null;
    submitted: boolean;
}) {
    const { t } = useLocale();
    if (!submitted) {
        return <span className="text-muted-foreground text-xs">—</span>;
    }
    const label = status === 'submitted' ? t('submitted', 'rfqs') : (status ?? '');
    return (
        <Badge variant="secondary" className="text-xs">
            {label}
        </Badge>
    );
}

function InsightCard({
    label,
    value,
    highlight,
}: {
    label: string;
    value: number;
    highlight?: 'green' | 'red';
}) {
    return (
        <Card>
            <CardContent className="pt-4">
                <p className="text-xs font-medium text-muted-foreground text-start">{label}</p>
                <p
                    className={`text-lg font-semibold tabular-nums text-start ${
                        highlight === 'green'
                            ? 'text-green-600'
                            : highlight === 'red'
                              ? 'text-red-600'
                              : ''
                    }`}
                >
                    {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </CardContent>
        </Card>
    );
}

export default function Comparison({
    rfq,
    project,
    package: pkg,
    supplierComparisons,
    recommendedSupplier,
    recommendedBy,
    recommendedAt,
    can,
    recommendationApprovedByName,
    recommendationApprovedAt,
    recommendationRejectedByName,
    recommendationRejectedAt,
    recommendationApprovalNotes,
    recommendationCanSubmit = false,
    recommendationCanApprove = false,
    recommendationCanReject = false,
}: ComparisonProps) {
    const { t } = useLocale();
    const form = useForm({
        recommended_supplier_id: rfq.recommended_supplier_id ?? 'none',
        recommendation_notes: rfq.recommendation_notes ?? '',
        recommendation_status: rfq.recommendation_status || 'draft',
    });

    const totals = supplierComparisons
        .map((s) => s.quoted_total)
        .filter((t): t is number => t != null);

    const recommendationApprovalStatus: 'draft' | 'submitted' | 'approved' | 'rejected' =
        recommendationApprovedAt ? 'approved' : recommendationRejectedAt ? 'rejected' : rfq.recommendation_status === 'submitted' ? 'submitted' : 'draft';

    const formatDeadline = (d: string | null) =>
        d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    return (
        <AppLayout>
            <Head title={`${t('comparison', 'rfqs')} — ${rfq.rfq_number}`} />
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Link href={route('rfqs.index')} className="hover:text-foreground">
                                {t('title_index', 'rfqs')}
                            </Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href={route('rfqs.show', { rfq: rfq.id })} className="hover:text-foreground">
                                {rfq.rfq_number}
                            </Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="font-medium text-foreground">{t('comparison', 'rfqs')}</span>
                        </nav>
                        <h1 className="text-2xl font-semibold tracking-tight text-start">
                            {t('comparison', 'rfqs')} — {rfq.rfq_number}
                        </h1>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('rfqs.show', { rfq: rfq.id })}>
                            <ChevronRight className="me-1 h-4 w-4 rotate-180" />
                            {t('action_back', 'rfqs')}
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('rfq_details', 'rfqs')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                            <SummaryItem label={t('reference', 'rfqs')} value={rfq.rfq_number} />
                            <SummaryItem label={t('project', 'rfqs')} value={project?.name} />
                            <SummaryItem label={t('status', 'rfqs')} value={rfq.status} />
                            <SummaryItem label={t('deadline', 'rfqs')} value={formatDeadline(rfq.submission_deadline)} />
                            <SummaryItem
                                label={t('invited_suppliers', 'rfqs')}
                                value={supplierComparisons.length}
                            />
                            <SummaryItem
                                label={t('quotes_received', 'rfqs')}
                                value={supplierComparisons.filter((s) => s.quote_submitted).length}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('comparison', 'rfqs')}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted text-xs font-medium">
                                        <th className="text-start px-3 py-2">{t('supplier', 'rfqs')}</th>
                                        <th className="text-center px-3 py-2">{t('vendor_list', 'rfqs')}</th>
                                        <th className="text-center px-3 py-2">{t('quote_status', 'rfqs')}</th>
                                        <th className="text-end px-3 py-2">{t('quoted_amount', 'rfqs')}</th>
                                        <th className="text-center px-3 py-2">{t('clarifications', 'rfqs')}</th>
                                        <th className="text-center px-3 py-2">{t('recommended', 'rfqs')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supplierComparisons.map((s) => (
                                        <tr
                                            key={s.supplier_id}
                                            className={`border-b ${s.is_recommended ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                                        >
                                            <td className="px-3 py-2 font-medium text-start">
                                                {s.supplier_name}
                                                {s.supplier_code && (
                                                    <span className="ms-1 text-muted-foreground font-normal">
                                                        ({s.supplier_code})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {s.on_vendor_list === true ? (
                                                    <span className="text-green-600">✓</span>
                                                ) : s.on_vendor_list === false ? (
                                                    <span className="text-muted-foreground">—</span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <QuoteStatusBadge
                                                    status={s.quote_status}
                                                    submitted={s.quote_submitted}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-end tabular-nums">
                                                {s.quoted_total != null
                                                    ? formatCurrency(s.quoted_total, rfq.currency)
                                                    : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-center">{s.clarification_count}</td>
                                            <td className="px-3 py-2 text-center">
                                                {s.is_recommended && (
                                                    <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 font-medium text-xs">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        {t('recommended', 'rfqs')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {totals.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <InsightCard
                            label={t('lowest_quote', 'rfqs')}
                            value={Math.min(...totals)}
                            highlight="green"
                        />
                        <InsightCard
                            label={t('highest_quote', 'rfqs')}
                            value={Math.max(...totals)}
                            highlight="red"
                        />
                        <InsightCard
                            label={t('quote_spread', 'rfqs')}
                            value={Math.max(...totals) - Math.min(...totals)}
                        />
                    </div>
                )}

                {can.recommend && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('award_recommendation', 'rfqs')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('recommended_supplier', 'rfqs')}</Label>
                                    <Select
                                        value={form.data.recommended_supplier_id || 'none'}
                                        onValueChange={(v) => form.setData('recommended_supplier_id', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('select_supplier', 'rfqs')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t('no_recommendation', 'rfqs')}</SelectItem>
                                            {supplierComparisons.map((s) => (
                                                <SelectItem key={s.supplier_id} value={s.supplier_id}>
                                                    {s.supplier_name}
                                                    {s.quote_submitted && s.quoted_total != null &&
                                                        ` — ${formatCurrency(s.quoted_total, rfq.currency)}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('recommendation_notes', 'rfqs')}</Label>
                                    <Textarea
                                        value={form.data.recommendation_notes}
                                        onChange={(e) => form.setData('recommendation_notes', e.target.value)}
                                        placeholder={t('recommendation_notes_placeholder', 'rfqs')}
                                        rows={4}
                                        className="resize-none"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={form.processing}
                                        onClick={() => {
                                            form.setData('recommendation_status', 'draft');
                                            form.post(route('rfqs.comparison.recommend', { rfq: rfq.id }), {
                                                preserveScroll: true,
                                            });
                                        }}
                                    >
                                        {t('save_draft', 'rfqs')}
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={form.processing}
                                        onClick={() => {
                                            form.setData('recommendation_status', 'submitted');
                                            form.post(route('rfqs.comparison.recommend', { rfq: rfq.id }), {
                                                preserveScroll: true,
                                            });
                                        }}
                                    >
                                        {t('submit_recommendation', 'rfqs')}
                                    </Button>
                                </div>
                                {form.errors.recommended_supplier_id && (
                                    <p className="text-sm text-destructive">{form.errors.recommended_supplier_id}</p>
                                )}
                            </div>
                            {recommendedBy && recommendedAt && (
                                <p className="text-xs text-muted-foreground text-start">
                                    {t('recommended', 'rfqs')}: {recommendedSupplier?.legal_name_en ?? '—'} — {recommendedBy.name} ({recommendedAt})
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {rfq.recommendation_status === 'submitted' && (
                    <ApprovalStatusPanel
                        approvalStatus={recommendationApprovalStatus}
                        approvedBy={recommendationApprovedByName ?? undefined}
                        approvedAt={recommendationApprovedAt ?? undefined}
                        approvalNotes={recommendationApprovalNotes ?? undefined}
                        can={{
                            submit: recommendationCanSubmit,
                            approve: recommendationCanApprove,
                            reject: recommendationCanReject,
                        }}
                        onSubmit={() =>
                            router.post(route('rfqs.comparison.recommend.submit', { rfq: rfq.id }), {}, { preserveScroll: true, onSuccess: () => router.reload() })
                        }
                        onApprove={() =>
                            router.post(route('rfqs.comparison.recommend.approve', { rfq: rfq.id }), {}, { preserveScroll: true, onSuccess: () => router.reload() })
                        }
                        onReject={(notes) =>
                            router.post(
                                route('rfqs.comparison.recommend.reject', { rfq: rfq.id }),
                                { recommendation_approval_notes: notes },
                                { preserveScroll: true, onSuccess: () => router.reload() }
                            )
                        }
                        entityLabel={t('award_recommendation', 'rfqs')}
                        translationNamespace="rfqs"
                    />
                )}
            </div>
        </AppLayout>
    );
}
