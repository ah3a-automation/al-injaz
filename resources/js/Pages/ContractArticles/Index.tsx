import AppLayout from '@/Layouts/AppLayout';
import { DataTable } from '@/Components/DataTable';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { useFilters } from '@/hooks';
import { useLocale } from '@/hooks/useLocale';
import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';

interface ContractArticleVersion {
    id: string;
    version_number: number;
    title_ar: string;
    title_en: string;
    risk_tags?: string[] | null;
}

interface ContractArticle {
    id: string;
    code: string;
    serial: number;
    category: string;
    status: string;
    approval_status?: string;
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
        approval_status?: string;
        risk_tags?: string;
        per_page?: number;
    };
    categories: string[];
    statuses: string[];
    approvalStatuses: string[];
    allowedRiskTags: string[];
    can: {
        create: boolean;
        manage: boolean;
    };
}

function riskTagLabelKey(tag: string): `risk_tag_${string}` {
    return `risk_tag_${tag}` as `risk_tag_${string}`;
}

function riskTagBadgeClass(tag: string): string {
    const palette: Record<string, string> = {
        payment: 'bg-amber-100 text-amber-900',
        delay_damages: 'bg-orange-100 text-orange-900',
        retention: 'bg-yellow-100 text-yellow-900',
        warranty: 'bg-sky-100 text-sky-900',
        termination: 'bg-red-100 text-red-900',
        indemnity: 'bg-purple-100 text-purple-900',
        insurance: 'bg-cyan-100 text-cyan-900',
        variation: 'bg-indigo-100 text-indigo-900',
        dispute_resolution: 'bg-violet-100 text-violet-900',
        liability: 'bg-rose-100 text-rose-900',
        confidentiality: 'bg-slate-200 text-slate-900',
        force_majeure: 'bg-emerald-100 text-emerald-900',
    };
    return palette[tag] ?? 'bg-muted text-foreground';
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
    approvalStatuses,
    allowedRiskTags,
    riskTagsCsv,
    onRiskTagsChange,
    categoryValue,
    onCategoryChange,
    statusValue,
    onStatusChange,
    approvalValue,
    onApprovalChange,
    t,
}: {
    categories: string[];
    statuses: string[];
    approvalStatuses: string[];
    allowedRiskTags: string[];
    riskTagsCsv: string;
    onRiskTagsChange: (nextCsv: string) => void;
    categoryValue: string;
    onCategoryChange: (value: string) => void;
    statusValue: string;
    onStatusChange: (value: string) => void;
    approvalValue: string;
    onApprovalChange: (value: string) => void;
    t: (key: string, ns: 'contract_articles') => string;
}) {
    const selected = riskTagsCsv
        ? riskTagsCsv.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    const toggleRiskTag = (tag: string) => {
        const set = new Set(selected);
        if (set.has(tag)) {
            set.delete(tag);
        } else {
            set.add(tag);
        }
        onRiskTagsChange(Array.from(set).join(','));
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <select
                value={categoryValue || 'all'}
                onChange={(event) => onCategoryChange(event.target.value)}
                className="flex h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filter by category"
            >
                <option value="all">{t('all_categories', 'contract_articles')}</option>
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
                <option value="all">{t('all_statuses', 'contract_articles')}</option>
                {statuses.map((status) => (
                    <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                ))}
            </select>
            <select
                value={approvalValue || 'all'}
                onChange={(event) => onApprovalChange(event.target.value)}
                className="flex h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={t('filter_approval', 'contract_articles')}
            >
                <option value="all">{t('all_approval', 'contract_articles')}</option>
                {approvalStatuses.map((s) => (
                    <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                    </option>
                ))}
            </select>
            <div
                className="flex max-w-xl flex-wrap items-center gap-1.5"
                role="group"
                aria-label={t('filter_risk_tags', 'contract_articles')}
            >
                {allowedRiskTags.map((tag) => {
                    const active = selected.includes(tag);
                    return (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => toggleRiskTag(tag)}
                            className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ltr:text-left rtl:text-right ${
                                active
                                    ? 'border-primary bg-primary/10 text-foreground'
                                    : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
                            }`}
                        >
                            {t(riskTagLabelKey(tag), 'contract_articles')}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function ContractArticlesIndex({
    articles,
    filters,
    categories,
    statuses,
    approvalStatuses,
    allowedRiskTags,
    can,
}: IndexProps) {
    const { t } = useLocale();

    const { filters: localFilters, setFilter, applyFilters } = useFilters(
        'contract-articles.index',
        {
            q: filters.q ?? '',
            category: filters.category ?? '',
            status: filters.status ?? '',
            approval_status: filters.approval_status ?? '',
            risk_tags: filters.risk_tags ?? '',
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

    const handleApprovalChange = (value: string) => {
        const normalized = value === 'all' ? '' : value;
        setFilter('approval_status', normalized);
        applyFilters({
            approval_status: normalized || undefined,
            page: 1,
        } as never);
    };

    const handleRiskTagsChange = (nextCsv: string) => {
        setFilter('risk_tags', nextCsv);
        applyFilters({
            risk_tags: nextCsv || undefined,
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
                        {version.risk_tags && version.risk_tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                                {version.risk_tags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="secondary"
                                        className={`px-1.5 py-0 text-[10px] font-normal ${riskTagBadgeClass(tag)}`}
                                    >
                                        {t(riskTagLabelKey(tag), 'contract_articles')}
                                    </Badge>
                                ))}
                            </div>
                        )}
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
            id: 'approval_status',
            header: () => t('approval_status', 'contract_articles'),
            enableSorting: false,
            enableHiding: true,
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground">
                    {row.original.approval_status ?? 'none'}
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
                            approvalStatuses={approvalStatuses}
                            allowedRiskTags={allowedRiskTags}
                            riskTagsCsv={localFilters.risk_tags as string}
                            onRiskTagsChange={handleRiskTagsChange}
                            categoryValue={localFilters.category as string}
                            onCategoryChange={handleCategoryChange}
                            statusValue={localFilters.status as string}
                            onStatusChange={handleStatusChange}
                            approvalValue={localFilters.approval_status as string}
                            onApprovalChange={handleApprovalChange}
                            t={t}
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

