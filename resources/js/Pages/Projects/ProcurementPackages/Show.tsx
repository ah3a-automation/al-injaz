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
import { Head, Link, useForm } from '@inertiajs/react';
import { ExternalLink, Upload } from 'lucide-react';
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
    source_type: string;
    file_path: string | null;
    external_url: string | null;
    external_provider: string | null;
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
}

const statusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    rfq_created: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    awarded: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    contracted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

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

export default function ProcurementPackageShow({ project, package: pkg }: ShowProps) {
    const projectName = project.name_en ?? project.name ?? 'Project';
    const items = pkg.boq_items ?? [];

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
                        <h1 className="text-2xl font-semibold tracking-tight">{pkg.name}</h1>
                        <p className="mt-1 font-mono text-sm text-muted-foreground">{pkg.package_no ?? '—'}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild>
                            <Link href={route('projects.procurement-packages.rfqs.create', [project.id, pkg.id])}>
                                Create RFQ
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('projects.procurement-packages.index', project.id)}>Back to list</Link>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Package details</CardTitle>
                        <CardDescription>Header and status</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Project</p>
                            <p className="mt-1">{projectName}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Status</p>
                            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[pkg.status] ?? ''}`}>
                                {pkg.status}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Currency</p>
                            <p className="mt-1">{pkg.currency}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Needed by date</p>
                            <p className="mt-1">{pkg.needed_by_date ? new Date(pkg.needed_by_date).toLocaleDateString() : '—'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Created by</p>
                            <p className="mt-1">{pkg.created_by_user?.name ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Created at</p>
                            <p className="mt-1">{pkg.created_at ? new Date(pkg.created_at).toLocaleString() : '—'}</p>
                        </div>
                    </CardContent>
                    {pkg.description && (
                        <CardContent className="border-t pt-4">
                            <p className="text-sm font-medium text-muted-foreground">Description</p>
                            <p className="mt-1 whitespace-pre-wrap">{pkg.description}</p>
                        </CardContent>
                    )}
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Commercial summary</CardTitle>
                            <CardDescription>Revenue, cost, and profit</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total revenue</span>
                                <span className="font-medium">{formatNum(pkg.estimated_revenue)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Estimated cost</span>
                                <span className="font-medium">{formatNum(pkg.estimated_cost)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Estimated profit</span>
                                <span className="font-medium">{formatNum(pkg.estimated_profit)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Estimated profit %</span>
                                <span className="font-medium">
                                    {pkg.estimated_profit_pct != null ? `${pkg.estimated_profit_pct.toFixed(1)}%` : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="text-muted-foreground">Actual cost</span>
                                <span className="font-medium">{formatNum(pkg.actual_cost)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Actual profit %</span>
                                <span className="font-medium">
                                    {pkg.actual_profit_pct != null ? `${pkg.actual_profit_pct.toFixed(1)}%` : '—'}
                                </span>
                            </div>
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
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3 text-left font-medium">Code</th>
                                    <th className="px-4 py-3 text-left font-medium">Description</th>
                                    <th className="px-4 py-3 text-left font-medium">Unit</th>
                                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                                    <th className="px-4 py-3 text-right font-medium">Revenue</th>
                                    <th className="px-4 py-3 text-right font-medium">Est. cost</th>
                                    <th className="px-4 py-3 text-right font-medium">Est. profit %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row) => {
                                    const rev = parseFloat(row.revenue_amount ?? '0');
                                    const cost = parseFloat(row.planned_cost ?? '0');
                                    const pct = estProfitPct(rev, cost);
                                    return (
                                        <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono">{row.code}</td>
                                            <td className="px-4 py-3">{row.description_en ?? '—'}</td>
                                            <td className="px-4 py-3">{row.unit ?? '—'}</td>
                                            <td className="px-4 py-3 text-right">{row.qty ?? '—'}</td>
                                            <td className="px-4 py-3 text-right">{formatNum(rev)}</td>
                                            <td className="px-4 py-3 text-right">{formatNum(cost)}</td>
                                            <td className="px-4 py-3 text-right">{pct != null ? `${pct.toFixed(1)}%` : '—'}</td>
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
                        <CardTitle>Attachments</CardTitle>
                        <CardDescription>Files and external links</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {(pkg.attachments?.length ?? 0) > 0 ? (
                            <ul className="space-y-2">
                                {pkg.attachments!.map((att) => (
                                    <li key={att.id} className="flex items-center justify-between rounded border border-border px-4 py-2">
                                        <div>
                                            <p className="font-medium">{att.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {att.source_type}
                                                {att.external_provider ? ` · ${att.external_provider}` : ''}
                                            </p>
                                        </div>
                                        {att.external_url && (
                                            <a
                                                href={att.external_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No attachments yet.</p>
                        )}
                        <UploadFilesForm projectId={project.id} packageId={pkg.id} />
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
            </div>
        </AppLayout>
    );
}
