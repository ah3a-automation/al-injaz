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
import { Head, Link, router, useForm } from '@inertiajs/react';
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
} from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '@/hooks';

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
    supplier: { id: string; legal_name_en: string; supplier_code: string; supplier_type: string; city: string | null; country: string | null };
    quotes?: SupplierQuote[];
}

interface RfqDocument {
    id: string;
    document_type: string;
    source_type: string;
    title: string;
    file_size_bytes: number | null;
}

interface RfqClarification {
    id: string;
    question: string;
    answer: string | null;
    visibility: string;
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
    supplier: { id: string; legal_name_en: string; supplier_code: string };
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
    award?: { id: string; supplier: { id: string; legal_name_en: string }; quote: { id: string; total_price: string } } | null;
}

interface PackageAttachmentRow {
    id: string;
    title: string;
    source_type: string;
    document_type: string | null;
    external_url: string | null;
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

interface ShowProps {
    rfq: RfqDetail;
    comparison: Record<string, Record<string, { unit_price: string; total_price: string; version_no: number }>>;
    comparison_quotes_matrix: Record<string, Record<string, { unit_price: string; total_price: string }>>;
    comparison_suppliers: ComparisonSupplier[];
    comparison_summary: ComparisonSummary;
    package_attachments: PackageAttachmentRow[];
    can: { issue: boolean; mark_responses: boolean; evaluate: boolean; award: boolean; close: boolean; edit: boolean; delete: boolean };
}

const statusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    issued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    supplier_submissions: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    evaluation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    awarded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

function statusLabel(s: string): string {
    const map: Record<string, string> = {
        draft: 'Draft',
        issued: 'Sent',
        supplier_submissions: 'Responses Received',
        evaluation: 'Evaluation',
        awarded: 'Awarded',
        closed: 'Closed',
    };
    return map[s] ?? s.replace(/_/g, ' ');
}

const supplierStatusBadgeClass: Record<string, string> = {
    invited: 'bg-slate-100 text-slate-700',
    accepted: 'bg-blue-100 text-blue-700',
    declined: 'bg-red-100 text-red-700',
    submitted: 'bg-green-100 text-green-700',
};

export default function Show({ rfq, comparison, comparison_quotes_matrix, comparison_suppliers, comparison_summary, package_attachments, can }: ShowProps) {
    const { confirmDelete, confirmAction } = useConfirm();
    const [activeTab, setActiveTab] = useState<'items' | 'suppliers' | 'documents' | 'clarifications' | 'comparison'>('items');
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showAwardDialog, setShowAwardDialog] = useState(false);
    const [showAddDocumentDialog, setShowAddDocumentDialog] = useState(false);
    const [showAddClarificationDialog, setShowAddClarificationDialog] = useState(false);
    const [showAnswerDialog, setShowAnswerDialog] = useState<RfqClarification | null>(null);
    const [submitQuoteForSupplier, setSubmitQuoteForSupplier] = useState<RfqSupplier | null>(null);
    const [showAwardFromComparisonDialog, setShowAwardFromComparisonDialog] = useState(false);

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
        quote_id: '',
        awarded_amount: '',
        award_note: '',
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
        visibility: 'private_supplier',
    });

    const answerForm = useForm({
        answer: '',
        visibility: 'private_supplier',
    });

    const submittedQuotes = rfq.suppliers.flatMap((rs) => rs.quotes ?? []).filter((q) => q.status === 'submitted');
    const rfqQuotes = (rfq as RfqDetail & { rfq_quotes?: RfqQuoteRow[] }).rfq_quotes ?? [];
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
            onSuccess: () => setShowEditDialog(false),
        });
    };

    const handleAward = (e: React.FormEvent) => {
        e.preventDefault();
        awardForm.transform((data) => ({
            ...data,
            awarded_amount: parseFloat(data.awarded_amount),
        }));
        awardForm.post(route('rfqs.award', rfq.id), {
            onSuccess: () => {
                setShowAwardDialog(false);
                awardForm.reset();
            },
        });
    };

    const handleAwardFromComparison = (e: React.FormEvent) => {
        e.preventDefault();
        awardFromComparisonForm.post(route('rfqs.award-from-comparison', rfq.id), {
            onSuccess: () => {
                setShowAwardFromComparisonDialog(false);
                awardFromComparisonForm.reset();
            },
        });
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
                setShowAddDocumentDialog(false);
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
                setShowAddClarificationDialog(false);
                clarificationForm.reset();
            },
        });
    };

    const handleAnswer = (e: React.FormEvent, clarification: RfqClarification) => {
        e.preventDefault();
        answerForm.post(route('rfqs.clarifications.answer', { rfq: rfq.id, clarification: clarification.id }), {
            onSuccess: () => {
                setShowAnswerDialog(null);
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

    const supplierColumns = Object.keys(
        Object.values(comparison).reduce((acc, row) => ({ ...acc, ...row }), {})
    ).filter(Boolean);

    const projectName = rfq.project?.name_en ?? rfq.project?.name ?? '—';
    const hasQuote = (rs: RfqSupplier) =>
        (rs.quotes ?? []).some((q) => q.status === 'submitted') ||
        rfqQuotes.some((q) => q.supplier_id === rs.supplier.id && q.status === 'submitted');
    const getSupplierQuote = (supplierId: string) =>
        rfqQuotes.filter((q) => q.supplier_id === supplierId).sort((a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''))[0];
    const openSubmitQuoteModal = (rs: RfqSupplier) => {
        setSubmitQuoteForSupplier(rs);
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
                setSubmitQuoteForSupplier(null);
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
                                    <Button onClick={() => router.post(route('rfqs.issue', rfq.id), {}, { preserveScroll: true })}>
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
                                {can.evaluate && rfq.status === 'supplier_submissions' && (
                                    <Button onClick={() => router.post(route('rfqs.evaluate', rfq.id), {}, { preserveScroll: true })}>
                                        <ClipboardCheck className="h-4 w-4" />
                                        Move to evaluation
                                    </Button>
                                )}
                                {can.award && rfq.status === 'evaluation' && (
                                    <Button onClick={() => setShowAwardDialog(true)}>
                                        <Award className="h-4 w-4" />
                                        Award
                                    </Button>
                                )}
                                {can.close && (rfq.status === 'evaluation' || rfq.status === 'awarded') && (
                                    <Button variant="outline" onClick={handleClose}>
                                        <XCircle className="h-4 w-4" />
                                        Close
                                    </Button>
                                )}
                                {can.edit && rfq.status === 'draft' && (
                                    <Button variant="outline" onClick={() => setShowEditDialog(true)}>
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
                                <p className="mt-0.5">
                                    <Badge variant="outline" className={statusBadgeClass[rfq.status] ?? ''}>
                                        {statusLabel(rfq.status)}
                                    </Badge>
                                </p>
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
                        </div>
                    </CardHeader>
                </Card>

                {(rfq.status === 'evaluation' || rfq.status === 'awarded') && Object.keys(comparison).length > 0 && (
                    <Card>
                        <CardHeader className="sticky top-0 z-10 bg-card border-b border-border rounded-t-lg">
                            <CardTitle>Quote comparison</CardTitle>
                            <CardDescription>Unit prices by supplier (lowest per row highlighted)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 text-left text-sm font-medium">Item Description</th>
                                        {rfq.suppliers.filter((s) => comparison[rfq.items[0]?.id]?.[s.supplier.id]).map((s) => (
                                            <th key={s.id} className="px-4 py-3 text-left text-sm font-medium">
                                                {s.supplier.legal_name_en}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rfq.items.map((item) => {
                                        const rowData = comparison[item.id] ?? {};
                                        const prices = Object.entries(rowData).map(([, v]) => parseFloat(String(v.unit_price)));
                                        const minPrice = prices.length ? Math.min(...prices) : null;
                                        return (
                                            <tr key={item.id} className="border-b border-border">
                                                <td className="px-4 py-3 text-sm">{item.description_en}</td>
                                                {rfq.suppliers.filter((s) => rowData[s.supplier.id]).map((s) => {
                                                    const d = rowData[s.supplier.id];
                                                    const isMin = minPrice != null && parseFloat(String(d.unit_price)) === minPrice;
                                                    return (
                                                        <td key={s.id} className={`px-4 py-3 text-sm ${isMin ? 'bg-green-100 dark:bg-green-900/20 font-medium' : ''}`}>
                                                            {parseFloat(String(d.unit_price)).toLocaleString()}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                <div className="sticky top-0 z-10 bg-background border-b border-border -mx-1 px-1">
                    <div className="flex gap-4">
                        {(['items', 'suppliers', 'documents', 'clarifications'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                                    activeTab === tab
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab === 'documents' ? 'Attachments' : tab}
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
                    </div>
                </div>

                {activeTab === 'items' && (
                    <Card>
                        <CardHeader className="sticky top-0 z-10 bg-card border-b border-border rounded-t-lg">
                            <CardTitle>RFQ items</CardTitle>
                            <CardDescription>Read-only snapshot from RFQ items</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-muted/95 z-10">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left font-medium">Code</th>
                                            <th className="px-4 py-3 text-left font-medium">Description</th>
                                            <th className="px-4 py-3 text-left font-medium">Unit</th>
                                            <th className="px-4 py-3 text-right font-medium">Qty</th>
                                            <th className="px-4 py-3 text-right font-medium">Est. cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rfq.items.map((item) => (
                                            <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                                                <td className="px-4 py-3 font-mono">{item.code ?? '—'}</td>
                                                <td className="px-4 py-3">{item.description_en}</td>
                                                <td className="px-4 py-3">{item.unit ?? '—'}</td>
                                                <td className="px-4 py-3 text-right tabular-nums">{item.qty ?? '—'}</td>
                                                <td className="px-4 py-3 text-right tabular-nums">{parseFloat(item.estimated_cost).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {rfq.items.length === 0 && (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No items.</div>
                            )}
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
                                            <th className="px-4 py-3 text-left font-medium">Supplier name</th>
                                            <th className="px-4 py-3 text-left font-medium">Invitation status</th>
                                            <th className="px-4 py-3 text-left font-medium">Invited at</th>
                                            <th className="px-4 py-3 text-left font-medium">Responded at</th>
                                            <th className="px-4 py-3 text-center font-medium">Quote received</th>
                                            {can.edit && rfq.status === 'draft' && <th className="px-4 py-3 text-right font-medium">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rfq.suppliers.map((rs) => (
                                            <tr key={rs.id} className="border-b border-border hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium">{rs.supplier.legal_name_en}</td>
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
                                            <th className="px-4 py-3 text-right font-medium">Action</th>
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
                                                    <td className="px-4 py-3 text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openSubmitQuoteModal(rs)}
                                                            disabled={rfq.items.length === 0}
                                                        >
                                                            Submit Quote
                                                        </Button>
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
                        <CardHeader className="sticky top-0 z-10 bg-card border-b border-border rounded-t-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Attachments</CardTitle>
                                    <CardDescription>Package attachments (inherited) and RFQ-specific documents</CardDescription>
                                </div>
                                {can.edit && rfq.status === 'draft' && (
                                    <Button onClick={() => setShowAddDocumentDialog(true)}>
                                        <FilePlus className="h-4 w-4" />
                                        Add document
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {package_attachments.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Package attachments (inherited)</h4>
                                    <div className="overflow-x-auto border rounded-md">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border bg-muted/50">
                                                    <th className="px-4 py-3 text-left font-medium">Type</th>
                                                    <th className="px-4 py-3 text-left font-medium">Title</th>
                                                    <th className="px-4 py-3 text-left font-medium">Source</th>
                                                    <th className="px-4 py-3 text-right font-medium">Link</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {package_attachments.map((att) => (
                                                    <tr key={att.id} className="border-b border-border hover:bg-muted/30">
                                                        <td className="px-4 py-3">{att.document_type ?? '—'}</td>
                                                        <td className="px-4 py-3 font-medium">{att.title}</td>
                                                        <td className="px-4 py-3">{att.source_type}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            {att.external_url && (
                                                                <a href={att.external_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                                    Open
                                                                </a>
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
                                <h4 className="text-sm font-semibold mb-2">RFQ documents</h4>
                                {rfq.documents.length > 0 ? (
                                    <div className="overflow-x-auto border rounded-md">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border bg-muted/50">
                                                    <th className="px-4 py-3 text-left font-medium">Type</th>
                                                    <th className="px-4 py-3 text-left font-medium">Title</th>
                                                    <th className="px-4 py-3 text-left font-medium">Source</th>
                                                    <th className="px-4 py-3 text-left font-medium">Size</th>
                                                    {can.edit && rfq.status === 'draft' && <th className="px-4 py-3 text-right font-medium">Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rfq.documents.map((doc) => (
                                                    <tr key={doc.id} className="border-b border-border hover:bg-muted/30">
                                                        <td className="px-4 py-3">{doc.document_type}</td>
                                                        <td className="px-4 py-3 font-medium">{doc.title}</td>
                                                        <td className="px-4 py-3">{doc.source_type}</td>
                                                        <td className="px-4 py-3 tabular-nums">{formatBytes(doc.file_size_bytes)}</td>
                                                        {can.edit && rfq.status === 'draft' && (
                                                            <td className="px-4 py-3 text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        router.delete(route('rfqs.documents.destroy', [rfq.id, doc.id]), {
                                                                            preserveScroll: true,
                                                                        })
                                                                    }
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground py-4">No RFQ-specific documents.</p>
                                )}
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
                                    <Button onClick={() => setShowAddClarificationDialog(true)}>
                                        <MessageSquarePlus className="h-4 w-4" />
                                        Add Question
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {rfq.clarifications.map((c) => (
                                <div key={c.id} className="border rounded-lg p-4">
                                    <p className="font-medium">{c.question}</p>
                                    {c.supplier && <p className="text-sm text-muted-foreground">Supplier: {c.supplier.legal_name_en}</p>}
                                    <Badge variant="outline" className="mt-1">{c.visibility.replace('_', ' ')}</Badge>
                                    <p className="mt-2">{c.answer ?? <span className="text-muted-foreground">Unanswered</span>}</p>
                                    {!c.answer && can.issue && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={() => setShowAnswerDialog(c)}
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            Answer
                                        </Button>
                                    )}
                                </div>
                            ))}
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

                            {rfq.status === 'evaluation' && can.award && (
                                <div className="flex justify-end">
                                    <Button onClick={() => setShowAwardFromComparisonDialog(true)}>
                                        <Award className="h-4 w-4" />
                                        Award supplier
                                    </Button>
                                </div>
                            )}

                            <div className="overflow-x-auto border rounded-md">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-muted/95 z-10">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left font-medium">Item code</th>
                                            <th className="px-4 py-3 text-left font-medium">Description</th>
                                            <th className="px-4 py-3 text-right font-medium">Qty</th>
                                            <th className="px-4 py-3 text-right font-medium">Est. cost</th>
                                            {comparison_suppliers.map((s) => (
                                                <th key={s.id} className="px-4 py-3 text-right font-medium whitespace-nowrap">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span>{s.legal_name_en}</span>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs font-normal ${
                                                                (s.completeness_pct ?? 0) >= 100
                                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300'
                                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300'
                                                            }`}
                                                        >
                                                            {(s.priced_items ?? 0)}/{(s.total_rfq_items ?? 0)} ({s.completeness_pct ?? 0}%)
                                                        </Badge>
                                                        {s.variance_pct != null && (
                                                            <span className={`text-xs tabular-nums ${s.variance_pct > 0 ? 'text-amber-600 dark:text-amber-400' : s.variance_pct < 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                                                {s.variance_pct > 0 ? '+' : ''}{s.variance_pct}% vs est.
                                                            </span>
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rfq.items.map((item) => {
                                            const rowData = comparison_quotes_matrix[item.id] ?? {};
                                            const totals = Object.entries(rowData).map(([, v]) => parseFloat(String(v.total_price)));
                                            const minTotal = totals.length ? Math.min(...totals) : null;
                                            return (
                                                <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-mono">{item.code ?? '—'}</td>
                                                    <td className="px-4 py-3">{item.description_en}</td>
                                                    <td className="px-4 py-3 text-right tabular-nums">{item.qty ?? '—'}</td>
                                                    <td className="px-4 py-3 text-right tabular-nums">
                                                        {parseFloat(item.estimated_cost).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                    </td>
                                                    {comparison_suppliers.map((s) => {
                                                        const cell = rowData[s.id];
                                                        const totalPrice = cell ? parseFloat(cell.total_price) : null;
                                                        const isLowest = minTotal != null && totalPrice != null && totalPrice === minTotal;
                                                        const isMissing = !cell;
                                                        return (
                                                            <td
                                                                key={s.id}
                                                                className={`px-4 py-3 text-right tabular-nums ${isLowest ? 'bg-green-50 dark:bg-green-900/30 font-medium' : ''} ${isMissing ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : ''}`}
                                                            >
                                                                {cell ? (
                                                                    <>
                                                                        {parseFloat(cell.unit_price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })} /{' '}
                                                                        {parseFloat(cell.total_price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                                    </>
                                                                ) : (
                                                                    <span className="font-medium">Missing</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-muted/50 font-medium">
                                        <tr className="border-t-2 border-border">
                                            <td className="px-4 py-3" colSpan={4}>
                                                Totals
                                            </td>
                                            {comparison_suppliers.map((s) => (
                                                <td key={s.id} className="px-4 py-3 text-right tabular-nums">
                                                    {(comparison_summary.supplier_totals[s.id] ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                </td>
                                            ))}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Modal show={showEditDialog} onClose={() => setShowEditDialog(false)}>
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
                                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                                <Button type="submit" disabled={editForm.processing}>Update</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Modal>

            <Modal show={showAwardDialog} onClose={() => setShowAwardDialog(false)}>
                <Card className="border-0 shadow-none">
                    <CardHeader>
                        <CardTitle>Award RFQ</CardTitle>
                        <CardDescription>Select the winning quote</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAward} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Quote *</Label>
                                <Select
                                    value={awardForm.data.quote_id}
                                    onValueChange={(v) => {
                                        const q = submittedQuotes.find((qu) => qu.id === v);
                                        if (q) {
                                            awardForm.setData({ quote_id: v, supplier_id: q.supplier_id, awarded_amount: q.total_price });
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select quote" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {submittedQuotes.map((q) => {
                                            const s = rfq.suppliers.find((rs) => rs.supplier.id === q.supplier_id)?.supplier;
                                            return (
                                                <SelectItem key={q.id} value={q.id}>
                                                    {s?.legal_name_en ?? q.supplier_id} — {rfq.currency} {parseFloat(q.total_price).toLocaleString()}
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
                                    value={awardForm.data.awarded_amount}
                                    onChange={(e) => awardForm.setData('awarded_amount', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="award_note">Award Note</Label>
                                <textarea
                                    id="award_note"
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                    value={awardForm.data.award_note}
                                    onChange={(e) => awardForm.setData('award_note', e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowAwardDialog(false)}>Cancel</Button>
                                <Button type="submit" disabled={awardForm.processing}>Award</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Modal>

            <Modal show={showAwardFromComparisonDialog} onClose={() => setShowAwardFromComparisonDialog(false)}>
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
                                    <SelectContent>
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
                                <Button type="button" variant="outline" onClick={() => setShowAwardFromComparisonDialog(false)}>
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

            <Modal show={showAddDocumentDialog} onClose={() => setShowAddDocumentDialog(false)}>
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
                                <Button type="button" variant="outline" onClick={() => setShowAddDocumentDialog(false)}>Cancel</Button>
                                <Button type="submit">Add</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Modal>

            <Modal show={showAddClarificationDialog} onClose={() => setShowAddClarificationDialog(false)}>
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
                                        <SelectItem value="private_supplier">Private Supplier</SelectItem>
                                        <SelectItem value="broadcast_all">Broadcast All</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowAddClarificationDialog(false)}>Cancel</Button>
                                <Button type="submit">Add</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Modal>

            <Modal show={!!submitQuoteForSupplier} onClose={() => setSubmitQuoteForSupplier(null)}>
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
                                <Button type="button" variant="outline" onClick={() => setSubmitQuoteForSupplier(null)}>
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
                <Modal show onClose={() => setShowAnswerDialog(null)}>
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
                                            <SelectItem value="private_supplier">Private Supplier</SelectItem>
                                            <SelectItem value="broadcast_all">Broadcast All</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setShowAnswerDialog(null)}>Cancel</Button>
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
