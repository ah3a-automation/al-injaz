import AppLayout from '@/Layouts/AppLayout';
import { DataTable } from '@/Components/DataTable';
import { Button } from '@/Components/ui/button';
import { useConfirm, useFilters } from '@/hooks';
import type { PaginatedSuppliers, Supplier } from '@/types';
import type { SharedPageProps } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';
import {
    getStatusColor,
    getStatusLabel,
    getTypeColor,
    getTypeLabel,
    getComplianceColor,
} from '@/utils/suppliers';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useLocale } from '@/hooks/useLocale';

interface IndexProps {
    suppliers: PaginatedSuppliers;
    filters: {
        q?: string;
        status?: string;
        supplier_type?: string;
        country?: string;
        category_id?: string;
        sort_field?: string;
        sort_dir?: string;
        per_page?: number;
        page?: number;
    };
    categories: Array<{ id: string; code: string; name_en: string; name_ar: string }>;
    countries: string[];
    can: { create: boolean; update: boolean; delete: boolean; approve: boolean };
}

function SupplierRowActions({
    supplier,
    can,
}: {
    supplier: Supplier;
    can: { update: boolean; delete: boolean };
}) {
    const { confirmDelete } = useConfirm();
    const { t } = useLocale();

    const handleDelete = () => {
        confirmDelete(
            t('confirm_delete_body', 'suppliers', { name: supplier.legal_name_en })
        ).then((confirmed) => {
            if (confirmed) {
                router.delete(route('suppliers.destroy', supplier.id));
            }
        });
    };

    return (
        <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" asChild>
                <Link
                    href={route('suppliers.show', supplier.id)}
                    aria-label={t('action_view', 'suppliers')}
                >
                    <Eye className="h-4 w-4" />
                </Link>
            </Button>
            {can.update && (
                <Button variant="ghost" size="icon" asChild>
                    <Link
                        href={route('suppliers.edit', supplier.id)}
                        aria-label={t('action_edit', 'suppliers')}
                    >
                        <Pencil className="h-4 w-4" />
                    </Link>
                </Button>
            )}
            {can.delete && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    aria-label={t('action_delete', 'suppliers')}
                >
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            )}
        </div>
    );
}

function SupplierFilters({
    statusValue,
    onStatusChange,
    typeValue,
    onTypeChange,
    countryValue,
    onCountryChange,
    categoryValue,
    onCategoryChange,
    countries,
    categories,
    locale,
}: {
    statusValue: string;
    onStatusChange: (v: string) => void;
    typeValue: string;
    onTypeChange: (v: string) => void;
    countryValue: string;
    onCountryChange: (v: string) => void;
    categoryValue: string;
    onCategoryChange: (v: string) => void;
    countries: string[];
    categories: Array<{ id: string; code: string; name_en: string; name_ar: string }>;
    locale: string;
}) {
    const { t } = useLocale();

    return (
        <div className="flex flex-wrap items-center gap-2">
            <select
                value={statusValue || 'all'}
                onChange={(e) => onStatusChange(e.target.value)}
                className="flex h-9 w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={t('filter_status', 'suppliers')}
            >
                <option value="all">{t('all_statuses', 'suppliers')}</option>
                <option value="pending_registration">
                    {t('status_pending_registration', 'suppliers')}
                </option>
                <option value="pending_review">
                    {t('status_pending_review', 'suppliers')}
                </option>
                <option value="under_review">
                    {t('status_under_review', 'suppliers')}
                </option>
                <option value="more_info_requested">
                    {t('status_more_info_requested', 'suppliers')}
                </option>
                <option value="approved">{t('status_approved', 'suppliers')}</option>
                <option value="rejected">{t('status_rejected', 'suppliers')}</option>
                <option value="suspended">{t('status_suspended', 'suppliers')}</option>
                <option value="blacklisted">{t('status_blacklisted', 'suppliers')}</option>
            </select>
            <select
                value={typeValue || 'all'}
                onChange={(e) => onTypeChange(e.target.value)}
                className="flex h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={t('filter_type', 'suppliers')}
            >
                <option value="all">{t('all_types', 'suppliers')}</option>
                <option value="supplier">{t('type_supplier', 'suppliers')}</option>
                <option value="subcontractor">
                    {t('type_subcontractor', 'suppliers')}
                </option>
                <option value="service_provider">
                    {t('type_service_provider', 'suppliers')}
                </option>
                <option value="consultant">{t('type_consultant', 'suppliers')}</option>
            </select>
            <select
                value={countryValue || ''}
                onChange={(e) => onCountryChange(e.target.value)}
                className="flex h-9 w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={t('filter_country', 'suppliers')}
            >
                <option value="">{t('all_countries', 'suppliers')}</option>
                {countries.map((c) => (
                    <option key={c} value={c}>
                        {c}
                    </option>
                ))}
            </select>
            <select
                value={categoryValue || ''}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="flex h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={t('filter_category', 'suppliers')}
            >
                <option value="">{t('all_categories', 'suppliers')}</option>
                {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                        {locale === 'ar' ? (cat.name_ar ?? cat.name_en) : (cat.name_en ?? cat.name_ar)}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function Index({
    suppliers,
    filters,
    categories,
    countries,
    can,
}: IndexProps) {
    const { flash, locale: pageLocale } = usePage().props as SharedPageProps & { locale?: string };
    const locale = pageLocale ?? 'en';
    const { t } = useLocale();

    const { filters: localFilters, setFilter, applyFilters } = useFilters(
        'suppliers.index',
        {
            q: filters.q ?? '',
            status: filters.status ?? '',
            supplier_type: filters.supplier_type ?? '',
            country: filters.country ?? '',
            category_id: filters.category_id ?? '',
            sort_field: filters.sort_field ?? 'created_at',
            sort_dir: filters.sort_dir ?? 'desc',
            per_page: filters.per_page ?? 25,
            page: filters.page ?? 1,
        },
        { debounceMs: 300 }
    );

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const handleStatusChange = (value: string) => {
        setFilter('status', value === 'all' ? '' : value);
        applyFilters({ status: value === 'all' ? undefined : value, page: 1 } as never);
    };
    const handleTypeChange = (value: string) => {
        setFilter('supplier_type', value === 'all' ? '' : value);
        applyFilters({ supplier_type: value === 'all' ? undefined : value, page: 1 } as never);
    };
    const handleCountryChange = (value: string) => {
        setFilter('country', value);
        applyFilters({ country: value || undefined, page: 1 } as never);
    };
    const handleCategoryChange = (value: string) => {
        setFilter('category_id', value);
        applyFilters({ category_id: value || undefined, page: 1 } as never);
    };

    const handleBulkAction = (action: string, ids: string[]) => {
        if (action === 'bulk_delete') {
            router.delete(route('suppliers.bulk-destroy'), { data: { ids } });
        }
    };

    const columns: ColumnDef<Supplier>[] = [
        {
            id: 'code_name',
            header: () => t('title_index', 'suppliers'),
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <div>
                    <Link
                        href={route('suppliers.show', row.original.id)}
                        className="font-medium hover:underline"
                    >
                        <span dir="ltr" className="font-mono tabular-nums">
                            {row.original.supplier_code}
                        </span>
                    </Link>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {row.original.legal_name_en}
                    </p>
                </div>
            ),
        },
        {
            accessorKey: 'supplier_type',
            header: () => t('filter_type', 'suppliers'),
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getTypeColor(row.original.supplier_type)}`}
                >
                    {getTypeLabel(row.original.supplier_type)}
                </span>
            ),
        },
        {
            accessorKey: 'status',
            header: () => t('col_status', 'suppliers'),
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(row.original.status)}`}
                >
                    {getStatusLabel(row.original.status)}
                </span>
            ),
        },
        {
            id: 'location',
            header: () => t('col_location', 'suppliers'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) =>
                [row.original.city, row.original.country].filter(Boolean).join(', ') || '—',
        },
        {
            id: 'categories',
            header: () => t('col_category', 'suppliers'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) =>
                row.original.categories
                    ?.map((c) => (locale === 'ar' ? (c.name_ar ?? c.name_en) : (c.name_en ?? c.name_ar)) ?? '—')
                    .join(', ') || '—',
        },
        {
            id: 'primary_contact',
            header: () => t('col_contact', 'suppliers'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) =>
                row.original.primary_contact?.name ?? row.original.primary_contact?.email ?? '—',
        },
        {
            accessorKey: 'compliance_status',
            header: () => t('col_compliance', 'suppliers'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getComplianceColor(row.original.compliance_status)}`}
                >
                    {row.original.compliance_status}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <SupplierRowActions supplier={row.original} can={can} />
            ),
        },
    ];

    const pagination = {
        total: suppliers.total,
        current_page: suppliers.current_page,
        per_page: suppliers.per_page,
        last_page: suppliers.last_page,
    };

    return (
        <AppLayout>
            <Head title={t('title_index', 'suppliers')} />
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('title_index', 'suppliers')}
                    </h1>
                    <div className="flex gap-2">
                        <Button variant="secondary" asChild>
                            <Link href={route('admin.suppliers.map')}>
                                {t('coverage_map', 'dashboard')}
                            </Link>
                        </Button>
                        {can.create && (
                            <Button asChild>
                                <Link href={route('suppliers.create')}>
                                    <Plus className="h-4 w-4" />
                                    {t('title_create', 'suppliers')}
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
                <DataTable<Supplier>
                    tableKey="suppliers"
                    columns={columns}
                    data={suppliers.data}
                    pagination={pagination}
                    searchValue={localFilters.q as string}
                    onSearchChange={(v) => setFilter('q', v as never)}
                    extraFilters={
                        <SupplierFilters
                            statusValue={localFilters.status as string}
                            onStatusChange={handleStatusChange}
                            typeValue={localFilters.supplier_type as string}
                            onTypeChange={handleTypeChange}
                            countryValue={localFilters.country as string}
                            onCountryChange={handleCountryChange}
                            categoryValue={localFilters.category_id as string}
                            onCategoryChange={handleCategoryChange}
                            countries={countries}
                            categories={categories}
                            locale={locale}
                        />
                    }
                    onSortChange={(field, dir) =>
                        applyFilters({ sort_field: field, sort_dir: dir, page: 1 } as never)
                    }
                    onPageChange={(page) =>
                        applyFilters({ page, per_page: localFilters.per_page } as never)
                    }
                    onPerPageChange={(perPage) =>
                        applyFilters({ per_page: perPage, page: 1 } as never)
                    }
                    onBulkAction={handleBulkAction}
                    bulkActions={[
                        {
                            label: t('action_bulk_delete', 'suppliers'),
                            action: 'bulk_delete',
                            variant: 'destructive',
                        },
                    ]}
                    exportRouteName="suppliers.export"
                    emptyMessage={t('empty_title', 'suppliers')}
                    currentFilters={localFilters as Record<string, unknown>}
                />
            </div>
        </AppLayout>
    );
}
