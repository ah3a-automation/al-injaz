import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Head, Link, router } from '@inertiajs/react';
import { Eye, Plus, Send, Pencil } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { StatusBadge } from '@/Components/StatusBadge';

interface RfqRow {
    id: string;
    rfq_number: string;
    title: string;
    status: string;
    submission_deadline: string | null;
    created_at: string;
    project?: { id: string; name: string; name_en: string | null } | null;
    procurement_package?: { id: string; package_no: string | null; name: string } | null;
    created_by?: { id: number; name: string } | null;
    award?: { id: string } | null;
    suppliers_count: number;
    quotes_count: number;
}

interface RfqsPayload {
    data: RfqRow[];
    path: string;
    per_page: number;
    next_cursor: string | null;
    prev_cursor: string | null;
    total?: number;
}

interface IndexProps {
    rfqs: RfqsPayload;
    metrics: { total: number; draft: number; active: number; closed: number };
    projects: Array<{ id: string; name: string; name_en: string | null }>;
    filters: { project_id?: string; status?: string; search?: string };
    can: { create: boolean; issue: boolean; award: boolean };
}

export default function Index({ rfqs, metrics, projects, filters, can }: IndexProps) {
    const [searchInput, setSearchInput] = useState(filters.search ?? '');
    const { t } = useLocale();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setSearchInput(filters.search ?? '');
    }, [filters.search]);

    const applyFilters = useCallback(
        (overrides: Record<string, string | number | undefined>) => {
            const params: Record<string, string | number> = {
                project_id: filters.project_id ?? '',
                status: filters.status ?? '',
                search: filters.search ?? '',
                per_page: rfqs.per_page,
            };
            Object.assign(params, overrides);
            const normalized = Object.fromEntries(
                Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
            ) as Record<string, string | number>;
            router.get(route('rfqs.index'), normalized, { preserveState: true, replace: true });
        },
        [filters, rfqs.per_page]
    );

    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            applyFilters({ search: searchInput });
            debounceRef.current = null;
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchInput, applyFilters]);

    const handleProjectChange = (v: string) => applyFilters({ project_id: v === 'all' ? undefined : v });
    const handleStatusChange = (v: string) => applyFilters({ status: v === 'all' ? undefined : v });

    return (
        <AppLayout>
            <Head title={t('title_index', 'rfqs')} />
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('title_index', 'rfqs')}
                    </h1>
                    {can.create && (
                        <Button asChild>
                            <Link href={route('rfqs.create')}>
                                <Plus className="h-4 w-4" />
                                {t('action_create', 'rfqs')}
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('title_index', 'rfqs')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold tabular-nums">
                                <span dir="ltr" className="font-mono tabular-nums">
                                    {metrics.total}
                                </span>
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('status_draft', 'rfqs')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold tabular-nums">
                                <span dir="ltr" className="font-mono tabular-nums">
                                    {metrics.draft}
                                </span>
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('status_sent', 'rfqs')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold tabular-nums">
                                <span dir="ltr" className="font-mono tabular-nums">
                                    {metrics.active}
                                </span>
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('status_closed', 'rfqs')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold tabular-nums">
                                <span dir="ltr" className="font-mono tabular-nums">
                                    {metrics.closed}
                                </span>
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('title_index', 'rfqs')}</CardTitle>
                        <CardDescription>
                            {t('section_activity', 'rfqs')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <input
                                type="search"
                                placeholder={t('search_placeholder', 'rfqs')}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="h-9 w-[280px] rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                aria-label={t('search_placeholder', 'rfqs')}
                            />
                            <Select value={filters.project_id ?? 'all'} onValueChange={handleProjectChange}>
                                <SelectTrigger
                                    className="h-9 w-[180px]"
                                    aria-label={t('filter_project', 'rfqs')}
                                >
                                    <SelectValue placeholder={t('all_projects', 'rfqs')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t('all_projects', 'rfqs')}
                                    </SelectItem>
                                    {projects.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name_en ?? p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filters.status ?? 'all'} onValueChange={handleStatusChange}>
                                <SelectTrigger
                                    className="h-9 w-[160px]"
                                    aria-label={t('filter_status', 'rfqs')}
                                >
                                    <SelectValue placeholder={t('all_statuses', 'rfqs')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t('all_statuses', 'rfqs')}
                                    </SelectItem>
                                    <SelectItem value="draft">
                                        {t('status_draft', 'rfqs')}
                                    </SelectItem>
                                    <SelectItem value="issued">
                                        {t('status_sent', 'rfqs')}
                                    </SelectItem>
                                    <SelectItem value="responses_received">
                                        {t('status_quotes_received', 'rfqs')}
                                    </SelectItem>
                                    <SelectItem value="under_evaluation">
                                        {t('status_under_evaluation', 'rfqs')}
                                    </SelectItem>
                                    <SelectItem value="awarded">
                                        {t('status_awarded', 'rfqs')}
                                    </SelectItem>
                                    <SelectItem value="closed">
                                        {t('status_closed', 'rfqs')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="overflow-x-auto border rounded-md">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted/80 z-10">
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 text-start font-medium">
                                            {t('col_reference', 'rfqs')}
                                        </th>
                                        <th className="px-4 py-3 text-start font-medium">
                                            {t('col_project', 'rfqs')}
                                        </th>
                                        <th className="px-4 py-3 text-start font-medium">
                                            {t('col_category', 'rfqs')}
                                        </th>
                                        <th className="px-4 py-3 text-center font-medium">
                                            {t('col_suppliers', 'rfqs')}
                                        </th>
                                        <th className="px-4 py-3 text-center font-medium">
                                            {t('col_quotes', 'rfqs')}
                                        </th>
                                        <th className="px-4 py-3 text-start font-medium">
                                            {t('col_created', 'rfqs')}
                                        </th>
                                        <th className="px-4 py-3 text-start font-medium">
                                            {t('col_status', 'rfqs')}
                                        </th>
                                        <th className="px-4 py-3 text-end font-medium">
                                            {t('col_actions', 'rfqs')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rfqs.data.map((row) => (
                                        <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono">
                                                <Link
                                                    href={route('rfqs.show', row.id)}
                                                    className="font-medium hover:underline"
                                                >
                                                    <span
                                                        dir="ltr"
                                                        className="font-mono tabular-nums"
                                                    >
                                                        {row.rfq_number}
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.project?.name_en ?? row.project?.name ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.procurement_package ? (
                                                    row.procurement_package.package_no ?? row.procurement_package.name
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center tabular-nums">
                                                <span
                                                    dir="ltr"
                                                    className="font-mono tabular-nums"
                                                >
                                                    {row.suppliers_count}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center tabular-nums">
                                                <span
                                                    dir="ltr"
                                                    className="font-mono tabular-nums"
                                                >
                                                    {row.quotes_count}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {row.created_at
                                                    ? new Date(
                                                          row.created_at
                                                      ).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={row.status} entity="rfq" />
                                            </td>
                                            <td className="px-4 py-3 text-end">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <Link
                                                            href={route('rfqs.show', row.id)}
                                                            aria-label={t('action_view', 'rfqs')}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    {row.status === 'draft' && (
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <Link
                                                                href={route('rfqs.show', row.id)}
                                                                aria-label={t('action_edit', 'rfqs')}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    {can.issue && row.status === 'draft' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                router.post(route('rfqs.issue', row.id), {}, { preserveScroll: true })
                                                            }
                                                            aria-label={t('action_send', 'rfqs')}
                                                        >
                                                            <Send className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {rfqs.data.length === 0 && (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    {t('empty_title', 'rfqs')}
                                </div>
                            )}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground">
                                {t('showing', 'rfqs', {
                                    from: rfqs.data.length > 0 ? 1 : 0,
                                    to: rfqs.data.length,
                                    total: rfqs.total ?? rfqs.data.length,
                                })}
                            </p>
                            <div className="flex gap-2">
                                {rfqs.prev_cursor && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyFilters({ cursor: rfqs.prev_cursor! })}
                                    >
                                        {t('previous', 'admin')}
                                    </Button>
                                )}
                                {rfqs.next_cursor && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyFilters({ cursor: rfqs.next_cursor! })}
                                    >
                                        {t('next', 'admin')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
