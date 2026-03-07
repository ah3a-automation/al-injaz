import AppLayout from '@/Layouts/AppLayout';
import { DataTable } from '@/Components/DataTable';
import { Button } from '@/Components/ui/button';
import { useConfirm, useFilters } from '@/hooks';
import type { PaginatedUsers, UserRecord } from '@/types';
import type { SharedPageProps } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';
import { getRoleColor, getRoleLabel, getStatusColor, getStatusLabel } from '@/utils/users';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface IndexProps {
    users: PaginatedUsers;
    filters: {
        q?: string;
        status?: string;
        role?: string;
        department?: string;
        sort_field?: string;
        sort_dir?: string;
        per_page?: number;
        page?: number;
    };
    roles: Array<{ id: number; name: string }>;
    departments: string[];
    can: { create: boolean; update: boolean; delete: boolean };
}

function UserRowActions({
    user,
    can,
    currentUserId,
}: {
    user: UserRecord;
    can: { update: boolean; delete: boolean };
    currentUserId: number;
}) {
    const { confirmDelete } = useConfirm();
    const roleName = user.roles[0]?.name;
    const canDelete = can.delete && user.id !== currentUserId && roleName !== 'super_admin';

    const handleDelete = () => {
        confirmDelete(`Delete user "${user.name}"?`).then((confirmed) => {
            if (confirmed) router.delete(route('users.destroy', user.id));
        });
    };

    return (
        <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" asChild>
                <Link href={route('users.show', user.id)} aria-label="View">
                    <Eye className="h-4 w-4" />
                </Link>
            </Button>
            {can.update && (
                <Button variant="ghost" size="icon" asChild>
                    <Link href={route('users.edit', user.id)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                    </Link>
                </Button>
            )}
            {canDelete && (
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

function UserFilters({
    statusValue,
    onStatusChange,
    roleValue,
    onRoleChange,
    departmentValue,
    onDepartmentChange,
    roles,
    departments,
    getRoleLabel: getLabel,
}: {
    statusValue: string;
    onStatusChange: (v: string) => void;
    roleValue: string;
    onRoleChange: (v: string) => void;
    departmentValue: string;
    onDepartmentChange: (v: string) => void;
    roles: Array<{ id: number; name: string }>;
    departments: string[];
    getRoleLabel: (name: string) => string;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <select
                value={statusValue || 'all'}
                onChange={(e) => onStatusChange(e.target.value)}
                className="flex h-9 w-[140px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filter by status"
            >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
            </select>
            <select
                value={roleValue || ''}
                onChange={(e) => onRoleChange(e.target.value)}
                className="flex h-9 min-w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filter by role"
            >
                <option value="">All roles</option>
                {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                        {getLabel(r.name)}
                    </option>
                ))}
            </select>
            <select
                value={departmentValue || ''}
                onChange={(e) => onDepartmentChange(e.target.value)}
                className="flex h-9 min-w-[140px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filter by department"
            >
                <option value="">All departments</option>
                {departments.map((d) => (
                    <option key={d} value={d}>
                        {d}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function Index({ users, filters, roles, departments, can }: IndexProps) {
    const { flash, auth } = usePage().props as SharedPageProps;
    const currentUserId = auth?.user?.id ?? 0;

    const { filters: localFilters, setFilter, applyFilters } = useFilters(
        'users.index',
        {
            q: filters.q ?? '',
            status: filters.status ?? '',
            role: filters.role ?? '',
            department: filters.department ?? '',
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

    useEffect(() => {
        setFilter('per_page', (filters.per_page ?? 25) as never);
        setFilter('page', (filters.page ?? 1) as never);
        setFilter('sort_field', (filters.sort_field ?? 'created_at') as never);
        setFilter('sort_dir', (filters.sort_dir ?? 'desc') as never);
    }, [filters.per_page, filters.page, filters.sort_field, filters.sort_dir]);

    const handleStatusChange = (value: string) => {
        setFilter('status', value === 'all' ? '' : value);
        applyFilters({ status: value === 'all' ? undefined : value, page: 1 } as never);
    };
    const handleRoleChange = (value: string) => {
        setFilter('role', value);
        applyFilters({ role: value || undefined, page: 1 } as never);
    };
    const handleDepartmentChange = (value: string) => {
        setFilter('department', value);
        applyFilters({ department: value || undefined, page: 1 } as never);
    };

    const handleBulkAction = (action: string, selectedIds: string[]) => {
        if (action === 'bulk_delete') {
            router.delete(route('users.bulk-destroy'), { data: { ids: selectedIds } });
        }
    };

    const columns: ColumnDef<UserRecord>[] = [
        {
            id: 'user',
            header: 'User',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {row.original.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <Link
                            href={route('users.show', row.original.id)}
                            className="font-medium hover:underline"
                        >
                            {row.original.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{row.original.email}</p>
                    </div>
                </div>
            ),
        },
        {
            id: 'role',
            header: 'Role',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => {
                const roleName = row.original.roles[0]?.name ?? '—';
                return (
                    <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getRoleColor(roleName)}`}
                    >
                        {roleName === '—' ? '—' : getRoleLabel(roleName)}
                    </span>
                );
            },
        },
        {
            accessorKey: 'department',
            header: 'Department',
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => row.original.department ?? '—',
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
            id: 'must_change_password',
            header: 'Password',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) =>
                row.original.must_change_password ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        ⚠ Password Reset Required
                    </span>
                ) : (
                    '—'
                ),
        },
        {
            accessorKey: 'last_login_at',
            header: 'Last Login',
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) =>
                row.original.last_login_at
                    ? new Date(row.original.last_login_at).toLocaleString()
                    : 'Never',
        },
        {
            id: 'actions',
            header: '',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <UserRowActions
                    user={row.original}
                    can={can}
                    currentUserId={currentUserId}
                />
            ),
        },
    ];

    const pagination = {
        total: users.total,
        current_page: users.current_page,
        per_page: users.per_page,
        last_page: users.last_page,
    };

    return (
        <AppLayout>
            <Head title="Users" />
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
                    {can.create && (
                        <Button asChild>
                            <Link href={route('users.create')}>
                                <Plus className="h-4 w-4" />
                                New User
                            </Link>
                        </Button>
                    )}
                </div>
                <DataTable<UserRecord>
                    tableKey="users"
                    columns={columns}
                    data={users.data}
                    pagination={pagination}
                    searchValue={localFilters.q as string}
                    onSearchChange={(v) => setFilter('q', v as never)}
                    extraFilters={
                        <UserFilters
                            statusValue={localFilters.status as string}
                            onStatusChange={handleStatusChange}
                            roleValue={localFilters.role as string}
                            onRoleChange={handleRoleChange}
                            departmentValue={localFilters.department as string}
                            onDepartmentChange={handleDepartmentChange}
                            roles={roles}
                            departments={departments}
                            getRoleLabel={getRoleLabel}
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
                    emptyMessage="No users found."
                    currentFilters={localFilters as Record<string, unknown>}
                />
            </div>
        </AppLayout>
    );
}
