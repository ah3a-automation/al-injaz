import AppLayout from '@/Layouts/AppLayout';
import { DataTable } from '@/Components/DataTable';
import { Button } from '@/Components/ui/button';
import { useFilters } from '@/hooks';
import { useLocale } from '@/hooks/useLocale';
import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

interface ContractArticleVersion {
    id: string;
    version_number: number;
    title_ar: string;
    title_en: string;
}

interface ContractArticle {
    id: string;
    code: string;
    serial: number;
    category: string;
    status: string;
    current_version_id: string | null;
    current_version?: ContractArticleVersion | null;
    updated_at: string;
}

interface PaginatedArticles {
    data: ContractArticle[];
    total: number;
    current_page: number;
    per_page: number;
    last_page: number;
}

interface IndexProps {
    articles: PaginatedArticles;
    filters: {
        q?: string;
        category?: string;
        status?: string;
        per_page?: number;
    };
    categories: string[];
    statuses: string[];
    can: {
        create: boolean;
        manage: boolean;
    };
}

function badgeClassFromCategory(category: string): string {
    switch (category) {
        case 'mandatory':
            return 'bg-red-100 text-red-700';
        case 'recommended':
            return 'bg-blue-100 text-blue-700';
        case 'optional':
            return 'bg-gray-100 text-gray-700';
        default:
            return 'bg-muted text-foreground';
    }
}

function badgeClassFromStatus(status: string): string {
    switch (status) {
        case 'draft':
            return 'bg-gray-100 text-gray-700';
        case 'active':
            return 'bg-green-100 text-green-700';
        case 'archived':
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-muted text-foreground';
    }
}

function ContractArticleFilters({
    categories,
    statuses,
    categoryValue,
    onCategoryChange,
    statusValue,
    onStatusChange,
}: {
    categories: string[];
    statuses: string[];
    categoryValue: string;
    onCategoryChange: (value: string) => void;
    statusValue: string;
    onStatusChange: (value: string) => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <select
                value={categoryValue || 'all'}
                onChange={(event) => onCategoryChange(event.target.value)}
                className="flex h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filter by category"
            >
                <option value="all">All categories</option>
                {categories.map((category) => (
                    <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                ))}
            </select>
            <select
                value={statusValue || 'all'}
                onChange={(event) => onStatusChange(event.target.value)}
                className="flex h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filter by status"
            >
                <option value="all">All statuses</option>
                {statuses.map((status) => (
                    <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function ContractArticlesIndex({
    articles,
    filters,
    categories,
    statuses,
    can,
}: IndexProps) {
    const { t } = useLocale();

    const { filters: localFilters, setFilter, applyFilters } = useFilters(
        'contract-articles.index',
        {
            q: filters.q ?? '',
            category: filters.category ?? '',
            status: filters.status ?? '',
            per_page: filters.per_page ?? 25,
            page: 1,
        },
        { debounceMs: 300 }
    );

    const handleCategoryChange = (value: string) => {
        const normalized = value === 'all' ? '' : value;
        setFilter('category', normalized);
        applyFilters({
            category: normalized || undefined,
            page: 1,
        } as never);
    };

    const handleStatusChange = (value: string) => {
        const normalized = value === 'all' ? '' : value;
        setFilter('status', normalized);
        applyFilters({
            status: normalized || undefined,
            page: 1,
        } as never);
    };

    const handleArchiveToggle = (article: ContractArticle) => {
        if (article.status === 'active') {
            router.post(route('contract-articles.archive', article.id));
        } else if (article.status === 'archived') {
            router.post(route('contract-articles.activate', article.id));
        }
    };

    const columns: ColumnDef<ContractArticle>[] = [
        {
            accessorKey: 'code',
            header: () => t('article_code', 'contract_articles'),
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <Link
                    href={route('contract-articles.show', row.original.id)}
                    className="font-mono text-sm hover:underline"
                >
                    {row.original.code}
                </Link>
            ),
        },
        {
            accessorKey: 'serial',
            header: () => t('serial', 'contract_articles'),
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => row.original.serial,
        },
        {
            id: 'title',
            header: () => t('col_title_bilingual', 'contract_articles'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => {
                const version = row.original.current_version;
                if (!version) return '—';

                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{version.title_en}</span>
                        <span className="text-xs text-muted-foreground" dir="rtl">
                            {version.title_ar}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'category',
            header: () => t('category', 'contract_articles'),
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badgeClassFromCategory(
                        row.original.category
                    )}`}
                >
                    {row.original.category}
                </span>
            ),
        },
        {
            accessorKey: 'status',
            header: () => t('status', 'contract_articles'),
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) => (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badgeClassFromStatus(
                        row.original.status
                    )}`}
                >
                    {row.original.status}
                </span>
            ),
        },
        {
            id: 'version',
            header: () => t('version_number', 'contract_articles'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) =>
                row.original.current_version
                    ? `v${row.original.current_version.version_number}`
                    : '—',
        },
        {
            accessorKey: 'updated_at',
            header: () => t('col_updated_at', 'contract_articles'),
            enableSorting: true,
            enableHiding: true,
            cell: ({ row }) =>
                row.original.updated_at
                    ? new Date(row.original.updated_at).toLocaleString()
                    : '—',
        },
        {
            id: 'actions',
            header: '',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={route('contract-articles.show', row.original.id)}>
                            {t('action_view', 'contract_articles')}
                        </Link>
                    </Button>
                    {can.manage && (
                        <>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={route('contract-articles.edit', row.original.id)}>
                                    {t('action_edit', 'contract_articles')}
                                </Link>
                            </Button>
                            {row.original.status === 'active' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleArchiveToggle(row.original)}
                                >
                                    {t('action_archive', 'contract_articles')}
                                </Button>
                            )}
                            {row.original.status === 'archived' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleArchiveToggle(row.original)}
                                >
                                    {t('action_reactivate', 'contract_articles')}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            ),
        },
    ];

    const pagination = {
        total: articles.total,
        current_page: articles.current_page,
        per_page: articles.per_page,
        last_page: articles.last_page,
    };

    return (
        <AppLayout>
            <Head title={t('title_index', 'contract_articles')} />
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('title_index', 'contract_articles')}
                    </h1>
                    {can.create && (
                        <Button asChild>
                            <Link href={route('contract-articles.create')}>
                                {t('action_create', 'contract_articles')}
                            </Link>
                        </Button>
                    )}
                </div>

                <DataTable<ContractArticle>
                    tableKey="contract-articles"
                    columns={columns}
                    data={articles.data}
                    pagination={pagination}
                    searchValue={localFilters.q as string}
                    onSearchChange={(value) => setFilter('q', value as never)}
                    extraFilters={
                        <ContractArticleFilters
                            categories={categories}
                            statuses={statuses}
                            categoryValue={localFilters.category as string}
                            onCategoryChange={handleCategoryChange}
                            statusValue={localFilters.status as string}
                            onStatusChange={handleStatusChange}
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
                    onBulkAction={undefined}
                    bulkActions={[]}
                    exportRouteName={undefined}
                    emptyMessage={t('empty_title', 'contract_articles')}
                    currentFilters={localFilters as Record<string, unknown>}
                />
            </div>
        </AppLayout>
    );
}

