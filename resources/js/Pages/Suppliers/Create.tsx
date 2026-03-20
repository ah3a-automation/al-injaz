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
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler, useMemo, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CategoryOption {
    id: string;
    code: string;
    name_en: string;
    name_ar: string;
    supplier_type: string;
    parent_id: string | null;
}

interface CreateProps {
    categories: CategoryOption[];
    supplierTypeCategoryMap: Record<string, string[]>;
}

function buildPath(
    categoryId: string,
    byId: Map<string, CategoryOption>,
    locale: string
): string {
    const cat = byId.get(categoryId);
    if (!cat) return '';
    const name = locale === 'ar' ? cat.name_ar : cat.name_en;
    if (!cat.parent_id) return name;
    const parentPath = buildPath(cat.parent_id, byId, locale);
    return parentPath ? `${parentPath} > ${name}` : name;
}

function CategoryTreeSection({
    category,
    getChildren,
    byId,
    locale,
    selectedIds,
    onToggle,
    depth = 0,
}: {
    category: CategoryOption;
    getChildren: (parentId: string) => CategoryOption[];
    byId: Map<string, CategoryOption>;
    locale: string;
    selectedIds: string[];
    onToggle: (id: string) => void;
    depth?: number;
}) {
    const children = getChildren(category.id);
    const [open, setOpen] = useState(depth < 1);
    const pathLabel = buildPath(category.id, byId, locale);
    return (
        <div className="rounded border border-transparent hover:bg-muted/30" style={{ marginLeft: depth * 12 }}>
            <div className="flex items-center gap-2 py-1">
                {children.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                        aria-label={open ? 'Collapse' : 'Expand'}
                    >
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                ) : (
                    <span className="h-6 w-6 shrink-0" />
                )}
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <Checkbox
                        checked={selectedIds.includes(category.id)}
                        onCheckedChange={() => onToggle(category.id)}
                    />
                    <span className="truncate text-sm" title={pathLabel}>
                        {pathLabel}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">({category.code})</span>
                </label>
            </div>
            {open && children.length > 0 && (
                <div className="ml-6 border-l border-border pl-2">
                    {children.map((child) => (
                        <CategoryTreeSection
                            key={child.id}
                            category={child}
                            getChildren={getChildren}
                            byId={byId}
                            locale={locale}
                            selectedIds={selectedIds}
                            onToggle={onToggle}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Create({ categories, supplierTypeCategoryMap }: CreateProps) {
    const { t } = useLocale();
    const form = useForm({
        legal_name_en: '',
        legal_name_ar: '',
        trade_name: '',
        supplier_type: 'supplier',
        country: '',
        city: '',
        postal_code: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        notes: '',
        category_ids: [] as string[],
    });
    const locale = (usePage().props as { locale?: string }).locale ?? 'en';
    const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
    const selectableCategories = useMemo(() => {
        const allowed = supplierTypeCategoryMap[form.data.supplier_type] ?? [];
        return categories.filter((c) => allowed.includes(c.supplier_type));
    }, [categories, supplierTypeCategoryMap, form.data.supplier_type]);
    const roots = useMemo(
        () => selectableCategories.filter((c) => !c.parent_id),
        [selectableCategories]
    );
    const getChildren = (parentId: string) =>
        selectableCategories.filter((c) => c.parent_id === parentId);

    const toggleCategory = (id: string) => {
        const next = form.data.category_ids.includes(id)
            ? form.data.category_ids.filter((c) => c !== id)
            : [...form.data.category_ids, id];
        form.setData('category_ids', next);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('suppliers.store'));
    };

    return (
        <AppLayout>
            <Head title={t('title_create', 'suppliers')} />
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('title_create', 'suppliers')}
                    </h1>
                    <Button variant="outline" asChild>
                        <Link href={route('suppliers.index')}>
                            {t('action_cancel', 'suppliers')}
                        </Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('section_basic', 'suppliers')}</CardTitle>
                            <CardDescription>
                                {t('company_info_help', 'suppliers')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="legal_name_en">
                                    {t('field_name', 'suppliers')} (EN) *
                                </Label>
                                <Input
                                    id="legal_name_en"
                                    value={form.data.legal_name_en}
                                    onChange={(e) => form.setData('legal_name_en', e.target.value)}
                                    required
                                    aria-invalid={!!form.errors.legal_name_en}
                                />
                                {form.errors.legal_name_en && (
                                    <p className="text-sm text-destructive">{form.errors.legal_name_en}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="legal_name_ar">
                                    {t('field_name', 'suppliers')} (AR)
                                </Label>
                                <Input
                                    id="legal_name_ar"
                                    value={form.data.legal_name_ar ?? ''}
                                    onChange={(e) => form.setData('legal_name_ar', e.target.value)}
                                    aria-invalid={!!form.errors.legal_name_ar}
                                />
                                {form.errors.legal_name_ar && (
                                    <p className="text-sm text-destructive">{form.errors.legal_name_ar}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="trade_name">
                                    {t('field_trade_name', 'suppliers')}
                                </Label>
                                <Input
                                    id="trade_name"
                                    value={form.data.trade_name ?? ''}
                                    onChange={(e) => form.setData('trade_name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="supplier_type">
                                    {t('col_type', 'suppliers')} *
                                </Label>
                                <select
                                    id="supplier_type"
                                    value={form.data.supplier_type}
                                    onChange={(e) => form.setData('supplier_type', e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="supplier">
                                        {t('type_supplier', 'suppliers')}
                                    </option>
                                    <option value="subcontractor">
                                        {t('type_subcontractor', 'suppliers')}
                                    </option>
                                    <option value="service_provider">
                                        {t('type_service_provider', 'suppliers')}
                                    </option>
                                    <option value="consultant">
                                        {t('type_consultant', 'suppliers')}
                                    </option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('section_location', 'suppliers')}</CardTitle>
                            <CardDescription>
                                {t('location_help', 'suppliers')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="country">
                                        {t('field_country', 'suppliers')} *
                                    </Label>
                                    <Input
                                        id="country"
                                        value={form.data.country}
                                        onChange={(e) => form.setData('country', e.target.value)}
                                        required
                                        aria-invalid={!!form.errors.country}
                                    />
                                    {form.errors.country && (
                                        <p className="text-sm text-destructive">{form.errors.country}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">
                                        {t('field_city', 'suppliers')} *
                                    </Label>
                                    <Input
                                        id="city"
                                        value={form.data.city}
                                        onChange={(e) => form.setData('city', e.target.value)}
                                        required
                                        aria-invalid={!!form.errors.city}
                                    />
                                    {form.errors.city && (
                                        <p className="text-sm text-destructive">{form.errors.city}</p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="postal_code">
                                    {t('field_postal_code', 'suppliers')}
                                </Label>
                                <Input
                                    id="postal_code"
                                    value={form.data.postal_code ?? ''}
                                    onChange={(e) => form.setData('postal_code', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">
                                    {t('field_address', 'suppliers')}
                                </Label>
                                <textarea
                                    id="address"
                                    value={form.data.address ?? ''}
                                    onChange={(e) => form.setData('address', e.target.value)}
                                    rows={2}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('section_contact', 'suppliers')}</CardTitle>
                            <CardDescription>
                                {t('contact_help', 'suppliers')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">
                                    {t('field_phone', 'suppliers')}
                                </Label>
                                <Input
                                    id="phone"
                                    value={form.data.phone ?? ''}
                                    onChange={(e) => form.setData('phone', e.target.value)}
                                    aria-invalid={!!form.errors.phone}
                                />
                                {form.errors.phone && (
                                    <p className="text-sm text-destructive">{form.errors.phone}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">
                                    {t('field_email', 'suppliers')}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.data.email ?? ''}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    aria-invalid={!!form.errors.email}
                                />
                                {form.errors.email && (
                                    <p className="text-sm text-destructive">{form.errors.email}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="website">
                                    {t('field_website', 'suppliers')}
                                </Label>
                                <Input
                                    id="website"
                                    type="url"
                                    value={form.data.website ?? ''}
                                    onChange={(e) => form.setData('website', e.target.value)}
                                    aria-invalid={!!form.errors.website}
                                />
                                {form.errors.website && (
                                    <p className="text-sm text-destructive">{form.errors.website}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('categories', 'suppliers')}</CardTitle>
                            <CardDescription>
                                {t('categories_help', 'suppliers')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-2 text-sm text-muted-foreground">
                                {t('categories_help', 'suppliers')} {t('category_filter_by_type', 'supplier_categories')}
                            </p>
                            <div className="max-h-[320px] space-y-1 overflow-y-auto rounded-md border border-border p-2">
                                {roots.length === 0 ? (
                                    <p className="py-4 text-center text-sm text-muted-foreground">
                                        {t('no_categories_found', 'supplier_categories')}
                                    </p>
                                ) : (
                                    roots.map((root) => (
                                        <CategoryTreeSection
                                            key={root.id}
                                            category={root}
                                            getChildren={getChildren}
                                            byId={byId}
                                            locale={locale}
                                            selectedIds={form.data.category_ids}
                                            onToggle={toggleCategory}
                                        />
                                    ))
                                )}
                            </div>
                            {form.errors.category_ids && (
                                <p className="mt-2 text-sm text-destructive">{form.errors.category_ids}</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('section_notes', 'suppliers')}</CardTitle>
                            <CardDescription>
                                {t('notes_help', 'suppliers')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                id="notes"
                                value={form.data.notes ?? ''}
                                onChange={(e) => form.setData('notes', e.target.value)}
                                rows={3}
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </CardContent>
                    </Card>

                    <div className="flex gap-2">
                        <Button type="submit" disabled={form.processing}>
                            {t('action_add', 'suppliers')}
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('suppliers.index')}>
                                {t('action_cancel', 'suppliers')}
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
