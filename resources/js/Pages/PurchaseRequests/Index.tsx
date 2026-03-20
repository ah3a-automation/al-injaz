import AppLayout from '@/Layouts/AppLayout';
import { DataTable } from '@/Components/DataTable';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import { Head, Link, router } from '@inertiajs/react';
import { Eye, CheckCircle, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';

interface PurchaseRequestRow {
    id: string;
    pr_number: string;
    title_en: string;
    title_ar: string | null;
    status: string;
    priority: string;
    needed_by_date: string | null;
    project?: { id: string; name: string; name_en: string | null } | null;
    requested_by?: { id: number; name: string } | null;
}

interface IndexProps {
    purchaseRequests: {
        data: PurchaseRequestRow[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    projects: Array<{ id: string; name: string; name_en: string | null }>;
    filters: {
        project_id?: string;
        status?: string;
        priority?: string;
        search?: string;
    };
    can: { create: boolean; approve: boolean; convert: boolean };
}

const statusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    converted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const priorityBadgeClass: Record<string, string> = {
    low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function PRFilters({
    projectValue,
    onProjectChange,
    statusValue,
    onStatusChange,
    priorityValue,
    onPriorityChange,
    projects,
    t,
}: {
    projectValue: string;
    onProjectChange: (v: string) => void;
    statusValue: string;
    onStatusChange: (v: string) => void;
    priorityValue: string;
    onPriorityChange: (v: string) => void;
    projects: Array<{ id: string; name: string; name_en: string | null }>;
    t: (key: string, ns: 'purchase_requests') => string;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Select value={projectValue || 'all'} onValueChange={onProjectChange}>
                <SelectTrigger className="h-9 w-[180px]" aria-label={t('filter_project', 'purchase_requests')}>
                    <SelectValue placeholder={t('all_projects', 'purchase_requests')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('all_projects', 'purchase_requests')}</SelectItem>
                    {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                            {p.name_en ?? p.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={statusValue || 'all'} onValueChange={onStatusChange}>
                <SelectTrigger className="h-9 w-[140px]" aria-label={t('filter_status', 'purchase_requests')}>
                    <SelectValue placeholder={t('all_statuses', 'purchase_requests')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('all_statuses', 'purchase_requests')}</SelectItem>
                    <SelectItem value="draft">{t('status_draft', 'purchase_requests')}</SelectItem>
                    <SelectItem value="submitted">{t('status_submitted', 'purchase_requests')}</SelectItem>
                    <SelectItem value="approved">{t('status_approved', 'purchase_requests')}</SelectItem>
                    <SelectItem value="rejected">{t('status_rejected', 'purchase_requests')}</SelectItem>
                    <SelectItem value="converted">{t('status_converted', 'purchase_requests')}</SelectItem>
                    <SelectItem value="closed">{t('status_closed', 'purchase_requests')}</SelectItem>
                </SelectContent>
            </Select>
            <Select value={priorityValue || 'all'} onValueChange={onPriorityChange}>
                <SelectTrigger className="h-9 w-[120px]" aria-label={t('filter_priority', 'purchase_requests')}>
                    <SelectValue placeholder={t('all_priorities', 'purchase_requests')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('all_priorities', 'purchase_requests')}</SelectItem>
                    <SelectItem value="low">{t('priority_low', 'purchase_requests')}</SelectItem>
                    <SelectItem value="normal">{t('priority_normal', 'purchase_requests')}</SelectItem>
                    <SelectItem value="high">{t('priority_high', 'purchase_requests')}</SelectItem>
                    <SelectItem value="urgent">{t('priority_urgent', 'purchase_requests')}</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

export default function Index({ purchaseRequests, projects, filters, can }: IndexProps) {
    const { t } = useLocale();
    const [searchInput, setSearchInput] = useState(filters.search ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setSearchInput(filters.search ?? '');
    }, [filters.search]);

    const applyFilters = useCallback(
        (overrides: Record<string, string | number | undefined>) => {
            const params: Record<string, string | number> = {
                project_id: filters.project_id ?? '',
                status: filters.status ?? '',
                priority: filters.priority ?? '',
                search: filters.search ?? '',
                page: purchaseRequests.current_page,
                per_page: purchaseRequests.per_page,
            };
            for (const [k, v] of Object.entries(overrides)) {
                if (v !== undefined && v !== '') params[k] = v;
                else if (k in params && (v === '' || v === undefined)) {
                    if (k === 'project_id' || k === 'status' || k === 'priority' || k === 'search') {
                        delete params[k];
                    }
                }
            }
            const normalized = Object.fromEntries(
                Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
            ) as Record<string, string | number>;
            router.get(route('purchase-requests.index'), normalized, {
                preserveState: true,
                replace: true,
            });
        },
        [filters, purchaseRequests.current_page, purchaseRequests.per_page]
    );

    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            applyFilters({ search: searchInput, page: 1 });
            debounceRef.current = null;
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchInput, applyFilters]);

    const handleProjectChange = (v: string) => {
        applyFilters({ project_id: v === 'all' ? undefined : v, page: 1 });
    };
    const handleStatusChange = (v: string) => {
        applyFilters({ status: v === 'all' ? undefined : v, page: 1 });
    };
    const handlePriorityChange = (v: string) => {
        applyFilters({ priority: v === 'all' ? undefined : v, page: 1 });
    };

    const columns: ColumnDef<PurchaseRequestRow>[] = [
        {
            accessorKey: 'pr_number',
            header: t('col_reference', 'purchase_requests'),
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <Link
                    href={route('purchase-requests.show', row.original.id)}
                    className="font-medium hover:underline"
                >
                    <span dir="ltr" className="font-mono tabular-nums">{row.original.pr_number}</span>
                </Link>
            ),
        },
        {
            accessorKey: 'project',
            header: t('col_project', 'purchase_requests'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => row.original.project?.name_en ?? row.original.project?.name ?? '—',
        },
        {
            accessorKey: 'title_en',
            header: t('col_title', 'purchase_requests'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => (
                <span className="truncate max-w-[200px] block">
                    {row.original.title_en}
                </span>
            ),
        },
        {
            accessorKey: 'priority',
            header: t('col_priority', 'purchase_requests'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => {
                const key = row.original.priority === 'normal' ? 'priority_normal' : `priority_${row.original.priority}`;
                return (
                    <Badge
                        variant="outline"
                        className={priorityBadgeClass[row.original.priority] ?? ''}
                    >
                        {t(key, 'purchase_requests')}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'status',
            header: t('col_status', 'purchase_requests'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => {
                const key = row.original.status === 'converted' ? 'status_converted' : row.original.status === 'closed' ? 'status_closed' : `status_${row.original.status}`;
                return (
                    <Badge
                        variant="outline"
                        className={statusBadgeClass[row.original.status] ?? ''}
                    >
                        {t(key, 'purchase_requests')}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'requested_by',
            header: t('col_requester', 'purchase_requests'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => row.original.requested_by?.name ?? '—',
        },
        {
            accessorKey: 'needed_by_date',
            header: t('col_required_date', 'purchase_requests'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) =>
                row.original.needed_by_date ? (
                    <span dir="ltr" className="font-mono tabular-nums">
                        {new Date(row.original.needed_by_date).toLocaleDateString()}
                    </span>
                ) : (
                    '—'
                ),
        },
        {
            id: 'actions',
            header: '',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={route('purchase-requests.show', row.original.id)} aria-label={t('action_view', 'purchase_requests')}>
                            <Eye className="h-4 w-4" />
                        </Link>
                    </Button>
                    {can.approve && row.original.status === 'submitted' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                                router.post(
                                    route('purchase-requests.approve', row.original.id),
                                    {},
                                    { preserveScroll: true }
                                )
                            }
                            aria-label={t('action_approve', 'purchase_requests')}
                        >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const pagination = {
        total: purchaseRequests.total,
        current_page: purchaseRequests.current_page,
        per_page: purchaseRequests.per_page,
        last_page: purchaseRequests.last_page,
    };

    return (
        <AppLayout>
            <Head title={t('title_index', 'purchase_requests')} />
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">{t('title_index', 'purchase_requests')}</h1>
                    {can.create && (
                        <Button asChild>
                            <Link href={route('purchase-requests.create')}>
                                <Plus className="h-4 w-4" />
                                {t('action_new', 'purchase_requests')}
                            </Link>
                        </Button>
                    )}
                </div>

                <DataTable<PurchaseRequestRow>
                    tableKey="purchase-requests"
                    columns={columns}
                    data={purchaseRequests.data}
                    pagination={pagination}
                    searchValue={searchInput}
                    onSearchChange={setSearchInput}
                    extraFilters={
                        <PRFilters
                            projectValue={filters.project_id ?? 'all'}
                            onProjectChange={handleProjectChange}
                            statusValue={filters.status ?? 'all'}
                            onStatusChange={handleStatusChange}
                            priorityValue={filters.priority ?? 'all'}
                            onPriorityChange={handlePriorityChange}
                            projects={projects}
                            t={t}
                        />
                    }
                    onPageChange={(page) => applyFilters({ page })}
                    onPerPageChange={(perPage) => applyFilters({ per_page: perPage, page: 1 })}
                    emptyMessage={t('empty_title', 'purchase_requests')}
                />
            </div>
        </AppLayout>
    );
}
