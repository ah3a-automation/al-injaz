import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import Modal from '@/Components/Modal';
import { useLocale } from '@/hooks/useLocale';
import { StatusBadge } from '@/Components/StatusBadge';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ChevronRight,
    Send,
    ClipboardCheck,
    Award,
    XCircle,
    Pencil,
    Trash2,
    UserPlus,
    FilePlus,
    MessageSquarePlus,
    MessageCircle,
    Eye,
    Printer,
    FileDown,
    BarChart2,
    ShieldAlert,
    Clock,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { SharedPageProps } from '@/types';
import { useConfirm } from '@/hooks';
import { ComparisonTable } from './Show/ComparisonTable';
import { ItemsTable } from './Show/ItemsTable';
import { QuoteComparisonTable } from './Show/QuoteComparisonTable';
import { EvaluationTable } from './Show/EvaluationTable';
import { ApprovalStatusPanel } from '@/Components/ApprovalStatusPanel';
import { ActivityTimeline, type TimelineEvent } from '@/Components/ActivityTimeline';
import { DocumentList, type DocumentItem } from '@/Components/DocumentList';

interface RfqItem {
    id: string;
    code: string | null;
    description_en: string;
    description_ar: string | null;
    unit: string | null;
    qty: string | null;
    estimated_cost: string;
    sort_order: number;
}

interface RfqSupplier {
    id: string;
    status: string;
    invited_at: string | null;
    responded_at: string | null;
    on_vendor_list?: boolean | null;
    supplier: { id: string; legal_name_en: string; supplier_code: string; supplier_type: string; city: string | null; country: string | null };
    quotes?: SupplierQuote[];
}

interface RfqDocument {
    id: string;
    document_type: string;
    source_type: string;
    title: string;
    file_size_bytes: number | null;
    external_url?: string | null;
    url?: string | null;
    download_url?: string | null;
    version?: number;
    is_current?: boolean;
    uploaded_at?: string | null;
}

interface RfqClarification {
    id: string;
    question: string;
    answer: string | null;
    status: string;
    visibility: string;
    created_at?: string | null;
    answered_at?: string | null;
    asked_by_name?: string | null;
    answered_by_name?: string | null;
    supplier: { id: string; legal_name_en: string } | null;
}

interface SupplierQuote {
    id: string;
    supplier_id: string;
    total_price: string;
    status: string;
    version_no: number;
}

interface RfqQuoteRow {
    id: string;
    supplier_id: string;
    status: string;
    submitted_at: string | null;
    total_amount: number;
    supplier: { id: string; legal_name_en: string; supplier_code: string } | null;
    items: Array<{
        id: string;
        rfq_item_id: string;
        unit_price: string;
        total_price: string;
        currency: string | null;
        notes: string | null;
        rfq_item: {
            id: string;
            code: string | null;
            description_en: string;
            unit: string | null;
            qty: string;
        } | null;
    }>;
    attachments: Array<{
        id: number;
        name: string;
        size_bytes: number;
        mime_type: string | null;
        url: string;
        download_url: string;
    }>;
}

interface RfqEvaluationRow {
    id: string;
    supplier_id: string;
    evaluator_id: number;
    price_score: number;
    technical_score: number;
    commercial_score: number;
    total_score: number;
    comments: string | null;
    created_at: string | null;
    supplier: { id: string; legal_name_en: string; supplier_code: string | null } | null;
    evaluator: { id: number; name: string } | null;
}

interface RfqContractRow {
    id: string;
    contract_number: string;
    status: string;
    contract_value: number;
    currency: string;
    signed_at: string | null;
    show_url: string;
}

interface RfqDetail {
    id: string;
    rfq_number: string;
    title: string;
    description: string | null;
    status: string;
    submission_deadline: string | null;
    currency: string;
    version_no: number;
    addendum_note: string | null;
    validity_period_days: number | null;
    created_at: string;
    project?: { id: string; name: string; name_en: string | null; code: string | null } | null;
    purchase_request?: { id: string; pr_number: string; title_en: string } | null;
    procurement_package?: { id: string; package_no: string | null; name: string; project_id: string } | null;
    created_by?: { id: number; name: string } | null;
    issued_by?: { id: number; name: string } | null;
    items: RfqItem[];
    suppliers: RfqSupplier[];
    rfq_quotes?: RfqQuoteRow[];
    documents: RfqDocument[];
    clarifications: RfqClarification[];
    evaluations?: RfqEvaluationRow[];
    contract?: RfqContractRow | null;
    award?: { id: string; supplier: { id: string; legal_name_en: string }; quote: { id: string; total_price: string } } | null;
}

interface PackageAttachmentRow {
    id: string;
    title: string;
    source_type: string;
    document_type: string | null;
    external_url: string | null;
    url?: string | null;
}

interface ComparisonSupplier {
    id: string;
    rfq_quote_id: string;
    legal_name_en: string;
    supplier_code: string;
    total_rfq_items?: number;
    priced_items?: number;
    completeness_pct?: number;
    variance_pct?: number | null;
}

interface ComparisonSummary {
    suppliers_invited: number;
    suppliers_responded: number;
    lowest_total_supplier_id: string | null;
    highest_total_supplier_id: string | null;
    supplier_totals: Record<string, number>;
    total_estimated_cost?: number;
    total_rfq_items?: number;
    recommended_supplier_ids?: string[];
    is_tie?: boolean;
}

interface ComparisonData {
    comparison: Record<string, Record<string, { unit_price: string; total_price: string; version_no: number }>>;
    comparison_quotes_matrix: Record<string, Record<string, { unit_price: string; total_price: string }>>;
    comparison_suppliers: ComparisonSupplier[];
    comparison_summary: ComparisonSummary;
}

interface ShowProps {
    rfq: RfqDetail;
    comparisonData?: ComparisonData;
    package_attachments: PackageAttachmentRow[];
    approval_status?: string;
    rfq_approved_by_name?: string | null;
    rfq_approved_at_formatted?: string | null;
    rfq_submitted_for_approval_at_formatted?: string | null;
    rfq_approval_notes?: string | null;
    can: {
        issue: boolean;
        mark_responses: boolean;
        evaluate: boolean;
        evaluate_supplier: boolean;
        award: boolean;
        create_contract: boolean;
        close: boolean;
        edit: boolean;
        delete: boolean;
        approve_rfq?: boolean;
        manage_clarifications?: boolean;
    };
    timeline: TimelineEvent[];
    rfq_missing_documents?: string[];
}

const supplierStatusBadgeClass: Record<string, string> = {
    invited: 'bg-slate-100 text-slate-700',
    accepted: 'bg-blue-100 text-blue-700',
    declined: 'bg-red-100 text-red-700',
    submitted: 'bg-green-100 text-green-700',
};

const clarificationStatusBadgeClass: Record<string, string> = {
    open: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    answered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    closed: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    reopened: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

const clarificationVisibilityBadgeClass: Record<string, string> = {
    public: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    private: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

function clarificationStatusLabel(status: string): string {
    const map: Record<string, string> = {
        open: 'Open',
        answered: 'Answered',
        closed: 'Closed',
        reopened: 'Reopened',
    };
    return map[status] ?? status.replace(/_/g, ' ');
}

function clarificationVisibilityLabel(visibility: string): string {
    const normalized = visibility === 'private_supplier' ? 'private' : visibility === 'broadcast_all' ? 'public' : visibility;
    return normalized === 'private' ? 'Private' : normalized === 'public' ? 'Public' : normalized;
}

function clarificationVisibilityNormalized(value: string): 'private' | 'public' | string {
    if (value === 'private_supplier') return 'private';
    if (value === 'broadcast_all') return 'public';
    return value;
}

export default function Show({
    rfq,
    comparisonData,
    package_attachments,
    can,
    approval_status = 'draft',
    rfq_approved_by_name,
    rfq_approved_at_formatted,
    rfq_submitted_for_approval_at_formatted,
    rfq_approval_notes,
    timeline,
}: ShowProps) {
    const { t } = useLocale();
    const {
        comparison = {},
        comparison_quotes_matrix = {},
        comparison_suppliers = [],
        comparison_summary = {
            suppliers_invited: 0,
            suppliers_responded: 0,
            lowest_total_supplier_id: null,
            highest_total_supplier_id: null,
            supplier_totals: {},
            total_estimated_cost: 0,
            total_rfq_items: 0,
            recommended_supplier_ids: [],
            is_tie: false,
        },
    } = comparisonData ?? {};

    const { confirmDelete, confirmAction } = useConfirm();
    const { errors, rfq_missing_documents } = usePage().props as SharedPageProps & {
        errors?: Record<string, string | undefined>;
        rfq_missing_documents?: string[];
    };
    const [activeTab, setActiveTab] = useState<
        'items' | 'suppliers' | 'documents' | 'clarifications' | 'evaluations' | 'comparison' | 'activity'
    >('items');

    type DialogType = 'edit' | 'award' | 'awardFromComparison' | 'document' | 'addClarification' | 'answer' | 'viewQuote' | 'submitQuote' | null;
    const [dialogState, setDialogState] = useState<{ type: DialogType; data: RfqClarification | RfqSupplier | RfqQuoteRow | null }>({ type: null, data: null });

    const showEditDialog = dialogState.type === 'edit';
    const showAwardDialog = dialogState.type === 'award';
    const showAddDocumentDialog = dialogState.type === 'document';
    const showAddClarificationDialog = dialogState.type === 'addClarification';
    const showAnswerDialog = dialogState.type === 'answer' ? (dialogState.data as RfqClarification) : null;
    const submitQuoteForSupplier = dialogState.type === 'submitQuote' ? (dialogState.data as RfqSupplier) : null;
    const showAwardFromComparisonDialog = dialogState.type === 'awardFromComparison';
    const viewQuote = dialogState.type === 'viewQuote' ? (dialogState.data as RfqQuoteRow) : null;

    useEffect(() => {
        if (activeTab === 'comparison' && comparisonData === undefined) {
            router.reload({ only: ['comparisonData'] });
        }
    }, [activeTab, comparisonData]);

    const editForm = useForm({
        title: rfq.title,
        description: rfq.description ?? '',
        submission_deadline: rfq.submission_deadline ? rfq.submission_deadline.substring(0, 10) : '',
        validity_period_days: rfq.validity_period_days?.toString() ?? '',
        currency: rfq.currency,
        addendum_note: rfq.addendum_note ?? '',
    });

    const awardForm = useForm({
        supplier_id: '',
        amount: '',
        currency: rfq.currency,
        reason: '',
    });
    const awardFromComparisonForm = useForm({
        rfq_quote_id: '',
        award_note: '',
    });

    const documentForm = useForm({
        document_type: 'other',
        source_type: 'upload',
        title: '',
        file: null as File | null,
        external_url: '',
        external_provider: '',
    });

    const clarificationForm = useForm({
        question: '',
        supplier_id: '',
        visibility: 'private',
    });

    const answerForm = useForm({
        answer: '',
        visibility: 'private',
    });

    const evaluateForm = useForm({
        supplier_id: '',
        price_score: '',
        technical_score: '',
        commercial_score: '',
        comments: '',
    });

    const rfqQuotes = (rfq as RfqDetail & { rfq_quotes?: RfqQuoteRow[] }).rfq_quotes ?? [];
    const submittedRfqQuotes = rfqQuotes.filter((q) => q.status === 'submitted');
    const evaluations = rfq.evaluations ?? [];
    const quoteFormInitialItems = Object.fromEntries(
        rfq.items.map((item) => [
            item.id,
            { unit_price: '', total_price: '', notes: '' as string },
        ])
    );
    const quoteForm = useForm({
        supplier_id: '' as string,
        items: quoteFormInitialItems as Record<string, { unit_price: string; total_price: string; notes: string }>,
    });

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.put(route('rfqs.update', rfq.id), {
            onSuccess: () => setDialogState({ type: null, data: null }),
        });
    };

    const handleAward = (e: React.FormEvent) => {
        e.preventDefault();
        awardForm.transform((data) => ({
            ...data,
            amount: parseFloat(data.amount),
        }));
        awardForm.post(route('rfqs.award', rfq.id), {
            onSuccess: () => handleCloseAwardModal(),
        });
    };

    const handleEvaluateSupplier = (e: React.FormEvent) => {
        e.preventDefault();
        evaluateForm.transform((data) => ({
            ...data,
            price_score: parseFloat(data.price_score),
            technical_score: parseFloat(data.technical_score),
            commercial_score: parseFloat(data.commercial_score),
        }));
        evaluateForm.post(route('rfqs.evaluations.store', rfq.id), {
            onSuccess: () => {
                evaluateForm.reset();
            },
        });
    };

    const handleAwardFromComparison = (e: React.FormEvent) => {
        e.preventDefault();
        awardFromComparisonForm.post(route('rfqs.award-from-comparison', rfq.id), {
            onSuccess: () => {
                handleCloseAwardFromComparisonModal();
            },
        });
    };

    const handleCloseAwardModal = () => {
        awardForm.reset();
        awardForm.setData('currency', rfq.currency);
        setDialogState({ type: null, data: null });
    };

    const handleCloseAwardFromComparisonModal = () => {
        awardFromComparisonForm.reset();
        setDialogState({ type: null, data: null });
    };

    const handleAddDocument = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('document_type', documentForm.data.document_type);
        formData.append('source_type', documentForm.data.source_type);
        formData.append('title', documentForm.data.title);
        if (documentForm.data.file) formData.append('file', documentForm.data.file);
        if (documentForm.data.external_url) formData.append('external_url', documentForm.data.external_url);
        if (documentForm.data.external_provider) formData.append('external_provider', documentForm.data.external_provider);
        router.post(route('rfqs.documents.store', rfq.id), formData, {
            forceFormData: true,
            onSuccess: () => {
                setDialogState({ type: null, data: null });
                documentForm.reset();
            },
        });
    };

    const handleAddClarification = (e: React.FormEvent) => {
        e.preventDefault();
        clarificationForm.transform((data) => ({
            ...data,
            supplier_id: data.supplier_id || null,
        }));
        clarificationForm.post(route('rfqs.clarifications.store', rfq.id), {
            onSuccess: () => {
                setDialogState({ type: null, data: null });
                clarificationForm.reset();
            },
        });
    };

    const handleAnswer = (e: React.FormEvent, clarification: RfqClarification) => {
        e.preventDefault();
        answerForm.post(route('rfqs.clarifications.answer', { rfq: rfq.id, clarification: clarification.id }), {
            onSuccess: () => {
                setDialogState({ type: null, data: null });
                answerForm.reset();
            },
        });
    };

    const handleClose = () => {
        confirmAction('Close RFQ', 'Are you sure you want to close this RFQ?').then((confirmed) => {
            if (confirmed) {
                router.post(route('rfqs.close', rfq.id), { preserveScroll: true });
            }
        });
    };

    const handleIssue = () => {
        const hasAttachments = package_attachments.length > 0 || rfq.documents.length > 0;

        if (hasAttachments) {
            router.post(route('rfqs.issue', rfq.id), {}, { preserveScroll: true });
            return;
        }

        confirmAction(
            'Send RFQ Without Attachments?',
            'No documents are attached to this RFQ. You can proceed and send it now, or go back and add attachments first.'
        ).then((confirmed) => {
            if (confirmed) {
                router.post(route('rfqs.issue', rfq.id), {}, { preserveScroll: true });
            }
        });
    };

    const handleDelete = () => {
        confirmDelete(`Delete RFQ "${rfq.rfq_number}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('rfqs.destroy', rfq.id));
            }
        });
    };

    const formatBytes = (bytes: number | null) => {
        if (bytes == null) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const projectName = rfq.project?.name_en ?? rfq.project?.name ?? '—';
    const hasQuote = (rs: RfqSupplier) =>
        (rs.quotes ?? []).some((q) => q.status === 'submitted') ||
        rfqQuotes.some((q) => q.supplier_id === rs.supplier.id && q.status === 'submitted');
    const getSupplierQuote = (supplierId: string) =>
        rfqQuotes.filter((q) => q.supplier_id === supplierId).sort((a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''))[0];
    const topSupplierByScore = useMemo(() => {
        if (evaluations.length === 0) return null;

        const aggregate = new Map<string, { total: number; count: number; supplierName: string }>();
        evaluations.forEach((evaluation) => {
            const supplierName = evaluation.supplier?.legal_name_en ?? 'Unknown supplier';
            const current = aggregate.get(evaluation.supplier_id) ?? { total: 0, count: 0, supplierName };
            current.total += evaluation.total_score;
            current.count += 1;
            current.supplierName = supplierName;
            aggregate.set(evaluation.supplier_id, current);
        });

        const ranked = [...aggregate.entries()].map(([supplierId, row]) => ({
            supplierId,
            supplierName: row.supplierName,
            average: row.total / row.count,
            count: row.count,
        })).sort((a, b) => b.average - a.average);

        return ranked[0] ?? null;
    }, [evaluations]);
    const openSubmitQuoteModal = (rs: RfqSupplier) => {
        setDialogState({ type: 'submitQuote', data: rs });
        const items = Object.fromEntries(
            rfq.items.map((item) => [item.id, { unit_price: '', total_price: '', notes: '' }])
        ) as Record<string, { unit_price: string; total_price: string; notes: string }>;
        quoteForm.setData({ supplier_id: rs.supplier.id, items });
    };
    const handleSubmitQuote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!submitQuoteForSupplier) return;
        quoteForm.post(route('rfqs.quotes.store', rfq.id), {
            onSuccess: () => {
                setDialogState({ type: null, data: null });
                quoteForm.reset();
            },
        });
    };

    return (
        <AppLayout>
            <Head title={`RFQ ${rfq.rfq_number}`} />
            <div className="space-y-6">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('rfqs.index')} className="hover:text-foreground">
                        RFQs
                    </Link>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                    <span className="text-foreground font-medium">{rfq.rfq_number}</span>
                </nav>
                {errors?.rfq && (
                    <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errors.rfq}
                    </div>
                )}
                {errors?.approval && (
                    <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errors.approval}
                    </div>
                )}
                {errors?.documents && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                            <p>{errors.documents}</p>
                            {can.issue && rfq.status === 'draft' && (
                                <div className="mt-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="border-amber-500 text-amber-700 hover:bg-amber-100"
                                        onClick={() =>
                                            router.post(
                                                route('rfqs.issue', rfq.id),
                                                { force_issue: true },
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        {t('issue_anyway', 'rfqs')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {approval_status !== 'approved' && rfq.status === 'draft' && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                        <ShieldAlert className="me-2 inline h-4 w-4 shrink-0 align-middle" />
                        {t('approval_required_before_issue', 'rfqs')}
                    </div>
                )}

                <ApprovalStatusPanel
                    approvalStatus={(approval_status ?? 'draft') as 'draft' | 'submitted' | 'approved' | 'rejected'}
                    approvedBy={rfq_approved_by_name ?? undefined}
                    approvedAt={rfq_approved_at_formatted ?? undefined}
                    approvalNotes={rfq_approval_notes ?? undefined}
                    submittedAt={rfq_submitted_for_approval_at_formatted ?? undefined}
                    can={{
                        submit: can.edit,
                        approve: can.approve_rfq ?? false,
                        reject: can.approve_rfq ?? false,
                    }}
                    onSubmit={() =>
                        router.post(route('rfqs.submit-for-approval', rfq.id), {}, { preserveScroll: true, onSuccess: () => router.reload() })
                    }
                    onApprove={() =>
                        router.post(route('rfqs.approve', rfq.id), {}, { preserveScroll: true, onSuccess: () => router.reload() })
                    }
                    onReject={(notes) =>
                        router.post(route('rfqs.reject', rfq.id), { rfq_approval_notes: notes }, { preserveScroll: true, onSuccess: () => router.reload() })
                    }
                    entityLabel="RFQ"
                    translationNamespace="rfqs"
                />

                {/* Header card: RFQ number, title, project, package, status, deadline, currency, created */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <CardTitle className="text-xl">{rfq.rfq_number}</CardTitle>
                                <CardDescription className="mt-1">{rfq.title}</CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {can.issue && rfq.status === 'draft' && (
                                    <Button onClick={handleIssue}>
                                        <Send className="h-4 w-4" />
                                        Send RFQ
                                    </Button>
                                )}
                                {can.mark_responses && rfq.status === 'issued' && (
                                    <Button onClick={() => router.post(route('rfqs.mark-responses-received', rfq.id), {}, { preserveScroll: true })}>
                                        <ClipboardCheck className="h-4 w-4" />
                                        Mark responses received
                                    </Button>
                                )}
                                {can.evaluate && rfq.status === 'responses_received' && (
                                    <Button onClick={() => router.post(route('rfqs.evaluate', rfq.id), {}, { preserveScroll: true })}>
                                        <ClipboardCheck className="h-4 w-4" />
                                        Move to evaluation
                                    </Button>
                                )}
                                {rfq.contract && (
                                    <Button variant="outline" asChild>
                                        <Link href={rfq.contract.show_url}>View Contract</Link>
                                    </Button>
                                )}
                                {!rfq.contract && can.create_contract && rfq.status === 'awarded' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => router.get(route('contracts.create-from-rfq', rfq.id))}
                                    >
                                        Create Contract Draft
                                    </Button>
                                )}
                                {can.award && (rfq.status === 'under_evaluation' || rfq.status === 'recommended') && (
                                    <Button onClick={() => setDialogState({ type: 'award', data: null })}>
                                        <Award className="h-4 w-4" />
                                        Award
                                    </Button>
                                )}
                                {can.close && (rfq.status === 'under_evaluation' || rfq.status === 'awarded') && (
                                    <Button variant="outline" onClick={handleClose}>
                                        <XCircle className="h-4 w-4" />
                                        Close
                                    </Button>
                                )}
                                {can.edit && rfq.status === 'draft' && (
                                    <Button variant="outline" onClick={() => setDialogState({ type: 'edit', data: null })}>
                                        <Pencil className="h-4 w-4" />
                                        Edit
                                    </Button>
                                )}
                                {can.delete && rfq.status === 'draft' && (
                                    <Button variant="destructive" onClick={handleDelete}>
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </Button>
                                )}
                                <Link
                                    href={route('rfqs.comparison', { rfq: rfq.id })}
                                    className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                                >
                                    <BarChart2 className="h-4 w-4" />
                                    {t('comparison', 'rfqs')}
                                </Link>
                                <a
                                    href={route('rfqs.print', { rfq: rfq.id })}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                                >
                                    <Printer className="h-4 w-4" />
                                    {t('print', 'rfqs')}
                                </a>
                                <a
                                    href={route('rfqs.pdf', { rfq: rfq.id })}
                                    className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                                >
                                    <FileDown className="h-4 w-4" />
                                    {t('pdf', 'rfqs')}
                                </a>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Project</p>
                                <p className="mt-0.5">{projectName}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Procurement package</p>
                                <p className="mt-0.5">
                                    {rfq.procurement_package ? (
                                        <Link
                                            href={route('projects.procurement-packages.show', [rfq.procurement_package.project_id, rfq.procurement_package.id])}
                                            className="hover:underline font-medium"
                                        >
                                            {rfq.procurement_package.package_no ?? rfq.procurement_package.name}
                                        </Link>
                                    ) : rfq.purchase_request ? (
                                        <Link href={route('purchase-requests.show', rfq.purchase_request.id)} className="hover:underline">
                                            {rfq.purchase_request.pr_number}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <div className="mt-0.5">
                                    <StatusBadge status={rfq.status} entity="rfq" />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Deadline</p>
                                <p className="mt-0.5">
                                    {rfq.submission_deadline ? new Date(rfq.submission_deadline).toLocaleDateString() : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Currency</p>
                                <p className="mt-0.5">{rfq.currency}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Created date</p>
                                <p className="mt-0.5">
                                    {rfq.created_at ? new Date(rfq.created_at).toLocaleDateString() : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Created by</p>
                                <p className="mt-0.5">{rfq.created_by?.name ?? '—'}</p>
                            </div>
                            {rfq.issued_by && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Issued by</p>
                                    <p className="mt-0.5">{rfq.issued_by.name}</p>
                                </div>
                            )}
                            {rfq.contract && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Contract</p>
                                    <p className="mt-0.5">
                                        {rfq.contract.contract_number} ({rfq.contract.status.replace('_', ' ')})
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                </Card>

                {(rfq.status === 'under_evaluation' || rfq.status === 'awarded') && Object.keys(comparison).length > 0 && (
                    <Card>
                        <CardHeader className="sticky top-0 z-10 bg-card border-b border-border rounded-t-lg">
                            <CardTitle>Quote comparison</CardTitle>
                            <CardDescription>Unit prices by supplier (lowest per row highlighted)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <QuoteComparisonTable
                                items={rfq.items}
                                suppliers={rfq.suppliers}
                                comparison={comparison}
                            />
                        </CardContent>
                    </Card>
                )}

                <div className="sticky top-0 z-10 bg-background border-b border-border -mx-1 px-1">
                    <div className="flex gap-4">
                        {(['items', 'suppliers', 'documents', 'clarifications', 'evaluations'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                                    activeTab === tab
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab === 'documents' ? 'Attachments' : tab === 'evaluations' ? 'Evaluation' : tab}
                            </button>
                        ))}
                        {comparison_suppliers.length > 0 && (
                            <button
                                onClick={() => setActiveTab('comparison')}
                                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'comparison'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Comparison
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('activity')}
                            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'activity'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {t('activity_timeline', 'activity')}
                        </button>
                    </div>
                </div>

                {activeTab === 'items' && (
                    <Card>
                        <CardHeader className="sticky top-0 z-10 bg-card border-b border-border rounded-t-lg">
                            <CardTitle>RFQ items</CardTitle>
                            <CardDescription>Read-only snapshot from RFQ items</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ItemsTable items={rfq.items} />
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'suppliers' && (
                    <Card>
                        <CardHeader className="sticky top-0 z-10 bg-card border-b border-border rounded-t-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Supplier invitations</CardTitle>
                                    <CardDescription>Invited suppliers, status, and quote receipt</CardDescription>
                                </div>
                                {can.edit && rfq.status === 'draft' && (
                                    <Button asChild>
                                        <Link href={route('rfqs.invite-suppliers', rfq.id)}>
                                            <UserPlus className="h-4 w-4" />
                                            Invite suppliers
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-muted/95 z-10">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-start font-medium">Supplier name</th>
                                            <th className="px-4 py-3 text-start font-medium">{t('vendor_list', 'rfqs')}</th>
                                            <th className="px-4 py-3 text-start font-medium">Invitation status</th>
                                            <th className="px-4 py-3 text-start font-medium">Invited at</th>
                                            <th className="px-4 py-3 text-start font-medium">Responded at</th>
                                            <th className="px-4 py-3 text-center font-medium">Quote received</th>
                                            {can.edit && rfq.status === 'draft' && <th className="px-4 py-3 text-end font-medium">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rfq.suppliers.map((rs) => (
                                            <tr key={rs.id} className="border-b border-border hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium">{rs.supplier.legal_name_en}</td>
                                                <td className="px-4 py-3 text-muted-foreground text-sm">
                                                    {rs.on_vendor_list === true
                                                        ? t('on_vendor_list', 'rfqs')
                                                        : rs.on_vendor_list === false
                                                            ? t('not_on_vendor_list', 'rfqs')
                                                            : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={supplierStatusBadgeClass[rs.status] ?? ''}>
                                                        {rs.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                                                    {rs.invited_at ? new Date(rs.invited_at).toLocaleString() : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                                                    {rs.responded_at ? new Date(rs.responded_at).toLocaleString() : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {hasQuote(rs) ? (
                                                        <span className="text-green-600 dark:text-green-400 font-medium">Yes</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">No</span>
                                                    )}
                                                </td>
                                                {can.edit && rfq.status === 'draft' && (
                                                    <td className="px-4 py-3 text-right">
                                                        {rs.status !== 'submitted' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    router.delete(route('rfqs.suppliers.remove', [rfq.id, rs.id]), {
                                                                        preserveScroll: true,
                                                                    })
                                                                }
                                                            >
                                                                Remove
                                                            </Button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {rfq.suppliers.length === 0 && (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No suppliers invited yet.</div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'suppliers' && (
                    <Card className="mt-6">
                        <CardHeader className="sticky top-0 z-10 bg-card border-b border-border rounded-t-lg">
                            <CardTitle>Supplier Quotes</CardTitle>
                            <CardDescription>Submit or view pricing per supplier</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-muted/95 z-10">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left font-medium">Supplier</th>
                                            <th className="px-4 py-3 text-left font-medium">Status</th>
                                            <th className="px-4 py-3 text-left font-medium">Submitted At</th>
                                            <th className="px-4 py-3 text-right font-medium">Total</th>
                                            <th className="px-4 py-3 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rfq.suppliers.map((rs) => {
                                            const quote = getSupplierQuote(rs.supplier.id);
                                            return (
                                                <tr key={rs.id} className="border-b border-border hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-medium">{rs.supplier.legal_name_en}</td>
                                                    <td className="px-4 py-3">
                                                        {quote ? (
                                                            <Badge variant="outline" className={supplierStatusBadgeClass[quote.status] ?? ''}>
                                                                {quote.status}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">Not submitted</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                                                        {quote?.submitted_at ? new Date(quote.submitted_at).toLocaleString() : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums">
                                                        {quote ? `${rfq.currency} ${quote.total_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {quote && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setDialogState({ type: 'viewQuote', data: quote })}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                    View
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openSubmitQuoteModal(rs)}
                                                                disabled={rfq.items.length === 0}
                                                            >
                                                                Submit Quote
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {rfq.suppliers.length === 0 && (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No suppliers to show quotes for.</div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'documents' && (
                    <Card>
                        <CardHeader className="sticky top-0 z-10 rounded-t-lg border-b border-border bg-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Attachments</CardTitle>
                                    <CardDescription>
                                        Package attachments (inherited) and RFQ-specific
                                        documents
                                    </CardDescription>
                                </div>
                                {can.edit && rfq.status === 'draft' && (
                                    <Button
                                        onClick={() =>
                                            setDialogState({ type: 'document', data: null })
                                        }
                                    >
                                        <FilePlus className="h-4 w-4" />
                                        Add document
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {package_attachments.length > 0 && (
                                <div>
                                    <h4 className="mb-2 text-sm font-semibold">
                                        Package attachments (inherited)
                                    </h4>
                                    <div className="overflow-x-auto border rounded-md">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border bg-muted/50">
                                                    <th className="px-4 py-3 text-left font-medium">
                                                        Type
                                                    </th>
                                                    <th className="px-4 py-3 text-left font-medium">
                                                        Title
                                                    </th>
                                                    <th className="px-4 py-3 text-left font-medium">
                                                        Source
                                                    </th>
                                                    <th className="px-4 py-3 text-right font-medium">
                                                        Link
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {package_attachments.map((att) => (
                                                    <tr
                                                        key={att.id}
                                                        className="border-b border-border hover:bg-muted/30"
                                                    >
                                                        <td className="px-4 py-3">
                                                            {att.document_type ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3 font-medium">
                                                            {att.title}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {att.source_type}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {att.url ? (
                                                                <a
                                                                    href={att.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-primary hover:underline"
                                                                >
                                                                    Open
                                                                </a>
                                                            ) : (
                                                                <span className="text-muted-foreground">
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            <div>
                                <h4 className="mb-2 text-sm font-semibold">RFQ documents</h4>
                                <DocumentList
                                    documents={rfq.documents.map(
                                        (doc: RfqDocument) => ({
                                            id: String(doc.id),
                                            name: doc.title,
                                            document_type: doc.document_type,
                                            version: doc.version,
                                            is_current:
                                                doc.is_current ?? true,
                                            uploaded_at: doc.uploaded_at ?? null,
                                            download_url:
                                                doc.download_url ??
                                                doc.url ??
                                                '#',
                                            preview_url: doc.url ?? null,
                                        }),
                                    )}
                                    missingDocuments={rfq_missing_documents ?? []}
                                    showVersions
                                    renderActions={(doc) =>
                                        can.edit && rfq.status === 'draft' ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                type="button"
                                                onClick={() =>
                                                    router.delete(
                                                        route('rfqs.documents.destroy', [
                                                            rfq.id,
                                                            doc.id,
                                                        ]),
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                            >
                                                Delete
                                            </Button>
                                        ) : null
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'clarifications' && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Clarifications</CardTitle>
                                    <CardDescription>Q&A with suppliers</CardDescription>
                                </div>
                                {can.edit && (
                                    <Button onClick={() => setDialogState({ type: 'addClarification', data: null })}>
                                        <MessageSquarePlus className="h-4 w-4" />
                                        Add Question
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {rfq.clarifications.length === 0 && (
                                <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                                    No clarifications yet.
                                </div>
                            )}
                            {rfq.clarifications.map((c) => {
                                const normalizedVisibility = clarificationVisibilityNormalized(c.visibility);
                                const clarificationStatus = c.status ?? (c.answer ? 'answered' : 'open');

                                return (
                                    <div key={c.id} className="rounded-lg border p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="space-y-1">
                                                <p className="font-medium">{c.question}</p>
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    {c.supplier ? (
                                                        <span>Supplier: {c.supplier.legal_name_en}</span>
                                                    ) : (
                                                        <span>Scope: All suppliers</span>
                                                    )}
                                                    {c.asked_by_name && <span>Asked by: {c.asked_by_name}</span>}
                                                    {c.created_at && <span>{new Date(c.created_at).toLocaleString()}</span>}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={clarificationStatusBadgeClass[clarificationStatus] ?? ''}
                                                >
                                                    {clarificationStatusLabel(clarificationStatus)}
                                                </Badge>
                                                <div className="flex items-center gap-1">
                                                <Badge
                                                    variant="outline"
                                                    className={clarificationVisibilityBadgeClass[normalizedVisibility] ?? ''}
                                                >
                                                    {clarificationVisibilityLabel(normalizedVisibility)}
                                                </Badge>
                                                    {can.manage_clarifications && (
                                                        <Select
                                                            value={normalizedVisibility === 'public' ? 'public' : 'private'}
                                                            onValueChange={(value) => {
                                                                router.post(
                                                                    route('rfqs.clarifications.visibility', {
                                                                        rfq: rfq.id,
                                                                        clarification: c.id,
                                                                    }),
                                                                    { visibility: value },
                                                                    { preserveScroll: true, preserveState: true }
                                                                );
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-7 w-28 px-2 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent align="end">
                                                                <SelectItem value="private">Private</SelectItem>
                                                                <SelectItem value="public">General</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 rounded-md bg-muted/40 px-3 py-2">
                                            {c.answer ? (
                                                <div className="space-y-1">
                                                    <p>{c.answer}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {c.answered_by_name ? `Answered by: ${c.answered_by_name}` : 'Answered'}
                                                        {c.answered_at ? ` • ${new Date(c.answered_at).toLocaleString()}` : ''}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Awaiting answer.</p>
                                            )}
                                        </div>
                                        {!c.answer && can.manage_clarifications && (
                                            <div className="mt-3">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDialogState({ type: 'answer', data: c })}
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                    Answer
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'evaluations' && (
                    <Card>
                        <CardHeader className="sticky top-0 z-10 rounded-t-lg border-b border-border bg-card">
                            <CardTitle>Supplier Evaluation</CardTitle>
                            <CardDescription>Score suppliers by price, technical, and commercial criteria.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-lg border bg-card p-4">
                                    <p className="text-sm text-muted-foreground">Evaluations submitted</p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums">{evaluations.length}</p>
                                </div>
                                <div className="rounded-lg border bg-card p-4">
                                    <p className="text-sm text-muted-foreground">Suppliers evaluated</p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums">{new Set(evaluations.map((e) => e.supplier_id)).size}</p>
                                </div>
                                <div className="rounded-lg border bg-card p-4">
                                    <p className="text-sm text-muted-foreground">Top average score</p>
                                    <p className="mt-1 text-base font-semibold">
                                        {topSupplierByScore
                                            ? `${topSupplierByScore.supplierName} (${topSupplierByScore.average.toFixed(2)})`
                                            : '—'}
                                    </p>
                                </div>
                            </div>

                            {evaluations.length > 0 ? (
                                <EvaluationTable evaluations={evaluations} />
                            ) : (
                                <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                                    No evaluation records yet.
                                </div>
                            )}

                            {can.evaluate_supplier && (
                                <div className="rounded-lg border p-4">
                                    <h4 className="font-semibold">Add Evaluation</h4>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Use this form to record evaluator scoring for one supplier.
                                    </p>
                                    <form onSubmit={handleEvaluateSupplier} className="mt-4 grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Supplier *</Label>
                                            <Select
                                                value={evaluateForm.data.supplier_id}
                                                onValueChange={(value) => evaluateForm.setData('supplier_id', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select supplier" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {rfq.suppliers.map((row) => (
                                                        <SelectItem key={row.supplier.id} value={row.supplier.id}>
                                                            {row.supplier.legal_name_en}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {evaluateForm.errors.supplier_id && (
                                                <p className="text-sm text-destructive">{evaluateForm.errors.supplier_id}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="price_score">Price score *</Label>
                                            <Input
                                                id="price_score"
                                                type="number"
                                                min={0}
                                                max={100}
                                                step="0.01"
                                                value={evaluateForm.data.price_score}
                                                onChange={(e) => evaluateForm.setData('price_score', e.target.value)}
                                                required
                                            />
                                            {evaluateForm.errors.price_score && (
                                                <p className="text-sm text-destructive">{evaluateForm.errors.price_score}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="technical_score">Technical score *</Label>
                                            <Input
                                                id="technical_score"
                                                type="number"
                                                min={0}
                                                max={100}
                                                step="0.01"
                                                value={evaluateForm.data.technical_score}
                                                onChange={(e) => evaluateForm.setData('technical_score', e.target.value)}
                                                required
                                            />
                                            {evaluateForm.errors.technical_score && (
                                                <p className="text-sm text-destructive">{evaluateForm.errors.technical_score}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="commercial_score">Commercial score *</Label>
                                            <Input
                                                id="commercial_score"
                                                type="number"
                                                min={0}
                                                max={100}
                                                step="0.01"
                                                value={evaluateForm.data.commercial_score}
                                                onChange={(e) => evaluateForm.setData('commercial_score', e.target.value)}
                                                required
                                            />
                                            {evaluateForm.errors.commercial_score && (
                                                <p className="text-sm text-destructive">{evaluateForm.errors.commercial_score}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="evaluation_comments">Comments</Label>
                                            <textarea
                                                id="evaluation_comments"
                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                                value={evaluateForm.data.comments}
                                                onChange={(e) => evaluateForm.setData('comments', e.target.value)}
                                            />
                                            {evaluateForm.errors.comments && (
                                                <p className="text-sm text-destructive">{evaluateForm.errors.comments}</p>
                                            )}
                                        </div>
                                        <div className="md:col-span-2 flex justify-end">
                                            <Button type="submit" disabled={evaluateForm.processing}>
                                                Save Evaluation
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'comparison' && comparison_suppliers.length > 0 && (
                    <Card>
                        <CardHeader className="sticky top-0 z-10 bg-card border-b border-border rounded-t-lg">
                            <CardTitle>Quote comparison matrix</CardTitle>
                            <CardDescription>Side-by-side supplier pricing (lowest total per row highlighted)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                <div className="rounded-lg border bg-card p-4">
                                    <p className="text-sm font-medium text-muted-foreground">Suppliers invited</p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums">{comparison_summary.suppliers_invited}</p>
                                </div>
                                <div className="rounded-lg border bg-card p-4">
                                    <p className="text-sm font-medium text-muted-foreground">Suppliers responded</p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums">{comparison_summary.suppliers_responded}</p>
                                </div>
                                <div className="rounded-lg border bg-card p-4">
                                    <p className="text-sm font-medium text-muted-foreground">Complete quotes (100%)</p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                                        {comparison_suppliers.filter((s) => (s.completeness_pct ?? 0) >= 100).length}
                                    </p>
                                </div>
                                <div className="rounded-lg border bg-card p-4">
                                    <p className="text-sm font-medium text-muted-foreground">Lowest total</p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {comparison_summary.lowest_total_supplier_id
                                            ? comparison_suppliers.find((s) => s.id === comparison_summary.lowest_total_supplier_id)?.legal_name_en ?? '—'
                                            : '—'}
                                    </p>
                                </div>
                                <div className="rounded-lg border bg-card p-4">
                                    <p className="text-sm font-medium text-muted-foreground">Highest total</p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {comparison_summary.highest_total_supplier_id
                                            ? comparison_suppliers.find((s) => s.id === comparison_summary.highest_total_supplier_id)?.legal_name_en ?? '—'
                                            : '—'}
                                    </p>
                                </div>
                            </div>

                            {(comparison_summary.recommended_supplier_ids?.length ?? 0) > 0 && (
                                <div className="rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-4 py-3">
                                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                        {comparison_summary.is_tie ? (
                                            <>
                                                Tie: {comparison_summary.recommended_supplier_ids!.map((id) => comparison_suppliers.find((s) => s.id === id)?.legal_name_en ?? id).join(', ')}
                                            </>
                                        ) : (
                                            <>
                                                Recommended supplier:{' '}
                                                {comparison_suppliers.find((s) => s.id === comparison_summary.recommended_supplier_ids![0])?.legal_name_en ?? '—'}
                                            </>
                                        )}
                                    </p>
                                </div>
                            )}

                            {(rfq.status === 'under_evaluation' || rfq.status === 'recommended') && can.award && (
                                <div className="flex justify-end">
                                    <Button onClick={() => setDialogState({ type: 'awardFromComparison', data: null })}>
                                        <Award className="h-4 w-4" />
                                        Award supplier
                                    </Button>
                                </div>
                            )}

                            <ComparisonTable
                                items={rfq.items}
                                comparisonSuppliers={comparison_suppliers}
                                comparisonQuotesMatrix={comparison_quotes_matrix}
                                comparisonSummary={comparison_summary}
                            />
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'activity' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {t('activity_timeline', 'activity')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ActivityTimeline events={timeline} />
                        </CardContent>
                    </Card>
                )}
            </div>

            <Modal show={showEditDialog} onClose={() => setDialogState({ type: null, data: null })}>
                <Card className="border-0 shadow-none">
                    <CardHeader>
                        <CardTitle>Edit RFQ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleEdit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit_title">Title *</Label>
                                <Input id="edit_title" value={editForm.data.title} onChange={(e) => editForm.setData('title', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_description">Description</Label>
                                <textarea
                                    id="edit_description"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_deadline">Submission Deadline</Label>
                                <Input id="edit_deadline" type="date" value={editForm.data.submission_deadline} onChange={(e) => editForm.setData('submission_deadline', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_validity">Validity Period (days)</Label>
                                <Input id="edit_validity" type="number" min="1" value={editForm.data.validity_period_days} onChange={(e) => editForm.setData('validity_period_days', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_currency">Currency</Label>
                                <Input id="edit_currency" value={editForm.data.currency} onChange={(e) => editForm.setData('currency', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_addendum">Addendum Note</Label>
                                <textarea
                                    id="edit_addendum"
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                    value={editForm.data.addendum_note}
                                    onChange={(e) => editForm.setData('addendum_note', e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setDialogState({ type: null, data: null })}>Cancel</Button>
                                <Button type="submit" disabled={editForm.processing}>Update</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Modal>

            <Modal show={showAwardDialog} onClose={handleCloseAwardModal}>
                <Card className="border-0 shadow-none">
                    <CardHeader>
                        <CardTitle>Award RFQ</CardTitle>
                        <CardDescription>Select the winning quote</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAward} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Supplier *</Label>
                                <Select
                                    value={awardForm.data.supplier_id}
                                    onValueChange={(v) => {
                                        const q = getSupplierQuote(v);
                                        if (q) {
                                            awardForm.setData({
                                                supplier_id: v,
                                                amount: String(q.total_amount ?? ''),
                                                currency: rfq.currency,
                                                reason: awardForm.data.reason,
                                            });
                                            return;
                                        }

                                        awardForm.setData('supplier_id', v);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select supplier" />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        {submittedRfqQuotes.map((q) => {
                                            const s = rfq.suppliers.find((rs) => rs.supplier.id === q.supplier_id)?.supplier ?? q.supplier;
                                            return (
                                                <SelectItem key={q.id} value={q.supplier_id}>
                                                    {s?.legal_name_en ?? q.supplier_id} — {rfq.currency} {q.total_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="awarded_amount">Awarded Amount *</Label>
                                <Input
                                    id="awarded_amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={awardForm.data.amount}
                                    onChange={(e) => awardForm.setData('amount', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="award_currency">Currency *</Label>
                                <Input
                                    id="award_currency"
                                    value={awardForm.data.currency}
                                    onChange={(e) => awardForm.setData('currency', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="award_note">Award Note</Label>
                                <textarea
                                    id="award_note"
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                    value={awardForm.data.reason}
                                    onChange={(e) => awardForm.setData('reason', e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={handleCloseAwardModal}>Cancel</Button>
                                <Button type="submit" disabled={awardForm.processing}>Award</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Modal>

            <Modal show={showAwardFromComparisonDialog} onClose={handleCloseAwardFromComparisonModal}>
                <Card className="border-0 shadow-none">
                    <CardHeader>
                        <CardTitle>Award supplier</CardTitle>
                        <CardDescription>Confirm the winning supplier from the comparison matrix</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAwardFromComparison} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Supplier *</Label>
                                <Select
                                    value={awardFromComparisonForm.data.rfq_quote_id}
                                    onValueChange={(v) => awardFromComparisonForm.setData('rfq_quote_id', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select supplier to award" />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        {comparison_suppliers.map((s) => (
                                            <SelectItem key={s.id} value={s.rfq_quote_id}>
                                                {s.legal_name_en}
                                                {comparison_summary.supplier_totals[s.id] != null && (
                                                    <span className="text-muted-foreground ml-1">
                                                        — {rfq.currency} {(comparison_summary.supplier_totals[s.id] ?? 0).toLocaleString()}
                                                    </span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="award_from_comp_note">Award note (optional)</Label>
                                <textarea
                                    id="award_from_comp_note"
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                    value={awardFromComparisonForm.data.award_note}
                                    onChange={(e) => awardFromComparisonForm.setData('award_note', e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={handleCloseAwardFromComparisonModal}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={awardFromComparisonForm.processing}>
                                    Award supplier
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Modal>

            <Modal show={showAddDocumentDialog} onClose={() => setDialogState({ type: null, data: null })}>
                <Card className="border-0 shadow-none">
                    <CardHeader>
                        <CardTitle>Add Document</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddDocument} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Document Type *</Label>
                                <Select value={documentForm.data.document_type} onValueChange={(v) => documentForm.setData('document_type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="boq">BOQ</SelectItem>
                                        <SelectItem value="drawings">Drawings</SelectItem>
                                        <SelectItem value="specifications">Specifications</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Source Type *</Label>
                                <Select value={documentForm.data.source_type} onValueChange={(v) => documentForm.setData('source_type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="upload">Upload</SelectItem>
                                        <SelectItem value="google_drive">Google Drive</SelectItem>
                                        <SelectItem value="wetransfer">WeTransfer</SelectItem>
                                        <SelectItem value="dropbox">Dropbox</SelectItem>
                                        <SelectItem value="onedrive">OneDrive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="doc_title">Title *</Label>
                                <Input id="doc_title" value={documentForm.data.title} onChange={(e) => documentForm.setData('title', e.target.value)} required />
                            </div>
                            {documentForm.data.source_type === 'upload' && (
                                <div className="space-y-2">
                                    <Label htmlFor="doc_file">File</Label>
                                    <Input
                                        id="doc_file"
                                        type="file"
                                        onChange={(e) => documentForm.setData('file', e.target.files?.[0] ?? null)}
                                    />
                                </div>
                            )}
                            {documentForm.data.source_type !== 'upload' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="doc_url">External URL</Label>
                                        <Input id="doc_url" type="url" value={documentForm.data.external_url} onChange={(e) => documentForm.setData('external_url', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Provider</Label>
                                        <Select value={documentForm.data.external_provider} onValueChange={(v) => documentForm.setData('external_provider', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="google_drive">Google Drive</SelectItem>
                                                <SelectItem value="wetransfer">WeTransfer</SelectItem>
                                                <SelectItem value="dropbox">Dropbox</SelectItem>
                                                <SelectItem value="onedrive">OneDrive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setDialogState({ type: null, data: null })}>Cancel</Button>
                                <Button type="submit">Add</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Modal>

            <Modal show={showAddClarificationDialog} onClose={() => setDialogState({ type: null, data: null })}>
                <Card className="border-0 shadow-none">
                    <CardHeader>
                        <CardTitle>Add Question</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddClarification} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="clar_question">Question *</Label>
                                <textarea
                                    id="clar_question"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                    value={clarificationForm.data.question}
                                    onChange={(e) => clarificationForm.setData('question', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Supplier (optional)</Label>
                                <Select value={clarificationForm.data.supplier_id || 'none'} onValueChange={(v) => clarificationForm.setData('supplier_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger><SelectValue placeholder="All suppliers" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">All suppliers</SelectItem>
                                        {rfq.suppliers.map((rs) => (
                                            <SelectItem key={rs.id} value={rs.supplier.id}>{rs.supplier.legal_name_en}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Visibility</Label>
                                <Select value={clarificationForm.data.visibility} onValueChange={(v) => clarificationForm.setData('visibility', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="private">Private</SelectItem>
                                        <SelectItem value="public">Public (All suppliers)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setDialogState({ type: null, data: null })}>Cancel</Button>
                                <Button type="submit">Add</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Modal>

            <Modal show={!!viewQuote} onClose={() => setDialogState({ type: null, data: null })} maxWidth="2xl">
                <Card className="border-0 shadow-none max-h-[90vh] overflow-hidden">
                    <CardHeader>
                        <CardTitle>Supplier Quotation</CardTitle>
                        <CardDescription>
                            {viewQuote?.supplier?.legal_name_en ?? 'Supplier'}
                            {viewQuote ? ` • ${rfq.currency} ${viewQuote.total_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 overflow-y-auto">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                                <p className="text-xs text-muted-foreground">Status</p>
                                <Badge variant="outline" className={supplierStatusBadgeClass[viewQuote?.status ?? ''] ?? ''}>
                                    {viewQuote?.status ?? '—'}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Submitted At</p>
                                <p className="text-sm">
                                    {viewQuote?.submitted_at ? new Date(viewQuote.submitted_at).toLocaleString() : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Items</p>
                                <p className="text-sm tabular-nums">{viewQuote?.items.length ?? 0}</p>
                            </div>
                        </div>

                        {viewQuote && (
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/80">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left font-medium">Code</th>
                                            <th className="px-4 py-3 text-left font-medium">Description</th>
                                            <th className="px-4 py-3 text-right font-medium">Qty</th>
                                            <th className="px-4 py-3 text-right font-medium">Unit price</th>
                                            <th className="px-4 py-3 text-right font-medium">Total</th>
                                            <th className="px-4 py-3 text-left font-medium">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewQuote.items.map((item) => (
                                            <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                                                <td className="px-4 py-3 font-mono">{item.rfq_item?.code ?? '—'}</td>
                                                <td className="px-4 py-3">{item.rfq_item?.description_en ?? '—'}</td>
                                                <td className="px-4 py-3 text-right tabular-nums">{item.rfq_item?.qty ?? '—'}</td>
                                                <td className="px-4 py-3 text-right tabular-nums">
                                                    {parseFloat(item.unit_price).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums">
                                                    {parseFloat(item.total_price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{item.notes ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div>
                            <h4 className="font-medium">Attachments</h4>
                            {viewQuote && viewQuote.attachments.length > 0 ? (
                                <ul className="mt-2 space-y-2">
                                    {viewQuote.attachments.map((attachment) => (
                                        <li key={attachment.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                            <span className="truncate">{attachment.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-muted-foreground">{formatBytes(attachment.size_bytes)}</span>
                                                <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                    Open
                                                </a>
                                                <a href={attachment.download_url} className="text-primary hover:underline">
                                                    Download
                                                </a>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-1 text-sm text-muted-foreground">No attachments uploaded.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </Modal>

            <Modal show={!!submitQuoteForSupplier} onClose={() => setDialogState({ type: null, data: null })}>
                <Card className="border-0 shadow-none max-h-[90vh] overflow-hidden flex flex-col">
                    <CardHeader>
                        <CardTitle>Submit Quote</CardTitle>
                        <CardDescription>
                            {submitQuoteForSupplier ? `Enter pricing for ${submitQuoteForSupplier.supplier.legal_name_en}` : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-auto flex-1 p-0">
                        <form onSubmit={handleSubmitQuote} className="p-4 space-y-4">
                            <div className="overflow-x-auto border rounded-md">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/95">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left font-medium">Code</th>
                                            <th className="px-4 py-3 text-left font-medium">Description</th>
                                            <th className="px-4 py-3 text-left font-medium">Unit</th>
                                            <th className="px-4 py-3 text-right font-medium">Qty</th>
                                            <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                                            <th className="px-4 py-3 text-right font-medium">Total Price</th>
                                            <th className="px-4 py-3 text-left font-medium">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rfq.items.map((item) => (
                                            <tr key={item.id} className="border-b border-border">
                                                <td className="px-4 py-2 font-mono">{item.code ?? '—'}</td>
                                                <td className="px-4 py-2">{item.description_en}</td>
                                                <td className="px-4 py-2">{item.unit ?? '—'}</td>
                                                <td className="px-4 py-2 text-right tabular-nums">{item.qty ?? '—'}</td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className="w-28 text-right"
                                                        value={quoteForm.data.items[item.id]?.unit_price ?? ''}
                                                        onChange={(e) =>
                                                            quoteForm.setData('items', {
                                                                ...quoteForm.data.items,
                                                                [item.id]: {
                                                                    ...quoteForm.data.items[item.id],
                                                                    unit_price: e.target.value,
                                                                },
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className="w-28 text-right"
                                                        value={quoteForm.data.items[item.id]?.total_price ?? ''}
                                                        onChange={(e) =>
                                                            quoteForm.setData('items', {
                                                                ...quoteForm.data.items,
                                                                [item.id]: {
                                                                    ...quoteForm.data.items[item.id],
                                                                    total_price: e.target.value,
                                                                },
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        className="w-40"
                                                        placeholder="Notes"
                                                        value={quoteForm.data.items[item.id]?.notes ?? ''}
                                                        onChange={(e) =>
                                                            quoteForm.setData('items', {
                                                                ...quoteForm.data.items,
                                                                [item.id]: {
                                                                    ...quoteForm.data.items[item.id],
                                                                    notes: e.target.value,
                                                                },
                                                            })
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {quoteForm.errors.supplier_id && (
                                <p className="text-sm text-destructive">{quoteForm.errors.supplier_id}</p>
                            )}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setDialogState({ type: null, data: null })}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={quoteForm.processing}>
                                    Submit Quote
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Modal>

            {showAnswerDialog && (
                <Modal show onClose={() => setDialogState({ type: null, data: null })}>
                    <Card className="border-0 shadow-none">
                        <CardHeader>
                            <CardTitle>Answer Clarification</CardTitle>
                            <CardDescription>{showAnswerDialog.question}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={(e) => handleAnswer(e, showAnswerDialog)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="answer_text">Answer *</Label>
                                    <textarea
                                        id="answer_text"
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                        value={answerForm.data.answer}
                                        onChange={(e) => answerForm.setData('answer', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Visibility</Label>
                                    <Select value={answerForm.data.visibility} onValueChange={(v) => answerForm.setData('visibility', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="private">Private</SelectItem>
                                            <SelectItem value="public">Public (All suppliers)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setDialogState({ type: null, data: null })}>Cancel</Button>
                                    <Button type="submit" disabled={answerForm.processing}>Answer</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </Modal>
            )}
        </AppLayout>
    );
}
