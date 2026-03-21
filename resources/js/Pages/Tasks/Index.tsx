import AppLayout from '@/Layouts/AppLayout';
import { KanbanBoard } from '@/Components/Tasks';
import { TaskPriorityBadge } from '@/Components/Tasks/TaskPriorityBadge';
import { TaskStatusBadge } from '@/Components/Tasks/TaskStatusBadge';
import { Button } from '@/Components/ui/button';
import { useConfirm, useFilters } from '@/hooks';
import { useLocale } from '@/hooks/useLocale';
import type { PaginatedTasks, Task } from '@/types';
import type { SharedPageProps } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/Components/DataTable';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { isOverdue } from '@/utils/tasks';
import { ChevronDown, ChevronUp, Kanban, List, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface IndexProps {
    tasks: PaginatedTasks;
    filters: {
        q?: string;
        project_id?: string;
        status?: string;
        priority?: string;
        assignee_id?: string;
        sort_field?: string;
        sort_dir?: string;
        per_page?: number;
        page?: number;
    };
    projects: Array<{ id: string; name: string }>;
    users: Array<{ id: number; name: string }>;
    can: { create: boolean; update: boolean; delete: boolean };
}

type DueScope = 'all' | 'overdue' | 'week';

function applyDueScope(rows: Task[], scope: DueScope): Task[] {
    if (scope === 'all') {
        return rows;
    }
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return rows.filter((task) => {
        if (!task.due_at) {
            return false;
        }
        const due = new Date(task.due_at).getTime();
        if (scope === 'overdue') {
            return isOverdue(task);
        }
        /* Due within the next 7 days (and not already overdue) */
        return due >= now && due <= now + weekMs;
    });
}

function TaskRowActions({
    task,
    can,
    siblingIndex,
    siblingCount,
}: {
    task: Task;
    can: { update: boolean; delete: boolean };
    siblingIndex: number;
    siblingCount: number;
}) {
    const { confirmDelete } = useConfirm();
    const { t } = useLocale('tasks');

    const handleDelete = () => {
        confirmDelete(t('confirm_delete_body', undefined, { title: task.title })).then(
            (confirmed) => {
                if (confirmed) {
                    router.delete(route('tasks.destroy', task.id));
                }
            }
        );
    };

    const reorder = (direction: 'up' | 'down') => {
        router.post(
            route('tasks.reorder', task.id),
            { direction },
            { preserveScroll: true }
        );
    };

    const isFirst = siblingIndex <= 0;
    const isLast = siblingIndex >= siblingCount - 1;

    return (
        <div className="flex justify-end gap-1">
            {can.update && (
                <>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isFirst}
                        onClick={() => reorder('up')}
                        aria-label={t('reorder_up')}
                        title={t('reorder_up')}
                    >
                        <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isLast}
                        onClick={() => reorder('down')}
                        aria-label={t('reorder_down')}
                        title={t('reorder_down')}
                    >
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={route('tasks.edit', task.id)} aria-label={t('action_edit')}>
                            <Pencil className="h-4 w-4" />
                        </Link>
                    </Button>
                </>
            )}
            {can.delete && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    aria-label={t('action_delete')}
                >
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            )}
        </div>
    );
}

function TaskFiltersBar({
    statusValue,
    onStatusChange,
    priorityValue,
    onPriorityChange,
    projectValue,
    onProjectChange,
    assigneeValue,
    onAssigneeChange,
    dueScope,
    onDueScopeChange,
    projects,
    users,
}: {
    statusValue: string;
    onStatusChange: (v: string) => void;
    priorityValue: string;
    onPriorityChange: (v: string) => void;
    projectValue: string;
    onProjectChange: (v: string) => void;
    assigneeValue: string;
    onAssigneeChange: (v: string) => void;
    dueScope: DueScope;
    onDueScopeChange: (v: DueScope) => void;
    projects: Array<{ id: string; name: string }>;
    users: Array<{ id: number; name: string }>;
}) {
    const { t } = useLocale('tasks');

    return (
        <div className="flex flex-wrap items-center gap-2">
            <select
                value={statusValue || 'all'}
                onChange={(e) => onStatusChange(e.target.value)}
                className="flex h-9 min-w-[140px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={t('filter_status')}
            >
                <option value="all">{t('all_statuses')}</option>
                <option value="backlog">{t('status_backlog')}</option>
                <option value="open">{t('status_open')}</option>
                <option value="in_progress">{t('status_in_progress')}</option>
                <option value="review">{t('status_review')}</option>
                <option value="done">{t('status_done')}</option>
                <option value="cancelled">{t('status_cancelled')}</option>
            </select>
            <select
                value={priorityValue || 'all'}
                onChange={(e) => onPriorityChange(e.target.value)}
                className="flex h-9 min-w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={t('filter_priority')}
            >
                <option value="all">{t('all_priorities')}</option>
                <option value="low">{t('priority_low')}</option>
                <option value="normal">{t('priority_normal')}</option>
                <option value="high">{t('priority_high')}</option>
                <option value="urgent">{t('priority_urgent')}</option>
            </select>
            <select
                value={projectValue || ''}
                onChange={(e) => onProjectChange(e.target.value)}
                className="flex h-9 min-w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={t('filter_project')}
            >
                <option value="">{t('filter_project_all')}</option>
                {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                ))}
            </select>
            <select
                value={assigneeValue || ''}
                onChange={(e) => onAssigneeChange(e.target.value)}
                className="flex h-9 min-w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={t('filter_assignee')}
            >
                <option value="">{t('all_assignees')}</option>
                {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                        {u.name}
                    </option>
                ))}
            </select>
            <select
                value={dueScope}
                onChange={(e) => onDueScopeChange(e.target.value as DueScope)}
                className="flex h-9 min-w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={t('filter_due_scope')}
            >
                <option value="all">{t('filter_due_all')}</option>
                <option value="overdue">{t('filter_due_overdue')}</option>
                <option value="week">{t('filter_due_week')}</option>
            </select>
        </div>
    );
}

export default function Index({ tasks, filters, projects, users, can }: IndexProps) {
    const { flash } = usePage().props as SharedPageProps;
    const { t } = useLocale('tasks');
    const [view, setView] = useState<'list' | 'kanban'>(() => {
        if (typeof window === 'undefined') {
            return 'list';
        }
        return (localStorage.getItem('tasks_view') as 'list' | 'kanban') ?? 'list';
    });
    const [dueScope, setDueScope] = useState<DueScope>('all');

    const { filters: localFilters, setFilter, applyFilters } = useFilters(
        'tasks.index',
        {
            q: filters.q ?? '',
            project_id: filters.project_id ?? '',
            status: filters.status ?? '',
            priority: filters.priority ?? '',
            assignee_id: filters.assignee_id ?? '',
            sort_field: filters.sort_field ?? 'position',
            sort_dir: filters.sort_dir ?? 'asc',
            per_page: filters.per_page ?? 25,
            page: filters.page ?? 1,
        },
        { debounceMs: 300 }
    );

    const filteredTasks = useMemo(
        () => applyDueScope(tasks.data, dueScope),
        [tasks.data, dueScope]
    );

    /** Order within each (parent_task_id, status) group for reorder up/down controls. */
    const taskSiblingContext = useMemo(() => {
        const map = new Map<string, { index: number; count: number }>();
        const groups = new Map<string, Task[]>();
        for (const task of filteredTasks) {
            const key = `${task.parent_task_id ?? 'root'}|${task.status}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(task);
        }
        for (const group of groups.values()) {
            group.sort((a, b) => {
                const pa = a.position ?? 0;
                const pb = b.position ?? 0;
                if (pa !== pb) {
                    return pa - pb;
                }
                return String(a.id).localeCompare(String(b.id));
            });
            group.forEach((row, i) => {
                map.set(row.id, { index: i, count: group.length });
            });
        }
        return map;
    }, [filteredTasks]);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash?.success, flash?.error]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
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

    const handleAssigneeChange = (value: string) => {
        setFilter('assignee_id', value);
        applyFilters({
            assignee_id: value || undefined,
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
            header: t('col_title'),
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <Link
                    href={route('tasks.show', row.original.id)}
                    className={`block max-w-[240px] truncate hover:underline ${isOverdue(row.original) ? 'font-medium text-destructive' : ''}`}
                >
                    {row.original.title}
                </Link>
            ),
        },
        {
            accessorKey: 'status',
            header: t('col_status'),
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => <TaskStatusBadge status={row.original.status} />,
        },
        {
            accessorKey: 'priority',
            header: t('col_priority'),
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => <TaskPriorityBadge priority={row.original.priority} />,
        },
        {
            accessorKey: 'project',
            header: t('col_project'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => row.original.project?.name ?? '—',
        },
        {
            id: 'assignees',
            header: t('col_assignee'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => {
                const assignees = row.original.assignees ?? [];
                if (assignees.length === 0) {
                    return '—';
                }
                return (
                    <div className="flex -space-x-2 rtl:space-x-reverse">
                        {assignees.slice(0, 3).map((a) => (
                            <div
                                key={a.id}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-background bg-muted text-xs font-medium"
                                title={a.name}
                            >
                                {a.name.charAt(0).toUpperCase()}
                            </div>
                        ))}
                        {assignees.length > 3 && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-background bg-muted text-xs">
                                +{assignees.length - 3}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'subtasks',
            header: t('col_subtasks'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => row.original.subtasks?.length ?? 0,
        },
        {
            accessorKey: 'due_at',
            header: t('col_due_date'),
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => {
                const task = row.original;
                if (!task.due_at) {
                    return '—';
                }
                const overdue = isOverdue(task);
                return (
                    <span className={overdue ? 'font-medium text-destructive' : ''}>
                        {new Date(task.due_at).toLocaleDateString()}
                    </span>
                );
            },
        },
        {
            accessorKey: 'progress_percent',
            header: t('col_progress'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => (
                <div className="w-20 rounded-full bg-muted h-1.5">
                    <div
                        className="h-1.5 rounded-full bg-primary"
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
            cell: ({ row }) => {
                const ctx = taskSiblingContext.get(row.original.id) ?? {
                    index: 0,
                    count: 1,
                };
                return (
                    <TaskRowActions
                        task={row.original}
                        can={can}
                        siblingIndex={ctx.index}
                        siblingCount={ctx.count}
                    />
                );
            },
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
            <Head title={t('title_index')} />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">{t('title_index')}</h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex rounded-md border border-border">
                            <Button
                                variant={view === 'list' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setView('list')}
                                aria-label={t('view_list')}
                                title={t('view_list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={view === 'kanban' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setView('kanban')}
                                aria-label={t('view_kanban')}
                                title={t('view_kanban')}
                            >
                                <Kanban className="h-4 w-4" />
                            </Button>
                        </div>
                        {can.create && (
                            <Button asChild>
                                <Link href={route('tasks.create')} className="inline-flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    {t('action_create')}
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {dueScope !== 'all' && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                        {t('filter_due_scope_note')}
                    </p>
                )}

                {view === 'list' && (
                    <DataTable<Task>
                        tableKey="tasks"
                        columns={columns}
                        data={filteredTasks}
                        pagination={pagination}
                        searchValue={localFilters.q as string}
                        onSearchChange={(v) => setFilter('q', v as never)}
                        extraFilters={
                            <TaskFiltersBar
                                statusValue={localFilters.status as string}
                                onStatusChange={handleStatusChange}
                                priorityValue={localFilters.priority as string}
                                onPriorityChange={handlePriorityChange}
                                projectValue={localFilters.project_id as string}
                                onProjectChange={handleProjectChange}
                                assigneeValue={localFilters.assignee_id as string}
                                onAssigneeChange={handleAssigneeChange}
                                dueScope={dueScope}
                                onDueScopeChange={setDueScope}
                                projects={projects}
                                users={users}
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
                                label: t('bulk_delete'),
                                action: 'bulk_delete',
                                variant: 'destructive',
                            },
                        ]}
                        exportRouteName="tasks.export"
                        emptyMessage={t('empty_body')}
                        currentFilters={localFilters as Record<string, unknown>}
                    />
                )}

                {view === 'kanban' && (
                    <KanbanBoard tasks={filteredTasks} canReorder={can.update} />
                )}
            </div>
        </AppLayout>
    );
}
