import AppLayout from '@/Layouts/AppLayout';
import { DataTable } from '@/Components/DataTable';
import { Button } from '@/Components/ui/button';
import { useConfirm, useFilters } from '@/hooks';
import { useLocale } from '@/hooks/useLocale';
import type { PaginatedResult, Project, ProjectFilters, ProjectStatus } from '@/types/projects';
import type { SharedPageProps } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface IndexProps {
    projects: PaginatedResult<Project>;
    filters: ProjectFilters;
    can: { create: boolean; update: boolean; delete: boolean };
}

const statusBadgeClass: Record<ProjectStatus, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

function formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
}

function formatContractValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num)) return '—';
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: ProjectStatus }) {
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[status]}`}
        >
            {status}
        </span>
    );
}

interface ProjectRowActionsProps {
    project: Project;
    can: { update: boolean; delete: boolean };
}

function ProjectRowActions({ project, can }: ProjectRowActionsProps) {
    const { confirmDelete } = useConfirm();

    const handleDelete = () => {
        confirmDelete(`Delete project "${project.name}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('projects.destroy', project.id));
            }
        });
    };

    return (
        <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" asChild>
                <Link href={route('projects.show', project.id)} aria-label="View">
                    <Eye className="h-4 w-4" />
                </Link>
            </Button>
            {can.update && (
                <Button variant="ghost" size="icon" asChild>
                    <Link href={route('projects.edit', project.id)} aria-label="Edit">
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

function StatusSelect({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <select
            value={value || 'all'}
            onChange={(e) => onChange(e.target.value)}
            className="flex h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Filter by status"
        >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="on_hold">On hold</option>
        </select>
    );
}

export default function Index({ projects, filters, can }: IndexProps) {
    const { t } = useLocale();
    const { t: tProjects } = useLocale('projects');
    const { filters: localFilters, setFilter, applyFilters } = useFilters(
        'projects.index',
        {
            q: filters.q ?? '',
            status: filters.status ?? '',
            sort_field: filters.sort_field ?? '',
            sort_dir: filters.sort_dir ?? 'asc',
            page: filters.page ?? 1,
            per_page: filters.per_page ?? 25,
        },
        { debounceMs: 300 }
    )
    
    // Sync local filter state when Inertia props change (e.g. back/forward navigation)
    useEffect(() => {
        setFilter('per_page', (filters.per_page ?? 25) as never)
        setFilter('page', (filters.page ?? 1) as never)
        setFilter('sort_field', (filters.sort_field ?? '') as never)
        setFilter('sort_dir', (filters.sort_dir ?? 'asc') as never)
    }, [filters.per_page, filters.page, filters.sort_field, filters.sort_dir]);

    const handleStatusChange = (value: string) => {
        const statusValue = value === 'all' ? '' : (value as ProjectStatus);
        setFilter('status', statusValue);
        applyFilters({
            status: value === 'all' ? undefined : (value as ProjectStatus),
            page: 1,
        } as Partial<ProjectFilters>);
    };

    const handleBulkAction = (action: string, ids: string[]) => {
        if (action === 'bulk_delete') {
            router.delete(route('projects.bulk-destroy'), {
                data: { ids },
            })
        }
    };

    const columns: ColumnDef<Project>[] = [
        {
            accessorKey: 'code',
            header: 'Code',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => row.original.code ?? '—',
        },
        {
            accessorKey: 'name_en',
            header: 'Name EN',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => row.original.name_en ?? row.original.name ?? '—',
        },
        {
            accessorKey: 'name_ar',
            header: 'Name AR',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => row.original.name_ar ?? '—',
        },
        {
            accessorKey: 'client',
            header: 'Client',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => row.original.client ?? '—',
        },
        {
            accessorKey: 'contract_value',
            header: 'Contract Value',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => formatContractValue(row.original.contract_value),
        },
        {
            accessorKey: 'currency',
            header: 'Currency',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => row.original.currency ?? '—',
        },
        {
            accessorKey: 'status',
            header: 'Status',
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            accessorKey: 'start_date',
            header: 'Start date',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => formatDate(row.original.start_date),
        },
        {
            accessorKey: 'end_date',
            header: t('projects_end_date', 'admin'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => formatDate(row.original.end_date),
        },
        {
            accessorKey: 'remaining_days',
            header: t('projects_remaining_days', 'admin'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => {
                const project = row.original as Project & {
                    remaining_days?: number | null;
                    remaining_ratio?: number | null;
                };
                const remaining = project.remaining_days;
                const ratio = project.remaining_ratio;

                if (remaining === null || remaining === undefined) {
                    return '—';
                }

                const baseClass = 'tabular-nums';
                let toneClass = 'text-muted-foreground';
                let label: string;

                if (remaining <= 0) {
                    toneClass = 'text-destructive';
                    if (remaining === 0) {
                        label = t('projects_remaining_zero', 'admin');
                    } else {
                        const daysOverdue = Math.abs(remaining);
                        label = t('projects_overdue_by_days', 'admin', {
                            count: daysOverdue,
                        });
                    }
                } else if (ratio !== null && ratio !== undefined) {
                    if (ratio >= 0.8) {
                        toneClass = 'text-emerald-600 dark:text-emerald-400';
                    } else if (ratio <= 0.1) {
                        toneClass = 'text-amber-600 dark:text-amber-400';
                    }
                    label = t('projects_remaining_days_value', 'admin', {
                        count: remaining,
                    });
                } else {
                    label = t('projects_remaining_days_value', 'admin', {
                        count: remaining,
                    });
                }

                return <span className={`${baseClass} ${toneClass}`}>{label}</span>;
            },
        },
        {
            id: 'actions',
            header: '',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <ProjectRowActions project={row.original} can={can} />
            ),
        },
    ];

    return (
        <AppLayout>
            <Head title="Projects" />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>

                    {can.create && (
                        <Button asChild>
                            <Link href={route('projects.create')}>
                                <Plus className="h-4 w-4" />
                                Create
                            </Link>
                        </Button>
                    )}
                </div>

                <DataTable<Project>
                    tableKey="projects"
                    columns={columns}
                    data={projects.items}
                    pagination={projects}
                    searchValue={localFilters.q as string}
                    onSearchChange={(v) => setFilter('q', v as never)}
                    extraFilters={
                        <StatusSelect
                            value={localFilters.status as string}
                            onChange={(v) => handleStatusChange(v)}
                        />
                    }
                    onSortChange={(field, dir) =>
                        applyFilters({
                            sort_field: field,
                            sort_dir: dir,
                            page: 1,
                        } as never)
                    }
                    onPageChange={(page) => applyFilters({ page, per_page: localFilters.per_page } as never)}
                    onPerPageChange={(perPage) => applyFilters({ per_page: perPage, page: 1 } as never)}
                    onBulkAction={handleBulkAction}
                    bulkActions={[
                        {
                            label: tProjects('bulk_delete_selected'),
                            action: 'bulk_delete',
                            variant: 'destructive',
                        },
                    ]}
                    exportRouteName="projects.export"
                    emptyMessage={tProjects('index_empty')}
                    currentFilters={localFilters as Record<string, unknown>}
                />
            </div>
        </AppLayout>
    );
}
