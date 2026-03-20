import AppLayout from '@/Layouts/AppLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
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
import { Download, FileText, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';

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
    url: string | null;
    download_url: string | null;
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
    supplier_type?: string | null;
    city?: string | null;
    country?: string | null;
}

interface CreateFromPackageProps {
    project: ProjectInfo;
    package: PackageData;
    suppliers: SupplierOption[];
}

const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP'];

const SUPPLIER_TYPE_LABELS: Record<string, string> = {
    supplier: 'Supplier',
    subcontractor: 'Subcontractor',
    service_provider: 'Service Provider',
    consultant: 'Consultant',
};

function formatNum(v: string | number | undefined): string {
    if (v === undefined || v === null) return '—';
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isNaN(n) ? '—' : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function filterSuppliers(suppliers: SupplierOption[], search: string): SupplierOption[] {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => {
        const name = (s.legal_name_en ?? '').toLowerCase();
        const code = (s.supplier_code ?? '').toLowerCase();
        const type = SUPPLIER_TYPE_LABELS[s.supplier_type ?? '']?.toLowerCase() ?? (s.supplier_type ?? '').toLowerCase();
        const city = (s.city ?? '').toLowerCase();
        const country = (s.country ?? '').toLowerCase();
        return name.includes(q) || code.includes(q) || type.includes(q) || city.includes(q) || country.includes(q);
    });
}

export default function CreateFromPackage({ project, package: pkg, suppliers }: CreateFromPackageProps) {
    const { t } = useLocale();
    const projectName = project.name_en ?? project.name ?? 'Project';
    const [supplierSearch, setSupplierSearch] = useState('');
    const [avlSupplierIds, setAvlSupplierIds] = useState<Set<string>>(new Set());

    const form = useForm({
        title: pkg.name + ' – RFQ',
        submission_deadline: pkg.needed_by_date ?? '',
        currency: pkg.currency ?? 'SAR',
        supplier_ids: [] as string[],
        on_vendor_list_ids: [] as string[],
    });

    const filteredSuppliers = useMemo(
        () => filterSuppliers(suppliers, supplierSearch),
        [suppliers, supplierSearch]
    );

    const selectedSuppliers = useMemo(
        () => suppliers.filter((s) => form.data.supplier_ids.includes(s.id)),
        [suppliers, form.data.supplier_ids]
    );

    const toggleSupplier = (supplierId: string) => {
        const current = form.data.supplier_ids;
        const next = current.includes(supplierId)
            ? current.filter((id) => id !== supplierId)
            : [...current, supplierId];
        form.setData('supplier_ids', next);
    };

    const toggleAvl = (supplierId: string) => {
        setAvlSupplierIds((prev) => {
            const next = new Set(prev);
            if (next.has(supplierId)) next.delete(supplierId);
            else next.add(supplierId);
            form.setData('on_vendor_list_ids', Array.from(next));
            return next;
        });
    };

    const removeSelectedSupplier = (supplierId: string) => {
        form.setData(
            'supplier_ids',
            form.data.supplier_ids.filter((id) => id !== supplierId)
        );
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('projects.procurement-packages.rfqs.store-full', [project.id, pkg.id]), {
            forceFormData: false,
        });
    };

    return (
        <AppLayout>
            <Head title="Create RFQ from package" />
            <div className="mx-auto max-w-4xl min-h-0 w-full space-y-6 pb-6">
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
                    <span className="text-foreground">{t('title_create_package', 'rfqs')}</span>
                </nav>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('title_create_package', 'rfqs')}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('create_from_package_subtitle', 'rfqs', { package: pkg.package_no ?? pkg.name })}
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={route('projects.procurement-packages.show', [project.id, pkg.id])}>
                            Cancel
                        </Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('section_basic', 'rfqs')}</CardTitle>
                            <CardDescription>{t('section_basic_description', 'rfqs')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="text-muted-foreground">{t('col_project', 'rfqs')}</Label>
                                    <p className="mt-1 font-medium">{projectName}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">{t('source_package', 'rfqs')}</Label>
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
                            <CardTitle className="text-base">{t('action_invite', 'rfqs')}</CardTitle>
                            <CardDescription>{t('invite_section_description', 'rfqs')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {form.errors.supplier_ids && (
                                <p className="text-sm text-destructive">{form.errors.supplier_ids}</p>
                            )}
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-3">
                                    <Label className="text-muted-foreground">{t('invite_search', 'rfqs')}</Label>
                                    <div className="relative">
                                        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            type="search"
                                            placeholder={t('supplier_search_placeholder', 'rfqs')}
                                            value={supplierSearch}
                                            onChange={(e) => setSupplierSearch(e.target.value)}
                                            className="ps-9"
                                            aria-label={t('invite_search', 'rfqs')}
                                        />
                                    </div>
                                    <div className="max-h-56 overflow-y-auto rounded-md border border-border bg-muted/20">
                                        <ul className="divide-y divide-border p-2">
                                            {filteredSuppliers.length === 0 ? (
                                                <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                    {supplierSearch.trim() ? t('no_suppliers_match_search', 'rfqs') : t('no_approved_suppliers', 'rfqs')}
                                                </li>
                                            ) : (
                                                filteredSuppliers.map((s) => (
                                                    <li key={s.id} className="flex items-center gap-3 px-2 py-2">
                                                        <Checkbox
                                                            id={`supplier-${s.id}`}
                                                            checked={form.data.supplier_ids.includes(s.id)}
                                                            onCheckedChange={() => toggleSupplier(s.id)}
                                                            aria-label={`Select ${s.legal_name_en}`}
                                                        />
                                                        <label
                                                            htmlFor={`supplier-${s.id}`}
                                                            className="min-w-0 flex-1 cursor-pointer text-sm"
                                                        >
                                                            <span className="font-medium text-foreground">{s.legal_name_en}</span>
                                                            {s.supplier_code && (
                                                                <span className="ms-1 font-mono text-xs text-muted-foreground">
                                                                    {s.supplier_code}
                                                                </span>
                                                            )}
                                                            {s.supplier_type && (
                                                                <span className="ms-1 text-xs text-muted-foreground">
                                                                    · {SUPPLIER_TYPE_LABELS[s.supplier_type] ?? s.supplier_type}
                                                                </span>
                                                            )}
                                                        </label>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {form.data.supplier_ids.length} selected
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-muted-foreground">{t('selected_suppliers', 'rfqs')}</Label>
                                    <div className="max-h-56 overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
                                        {selectedSuppliers.length === 0 ? (
                                            <p className="py-4 text-center text-sm text-muted-foreground">
                                                {t('select_suppliers_empty', 'rfqs')}
                                            </p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {selectedSuppliers.map((s) => (
                                                    <li
                                                        key={s.id}
                                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium text-foreground">{s.legal_name_en}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {s.supplier_code && (
                                                                    <span className="font-mono">{s.supplier_code}</span>
                                                                )}
                                                                {s.supplier_type && (
                                                                    <span className="ms-1">
                                                                        {SUPPLIER_TYPE_LABELS[s.supplier_type] ?? s.supplier_type}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleAvl(s.id)}
                                                                className="shrink-0"
                                                                title={avlSupplierIds.has(s.id) ? t('avl_toggle_not_avl', 'rfqs') : t('avl_toggle_avl', 'rfqs')}
                                                            >
                                                                <Badge
                                                                    variant={avlSupplierIds.has(s.id) ? 'default' : 'secondary'}
                                                                    className="text-xs"
                                                                >
                                                                    {avlSupplierIds.has(s.id) ? t('avl_badge', 'rfqs') : t('not_avl_badge', 'rfqs')}
                                                                </Badge>
                                                            </button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 shrink-0"
                                                                onClick={() => removeSelectedSupplier(s.id)}
                                                                aria-label={`Remove ${s.legal_name_en}`}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('package_items_title', 'rfqs')}</CardTitle>
                            <CardDescription>{t('package_items_readonly', 'rfqs')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="px-4 py-3 text-start font-medium">Code</th>
                                        <th className="px-4 py-3 text-start font-medium">Description</th>
                                        <th className="px-4 py-3 text-start font-medium">Unit</th>
                                        <th className="px-4 py-3 text-end font-medium">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pkg.boq_items.map((row) => (
                                        <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono">{row.code ?? '—'}</td>
                                            <td className="px-4 py-3">{row.description_en ?? '—'}</td>
                                            <td className="px-4 py-3">{row.unit ?? '—'}</td>
                                            <td className="px-4 py-3 text-end tabular-nums">{row.qty ?? '—'}</td>
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
                                <CardTitle className="text-base">{t('package_attachments_title', 'rfqs')}</CardTitle>
                                <CardDescription>{t('package_attachments_included', 'rfqs')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {pkg.attachments.map((att) => (
                                        <li
                                            key={att.id}
                                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium text-foreground">{att.title || t('attachment_untitled', 'rfqs')}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {att.document_type ?? att.source_type}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {att.url && (
                                                    <a
                                                        href={att.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 rounded border border-border bg-muted/30 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                                                    >
                                                        <FileText className="h-3.5 w-3.5" />
                                                        {t('action_preview', 'rfqs')}
                                                    </a>
                                                )}
                                                {(att.download_url ?? (att.external_url ? att.url : null)) && (
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
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex gap-2">
                        <Button type="submit" disabled={form.processing || form.data.supplier_ids.length === 0}>
                            {form.processing ? t('saving', 'rfqs') : t('save_draft', 'rfqs')}
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
