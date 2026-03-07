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
import { Checkbox } from '@/Components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';

interface ProjectInfo {
    id: string;
    name: string;
    name_en?: string | null;
    code?: string | null;
}

interface BoqItemRow {
    id: string;
    code: string | null;
    description_en: string | null;
    description_ar: string | null;
    unit: string | null;
    qty: string | number | null;
    revenue_amount: string | number;
    planned_cost: string | number;
}

interface AttachmentRow {
    id: string;
    title: string;
    source_type: string;
    document_type: string | null;
    external_url: string | null;
}

interface PackageData {
    id: string;
    package_no: string | null;
    name: string;
    currency: string;
    needed_by_date: string | null;
    boq_items: BoqItemRow[];
    attachments: AttachmentRow[];
}

interface SupplierOption {
    id: string;
    legal_name_en: string;
    supplier_code: string | null;
}

interface CreateFromPackageProps {
    project: ProjectInfo;
    package: PackageData;
    suppliers: SupplierOption[];
}

const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP'];

function formatNum(v: string | number | undefined): string {
    if (v === undefined || v === null) return '—';
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isNaN(n) ? '—' : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function CreateFromPackage({ project, package: pkg, suppliers }: CreateFromPackageProps) {
    const projectName = project.name_en ?? project.name ?? 'Project';

    const form = useForm({
        title: pkg.name + ' – RFQ',
        submission_deadline: pkg.needed_by_date ?? '',
        currency: pkg.currency ?? 'SAR',
        supplier_ids: [] as string[],
    });

    const toggleSupplier = (supplierId: string) => {
        const current = form.data.supplier_ids;
        const next = current.includes(supplierId)
            ? current.filter((id) => id !== supplierId)
            : [...current, supplierId];
        form.setData('supplier_ids', next);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('projects.procurement-packages.rfqs.store-full', [project.id, pkg.id]), {
            forceFormData: false,
        });
    };

    return (
        <AppLayout>
            <Head title="Create RFQ from package" />
            <div className="mx-auto max-w-4xl space-y-6">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('projects.show', project.id)} className="hover:text-foreground">
                        {projectName}
                    </Link>
                    <span>/</span>
                    <Link href={route('projects.procurement-packages.index', project.id)} className="hover:text-foreground">
                        Procurement packages
                    </Link>
                    <span>/</span>
                    <Link href={route('projects.procurement-packages.show', [project.id, pkg.id])} className="hover:text-foreground">
                        {pkg.package_no ?? pkg.name}
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">Create RFQ</span>
                </nav>

                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Create RFQ</h1>
                    <Button variant="outline" asChild>
                        <Link href={route('projects.procurement-packages.show', [project.id, pkg.id])}>
                            Cancel
                        </Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>RFQ Header</CardTitle>
                            <CardDescription>Project, package, and deadline</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="text-muted-foreground">Project</Label>
                                    <p className="mt-1 font-medium">{projectName}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Procurement Package</Label>
                                    <p className="mt-1 font-medium">{pkg.package_no ?? pkg.name}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">RFQ Title *</Label>
                                <Input
                                    id="title"
                                    value={form.data.title}
                                    onChange={(e) => form.setData('title', e.target.value)}
                                    required
                                    maxLength={300}
                                    aria-invalid={!!form.errors.title}
                                />
                                {form.errors.title && (
                                    <p className="text-sm text-destructive">{form.errors.title}</p>
                                )}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="submission_deadline">RFQ Deadline</Label>
                                    <Input
                                        id="submission_deadline"
                                        type="date"
                                        value={form.data.submission_deadline}
                                        onChange={(e) => form.setData('submission_deadline', e.target.value)}
                                        aria-invalid={!!form.errors.submission_deadline}
                                    />
                                    {form.errors.submission_deadline && (
                                        <p className="text-sm text-destructive">{form.errors.submission_deadline}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currency">Currency</Label>
                                    <Select
                                        value={form.data.currency}
                                        onValueChange={(v) => form.setData('currency', v)}
                                    >
                                        <SelectTrigger id="currency" aria-label="Currency">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CURRENCIES.map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Suppliers</CardTitle>
                            <CardDescription>Select suppliers to invite to this RFQ</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {form.errors.supplier_ids && (
                                <p className="text-sm text-destructive mb-4">{form.errors.supplier_ids}</p>
                            )}
                            <ul className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                                {suppliers.map((s) => (
                                    <li key={s.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`supplier-${s.id}`}
                                            checked={form.data.supplier_ids.includes(s.id)}
                                            onCheckedChange={() => toggleSupplier(s.id)}
                                            aria-label={`Invite ${s.legal_name_en}`}
                                        />
                                        <label htmlFor={`supplier-${s.id}`} className="text-sm cursor-pointer">
                                            {s.legal_name_en}
                                            {s.supplier_code && (
                                                <span className="text-muted-foreground ml-1">({s.supplier_code})</span>
                                            )}
                                        </label>
                                    </li>
                                ))}
                            </ul>
                            {suppliers.length === 0 && (
                                <p className="text-sm text-muted-foreground">No approved suppliers available.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>RFQ Items</CardTitle>
                            <CardDescription>BOQ items from the package (read-only)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 text-left font-medium">Code</th>
                                        <th className="px-4 py-3 text-left font-medium">Description</th>
                                        <th className="px-4 py-3 text-left font-medium">Unit</th>
                                        <th className="px-4 py-3 text-right font-medium">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pkg.boq_items.map((row) => (
                                        <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono">{row.code ?? '—'}</td>
                                            <td className="px-4 py-3">{row.description_en ?? '—'}</td>
                                            <td className="px-4 py-3">{row.unit ?? '—'}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">{row.qty ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {pkg.boq_items.length === 0 && (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                    No items in this package.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {pkg.attachments.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Attachments</CardTitle>
                                <CardDescription>Package attachments (included with RFQ)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {pkg.attachments.map((att) => (
                                        <li key={att.id} className="flex items-center justify-between rounded border border-border px-4 py-2">
                                            <span className="font-medium">{att.title}</span>
                                            <span className="text-sm text-muted-foreground">{att.source_type}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex gap-2">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving...' : 'Save Draft'}
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('projects.procurement-packages.show', [project.id, pkg.id])}>
                                Cancel
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
