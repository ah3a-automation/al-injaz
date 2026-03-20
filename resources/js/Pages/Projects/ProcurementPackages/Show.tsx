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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Download, ExternalLink, FileDown, FileText, Printer, Upload, Clock } from 'lucide-react';
import { ApprovalStatusPanel } from '@/Components/ApprovalStatusPanel';
import { useLocale } from '@/hooks/useLocale';
import { ActivityTimeline, type TimelineEvent } from '@/Components/ActivityTimeline';
import { DocumentList, type DocumentItem } from '@/Components/DocumentList';
import { StatusBadge } from '@/Components/StatusBadge';
import { type FormEventHandler, useState } from 'react';

interface ProjectInfo {
    id: string;
    name: string;
    name_en?: string | null;
    name_ar?: string | null;
    code?: string | null;
}

interface BoqItemRow {
    id: string;
    code: string;
    description_en: string | null;
    unit: string | null;
    qty: string | null;
    revenue_amount: string;
    planned_cost: string;
}

interface AttachmentRow {
    id: string;
    title: string;
    document_type: string | null;
    source_type: string;
    file_path: string | null;
    external_url: string | null;
    external_provider: string | null;
    download_url: string | null;
    url: string | null;
    created_at: string | null;
}

interface RequestRow {
    id: string;
    request_no: string;
    status: string;
    issued_at: string | null;
}

interface PackageData {
    id: string;
    package_no: string | null;
    name: string;
    description: string | null;
    currency: string;
    needed_by_date: string | null;
    status: string;
    approval_status?: string;
    approved_by_name?: string | null;
    approved_at_formatted?: string | null;
    submitted_for_approval_at_formatted?: string | null;
    approval_notes?: string | null;
    estimated_revenue: string;
    estimated_cost: string;
    actual_cost: string;
    estimated_profit: number;
    estimated_profit_pct: number | null;
    actual_profit_pct: number | null;
    created_at: string;
    created_by_user?: { id: number; name: string } | null;
    boq_items?: BoqItemRow[];
    attachments?: AttachmentRow[];
    requests?: RequestRow[];
}

interface ShowProps {
    project: ProjectInfo;
    package: PackageData;
    documents: DocumentItem[];
    missing_documents?: string[];
    document_completeness?: boolean;
    approvalStatus?: string;
    approvedBy?: string | null;
    approvedAt?: string | null;
    approvalNotes?: string | null;
    submittedAt?: string | null;
    can?: { submitPackage?: boolean; approvePackage?: boolean };
    timeline: TimelineEvent[];
}

function formatNum(v: string | number | undefined): string {
    if (v === undefined || v === null) return '—';
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isNaN(n) ? '—' : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function estProfitPct(revenue: number, cost: number): number | null {
    if (revenue <= 0) return null;
    return ((revenue - cost) / revenue) * 100;
}

function UploadFilesForm({ projectId, packageId }: { projectId: string; packageId: string }) {
    const [sourceType, setSourceType] = useState<'upload' | 'other_link'>('upload');
    const form = useForm({
        title: '',
        document_type: 'other',
        source_type: 'upload',
        external_url: '',
        external_provider: '',
        file: null as File | null,
    });

    const submit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        const url = route('projects.procurement-packages.attachments.store', [projectId, packageId]);
        form.post(url, { forceFormData: true });
    };

    return (
        <div className="mt-4 pt-4 border-t border-border" id="upload">
            <p className="text-sm font-medium mb-2">Upload Files</p>
            <form onSubmit={submit} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="att_title">Title *</Label>
                        <Input
                            id="att_title"
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            required
                            maxLength={200}
                            placeholder="Document title"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="att_doc_type">Document type</Label>
                        <Select
                            value={form.data.document_type}
                            onValueChange={(v) => form.setData('document_type', v)}
                        >
                            <SelectTrigger id="att_doc_type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="specifications">Specifications</SelectItem>
                                <SelectItem value="drawings">Drawings</SelectItem>
                                <SelectItem value="boq">BOQ</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                        value={sourceType}
                        onValueChange={(v: 'upload' | 'other_link') => {
                            setSourceType(v);
                            form.setData('source_type', v);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="upload">Upload file</SelectItem>
                            <SelectItem value="other_link">External link</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {sourceType === 'upload' ? (
                    <div className="space-y-2">
                        <Label htmlFor="att_file">File</Label>
                        <Input
                            id="att_file"
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                            onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)}
                        />
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor="att_url">URL</Label>
                        <Input
                            id="att_url"
                            type="url"
                            value={form.data.external_url}
                            onChange={(e) => form.setData('external_url', e.target.value)}
                            placeholder="https://..."
                        />
                    </div>
                )}
                <Button type="submit" size="sm" disabled={form.processing}>
                    <Upload className="h-4 w-4 mr-1" />
                    {form.processing ? 'Adding...' : 'Add attachment'}
                </Button>
            </form>
        </div>
    );
}

function groupAttachmentsByType(attachments: AttachmentRow[]): { drawings: AttachmentRow[]; specifications: AttachmentRow[]; other: AttachmentRow[] } {
    const drawings: AttachmentRow[] = [];
    const specifications: AttachmentRow[] = [];
    const other: AttachmentRow[] = [];
    for (const a of attachments) {
        const t = (a.document_type ?? '').toLowerCase();
        if (t === 'drawings') drawings.push(a);
        else if (t === 'specifications') specifications.push(a);
        else other.push(a);
    }
    return { drawings, specifications, other };
}

function AttachmentRowActions({ att }: { att: AttachmentRow }) {
    const { t } = useLocale();
    const hasLink = att.url ?? att.download_url;
    const openInNewTab = att.external_url != null;
    return (
        <div className="flex items-center gap-2 shrink-0">
            {att.url && (
                <a
                    href={att.url}
                    target={openInNewTab ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-border bg-muted/30 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                    <FileText className="h-3.5 w-3.5" />
                    {t('action_preview', 'rfqs')}
                </a>
            )}
            {(att.download_url || att.external_url) && (
                <a
                    href={att.download_url ?? att.url ?? '#'}
                    target={att.external_url ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    download={!att.external_url}
                    className="inline-flex items-center gap-1 rounded border border-border bg-muted/30 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                    <Download className="h-3.5 w-3.5" />
                    {t('action_download', 'rfqs')}
                </a>
            )}
            {!hasLink && (
                <span className="text-xs text-muted-foreground">—</span>
            )}
        </div>
    );
}

function AttachmentSubSection({ title, items }: { title: string; items: AttachmentRow[] }) {
    const { t } = useLocale();
    if (items.length === 0) return null;
    return (
        <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">{title}</h4>
            <ul className="space-y-2">
                {items.map((att) => (
                    <li
                        key={att.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">{att.title || t('attachment_untitled', 'rfqs')}</p>
                            <p className="text-xs text-muted-foreground">
                                {att.document_type ?? att.source_type}
                                {att.external_provider ? ` · ${att.external_provider}` : ''}
                                {att.created_at ? ` · ${new Date(att.created_at).toLocaleDateString()}` : ''}
                            </p>
                        </div>
                        <AttachmentRowActions att={att} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function ProcurementPackageShow({
    project,
    package: pkg,
    documents,
    missing_documents,
    document_completeness,
    can = {},
    approvalStatus: approvalStatusProp,
    approvedBy: approvedByProp,
    approvedAt: approvedAtProp,
    approvalNotes: approvalNotesProp,
    submittedAt: submittedAtProp,
    timeline,
}: ShowProps) {
    const { t } = useLocale();
    const projectName = project.name_en ?? project.name ?? 'Project';
    const items = pkg.boq_items ?? [];
    const attachments = pkg.attachments ?? [];
    const groupedAttachments = groupAttachmentsByType(attachments);
    const approvalStatus = (approvalStatusProp ?? pkg.approval_status ?? 'draft') as 'draft' | 'submitted' | 'approved' | 'rejected';

    return (
        <AppLayout>
            <Head title={`${pkg.package_no ?? pkg.name} - ${projectName}`} />
            <div className="space-y-6">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('projects.index')} className="hover:text-foreground">
                        Projects
                    </Link>
                    <span>/</span>
                    <Link href={route('projects.show', project.id)} className="hover:text-foreground">
                        {projectName}
                    </Link>
                    <span>/</span>
                    <Link href={route('projects.procurement-packages.index', project.id)} className="hover:text-foreground">
                        Procurement packages
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">{pkg.package_no ?? pkg.name}</span>
                </nav>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{pkg.name}</h1>
                        <p className="mt-1 font-mono text-sm text-muted-foreground">{pkg.package_no ?? '—'}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                <span className="text-[11px] uppercase tracking-wide">
                                    {t('status', 'packages')}:
                                </span>
                                <StatusBadge status={pkg.status} entity="package" size="sm" />
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {projectName} · {pkg.created_by_user?.name ?? '—'} · {pkg.created_at ? new Date(pkg.created_at).toLocaleDateString() : '—'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {approvalStatus === 'approved' ? (
                            <Button asChild>
                                <Link href={route('projects.procurement-packages.rfqs.create', [project.id, pkg.id])}>
                                    {t('create_rfq', 'packages')}
                                </Link>
                            </Button>
                        ) : (
                            <Button disabled title={t('approval_required_to_create_rfq', 'packages')}>
                                {t('create_rfq', 'packages')}
                            </Button>
                        )}
                        {approvalStatus !== 'approved' && (
                            <p className="text-xs text-muted-foreground">
                                {t('approval_required_to_create_rfq', 'packages')}
                            </p>
                        )}
                        <Button variant="outline" asChild>
                            <Link href={route('projects.procurement-packages.index', project.id)}>Back to list</Link>
                        </Button>
                        <a
                            href={route('projects.procurement-packages.print', { project: project.id, package: pkg.id })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                        >
                            <Printer className="h-4 w-4" />
                            Print
                        </a>
                        <a
                            href={route('projects.procurement-packages.pdf', { project: project.id, package: pkg.id })}
                            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                        >
                            <FileDown className="h-4 w-4" />
                            Export PDF
                        </a>
                    </div>
                </div>

                <ApprovalStatusPanel
                    key={`package-approval-${approvalStatus}`}
                    approvalStatus={approvalStatus}
                    approvedBy={approvedByProp ?? pkg.approved_by_name ?? undefined}
                    approvedAt={approvedAtProp ?? pkg.approved_at_formatted ?? undefined}
                    approvalNotes={approvalNotesProp ?? pkg.approval_notes ?? undefined}
                    submittedAt={submittedAtProp ?? pkg.submitted_for_approval_at_formatted ?? undefined}
                    can={{
                        submit: can.submitPackage ?? false,
                        approve: can.approvePackage ?? false,
                        reject: can.approvePackage ?? false,
                    }}
                    onSubmit={() =>
                        router.post(
                            route('projects.procurement-packages.submit-for-approval', { project: project.id, package: pkg.id }),
                            {},
                            { preserveScroll: true, onSuccess: () => router.reload() }
                        )
                    }
                    onApprove={() =>
                        router.post(
                            route('projects.procurement-packages.approve', { project: project.id, package: pkg.id }),
                            {},
                            { preserveScroll: true, onSuccess: () => router.reload() }
                        )
                    }
                    onReject={(notes) =>
                        router.post(
                            route('projects.procurement-packages.reject', { project: project.id, package: pkg.id }),
                            { approval_notes: notes },
                            { preserveScroll: true, onSuccess: () => router.reload() }
                        )
                    }
                    entityLabel={t('package', 'packages')}
                    translationNamespace="packages"
                />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Package details</CardTitle>
                            <CardDescription>Reference and dates</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Currency</p>
                                <p className="mt-0.5 font-medium">{pkg.currency}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Needed by date</p>
                                <p className="mt-0.5 font-medium">{pkg.needed_by_date ? new Date(pkg.needed_by_date).toLocaleDateString() : '—'}</p>
                            </div>
                            {pkg.description && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Description</p>
                                    <p className="mt-0.5 whitespace-pre-wrap text-sm">{pkg.description}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Commercial summary</CardTitle>
                            <CardDescription>Revenue, cost, and profit</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total revenue</span>
                                <span className="font-medium tabular-nums">{formatNum(pkg.estimated_revenue)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Estimated cost</span>
                                <span className="font-medium tabular-nums">{formatNum(pkg.estimated_cost)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Estimated profit</span>
                                <span className="font-medium tabular-nums">{formatNum(pkg.estimated_profit)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 text-sm">
                                <span className="text-muted-foreground">Estimated profit %</span>
                                <span className="font-medium tabular-nums">
                                    {pkg.estimated_profit_pct != null ? `${pkg.estimated_profit_pct.toFixed(1)}%` : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Actual cost</span>
                                <span className="font-medium tabular-nums">{formatNum(pkg.actual_cost)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Actual profit %</span>
                                <span className="font-medium tabular-nums">
                                    {pkg.actual_profit_pct != null ? `${pkg.actual_profit_pct.toFixed(1)}%` : '—'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Summary</CardTitle>
                            <CardDescription>Items and attachments</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">BOQ items</p>
                                <p className="mt-0.5 font-medium tabular-nums">{items.length}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                                <p className="mt-0.5 font-medium tabular-nums">{attachments.length}</p>
                            </div>
                            {(pkg.requests?.length ?? 0) > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Related RFQs</p>
                                    <p className="mt-0.5 font-medium tabular-nums">{pkg.requests!.length}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>BOQ items</CardTitle>
                        <CardDescription>{items.length} items in this package</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="px-4 py-3 text-start font-medium">Code</th>
                                    <th className="px-4 py-3 text-start font-medium">Description</th>
                                    <th className="px-4 py-3 text-start font-medium">Unit</th>
                                    <th className="px-4 py-3 text-end font-medium">Qty</th>
                                    <th className="px-4 py-3 text-end font-medium">Revenue</th>
                                    <th className="px-4 py-3 text-end font-medium">Est. cost</th>
                                    <th className="px-4 py-3 text-end font-medium">Est. profit %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row) => {
                                    const rev = parseFloat(row.revenue_amount ?? '0');
                                    const cost = parseFloat(row.planned_cost ?? '0');
                                    const pct = estProfitPct(rev, cost);
                                    return (
                                        <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono whitespace-nowrap">{row.code}</td>
                                            <td className="px-4 py-3">{row.description_en ?? '—'}</td>
                                            <td className="px-4 py-3">{row.unit ?? '—'}</td>
                                            <td className="px-4 py-3 text-end tabular-nums">{row.qty ?? '—'}</td>
                                            <td className="px-4 py-3 text-end tabular-nums">{formatNum(rev)}</td>
                                            <td className="px-4 py-3 text-end tabular-nums">{formatNum(cost)}</td>
                                            <td className="px-4 py-3 text-end tabular-nums">{pct != null ? `${pct.toFixed(1)}%` : '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {items.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No items in this package.</div>
                        )}
                    </CardContent>
                </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('section_attachments', 'rfqs')}</CardTitle>
                            <CardDescription>{t('attachment_section_description', 'rfqs')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <DocumentList
                                documents={documents}
                                missingDocuments={missing_documents ?? []}
                                showVersions
                            />
                            <div className="border-t border-border pt-4">
                                <UploadFilesForm projectId={project.id} packageId={pkg.id} />
                            </div>
                        </CardContent>
                    </Card>

                {(pkg.requests?.length ?? 0) > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Related RFQs</CardTitle>
                            <CardDescription>Procurement requests for this package</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 text-left font-medium">RFQ number</th>
                                        <th className="px-4 py-3 text-left font-medium">Status</th>
                                        <th className="px-4 py-3 text-left font-medium">Issued at</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pkg.requests!.map((req) => (
                                        <tr key={req.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono">{req.request_no}</td>
                                            <td className="px-4 py-3">{req.status}</td>
                                            <td className="px-4 py-3">
                                                {req.issued_at ? new Date(req.issued_at).toLocaleString() : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

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
            </div>
        </AppLayout>
    );
}
