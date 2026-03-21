import SupplierPortalLayout from '@/Layouts/SupplierPortalLayout';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FileText, MessageSquare, Send, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { QuoteItemRow } from './QuoteItemRow';
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

interface Rfq {
    id: string;
    rfq_number: string;
    title: string;
    description: string | null;
    status: string;
    submission_deadline: string | null;
    currency: string;
    items: RfqItem[];
    documents: Array<{ id: string; title: string; document_type: string }>;
}

interface MyQuoteItem {
    rfq_item_id: string;
    unit_price: string;
    total_price: string;
    notes: string | null;
}

interface AwardPayload {
    you_won: boolean;
    awarded_amount: string | null;
    currency: string;
    awarded_at: string | null;
    award_note: string | null;
}

interface ShowProps {
    rfq: Rfq;
    rfqSupplier: { id: string; status: string; invited_at: string | null; quote_submitted?: boolean } | null;
    myQuote: { id: string; status: string; submitted_at: string | null; items: MyQuoteItem[] } | null;
    package_attachments: Array<{ id: string; title: string; source_type: string; document_type: string | null; external_url: string | null }>;
    clarifications: Clarification[];
    timeline: { type: string; title: string; timestamp: string }[];
    award: AwardPayload | null;
    can_submit_quote: boolean;
    can_ask_clarification: boolean;
}

type AttentionType = 'error' | 'warning' | 'success' | 'info';

interface AttentionItem {
    type: AttentionType;
    message: string;
    detail?: string;
}

function formatDate(value: string | null, locale: string): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
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

export default function SupplierPortalRfqShow({
    rfq,
    rfqSupplier,
    myQuote,
    package_attachments,
    clarifications,
    timeline,
    award,
    can_submit_quote,
    can_ask_clarification,
}: ShowProps) {
    const { t, locale } = useLocale();
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

    useEffect(() => {
        if (!can_ask_clarification) {
            setClarificationOpen(false);
        }
    }, [can_ask_clarification]);
    const initialTab = (() => {
        if (typeof window === 'undefined') return 'overview';
        const params = new URLSearchParams(window.location.search);
        return params.get('tab') ?? 'overview';
    })() as 'overview' | 'items' | 'attachments' | 'communication';
    const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'attachments' | 'communication'>(initialTab);
    const [quoteSubmitting, setQuoteSubmitting] = useState(false);
    const itemIds = useMemo(() => rfq.items.map((i) => i.id), [rfq.items]);
    const initialItems = useMemo(() => {
        const items: Record<string, { unit_price: string; total_price: string; notes: string }> = {};
        rfq.items.forEach((item) => {
            const existing = myQuote?.items?.find((q) => q.rfq_item_id === item.id);
            items[item.id] = {
                unit_price: existing?.unit_price ?? '',
                total_price: existing?.total_price ?? '',
                notes: existing?.notes ?? '',
            };
        });
        return items;
    }, [rfq.items, myQuote?.items]);
    const quoteForm = useForm({
        items: initialItems,
    });
    const clarificationForm = useForm({ question: '' });

    const itemsRef = useRef(quoteForm.data.items);
    itemsRef.current = quoteForm.data.items;

    const handleUnitPriceChange = useCallback((itemId: string, value: string) => {
        const prev = itemsRef.current;
        quoteForm.setData('items', {
            ...prev,
            [itemId]: {
                ...prev[itemId],
                unit_price: value,
                total_price: prev[itemId]?.total_price ?? '',
                notes: prev[itemId]?.notes ?? '',
            },
        });
    }, []);

    const handleTotalPriceChange = useCallback((itemId: string, value: string) => {
        const prev = itemsRef.current;
        quoteForm.setData('items', {
            ...prev,
            [itemId]: {
                ...prev[itemId],
                unit_price: prev[itemId]?.unit_price ?? '',
                total_price: value,
                notes: prev[itemId]?.notes ?? '',
            },
        });
    }, []);

    const allAttachments = [
        ...package_attachments.map((a) => ({ ...a, source: 'Package' })),
        ...rfq.documents.map((d) => ({ ...d, source: 'RFQ', external_url: null })),
    ];

    const attentionItems: AttentionItem[] = [];
    const hasSubmittedQuote =
        myQuote !== null && (myQuote.status === 'submitted' || myQuote.status === 'revised');

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

    const openClarifications = clarifications.filter(
        (c) => c.status === 'open' || c.status === 'reopened'
    );
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

    return (
        <SupplierPortalLayout>
            <Head title={`${t('title_rfq_detail', 'supplier_portal')}: ${rfq.title}`} />
            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Link href={route('supplier.rfqs.index')} className="text-sm text-muted-foreground hover:underline">
                            ← {t('action_back_rfqs', 'supplier_portal')}
                        </Link>
                        <h1 className="text-2xl font-semibold tracking-tight mt-1">{rfq.title}</h1>
                        <p className="text-muted-foreground">
                            <span dir="ltr" className="font-mono tabular-nums">{rfq.rfq_number}</span>
                            {' · '}
                            <span dir="ltr" className="font-mono tabular-nums">{rfq.currency}</span>
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-sm text-muted-foreground">{t('rfq_current_status', 'supplier_portal')}:</span>
                            <Badge variant="secondary">{rfqStatusLabel(rfq.status)}</Badge>
                        </div>
                        {rfqSupplier?.invited_at && (
                            <p className="mt-1 text-sm text-muted-foreground">
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

                <div className="flex flex-wrap gap-2 border-b border-border pb-2">
                    <Button
                        variant={activeTab === 'overview' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('overview')}
                    >
                        {t('tab_overview', 'supplier_portal')}
                    </Button>
                    <Button
                        variant={activeTab === 'items' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('items')}
                    >
                        {t('rfq_items', 'supplier_portal')}
                    </Button>
                    <Button
                        variant={activeTab === 'attachments' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('attachments')}
                    >
                        {t('rfq_attachments', 'supplier_portal')}
                    </Button>
                    <Button
                        variant={activeTab === 'communication' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('communication')}
                    >
                        {t('communication_center', 'supplier_portal')}
                    </Button>
                </div>

                {(activeTab === 'overview' || activeTab === 'items') && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('rfq_items', 'supplier_portal')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-start py-2">{t('code', 'supplier_portal')}</th>
                                        <th className="text-start py-2">{t('description', 'supplier_portal')}</th>
                                        <th className="text-end py-2">{t('qty', 'supplier_portal')}</th>
                                        <th className="text-end py-2">{t('est_cost', 'supplier_portal')}</th>
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
                                            <td className="py-2">{item.description_en}</td>
                                            <td className="text-end py-2">
                                                <span dir="ltr" className="font-mono tabular-nums">
                                                    {item.qty ?? '—'}
                                                </span>
                                            </td>
                                            <td className="text-end py-2">
                                                <span dir="ltr" className="font-mono tabular-nums">
                                                    {item.estimated_cost}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {(activeTab === 'overview' || activeTab === 'attachments') && allAttachments.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {t('rfq_attachments', 'supplier_portal')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-1">
                                {allAttachments.map((a) => (
                                    <li key={a.id}>
                                        {a.external_url ? (
                                            <a
                                                href={a.external_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                {a.title}
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground">{a.title}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'communication' && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('needs_attention', 'supplier_portal')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {attentionItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {t('no_attention_items', 'supplier_portal')}
                                    </p>
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
                                                {item.detail && (
                                                    <p className="mt-0.5 text-xs">{item.detail}</p>
                                                )}
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
                                    <p className="text-sm text-muted-foreground">
                                        {t('no_clarifications', 'supplier_portal')}
                                    </p>
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
                                    <p className="text-sm text-muted-foreground">{t('clarifications_closed_hint', 'supplier_portal')}</p>
                                ) : !clarificationOpen ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setClarificationOpen(true)}
                                    >
                                        {t('ask_question', 'supplier_portal')}
                                    </Button>
                                ) : (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            clarificationForm.post(
                                                route('supplier.rfqs.clarifications.store', rfq.id),
                                                {
                                                    onSuccess: () => {
                                                        clarificationForm.reset();
                                                        setClarificationOpen(false);
                                                    },
                                                }
                                            );
                                        }}
                                        className="space-y-2"
                                    >
                                        <Label>{t('your_question', 'supplier_portal')}</Label>
                                        <Input
                                            value={clarificationForm.data.question}
                                            onChange={(e) =>
                                                clarificationForm.setData('question', e.target.value)
                                            }
                                            placeholder={t('question_placeholder', 'supplier_portal')}
                                        />
                                        {clarificationForm.errors.question && (
                                            <p className="text-sm text-destructive">
                                                {clarificationForm.errors.question}
                                            </p>
                                        )}
                                        <div className="flex gap-2">
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={clarificationForm.processing}
                                            >
                                                <Send className="me-1 h-4 w-4" />
                                                {t('action_submit', 'supplier_portal')}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setClarificationOpen(false)}
                                            >
                                                {t('action_cancel', 'supplier_portal')}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('activity_timeline', 'supplier_portal')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {timeline.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {t('no_activity', 'supplier_portal')}
                                    </p>
                                ) : (
                                    <div className="relative ps-6 space-y-4">
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
                    </div>
                )}

                {hasSubmittedQuote && myQuote !== null ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('quote_your_quote', 'supplier_portal')}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {t('quote_submitted_at', 'supplier_portal', {
                                    date: myQuote.submitted_at ? formatDate(myQuote.submitted_at, locale) : '—',
                                })}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-start py-2">{t('item', 'supplier_portal')}</th>
                                        <th className="text-end py-2">{t('unit_price', 'supplier_portal')}</th>
                                        <th className="text-end py-2">{t('total', 'supplier_portal')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myQuote.items.map((qi) => {
                                        const item = rfq.items.find((i) => i.id === qi.rfq_item_id);
                                        return (
                                            <tr key={qi.rfq_item_id} className="border-b">
                                                <td className="py-2">{item?.description_en ?? qi.rfq_item_id}</td>
                                                <td className="text-end py-2"><span dir="ltr" className="font-mono tabular-nums">{qi.unit_price}</span></td>
                                                <td className="text-end py-2"><span dir="ltr" className="font-mono tabular-nums">{qi.total_price}</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                ) : !can_submit_quote ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('action_submit_quote', 'supplier_portal')}</CardTitle>
                            <p className="text-sm text-muted-foreground">{t('quote_submission_closed', 'supplier_portal')}</p>
                        </CardHeader>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('action_submit_quote', 'supplier_portal')}</CardTitle>
                            <p className="text-sm text-muted-foreground">{t('quote_enter_prices', 'supplier_portal')}</p>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const items: Record<string, { unit_price: number; total_price: number; notes: string }> = {};
                                    itemIds.forEach((id) => {
                                        const v = quoteForm.data.items[id] ?? { unit_price: '', total_price: '', notes: '' };
                                        items[id] = {
                                            unit_price: Number(v.unit_price) || 0,
                                            total_price: Number(v.total_price) || 0,
                                            notes: (v.notes ?? '') || '',
                                        };
                                    });
                                    setQuoteSubmitting(true);
                                    router.post(route('supplier.rfqs.quotes.store', rfq.id), { items }, {
                                        onFinish: () => setQuoteSubmitting(false),
                                    });
                                }}
                                className="space-y-4"
                            >
                                {rfq.items.map((item) => (
                                    <QuoteItemRow
                                        key={item.id}
                                        item={item}
                                        currency={rfq.currency}
                                        unitPrice={quoteForm.data.items[item.id]?.unit_price ?? ''}
                                        totalPrice={quoteForm.data.items[item.id]?.total_price ?? ''}
                                        onUnitPriceChange={handleUnitPriceChange}
                                        onTotalPriceChange={handleTotalPriceChange}
                                    />
                                ))}
                                {quoteForm.errors.items && <p className="text-sm text-destructive">{quoteForm.errors.items}</p>}
                                <Button type="submit" disabled={quoteSubmitting || !can_submit_quote}>
                                    {quoteSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                                    {t('action_submit_quote_btn', 'supplier_portal')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </SupplierPortalLayout>
    );
}
