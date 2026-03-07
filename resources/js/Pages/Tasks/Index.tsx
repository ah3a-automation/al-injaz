import AppLayout from '@/Layouts/AppLayout';
import { DataTable } from '@/Components/DataTable';
import { KanbanBoard } from '@/Components/Tasks';
import { Button } from '@/Components/ui/button';
import { useConfirm, useFilters } from '@/hooks';
import type { PaginatedTasks, Task } from '@/types';
import type { SharedPageProps } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { List, Kanban, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { isOverdue } from '@/utils/tasks';

interface IndexProps {
    tasks: PaginatedTasks;
    filters: {
        q?: string;
        project_id?: string;
        status?: string;
        priority?: string;
        sort_field?: string;
        sort_dir?: string;
        per_page?: number;
        page?: number;
    };
    projects: Array<{ id: string; name: string }>;
    users: Array<{ id: number; name: string }>;
    can: { create: boolean; update: boolean; delete: boolean };
}

const statusClass: Record<string, string> = {
    backlog: 'bg-gray-100 text-gray-700',
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    review: 'bg-purple-100 text-purple-700',
    done: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

const priorityClass: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
};

function TaskRowActions({
    task,
    can,
}: {
    task: Task;
    can: { update: boolean; delete: boolean };
}) {
    const { confirmDelete } = useConfirm();

    const handleDelete = () => {
        confirmDelete(`Delete task "${task.title}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('tasks.destroy', task.id));
            }
        });
    };

    return (
        <div className="flex justify-end gap-2">
            {can.update && (
                <Button variant="ghost" size="icon" asChild>
                    <Link href={route('tasks.edit', task.id)} aria-label="Edit">
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

function TaskFilters({
    statusValue,
    onStatusChange,
    priorityValue,
    onPriorityChange,
    projectValue,
    onProjectChange,
    projects,
}: {
    statusValue: string;
    onStatusChange: (v: string) => void;
    priorityValue: string;
    onPriorityChange: (v: string) => void;
    projectValue: string;
    onProjectChange: (v: string) => void;
    projects: Array<{ id: string; name: string }>;
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
                <option value="backlog">Backlog</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
            </select>
            <select
                value={priorityValue || 'all'}
                onChange={(e) => onPriorityChange(e.target.value)}
                className="flex h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filter by priority"
            >
                <option value="all">All priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
            </select>
            <select
                value={projectValue || ''}
                onChange={(e) => onProjectChange(e.target.value)}
                className="flex h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filter by project"
            >
                <option value="">All projects</option>
                {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function Index({ tasks, filters, projects, users, can }: IndexProps) {
    const { flash } = usePage().props as SharedPageProps;

    const [view, setView] = useState<'list' | 'kanban'>(() => {
        if (typeof window === 'undefined') return 'list';
        return (localStorage.getItem('tasks_view') as 'list' | 'kanban') ?? 'list';
    });

    const { filters: localFilters, setFilter, applyFilters } = useFilters(
        'tasks.index',
        {
            q: filters.q ?? '',
            project_id: filters.project_id ?? '',
            status: filters.status ?? '',
            priority: filters.priority ?? '',
            sort_field: filters.sort_field ?? 'position',
            sort_dir: filters.sort_dir ?? 'asc',
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
        if (typeof window === 'undefined') return;
        localStorage.setItem('tasks_view', view);
    }, [view]);

    const handleStatusChange = (value: string) => {
        setFilter('status', value === 'all' ? '' : value);
        applyFilters({
            status: value === 'all' ? undefined : value,
            page: 1,
        } as Partial<typeof localFilters>);
    };

    const handlePriorityChange = (value: string) => {
        setFilter('priority', value === 'all' ? '' : value);
        applyFilters({
            priority: value === 'all' ? undefined : value,
            page: 1,
        } as Partial<typeof localFilters>);
    };

    const handleProjectChange = (value: string) => {
        setFilter('project_id', value);
        applyFilters({
            project_id: value || undefined,
            page: 1,
        } as Partial<typeof localFilters>);
    };

    const handleBulkAction = (action: string, ids: string[]) => {
        if (action === 'bulk_delete') {
            router.delete(route('tasks.bulk-destroy'), {
                data: { ids },
            });
        }
    };

    const columns: ColumnDef<Task>[] = [
        {
            accessorKey: 'title',
            header: 'Title',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <Link
                    href={route('tasks.show', row.original.id)}
                    className="truncate max-w-[200px] block hover:underline"
                >
                    {row.original.title}
                </Link>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[row.original.status] ?? statusClass.backlog}`}
                >
                    {row.original.status}
                </span>
            ),
        },
        {
            accessorKey: 'priority',
            header: 'Priority',
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass[row.original.priority] ?? priorityClass.normal}`}
                >
                    {row.original.priority}
                </span>
            ),
        },
        {
            accessorKey: 'project',
            header: 'Project',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => row.original.project?.name ?? '—',
        },
        {
            id: 'assignees',
            header: 'Assignees',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => {
                const assignees = row.original.assignees ?? [];
                if (assignees.length === 0) return '—';
                return (
                    <div className="flex -space-x-2">
                        {assignees.slice(0, 3).map((a) => (
                            <div
                                key={a.id}
                                className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium border border-background"
                                title={a.name}
                            >
                                {a.name.charAt(0).toUpperCase()}
                            </div>
                        ))}
                        {assignees.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border border-background">
                                +{assignees.length - 3}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'due_at',
            header: 'Due date',
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => {
                const task = row.original;
                if (!task.due_at) return '—';
                const overdue = isOverdue(task);
                return (
                    <span className={overdue ? 'text-red-600 font-medium' : ''}>
                        {new Date(task.due_at).toLocaleDateString()}
                    </span>
                );
            },
        },
        {
            accessorKey: 'progress_percent',
            header: 'Progress',
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => (
                <div className="w-20 bg-muted rounded-full h-1.5">
                    <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{ width: `${row.original.progress_percent}%` }}
                    />
                </div>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <TaskRowActions task={row.original} can={can} />
            ),
        },
    ];

    const pagination = {
        total: tasks.total,
        current_page: tasks.current_page,
        per_page: tasks.per_page,
        last_page: tasks.last_page,
    };

    return (
        <AppLayout>
            <Head title="Tasks" />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-md border border-border">
                            <Button
                                variant={view === 'list' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setView('list')}
                                aria-label="List view"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={view === 'kanban' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setView('kanban')}
                                aria-label="Kanban view"
                            >
                                <Kanban className="h-4 w-4" />
                            </Button>
                        </div>
                        {can.create && (
                            <Button asChild>
                                <Link href={route('tasks.create')}>
                                    <Plus className="h-4 w-4" />
                                    New Task
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {view === 'list' && (
                    <>
                        <DataTable<Task>
                            tableKey="tasks"
                            columns={columns}
                            data={tasks.data}
                            pagination={pagination}
                            searchValue={localFilters.q as string}
                            onSearchChange={(v) => setFilter('q', v as never)}
                            extraFilters={
                                <TaskFilters
                                    statusValue={localFilters.status as string}
                                    onStatusChange={handleStatusChange}
                                    priorityValue={localFilters.priority as string}
                                    onPriorityChange={handlePriorityChange}
                                    projectValue={localFilters.project_id as string}
                                    onProjectChange={handleProjectChange}
                                    projects={projects}
                                />
                            }
                            onSortChange={(field, dir) =>
                                applyFilters({
                                    sort_field: field,
                                    sort_dir: dir,
                                    page: 1,
                                } as never)
                            }
                            onPageChange={(page) =>
                                applyFilters({
                                    page,
                                    per_page: localFilters.per_page,
                                } as never)
                            }
                            onPerPageChange={(perPage) =>
                                applyFilters({
                                    per_page: perPage,
                                    page: 1,
                                } as never)
                            }
                            onBulkAction={handleBulkAction}
                            bulkActions={[
                                {
                                    label: 'Delete selected',
                                    action: 'bulk_delete',
                                    variant: 'destructive',
                                },
                            ]}
                            exportRouteName="tasks.export"
                            emptyMessage="No tasks found. Create your first task."
                            currentFilters={localFilters as Record<string, unknown>}
                        />
                    </>
                )}

                {view === 'kanban' && (
                    <KanbanBoard tasks={tasks.data} />
                )}
            </div>
        </AppLayout>
    );
}
