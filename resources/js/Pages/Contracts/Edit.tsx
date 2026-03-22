import AppLayout from '@/Layouts/AppLayout';
import { formatDateForInput } from '@/lib/utils';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { PageProps, SharedPageProps } from '@/types';
import { useLocale } from '@/hooks/useLocale';
import { useState } from 'react';

interface SourceSummary {
    rfq: { id: string; rfq_number: string; title: string | null; status: string } | null;
    project: { id: string; name: string; name_en: string | null; code: string | null } | null;
    package: { id: string; package_no: string | null; name: string } | null;
    supplier: { id: string; legal_name_en: string; supplier_code: string | null } | null;
    template: { id: string; code: string; name_en: string; name_ar: string } | null;
}

interface DraftArticle {
    id: string;
    sort_order: number;
    article_code: string;
    title_en: string;
    title_ar: string;
    content_en: string;
    content_ar: string;
    origin_type: string;
    is_modified: boolean;
    versions_count?: number;
    negotiation_status?: string;
    negotiation_notes?: string | null;
    legal_notes?: string | null;
    commercial_notes?: string | null;
    negotiation_internal_notes?: string | null;
    has_deviation?: boolean;
    requires_special_approval?: boolean;
    rendered_content_en?: string | null;
    rendered_content_ar?: string | null;
    used_variable_keys?: string[] | null;
    unresolved_variable_keys?: string[] | null;
    last_rendered_at?: string | null;
}

interface ArticleOption {
    id: string;
    code: string;
    serial: number;
    category: string;
    title_en?: string;
    title_ar?: string;
    snippet_en?: string | null;
}

interface ContractReviewHistoryItem {
    id: string;
    stage: string;
    decision: string;
    from_status: string;
    to_status: string;
    notes?: string | null;
    decided_by?: string | null;
    decided_at?: string | null;
}

interface ContractReviewSummary {
    status: string;
    current_stage: string | null;
    submitted_for_review_at: string | null;
    submitted_for_review_by: { id: number; name: string } | null;
    review_completed_at: string | null;
    review_completed_by: { id: number; name: string } | null;
    return_reason: string | null;
    approval_summary: string | null;
    history: ContractReviewHistoryItem[];
}

interface ContractDetail {
    id: string;
    contract_number: string;
    title_en?: string | null;
    title_ar?: string | null;
    status: string;
    description?: string | null;
    internal_notes?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    draft_articles: DraftArticle[];
    is_locked_for_signature?: boolean;
}

interface VariableDef {
    key: string;
    label_en: string;
    label_ar: string;
    group: string;
    source: string;
    data_type: string;
    nullable: boolean;
    allowed_formatters: string[];
}

interface ContractCompletenessPayload {
    variables_filled: number;
    variables_total: number;
    variables_percent: number;
    mandatory_tags_required: string[];
    mandatory_tags_covered: string[];
    mandatory_tags_missing: string[];
    negotiated_articles_count: number;
    unresolved_negotiation_notes_count: number;
    is_ready_for_approval: boolean;
    blocking_reasons: string[];
    overall_status: 'ready' | 'needs_attention' | 'blocked';
    coverage_limitation_note: string | null;
}

interface Props extends PageProps {
    contract: ContractDetail;
    articles: ArticleOption[];
    source: SourceSummary;
    allowedStatusTransitions: string[];
    review: ContractReviewSummary;
    variable_groups?: Record<string, VariableDef[]>;
    variable_overrides?: Record<string, string>;
    unresolved_variable_keys?: string[];
    signature_readiness?: { is_ready: boolean; issues: string[] };
    completeness?: ContractCompletenessPayload;
}

const statusLabel: Record<string, string> = {
    draft: 'Draft',
    under_preparation: 'Under preparation',
    ready_for_review: 'Ready for review',
    cancelled: 'Cancelled',
};

const statusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    under_preparation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    ready_for_review: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const negotiationStatusColor: Record<string, string> = {
    not_reviewed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    in_negotiation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    agreed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    deviation_flagged: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    ready_for_review: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
};

const reviewStatusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    under_preparation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    ready_for_review: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    in_legal_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    in_commercial_review: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    in_management_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    returned_for_rework: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    approved_for_signature: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

export default function ContractsEdit({
    contract,
    articles,
    source,
    allowedStatusTransitions,
    review,
    variable_groups = {},
    variable_overrides = {},
    unresolved_variable_keys = [],
    signature_readiness,
    completeness,
}: Props) {
    const { t } = useLocale('contracts');
    const { dir } = usePage().props as SharedPageProps;

    const isLockedForSignature =
        contract.is_locked_for_signature === true || contract.status === 'signature_package_issued';

    const headerForm = useForm({
        title_en: contract.title_en ?? '',
        title_ar: contract.title_ar ?? '',
        description: contract.description ?? '',
        internal_notes: contract.internal_notes ?? '',
        start_date: contract.start_date ?? '',
        end_date: contract.end_date ?? '',
    });

    const [draftArticles, setDraftArticles] = useState<DraftArticle[]>(contract.draft_articles);

    const articleAddForm = useForm({ contract_article_id: '' });

    const reviewDecisionForm = useForm({
        stage: review.current_stage ?? '',
        decision: '',
        review_notes: '',
    });

    const handleHeaderSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        headerForm.put(route('contracts.update', contract.id));
    };

    const handleStatusChange = (status: string) => {
        router.post(
            route('contracts.update-status', contract.id),
            { status },
            { preserveScroll: true },
        );
    };

    const handleAddArticle = (e: React.FormEvent) => {
        e.preventDefault();
        if (!articleAddForm.data.contract_article_id) return;
        articleAddForm.post(route('contracts.add-article', contract.id), {
            preserveScroll: true,
        });
    };

    const updateDraftArticleField = (id: string, field: keyof DraftArticle, value: string) => {
        setDraftArticles((current) =>
            current.map((article) =>
                article.id === id ? { ...article, [field]: value } : article,
            ),
        );
    };

    const submitDraftArticle = (article: DraftArticle, e: React.FormEvent) => {
        e.preventDefault();
        router.put(
            route('contracts.draft-articles.update', { contract: contract.id, draftArticle: article.id }),
            {
                title_en: article.title_en,
                title_ar: article.title_ar,
                content_en: article.content_en,
                content_ar: article.content_ar,
            },
            { preserveScroll: true },
        );
    };

    const handleRemoveArticle = (article: DraftArticle) => {
        router.delete(
            route('contracts.draft-articles.remove', { contract: contract.id, draftArticle: article.id }),
            { preserveScroll: true },
        );
    };

    const moveArticle = (index: number, direction: 'up' | 'down') => {
        setDraftArticles((current) => {
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= current.length) return current;
            const clone = [...current];
            const temp = clone[index];
            clone[index] = clone[targetIndex];
            clone[targetIndex] = temp;
            // send new order to backend
            const orderedIds = clone.map((a) => a.id);
            router.post(
                route('contracts.draft-articles.reorder', contract.id),
                { ordered_ids: orderedIds },
                { preserveScroll: true },
            );
            return clone;
        });
    };

    const submissionBlockedByCompleteness = completeness?.overall_status === 'blocked';
    const canSubmitForReview =
        contract.status === 'ready_for_review' &&
        review.status === 'ready_for_review' &&
        !submissionBlockedByCompleteness;

    const handleSubmitForReview = () => {
        router.post(
            route('contracts.submit-for-review', contract.id),
            {},
            { preserveScroll: true },
        );
    };

    const handleReviewDecisionSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!review.current_stage) return;
        reviewDecisionForm.transform((data) => ({
            ...data,
            stage: review.current_stage ?? data.stage,
        }));
        reviewDecisionForm.post(route('contracts.review-decision', contract.id), {
            preserveScroll: true,
        });
    };

    const handleDraftArticleNegotiationSubmit = (article: DraftArticle) => {
        router.post(
            route('contracts.draft-articles.negotiation.update', {
                contract: contract.id,
                draftArticle: article.id,
            }),
            {
                negotiation_status: article.negotiation_status ?? 'not_reviewed',
                has_deviation: article.has_deviation ?? false,
                requires_special_approval: article.requires_special_approval ?? false,
                negotiation_notes: article.negotiation_notes ?? '',
                legal_notes: article.legal_notes ?? '',
                commercial_notes: article.commercial_notes ?? '',
                negotiation_internal_notes: article.negotiation_internal_notes ?? '',
            },
            { preserveScroll: true },
        );
    };

    return (
        <AppLayout>
            <Head title={t('workspace.title', 'contracts', { contract: contract.contract_number })} />
            <div className="space-y-6">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('contracts.index')} className="hover:text-foreground">
                        {t('workspace.breadcrumb.contracts')}
                    </Link>
                    <span>/</span>
                    <Link href={route('contracts.show', contract.id)} className="hover:text-foreground">
                        {contract.contract_number}
                    </Link>
                    <span>/</span>
                    <span className="font-medium text-foreground">
                        {t('workspace.breadcrumb.edit')}
                    </span>
                </nav>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            {t('workspace.heading', 'contracts', { contract: contract.contract_number })}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t('workspace.subtitle')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={statusBadgeClass[contract.status] ?? ''}
                        >
                            {statusLabel[contract.status] ?? contract.status}
                        </Badge>
                        {allowedStatusTransitions.map((status) => (
                            <Button
                                key={status}
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(status)}
                                disabled={isLockedForSignature}
                            >
                                {t(`workspace.status_actions.${status}`, 'contracts')}
                            </Button>
                        ))}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold">
                            {t('review.summary.title', 'contracts')}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {t('review.summary.description', 'contracts')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {t('review.summary.review_status', 'contracts')}
                            </p>
                            <p className="mt-1 flex items-center gap-2 font-medium">
                                <Badge
                                    variant="outline"
                                    className={reviewStatusBadgeClass[review.status] ?? ''}
                                >
                                    {t(`review.status_badges.${review.status}`, 'contracts')}
                                </Badge>
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {t('review.summary.current_stage', 'contracts')}
                            </p>
                            <p className="mt-1 font-medium">
                                {review.current_stage
                                    ? t(`review.stages.${review.current_stage}`, 'contracts')
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {t('review.summary.submitted_at', 'contracts')}
                            </p>
                            <p className="mt-1 font-medium">
                                {review.submitted_for_review_at
                                    ? new Date(review.submitted_for_review_at).toLocaleString()
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {t('review.summary.submitted_by', 'contracts')}
                            </p>
                            <p className="mt-1 font-medium">
                                {review.submitted_for_review_by?.name ?? '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {t('review.summary.completed_at', 'contracts')}
                            </p>
                            <p className="mt-1 font-medium">
                                {review.review_completed_at
                                    ? new Date(review.review_completed_at).toLocaleString()
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {t('review.summary.completed_by', 'contracts')}
                            </p>
                            <p className="mt-1 font-medium">
                                {review.review_completed_by?.name ?? '—'}
                            </p>
                        </div>
                        <div className="md:col-span-2 lg:col-span-4">
                            <p className="text-xs text-muted-foreground">
                                {t('review.summary.return_reason', 'contracts')}
                            </p>
                            <p className="mt-1 text-sm">
                                {review.return_reason ?? '—'}
                            </p>
                        </div>
                        <div className="md:col-span-2 lg:col-span-4 flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                                {canSubmitForReview && !isLockedForSignature && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleSubmitForReview}
                                    >
                                        {t('review.actions.submit_for_review', 'contracts')}
                                    </Button>
                                )}
                                {!canSubmitForReview &&
                                    contract.status === 'ready_for_review' &&
                                    review.status === 'ready_for_review' &&
                                    !isLockedForSignature &&
                                    submissionBlockedByCompleteness && (
                                        <p className="text-xs text-destructive">{t('completeness.submit_disabled_hint', 'contracts')}</p>
                                    )}
                            </div>
                            {completeness && (
                                <div
                                    className="rounded-md border p-3 text-xs"
                                    dir={dir ?? 'ltr'}
                                >
                                    <div className="flex flex-wrap items-center gap-2 font-medium">
                                        {completeness.overall_status === 'blocked' && (
                                            <XCircle className="h-4 w-4 text-destructive" aria-hidden />
                                        )}
                                        {completeness.overall_status === 'needs_attention' && (
                                            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
                                        )}
                                        {completeness.overall_status === 'ready' && (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                                        )}
                                        <span>
                                            {completeness.overall_status === 'blocked'
                                                ? t('completeness.overall_blocked', 'contracts')
                                                : completeness.overall_status === 'needs_attention'
                                                  ? t('completeness.overall_needs_attention', 'contracts')
                                                  : t('completeness.overall_ready', 'contracts')}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-muted-foreground">
                                        {t('completeness.variables_summary', 'contracts', {
                                            filled: completeness.variables_filled,
                                            total: completeness.variables_total,
                                            percent: completeness.variables_percent,
                                        })}
                                    </p>
                                    {completeness.blocking_reasons.length > 0 && (
                                        <ul className="mt-2 list-inside list-disc text-destructive">
                                            {completeness.blocking_reasons.map((r, i) => (
                                                <li key={i}>{r}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {variable_groups && Object.keys(variable_groups).length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold">
                                {t('variables.title', 'contracts')}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {t('variables.description', 'contracts')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {unresolved_variable_keys.length > 0 && (
                                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                                    <p className="font-medium text-amber-800 dark:text-amber-200">
                                        {t('variables.unresolved_warning', 'contracts')}
                                    </p>
                                    <p className="mt-1 text-amber-700 dark:text-amber-300">
                                        {t('variables.unresolved_message', 'contracts')}
                                    </p>
                                    <p className="mt-2 text-xs">
                                        {t('variables.unresolved_count', 'contracts', { count: unresolved_variable_keys.length })}
                                        : {unresolved_variable_keys.join(', ')}
                                    </p>
                                </div>
                            )}
                            {variable_groups.manual && variable_groups.manual.length > 0 && !isLockedForSignature && (
                                <form
                                    method="post"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const form = e.currentTarget;
                                        const overrides = variable_groups.manual.map((v) => ({
                                            variable_key: v.key,
                                            value_text: (form.elements.namedItem(`override_${v.key}`) as HTMLInputElement | HTMLTextAreaElement)?.value ?? variable_overrides[v.key] ?? '',
                                        }));
                                        router.post(route('contracts.variables.save-overrides', contract.id), { overrides }, { preserveScroll: true });
                                    }}
                                    className="space-y-3 rounded-md border p-3"
                                >
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {t('variables.manual_overrides', 'contracts')}
                                    </p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {variable_groups.manual.map((v) => (
                                            <div key={v.key}>
                                                <Label htmlFor={`override_${v.key}`} className="text-xs">
                                                    {v.label_en}
                                                </Label>
                                                <Input
                                                    id={`override_${v.key}`}
                                                    name={`override_${v.key}`}
                                                    defaultValue={variable_overrides[v.key] ?? ''}
                                                    className="mt-1"
                                                    placeholder={v.key}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="submit" size="sm">
                                        {t('variables.save_overrides', 'contracts')}
                                    </Button>
                                </form>
                            )}
                            {!isLockedForSignature && (
                                <div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => router.post(route('contracts.variables.preview-render', contract.id), {}, { preserveScroll: true })}
                                    >
                                        {t('variables.preview_render', 'contracts')}
                                    </Button>
                                </div>
                            )}
                            <details className="text-xs">
                                <summary className="cursor-pointer font-medium text-muted-foreground">
                                    {t('variables.available_variables', 'contracts')}
                                </summary>
                                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-muted-foreground">
                                    {Object.entries(variable_groups).map(([groupKey, vars]) => (
                                        <li key={groupKey}>
                                            <span className="font-medium">{t(`variables.variable_groups.${groupKey}`, 'contracts')}</span>
                                            {' — '}
                                            {vars.map((v) => v.key).join(', ')}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>{t('workspace.sections.source_title')}</CardTitle>
                        <CardDescription>{t('workspace.sections.source_description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {t('workspace.labels.rfq')}
                            </p>
                            <p className="mt-1 font-medium">
                                {source.rfq ? (
                                    <Link href={route('rfqs.show', source.rfq.id)} className="hover:underline">
                                        {source.rfq.rfq_number}
                                    </Link>
                                ) : (
                                    '—'
                                )}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {t('workspace.labels.project')}
                            </p>
                            <p className="mt-1 font-medium">{source.project?.name ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {t('workspace.labels.procurement_package')}
                            </p>
                            <p className="mt-1 font-medium">
                                {source.package ? `${source.package.package_no ?? ''} ${source.package.name}` : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {t('workspace.labels.supplier')}
                            </p>
                            <p className="mt-1 font-medium">
                                {source.supplier?.legal_name_en ?? '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {t('workspace.labels.template')}
                            </p>
                            <p className="mt-1 font-medium">
                                {source.template ? `${source.template.code} — ${source.template.name_en}` : '—'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-1">
                        <form onSubmit={handleHeaderSubmit}>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-semibold">
                                        {t('workspace.sections.metadata_title')}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('workspace.sections.metadata_description')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <Label htmlFor="title_en">{t('fields.title_en.label')}</Label>
                                        <Input
                                            id="title_en"
                                            className="mt-1"
                                            value={headerForm.data.title_en}
                                            onChange={(e) => headerForm.setData('title_en', e.target.value)}
                                            disabled={isLockedForSignature}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="title_ar">{t('fields.title_ar.label')}</Label>
                                        <Input
                                            id="title_ar"
                                            className="mt-1"
                                            value={headerForm.data.title_ar}
                                            onChange={(e) => headerForm.setData('title_ar', e.target.value)}
                                            disabled={isLockedForSignature}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="start_date">
                                            {t('fields.start_date.label')}
                                        </Label>
                                        <Input
                                            id="start_date"
                                            type="date"
                                            className="mt-1"
                                            value={formatDateForInput(headerForm.data.start_date)}
                                            onChange={(e) => headerForm.setData('start_date', e.target.value)}
                                            disabled={isLockedForSignature}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="end_date">
                                            {t('fields.end_date.label')}
                                        </Label>
                                        <Input
                                            id="end_date"
                                            type="date"
                                            className="mt-1"
                                            value={formatDateForInput(headerForm.data.end_date)}
                                            onChange={(e) => headerForm.setData('end_date', e.target.value)}
                                            disabled={isLockedForSignature}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="description">
                                            {t('fields.description.label')}
                                        </Label>
                                        <textarea
                                            id="description"
                                            className="mt-1 flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                            value={headerForm.data.description}
                                            onChange={(e) => headerForm.setData('description', e.target.value)}
                                            disabled={isLockedForSignature}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="internal_notes">
                                            {t('fields.internal_notes.label')}
                                        </Label>
                                        <textarea
                                            id="internal_notes"
                                            className="mt-1 flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                            value={headerForm.data.internal_notes}
                                            onChange={(e) => headerForm.setData('internal_notes', e.target.value)}
                                            disabled={isLockedForSignature}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={headerForm.processing || isLockedForSignature}>
                                            {t('workspace.actions.save_header')}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </form>
                    </div>

                    <div className="space-y-4 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-semibold">
                                    {t('workspace.sections.add_article_title')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('workspace.sections.add_article_description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <form onSubmit={handleAddArticle} className="flex flex-wrap items-end gap-2">
                                    <div className="flex-1 min-w-[220px]">
                                        <Label htmlFor="contract_article_id">
                                            {t('workspace.labels.available_articles')}
                                        </Label>
                                        <select
                                            id="contract_article_id"
                                            className="mt-1 block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                            value={articleAddForm.data.contract_article_id}
                                            onChange={(e) =>
                                                articleAddForm.setData('contract_article_id', e.target.value)
                                            }
                                            disabled={isLockedForSignature}
                                        >
                                            <option value="">
                                                {t('workspace.add_article.none_selected')}
                                            </option>
                                            {articles.map((article) => (
                                                <option key={article.id} value={article.id}>
                                                    {article.code} — {article.title_en}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={articleAddForm.processing || isLockedForSignature}
                                    >
                                        {t('workspace.actions.add_article')}
                                    </Button>
                                </form>
                                <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                                    {articles.map((article) => (
                                        <div key={article.id} className="px-4 py-3 text-sm">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-[11px] text-muted-foreground">
                                                            {article.code}
                                                        </span>
                                                        <span className="text-xs text-foreground">
                                                            {article.title_en}
                                                        </span>
                                                    </div>
                                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                                        {article.title_ar}
                                                    </div>
                                                    {article.snippet_en && (
                                                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                                            {article.snippet_en}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {articles.length === 0 && (
                                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                            {t('workspace.add_article.empty')}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {review.current_stage && !isLockedForSignature && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-semibold">
                                        {t('review.history.title')}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('review.history.description')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <form
                                        onSubmit={handleReviewDecisionSubmit}
                                        className="space-y-3 rounded-md border p-3"
                                    >
                                        <div className="grid gap-3 md:grid-cols-3">
                                            <div>
                                                <Label className="text-xs">
                                                    {t('review.fields.stage', 'contracts')}
                                                </Label>
                                                <Input
                                                    className="mt-1 h-8 text-xs"
                                                    value={
                                                        review.current_stage
                                                            ? t(
                                                                  `review.stages.${review.current_stage}`,
                                                                  'contracts',
                                                              )
                                                            : ''
                                                    }
                                                    disabled
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs">
                                                    {t('review.fields.decision', 'contracts')}
                                                </Label>
                                                <select
                                                    className="mt-1 block h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                                                    value={reviewDecisionForm.data.decision}
                                                    onChange={(e) =>
                                                        reviewDecisionForm.setData('decision', e.target.value)
                                                    }
                                                    required
                                                >
                                                    <option value="">
                                                        {t('review.actions.select_decision')}
                                                    </option>
                                                    <option value="approved">
                                                        {t('review.decisions.approved')}
                                                    </option>
                                                    <option value="returned_for_rework">
                                                        {t('review.decisions.returned_for_rework')}
                                                    </option>
                                                    <option value="rejected">
                                                        {t('review.decisions.rejected')}
                                                    </option>
                                                </select>
                                            </div>
                                                <div>
                                                <Label className="text-xs">
                                                    {t('review.fields.notes', 'contracts')}
                                                </Label>
                                                <Input
                                                    className="mt-1 h-8 text-xs"
                                                    value={reviewDecisionForm.data.review_notes}
                                                    onChange={(e) =>
                                                        reviewDecisionForm.setData(
                                                            'review_notes',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                        {(reviewDecisionForm.errors.stage ?? reviewDecisionForm.errors.decision ?? reviewDecisionForm.errors.review_notes) && (
                                            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                                {reviewDecisionForm.errors.stage && <p>{reviewDecisionForm.errors.stage}</p>}
                                                {reviewDecisionForm.errors.decision && <p>{reviewDecisionForm.errors.decision}</p>}
                                                {reviewDecisionForm.errors.review_notes && <p>{reviewDecisionForm.errors.review_notes}</p>}
                                            </div>
                                        )}
                                        <div className="flex justify-end">
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={reviewDecisionForm.processing}
                                            >
                                                {t('review.actions.save_decision')}
                                            </Button>
                                        </div>
                                    </form>
                                    <div className="rounded-md border">
                                        <div className="border-b bg-muted/60 px-4 py-2 text-xs font-medium">
                                            {t('review.history.table_title')}
                                        </div>
                                        <div className="max-h-48 overflow-y-auto text-xs">
                                            {review.history.length === 0 && (
                                                <div className="px-4 py-4 text-muted-foreground">
                                                    {t('review.history.no_reviews')}
                                                </div>
                                            )}
                                            {review.history.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="border-b px-4 py-2 last:border-b-0"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className={reviewStatusBadgeClass[item.to_status] ?? ''}
                                                            >
                                                                {t(
                                                                    `review.status_badges.${item.to_status}`,
                                                                    'contracts',
                                                                )}
                                                            </Badge>
                                                            <span>
                                                                {t(`review.stages.${item.stage}`, 'contracts')}
                                                                {' · '}
                                                                {t(`review.decisions.${item.decision}`, 'contracts')}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {item.decided_at
                                                                ? new Date(item.decided_at).toLocaleString()
                                                                : ''}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                                        {item.notes}
                                                    </div>
                                                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                                                        {item.decided_by
                                                            ? t('review.history.decided_by', 'contracts', {
                                                                  name: item.decided_by,
                                                              })
                                                            : ''}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-semibold">
                                    {t('workspace.sections.draft_articles_title')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('workspace.sections.draft_articles_description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {draftArticles.length === 0 && (
                                    <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                                        {t('workspace.draft_articles.empty')}
                                    </div>
                                )}
                                {draftArticles.map((article, index) => (
                                    <form
                                        key={article.id}
                                        onSubmit={(e) => submitDraftArticle(article, e)}
                                        className="space-y-3 rounded-md border p-3"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                                                    {index + 1}
                                                </span>
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {article.article_code}
                                                </span>
                                                <Badge variant="outline" className="text-[11px]">
                                                    {article.origin_type}
                                                </Badge>
                                                {article.negotiation_status && (
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[11px] ${negotiationStatusColor[article.negotiation_status] ?? ''}`}
                                                    >
                                                        {t(`negotiation.statuses.${article.negotiation_status}`)}
                                                    </Badge>
                                                )}
                                                {article.has_deviation && (
                                                    <Badge variant="outline" className="text-[11px]">
                                                        {t('negotiation.flags.deviation')}
                                                    </Badge>
                                                )}
                                                {article.requires_special_approval && (
                                                    <Badge variant="outline" className="text-[11px]">
                                                        {t('negotiation.flags.requires_special_approval')}
                                                    </Badge>
                                                )}
                                                {article.is_modified && (
                                                    <Badge variant="outline" className="text-[11px]">
                                                        {t('workspace.draft_articles.modified')}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {article.versions_count && article.versions_count > 0 && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={route('contracts.draft-articles.compare', {
                                                                contract: contract.id,
                                                                draftArticle: article.id,
                                                            })}
                                                        >
                                                            {t('versions.history_button')}
                                                            {` (${article.versions_count})`}
                                                        </Link>
                                                    </Button>
                                                )}
                                                {!isLockedForSignature && (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={index === 0}
                                                            onClick={() => moveArticle(index, 'up')}
                                                        >
                                                            {t('workspace.actions.move_up')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={index === draftArticles.length - 1}
                                                            onClick={() => moveArticle(index, 'down')}
                                                        >
                                                            {t('workspace.actions.move_down')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleRemoveArticle(article)}
                                                        >
                                                            {t('workspace.actions.remove')}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid gap-2 md:grid-cols-2">
                                            <div>
                                                <Label className="text-xs">
                                                    {t('workspace.draft_articles.fields.title_en')}
                                                </Label>
                                                <Input
                                                    className="mt-1"
                                                    value={article.title_en}
                                                    onChange={(e) =>
                                                        updateDraftArticleField(article.id, 'title_en', e.target.value)
                                                    }
                                                    disabled={isLockedForSignature}
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs">
                                                    {t('workspace.draft_articles.fields.title_ar')}
                                                </Label>
                                                <Input
                                                    className="mt-1"
                                                    value={article.title_ar}
                                                    onChange={(e) =>
                                                        updateDraftArticleField(article.id, 'title_ar', e.target.value)
                                                    }
                                                    disabled={isLockedForSignature}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2 md:grid-cols-2">
                                            <div>
                                                <Label className="text-xs">
                                                    {t('workspace.draft_articles.fields.content_en')}
                                                </Label>
                                                <textarea
                                                    className="mt-1 flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                                    value={article.content_en}
                                                    onChange={(e) =>
                                                        updateDraftArticleField(article.id, 'content_en', e.target.value)
                                                    }
                                                    disabled={isLockedForSignature}
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs">
                                                    {t('workspace.draft_articles.fields.content_ar')}
                                                </Label>
                                                <textarea
                                                    className="mt-1 flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                                    value={article.content_ar}
                                                    onChange={(e) =>
                                                        updateDraftArticleField(article.id, 'content_ar', e.target.value)
                                                    }
                                                    disabled={isLockedForSignature}
                                                />
                                            </div>
                                        </div>
                                        {!isLockedForSignature && (
                                            <div className="flex justify-end">
                                                <Button type="submit" size="sm">
                                                    {t('workspace.actions.save_article')}
                                                </Button>
                                            </div>
                                        )}
                                        <div className="space-y-2 rounded-md border border-dashed p-3">
                                            <p className="text-xs font-semibold text-muted-foreground">
                                                {t('negotiation.panel.title')}
                                            </p>
                                            <div className="grid gap-2 md:grid-cols-3">
                                                <div className="md:col-span-1">
                                                    <Label className="text-xs">
                                                        {t('negotiation.fields.status')}
                                                    </Label>
                                                    <select
                                                        className="mt-1 block w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                                                        value={article.negotiation_status ?? 'not_reviewed'}
                                                        onChange={(e) =>
                                                            updateDraftArticleField(
                                                                article.id,
                                                                'negotiation_status',
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={isLockedForSignature}
                                                    >
                                                        <option value="not_reviewed">
                                                            {t('negotiation.statuses.not_reviewed')}
                                                        </option>
                                                        <option value="in_negotiation">
                                                            {t('negotiation.statuses.in_negotiation')}
                                                        </option>
                                                        <option value="agreed">
                                                            {t('negotiation.statuses.agreed')}
                                                        </option>
                                                        <option value="deviation_flagged">
                                                            {t('negotiation.statuses.deviation_flagged')}
                                                        </option>
                                                        <option value="ready_for_review">
                                                            {t('negotiation.statuses.ready_for_review')}
                                                        </option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        id={`has_deviation_${article.id}`}
                                                        type="checkbox"
                                                        className="h-3 w-3 rounded border-input"
                                                        checked={article.has_deviation ?? false}
                                                        onChange={(e) =>
                                                            updateDraftArticleField(
                                                                article.id,
                                                                'has_deviation',
                                                                e.target.checked as unknown as string,
                                                            )
                                                        }
                                                        disabled={isLockedForSignature}
                                                    />
                                                    <Label
                                                        className="text-xs"
                                                        htmlFor={`has_deviation_${article.id}`}
                                                    >
                                                        {t('negotiation.flags.deviation')}
                                                    </Label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        id={`requires_special_${article.id}`}
                                                        type="checkbox"
                                                        className="h-3 w-3 rounded border-input"
                                                        checked={article.requires_special_approval ?? false}
                                                        onChange={(e) =>
                                                            updateDraftArticleField(
                                                                article.id,
                                                                'requires_special_approval',
                                                                e.target.checked as unknown as string,
                                                            )
                                                        }
                                                        disabled={isLockedForSignature}
                                                    />
                                                    <Label
                                                        className="text-xs"
                                                        htmlFor={`requires_special_${article.id}`}
                                                    >
                                                        {t('negotiation.flags.requires_special_approval')}
                                                    </Label>
                                                </div>
                                            </div>
                                            <div className="grid gap-2 md:grid-cols-2">
                                                <div>
                                                    <Label className="text-xs">
                                                        {t('negotiation.fields.negotiation_notes')}
                                                    </Label>
                                                    <textarea
                                                        className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs"
                                                        value={article.negotiation_notes ?? ''}
                                                        onChange={(e) =>
                                                            updateDraftArticleField(
                                                                article.id,
                                                                'negotiation_notes',
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={isLockedForSignature}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">
                                                        {t('negotiation.fields.legal_notes')}
                                                    </Label>
                                                    <textarea
                                                        className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs"
                                                        value={article.legal_notes ?? ''}
                                                        onChange={(e) =>
                                                            updateDraftArticleField(
                                                                article.id,
                                                                'legal_notes',
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={isLockedForSignature}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-2 md:grid-cols-2">
                                                <div>
                                                    <Label className="text-xs">
                                                        {t('negotiation.fields.commercial_notes')}
                                                    </Label>
                                                    <textarea
                                                        className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs"
                                                        value={article.commercial_notes ?? ''}
                                                        onChange={(e) =>
                                                            updateDraftArticleField(
                                                                article.id,
                                                                'commercial_notes',
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={isLockedForSignature}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">
                                                        {t('negotiation.fields.internal_notes')}
                                                    </Label>
                                                    <textarea
                                                        className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs"
                                                        value={article.negotiation_internal_notes ?? ''}
                                                        onChange={(e) =>
                                                            updateDraftArticleField(
                                                                article.id,
                                                                'negotiation_internal_notes',
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={isLockedForSignature}
                                                    />
                                                </div>
                                            </div>
                                            {!isLockedForSignature && (
                                                <div className="flex justify-end">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDraftArticleNegotiationSubmit(article)}
                                                    >
                                                        {t('negotiation.actions.update')}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </form>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
