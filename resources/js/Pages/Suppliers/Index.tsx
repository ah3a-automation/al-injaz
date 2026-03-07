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
    categories: Array<{ id: number; name: string }>;
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

    const handleDelete = () => {
        confirmDelete(`Delete supplier "${supplier.legal_name_en}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('suppliers.destroy', supplier.id));
            }
        });
    };

    return (
        <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" asChild>
                <Link href={route('suppliers.show', supplier.id)} aria-label="View">
                    <Eye className="h-4 w-4" />
                </Link>
            </Button>
            {can.update && (
                <Button variant="ghost" size="icon" asChild>
                    <Link href={route('suppliers.edit', supplier.id)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                    </Link>
                </Button>
            )}
            {can.delete && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    aria-label="Delete"
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
    categories: Array<{ id: number; name: string }>;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <select
                value={statusValue || 'all'}
                onChange={(e) => onStatusChange(e.target.value)}
                className="flex h-9 w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filter by status"
            >
                <option value="all">All statuses</option>
                <option value="pending_registration">Pending Registration</option>
                <option value="pending_review">Pending Review</option>
                <option value="under_review">Under Review</option>
                <option value="more_info_requested">More Info Requested</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
                <option value="blacklisted">Blacklisted</option>
            </select>
            <select
                value={typeValue || 'all'}
                onChange={(e) => onTypeChange(e.target.value)}
                className="flex h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filter by type"
            >
                <option value="all">All types</option>
                <option value="supplier">Supplier</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="service_provider">Service Provider</option>
                <option value="consultant">Consultant</option>
            </select>
            <select
                value={countryValue || ''}
                onChange={(e) => onCountryChange(e.target.value)}
                className="flex h-9 w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filter by country"
            >
                <option value="">All countries</option>
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
                aria-label="Filter by category"
            >
                <option value="">All categories</option>
                {categories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                        {cat.name}
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
    const { flash } = usePage().props as SharedPageProps;

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
            header: 'Supplier',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <div>
                    <Link
                        href={route('suppliers.show', row.original.id)}
                        className="font-medium hover:underline"
                    >
                        {row.original.supplier_code}
                    </Link>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {row.original.legal_name_en}
                    </p>
                </div>
            ),
        },
        {
            accessorKey: 'supplier_type',
            header: 'Type',
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
            header: 'Status',
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
            header: 'Location',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) =>
                [row.original.city, row.original.country].filter(Boolean).join(', ') || '—',
        },
        {
            id: 'categories',
            header: 'Categories',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) =>
                row.original.categories?.map((c) => c.name).join(', ') || '—',
        },
        {
            id: 'primary_contact',
            header: 'Primary contact',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) =>
                row.original.primary_contact?.name ?? row.original.primary_contact?.email ?? '—',
        },
        {
            accessorKey: 'compliance_status',
            header: 'Compliance',
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
            <Head title="Suppliers" />
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
                    {can.create && (
                        <Button asChild>
                            <Link href={route('suppliers.create')}>
                                <Plus className="h-4 w-4" />
                                Create
                            </Link>
                        </Button>
                    )}
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
                        { label: 'Delete selected', action: 'bulk_delete', variant: 'destructive' },
                    ]}
                    exportRouteName="suppliers.export"
                    emptyMessage="No suppliers found."
                    currentFilters={localFilters as Record<string, unknown>}
                />
            </div>
        </AppLayout>
    );
}
