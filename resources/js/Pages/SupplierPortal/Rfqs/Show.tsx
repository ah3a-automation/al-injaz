import SupplierPortalLayout from '@/Layouts/SupplierPortalLayout';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    FileText,
    Info,
    Loader2,
    MessageSquare,
    Send,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { supplierPortalRfqStatusKey } from '@/utils/supplierPortalRfq';

interface RfqItem {
    id: string;
    code: string | null;
    description_en: string;
    description_ar: string | null;
    unit: string | null;
    qty: string | null;
    estimated_cost: string;
}

interface Clarification {
    id: string;
    question: string;
    answer: string | null;
    status: string;
    visibility: string;
    supplier: { id: string; legal_name_en: string } | null;
    created_at: string | null;
    answered_at: string | null;
}

interface RfqDocumentRow {
    id: string;
    title: string;
    document_type: string;
    version: number;
    uploaded_at: string | null;
    uploaded_by: string | null;
    download_url: string | null;
    is_external: boolean;
}

interface PackageAttachmentRow {
    id: string;
    title: string;
    source_type: string;
    document_type: string | null;
    version: number;
    uploaded_at: string | null;
    uploaded_by: string | null;
    external_url: string | null;
    download_url: string | null;
    is_external: boolean;
}

interface SupplierQuoteAttachmentRow {
    id: number;
    name: string;
    file_name: string;
    size: number;
    mime_type: string | null;
    created_at: string | null;
}

interface MyQuoteItem {
    rfq_item_id: string;
    unit_price: string;
    total_price: string;
    notes: string | null;
    included_in_other: boolean;
}

interface DraftDataShape {
    items?: Record<
        string,
        {
            unit_price?: string | number;
            included_in_other?: boolean;
            notes?: string | null;
        }
    >;
}

interface MyQuotePayload {
    id: string;
    status: string;
    submitted_at: string | null;
    draft_saved_at: string | null;
    draft_data: DraftDataShape | null;
    items: MyQuoteItem[];
}

interface AwardPayload {
    you_won: boolean;
    awarded_amount: string | null;
    currency: string;
    awarded_at: string | null;
    award_note: string | null;
}

interface RfqPayload {
    id: string;
    rfq_number: string;
    title: string;
    description: string | null;
    status: string;
    submission_deadline: string | null;
    currency: string;
    items: RfqItem[];
    documents: Array<{ id: string; title: string; document_type: string }>;
    project?: { id: string; name: string; name_en: string | null; code: string | null } | null;
    procurement_package?: { id: string; package_no: string; name: string } | null;
}

interface ShowProps {
    rfq: RfqPayload;
    rfqSupplier: { id: string; status: string; invited_at: string | null; quote_submitted?: boolean } | null;
    myQuote: MyQuotePayload | null;
    package_attachments: PackageAttachmentRow[];
    rfq_documents: RfqDocumentRow[];
    supplier_quote_attachments: SupplierQuoteAttachmentRow[];
    clarifications: Clarification[];
    timeline: { type: string; title: string; timestamp: string }[];
    award: AwardPayload | null;
    can_submit_quote: boolean;
    can_ask_clarification: boolean;
    can_delete_quote_attachments: boolean;
    days_remaining: number | null;
    quote_status: string;
    current_quote_version: number;
    last_submitted_at: string | null;
    submission_state: 'submission_open' | 'revision_allowed' | 'locked';
    activity_count: number;
}

type AttentionType = 'error' | 'warning' | 'success' | 'info';

interface AttentionItem {
    type: AttentionType;
    message: string;
    detail?: string;
}

type TabKey = 'overview' | 'items' | 'attachments' | 'communication' | 'activity';

function formatDate(value: string | null, locale: string): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

function formatMoney(value: number, currency: string, locale: string): string {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
        style: 'currency',
        currency: currency || 'SAR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    }).format(value);
}

function parseQty(qty: string | null): number {
    if (qty === null || qty === '') return 0;
    const n = parseFloat(qty);
    return Number.isFinite(n) ? n : 0;
}

function AlertIcon({ type }: { type: AttentionType }) {
    if (type === 'error') {
        return <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />;
    }
    if (type === 'warning') {
        return <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />;
    }
    if (type === 'success') {
        return <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />;
    }
    return <Info className="mt-0.5 h-4 w-4 text-blue-600" />;
}

function ClarificationStatusBadge({
    status,
    label,
}: {
    status: string;
    label: string;
}) {
    const normalized = status.toLowerCase();
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
    if (normalized === 'answered') {
        return <span className={`${base} bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-200`}>{label}</span>;
    }
    if (normalized === 'closed') {
        return <span className={`${base} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200`}>{label}</span>;
    }
    return <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200`}>{label}</span>;
}

function TabBadge({ count }: { count: number }) {
    return (
        <span className="ms-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {count}
        </span>
    );
}

export default function SupplierPortalRfqShow({
    rfq,
    rfqSupplier,
    myQuote,
    package_attachments,
    rfq_documents,
    supplier_quote_attachments,
    clarifications,
    timeline,
    award,
    can_submit_quote,
    can_ask_clarification,
    can_delete_quote_attachments,
    days_remaining,
    quote_status,
    current_quote_version,
    last_submitted_at,
    submission_state,
    activity_count: activityCount,
}: ShowProps) {
    const { t, locale } = useLocale();
    const { flash } = usePage().props as { flash?: { success?: string } };
    const clarificationLabel = (status: string): string => {
        const n = status.toLowerCase();
        if (n === 'answered') return t('clarification_status_answered', 'supplier_portal');
        if (n === 'closed') return t('clarification_status_closed', 'supplier_portal');
        if (n === 'reopened') return t('clarification_status_reopened', 'supplier_portal');
        return t('clarification_status_open', 'supplier_portal');
    };
    const rfqStatusLabel = (status: string): string => {
        const key = supplierPortalRfqStatusKey(status);
        const label = t(key, 'supplier_portal');
        if (label === key) {
            return t('status_rfq_other', 'supplier_portal', { status });
        }
        return label;
    };

    const [clarificationOpen, setClarificationOpen] = useState(false);
    const [quoteSubmitting, setQuoteSubmitting] = useState(false);
    const [draftSaving, setDraftSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        if (!can_ask_clarification) {
            setClarificationOpen(false);
        }
    }, [can_ask_clarification]);

    const initialTab = (() => {
        if (typeof window === 'undefined') return 'overview';
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        const allowed: TabKey[] = ['overview', 'items', 'attachments', 'communication', 'activity'];
        return tab && allowed.includes(tab as TabKey) ? (tab as TabKey) : 'overview';
    })();

    const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

    const draftItems = myQuote?.draft_data?.items;

    const initialItems = useMemo(() => {
        const items: Record<
            string,
            { unit_price: string; included_in_other: boolean; notes: string }
        > = {};
        rfq.items.forEach((item) => {
            const fromDraft = draftItems?.[item.id];
            const fromQuote = myQuote?.items?.find((q) => q.rfq_item_id === item.id);
            const unitPrice =
                fromDraft?.unit_price !== undefined && fromDraft !== undefined
                    ? String(fromDraft.unit_price)
                    : fromQuote
                      ? String(fromQuote.unit_price)
                      : '';
            const included =
                fromDraft?.included_in_other !== undefined
                    ? Boolean(fromDraft.included_in_other)
                    : Boolean(fromQuote?.included_in_other);
            const notes =
                fromDraft?.notes !== undefined && fromDraft !== undefined
                    ? String(fromDraft.notes ?? '')
                    : fromQuote?.notes ?? '';
            items[item.id] = {
                unit_price: unitPrice,
                included_in_other: included,
                notes,
            };
        });
        return items;
    }, [rfq.items, myQuote?.items, draftItems]);

    const quoteForm = useForm({
        items: initialItems,
    });

    const itemsRef = useRef(quoteForm.data.items);
    itemsRef.current = quoteForm.data.items;

    const setItemField = useCallback(
        (itemId: string, patch: Partial<typeof initialItems[string]>) => {
            const prev = itemsRef.current;
            quoteForm.setData('items', {
                ...prev,
                [itemId]: {
                    ...prev[itemId],
                    unit_price: prev[itemId]?.unit_price ?? '',
                    included_in_other: prev[itemId]?.included_in_other ?? false,
                    notes: prev[itemId]?.notes ?? '',
                    ...patch,
                },
            });
        },
        [quoteForm]
    );

    const handleUnitPriceChange = useCallback(
        (itemId: string, value: string) => {
            setItemField(itemId, { unit_price: value });
        },
        [setItemField]
    );

    const handleIncludedChange = useCallback(
        (itemId: string, checked: boolean) => {
            setItemField(itemId, {
                included_in_other: checked,
                unit_price: checked ? '0' : itemsRef.current[itemId]?.unit_price ?? '',
            });
        },
        [setItemField]
    );

    const handleRemarkChange = useCallback(
        (itemId: string, value: string) => {
            setItemField(itemId, { notes: value });
        },
        [setItemField]
    );

    const { lines, grandTotal, pricedCount, missingCount, invalidRowIds } = useMemo(() => {
        const invalid = new Set<string>();
        let total = 0;
        let priced = 0;
        let missing = 0;

        const lineRows = rfq.items.map((item) => {
            const row = quoteForm.data.items[item.id];
            const included = row?.included_in_other ?? false;
            const unit = parseFloat(row?.unit_price ?? '');
            const qty = parseQty(item.qty);
            const lineTotal = included ? 0 : qty * (Number.isFinite(unit) ? unit : 0);

            if (included) {
                priced += 1;
            } else {
                if (!Number.isFinite(unit) || unit < 0.01) {
                    invalid.add(item.id);
                    missing += 1;
                } else {
                    priced += 1;
                    total += lineTotal;
                }
            }

            return { item, row, lineTotal, included };
        });

        return {
            lines: lineRows,
            grandTotal: total,
            pricedCount: priced,
            missingCount: missing,
            invalidRowIds: invalid,
        };
    }, [rfq.items, quoteForm.data.items]);

    const hasSubmittedQuote =
        myQuote !== null && (myQuote.status === 'submitted' || myQuote.status === 'revised');

    const attachmentCount =
        rfq_documents.length + package_attachments.length + supplier_quote_attachments.length;

    const quoteStatusLabel = useMemo(() => {
        if (quote_status === 'not_started') return t('quote_status_not_started', 'supplier_portal');
        if (quote_status === 'draft_saved') return t('quote_status_draft_saved', 'supplier_portal');
        if (quote_status === 'submitted_v1') return t('quote_status_submitted_v1', 'supplier_portal');
        if (quote_status.startsWith('revised_v')) {
            const v = quote_status.replace('revised_v', '');
            return t('quote_status_revised', 'supplier_portal', { version: v });
        }
        return quote_status;
    }, [quote_status, t]);

    const submissionStateLabel = useMemo(() => {
        if (submission_state === 'submission_open') return t('submission_state_open', 'supplier_portal');
        if (submission_state === 'revision_allowed') return t('submission_state_revision', 'supplier_portal');
        return t('submission_state_locked', 'supplier_portal');
    }, [submission_state, t]);

    const projectLabel = rfq.project?.name_en ?? rfq.project?.name ?? '—';
    const packageLabel = rfq.procurement_package
        ? `${rfq.procurement_package.package_no} · ${rfq.procurement_package.name}`
        : '—';

    const descriptionForItem = (item: RfqItem) =>
        locale === 'ar' && item.description_ar ? item.description_ar : item.description_en;

    const attentionItems: AttentionItem[] = [];
    if (!hasSubmittedQuote && !can_submit_quote) {
        attentionItems.push({
            type: 'warning',
            message: t('quote_submission_closed', 'supplier_portal'),
        });
    }

    if (!hasSubmittedQuote && can_submit_quote && rfq.submission_deadline) {
        const deadline = new Date(rfq.submission_deadline);
        const now = new Date();
        const diffDays = Math.floor((deadline.getTime() - now.getTime()) / 86400000);
        if (diffDays <= 3 && diffDays >= 0) {
            attentionItems.push({
                type: 'warning',
                message: t('quote_due_soon', 'supplier_portal'),
                detail: `${diffDays} ${t('days_remaining', 'supplier_portal')}`,
            });
        } else if (diffDays < 0) {
            attentionItems.push({
                type: 'error',
                message: t('quote_overdue', 'supplier_portal'),
            });
        }
    }

    const openClarifications = clarifications.filter((c) => c.status === 'open' || c.status === 'reopened');
    if (openClarifications.length > 0) {
        attentionItems.push({
            type: 'info',
            message: t('clarifications_pending', 'supplier_portal'),
            detail: `${openClarifications.length} ${t('awaiting_response', 'supplier_portal')}`,
        });
    }

    if (hasSubmittedQuote) {
        attentionItems.push({
            type: 'success',
            message: t('submission_complete', 'supplier_portal'),
        });
    }

    const buildPayloadItems = () => {
        const items: Record<string, { unit_price: number; included_in_other: boolean; notes: string }> = {};
        rfq.items.forEach((item) => {
            const v = quoteForm.data.items[item.id];
            const included = v?.included_in_other ?? false;
            const unit = included ? 0 : Number(v?.unit_price) || 0;
            items[item.id] = {
                unit_price: unit,
                included_in_other: included,
                notes: (v?.notes ?? '') || '',
            };
        });
        return items;
    };

    const saveDraft = () => {
        setDraftSaving(true);
        router.post(
            route('supplier.rfqs.quotes.draft', rfq.id),
            { items: buildPayloadItems() },
            {
                preserveScroll: true,
                onFinish: () => setDraftSaving(false),
            }
        );
    };

    const submitQuote = () => {
        setQuoteSubmitting(true);
        router.post(
            route('supplier.rfqs.quotes.submit', rfq.id),
            { items: buildPayloadItems() },
            {
                onFinish: () => {
                    setQuoteSubmitting(false);
                    setConfirmOpen(false);
                },
            }
        );
    };

    const uploadAttachment = (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        router.post(route('supplier.rfqs.quote-attachments.store', rfq.id), fd, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const deleteAttachment = (mediaId: number) => {
        router.delete(route('supplier.rfqs.quote-attachments.destroy', { rfq: rfq.id, media: mediaId }), {
            preserveScroll: true,
        });
    };

    const daysRemainingUrgent = days_remaining !== null && days_remaining < 3 && days_remaining >= 0;

    return (
        <SupplierPortalLayout>
            <Head title={`${t('title_rfq_detail', 'supplier_portal')}: ${rfq.title}`} />
            <div className="space-y-6 pb-24 md:pb-6">
                {flash?.success ? (
                    <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
                        {flash.success}
                    </div>
                ) : null}

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                        <Link href={route('supplier.rfqs.index')} className="text-sm text-muted-foreground hover:underline">
                            ← {t('action_back_rfqs', 'supplier_portal')}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight">{rfq.title}</h1>
                            <Badge variant="outline" className="font-mono text-xs tabular-nums" dir="ltr">
                                {rfq.rfq_number}
                            </Badge>
                            {current_quote_version > 0 ? (
                                <Badge variant="secondary" dir="ltr">
                                    {t('version_badge', 'supplier_portal', { version: String(current_quote_version) })}
                                </Badge>
                            ) : null}
                        </div>
                        <p className="text-muted-foreground text-sm">
                            <span className="font-medium">{t('header_project_package', 'supplier_portal')}:</span>{' '}
                            {projectLabel}
                            <span className="mx-1 text-muted-foreground">·</span>
                            {packageLabel}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{t('rfq_current_status', 'supplier_portal')}:</span>
                            <Badge variant="secondary">{rfqStatusLabel(rfq.status)}</Badge>
                            <Badge variant="outline">{submissionStateLabel}</Badge>
                            <Badge variant="outline">{quoteStatusLabel}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span>
                                <span className="font-medium text-foreground">{t('header_closing_date', 'supplier_portal')}: </span>
                                {formatDate(rfq.submission_deadline, locale)}
                            </span>
                            {days_remaining !== null ? (
                                <span
                                    className={
                                        daysRemainingUrgent
                                            ? 'font-semibold text-amber-700 dark:text-amber-400'
                                            : undefined
                                    }
                                    dir="ltr"
                                >
                                    <span className="font-medium text-foreground">{t('remaining_days', 'supplier_portal')}: </span>
                                    {days_remaining}
                                </span>
                            ) : null}
                            <span dir="ltr">
                                <span className="font-medium text-foreground">{t('header_currency', 'supplier_portal')}: </span>
                                {rfq.currency}
                            </span>
                            {last_submitted_at ? (
                                <span>
                                    {t('last_submitted_at', 'supplier_portal', {
                                        date: formatDate(last_submitted_at, locale),
                                    })}
                                </span>
                            ) : null}
                        </div>
                        {rfqSupplier?.invited_at && (
                            <p className="text-sm text-muted-foreground">
                                {t('rfq_invited_on', 'supplier_portal', {
                                    date: formatDate(rfqSupplier.invited_at, locale),
                                })}
                            </p>
                        )}
                    </div>
                </div>

                {award !== null && (
                    <Card
                        className={
                            award.you_won
                                ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40'
                                : 'border-border bg-muted/40'
                        }
                    >
                        <CardHeader>
                            <CardTitle className="text-base">{t('award_outcome_title', 'supplier_portal')}</CardTitle>
                            <p className="text-sm font-medium">
                                {award.you_won ? t('award_you_won', 'supplier_portal') : t('award_not_you', 'supplier_portal')}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            {award.awarded_amount !== null && (
                                <p dir="ltr" className="font-mono tabular-nums">
                                    {t('award_amount_label', 'supplier_portal')}: {award.awarded_amount} {award.currency}
                                </p>
                            )}
                            {award.awarded_at && (
                                <p className="text-muted-foreground">
                                    {t('award_date_label', 'supplier_portal')}: {formatDate(award.awarded_at, locale)}
                                </p>
                            )}
                            {award.award_note && (
                                <p>
                                    <span className="font-medium">{t('award_note_label', 'supplier_portal')}: </span>
                                    {award.award_note}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="flex min-w-0 flex-nowrap gap-1 overflow-x-auto overflow-y-hidden border-b border-border pb-2 [-ms-overflow-style:none] [scrollbar-width:thin] sm:flex-wrap sm:gap-2 sm:overflow-visible">
                    <Button
                        type="button"
                        variant={activeTab === 'overview' ? 'default' : 'ghost'}
                        size="sm"
                        className="shrink-0"
                        onClick={() => setActiveTab('overview')}
                    >
                        {t('tab_overview', 'supplier_portal')}
                    </Button>
                    <Button
                        type="button"
                        variant={activeTab === 'items' ? 'default' : 'ghost'}
                        size="sm"
                        className="shrink-0"
                        onClick={() => setActiveTab('items')}
                    >
                        {t('tab_items_quotation', 'supplier_portal')}
                        <TabBadge count={rfq.items.length} />
                    </Button>
                    <Button
                        type="button"
                        variant={activeTab === 'attachments' ? 'default' : 'ghost'}
                        size="sm"
                        className="shrink-0"
                        onClick={() => setActiveTab('attachments')}
                    >
                        {t('tab_attachments', 'supplier_portal')}
                        <TabBadge count={attachmentCount} />
                    </Button>
                    <Button
                        type="button"
                        variant={activeTab === 'communication' ? 'default' : 'ghost'}
                        size="sm"
                        className="shrink-0"
                        onClick={() => setActiveTab('communication')}
                    >
                        {t('tab_communication', 'supplier_portal')}
                        <TabBadge count={clarifications.length} />
                    </Button>
                    <Button
                        type="button"
                        variant={activeTab === 'activity' ? 'default' : 'ghost'}
                        size="sm"
                        className="shrink-0"
                        onClick={() => setActiveTab('activity')}
                    >
                        {t('tab_activity', 'supplier_portal')}
                        <TabBadge count={activityCount} />
                    </Button>
                </div>

                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {rfq.description && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('rfq_description', 'supplier_portal')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="whitespace-pre-wrap text-sm">{rfq.description}</p>
                                </CardContent>
                            </Card>
                        )}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('rfq_items', 'supplier_portal')}</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <table className="w-full min-w-[32rem] text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="py-2 text-start">{t('code', 'supplier_portal')}</th>
                                            <th className="py-2 text-start">{t('description', 'supplier_portal')}</th>
                                            <th className="py-2 text-end">{t('qty', 'supplier_portal')}</th>
                                            <th className="py-2 text-end">{t('col_unit', 'supplier_portal')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rfq.items.map((item) => (
                                            <tr key={item.id} className="border-b">
                                                <td className="py-2">
                                                    <span dir="ltr" className="font-mono tabular-nums">
                                                        {item.code ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="py-2">{descriptionForItem(item)}</td>
                                                <td className="py-2 text-end">
                                                    <span
                                                        dir="ltr"
                                                        className="text-base font-semibold tabular-nums md:text-lg"
                                                    >
                                                        {item.qty ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-end">
                                                    <span dir="ltr" className="tabular-nums">
                                                        {item.unit ?? '—'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'items' && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('tab_items_quotation', 'supplier_portal')}</CardTitle>
                                <p className="text-muted-foreground text-sm">{t('quote_enter_prices', 'supplier_portal')}</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="overflow-x-auto rounded-md border">
                                    <table className="w-full min-w-[56rem] text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="px-2 py-2 text-start">{t('code', 'supplier_portal')}</th>
                                                <th className="px-2 py-2 text-start">{t('description', 'supplier_portal')}</th>
                                                <th className="px-2 py-2 text-end">{t('qty', 'supplier_portal')}</th>
                                                <th className="px-2 py-2 text-end">{t('col_unit', 'supplier_portal')}</th>
                                                <th className="px-2 py-2 text-end">{t('quote_unit_price', 'supplier_portal')}</th>
                                                <th className="px-2 py-2 text-end">{t('quote_total', 'supplier_portal')}</th>
                                                <th className="px-2 py-2 text-center">{t('col_included', 'supplier_portal')}</th>
                                                <th className="px-2 py-2 text-start">{t('col_remark', 'supplier_portal')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map(({ item, row, lineTotal, included }) => {
                                                const invalid = invalidRowIds.has(item.id);
                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className={
                                                            invalid
                                                                ? 'border-b bg-red-50/50 dark:bg-red-950/20'
                                                                : 'border-b'
                                                        }
                                                    >
                                                        <td className="px-2 py-2 align-top">
                                                            <span dir="ltr" className="font-mono text-xs tabular-nums">
                                                                {item.code ?? '—'}
                                                            </span>
                                                        </td>
                                                        <td className="max-w-[14rem] px-2 py-2 align-top text-xs">
                                                            {descriptionForItem(item)}
                                                        </td>
                                                        <td className="px-2 py-2 text-end align-top">
                                                            <span
                                                                dir="ltr"
                                                                className="text-lg font-semibold tabular-nums leading-none"
                                                            >
                                                                {item.qty ?? '—'}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-2 text-end align-top">
                                                            <span dir="ltr" className="tabular-nums">
                                                                {item.unit ?? '—'}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-2 text-end align-top">
                                                            <Input
                                                                dir="ltr"
                                                                type="number"
                                                                step="0.0001"
                                                                min="0"
                                                                className="h-9 w-[7rem] text-end tabular-nums"
                                                                disabled={included || !can_submit_quote}
                                                                value={row?.unit_price ?? ''}
                                                                onChange={(e) => handleUnitPriceChange(item.id, e.target.value)}
                                                                aria-label={t('quote_unit_price', 'supplier_portal')}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2 text-end align-top">
                                                            <span dir="ltr" className="font-mono text-sm tabular-nums">
                                                                {formatMoney(lineTotal, rfq.currency, locale)}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-2 text-center align-top">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <Checkbox
                                                                    checked={included}
                                                                    disabled={!can_submit_quote}
                                                                    onCheckedChange={(c) =>
                                                                        handleIncludedChange(item.id, c === true)
                                                                    }
                                                                    aria-label={t('col_included', 'supplier_portal')}
                                                                />
                                                                <span className="text-[10px] text-muted-foreground max-w-[6rem] leading-tight">
                                                                    {t('included_help', 'supplier_portal')}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-2 align-top">
                                                            <Input
                                                                value={row?.notes ?? ''}
                                                                onChange={(e) => handleRemarkChange(item.id, e.target.value)}
                                                                disabled={!can_submit_quote}
                                                                className="h-9 min-w-[8rem]"
                                                                maxLength={1000}
                                                                aria-label={t('col_remark', 'supplier_portal')}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {quoteForm.errors.items && (
                                    <p className="text-sm text-destructive">{quoteForm.errors.items}</p>
                                )}

                                <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
                                    <div className="space-y-1 text-sm">
                                        <p dir="ltr" className="text-lg font-semibold tabular-nums">
                                            {t('summary_total_amount', 'supplier_portal')}:{' '}
                                            {formatMoney(grandTotal, rfq.currency, locale)}
                                        </p>
                                        <p className="text-muted-foreground">
                                            {t('items_priced_summary', 'supplier_portal', {
                                                priced: String(pricedCount),
                                                total: String(rfq.items.length),
                                            })}
                                        </p>
                                        {missingCount > 0 ? (
                                            <p className="text-amber-700 dark:text-amber-400">
                                                {t('missing_items_warning', 'supplier_portal', {
                                                    count: String(missingCount),
                                                })}
                                            </p>
                                        ) : null}
                                        {myQuote?.draft_saved_at ? (
                                            <p className="text-muted-foreground">
                                                {t('summary_last_saved', 'supplier_portal')}:{' '}
                                                {formatDate(myQuote.draft_saved_at, locale)}
                                            </p>
                                        ) : null}
                                        <div className="flex flex-wrap gap-2">
                                            {hasSubmittedQuote ? (
                                                <Badge>{t('summary_submitted_badge', 'supplier_portal')}</Badge>
                                            ) : (
                                                <Badge variant="outline">{t('summary_draft_badge', 'supplier_portal')}</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'attachments' && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('buyer_documents_section', 'supplier_portal')}</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                {rfq_documents.length === 0 && package_attachments.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">{t('no_attachments_yet', 'supplier_portal')}</p>
                                ) : (
                                    <table className="w-full min-w-[48rem] text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="py-2 text-start">{t('col_file_name', 'supplier_portal')}</th>
                                                <th className="py-2 text-start">{t('col_doc_type', 'supplier_portal')}</th>
                                                <th className="py-2 text-end">{t('col_version', 'supplier_portal')}</th>
                                                <th className="py-2 text-start">{t('col_upload_date', 'supplier_portal')}</th>
                                                <th className="py-2 text-start">{t('col_uploaded_by', 'supplier_portal')}</th>
                                                <th className="py-2 text-end">{t('action_download', 'supplier_portal')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {package_attachments.map((a) => (
                                                <tr key={`p-${a.id}`} className="border-b">
                                                    <td className="py-2">
                                                        {a.download_url ? (
                                                            <a
                                                                href={a.download_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:underline"
                                                            >
                                                                {a.title}
                                                            </a>
                                                        ) : (
                                                            <span className="text-muted-foreground">{a.title}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2">
                                                        {a.document_type ?? a.source_type}
                                                        <span className="ms-1 text-xs text-muted-foreground">(Package)</span>
                                                    </td>
                                                    <td className="py-2 text-end tabular-nums">{a.version}</td>
                                                    <td className="py-2">{formatDate(a.uploaded_at, locale)}</td>
                                                    <td className="py-2">{a.uploaded_by ?? '—'}</td>
                                                    <td className="py-2 text-end">
                                                        {a.download_url ? (
                                                            <Button variant="outline" size="sm" asChild>
                                                                <a
                                                                    href={a.download_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    {t('action_download', 'supplier_portal')}
                                                                </a>
                                                            </Button>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {rfq_documents.map((d) => (
                                                <tr key={`d-${d.id}`} className="border-b">
                                                    <td className="py-2">
                                                        {d.download_url ? (
                                                            <a
                                                                href={d.download_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:underline"
                                                            >
                                                                {d.title}
                                                            </a>
                                                        ) : (
                                                            <span className="text-muted-foreground">{d.title}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2">{d.document_type}</td>
                                                    <td className="py-2 text-end tabular-nums">{d.version}</td>
                                                    <td className="py-2">{formatDate(d.uploaded_at, locale)}</td>
                                                    <td className="py-2">{d.uploaded_by ?? '—'}</td>
                                                    <td className="py-2 text-end">
                                                        {d.download_url ? (
                                                            <Button variant="outline" size="sm" asChild>
                                                                <a
                                                                    href={d.download_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    {t('action_download', 'supplier_portal')}
                                                                </a>
                                                            </Button>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    {t('supplier_uploads_section', 'supplier_portal')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {can_submit_quote ? (
                                    <div>
                                        <Label htmlFor="quote-file" className="sr-only">
                                            {t('quote_attachments', 'supplier_portal')}
                                        </Label>
                                        <Input
                                            id="quote-file"
                                            type="file"
                                            className="w-full max-w-md"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) uploadAttachment(f);
                                                e.target.value = '';
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">{t('quote_attachments_locked', 'supplier_portal')}</p>
                                )}
                                <ul className="space-y-2 text-sm">
                                    {supplier_quote_attachments.length === 0 ? (
                                        <li className="text-muted-foreground">{t('no_attachments_yet', 'supplier_portal')}</li>
                                    ) : (
                                        supplier_quote_attachments.map((m) => (
                                            <li
                                                key={m.id}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                                            >
                                                <span className="min-w-0 truncate font-medium">{m.name}</span>
                                                <span className="text-muted-foreground">{formatDate(m.created_at, locale)}</span>
                                                {can_delete_quote_attachments ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive"
                                                        onClick={() => deleteAttachment(m.id)}
                                                    >
                                                        {t('action_delete', 'rfqs')}
                                                    </Button>
                                                ) : null}
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'communication' && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('needs_attention', 'supplier_portal')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {attentionItems.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">{t('no_attention_items', 'supplier_portal')}</p>
                                ) : (
                                    attentionItems.map((item, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                                                item.type === 'error'
                                                    ? 'border-red-200 bg-red-50 text-red-700'
                                                    : item.type === 'warning'
                                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                      : item.type === 'success'
                                                        ? 'border-green-200 bg-green-50 text-green-700'
                                                        : 'border-blue-200 bg-blue-50 text-blue-700'
                                            }`}
                                        >
                                            <AlertIcon type={item.type} />
                                            <div>
                                                <p className="text-sm font-medium">{item.message}</p>
                                                {item.detail && <p className="mt-0.5 text-xs">{item.detail}</p>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    {t('clarifications', 'supplier_portal')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {clarifications.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">{t('no_clarifications', 'supplier_portal')}</p>
                                ) : (
                                    clarifications.map((c) => (
                                        <div key={c.id} className="space-y-3 rounded-lg border p-3 text-sm">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-medium">{c.question}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {formatDate(c.created_at, locale)}
                                                    </p>
                                                </div>
                                                <ClarificationStatusBadge status={c.status} label={clarificationLabel(c.status)} />
                                            </div>
                                            {c.answer && (
                                                <div className="rounded-md border-s-2 border-primary bg-muted/50 px-3 py-2">
                                                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                                                        {t('answer', 'supplier_portal')}
                                                    </p>
                                                    <p className="text-sm">{c.answer}</p>
                                                    {c.answered_at && (
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {formatDate(c.answered_at, locale)}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}

                                {!can_ask_clarification ? (
                                    <p className="text-muted-foreground text-sm">{t('clarifications_closed_hint', 'supplier_portal')}</p>
                                ) : !clarificationOpen ? (
                                    <Button variant="outline" size="sm" onClick={() => setClarificationOpen(true)}>
                                        {t('ask_question', 'supplier_portal')}
                                    </Button>
                                ) : (
                                    <ClarificationForm
                                        rfqId={rfq.id}
                                        onClose={() => setClarificationOpen(false)}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'activity' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('activity_timeline', 'supplier_portal')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {timeline.length === 0 ? (
                                <p className="text-muted-foreground text-sm">{t('no_activity', 'supplier_portal')}</p>
                            ) : (
                                <div className="relative space-y-4 ps-6">
                                    <div className="absolute start-2 top-0 bottom-0 w-px bg-border" />
                                    {timeline.map((event, i) => (
                                        <div
                                            key={`${event.type}-${event.timestamp}-${i}`}
                                            className="relative flex items-start gap-3"
                                        >
                                            <div className="absolute -start-4 mt-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                                            <div>
                                                <p className="text-sm font-medium">{event.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(event.timestamp, locale)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'items' && can_submit_quote && (
                    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:z-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
                        <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto"
                                disabled={draftSaving}
                                onClick={() => saveDraft()}
                            >
                                {draftSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                                {t('action_save_draft', 'supplier_portal')}
                            </Button>
                            <Button
                                type="button"
                                className="w-full sm:w-auto"
                                disabled={quoteSubmitting || missingCount > 0}
                                onClick={() => setConfirmOpen(true)}
                            >
                                {quoteSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                                {hasSubmittedQuote
                                    ? t('action_resubmit_quote', 'supplier_portal')
                                    : t('action_submit_quote_btn', 'supplier_portal')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Modal show={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="md">
                <div className="p-6 space-y-4">
                    <h2 className="text-lg font-semibold">{t('confirm_submit_title', 'supplier_portal')}</h2>
                    <p className="text-muted-foreground text-sm">{t('quote_confirm_submit_intro', 'supplier_portal')}</p>
                    <ul className="space-y-2 text-sm">
                        <li dir="ltr" className="flex justify-between gap-2">
                            <span>{t('confirm_total_amount', 'supplier_portal')}</span>
                            <span className="font-mono font-medium">{formatMoney(grandTotal, rfq.currency, locale)}</span>
                        </li>
                        <li className="flex justify-between gap-2">
                            <span>{t('confirm_items_priced', 'supplier_portal')}</span>
                            <span className="font-mono">
                                {pricedCount} / {rfq.items.length}
                            </span>
                        </li>
                        {missingCount > 0 ? (
                            <li className="text-amber-700 dark:text-amber-400">
                                {t('confirm_missing_items', 'supplier_portal')}: {missingCount}
                            </li>
                        ) : null}
                        <li className="flex justify-between gap-2">
                            <span>{t('confirm_attachments_count', 'supplier_portal')}</span>
                            <span className="font-mono">{supplier_quote_attachments.length}</span>
                        </li>
                    </ul>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                            {t('action_cancel', 'supplier_portal')}
                        </Button>
                        <Button type="button" onClick={() => submitQuote()} disabled={quoteSubmitting || missingCount > 0}>
                            {t('confirm_submit_action', 'supplier_portal')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </SupplierPortalLayout>
    );
}

function ClarificationForm({ rfqId, onClose }: { rfqId: string; onClose: () => void }) {
    const { t } = useLocale();
    const form = useForm({ question: '' });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.post(route('supplier.rfqs.clarifications.store', rfqId), {
                    onSuccess: () => {
                        form.reset();
                        onClose();
                    },
                });
            }}
            className="space-y-2"
        >
            <Label>{t('your_question', 'supplier_portal')}</Label>
            <Input
                value={form.data.question}
                onChange={(e) => form.setData('question', e.target.value)}
                placeholder={t('question_placeholder', 'supplier_portal')}
            />
            {form.errors.question && <p className="text-sm text-destructive">{form.errors.question}</p>}
            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={form.processing}>
                    <Send className="me-1 h-4 w-4" />
                    {t('action_submit', 'supplier_portal')}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onClose()}>
                    {t('action_cancel', 'supplier_portal')}
                </Button>
            </div>
        </form>
    );
}
