import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
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
}

interface IndexProps {
    rfqs: RfqsPayload;
    metrics: { total: number; draft: number; active: number; closed: number };
    projects: Array<{ id: string; name: string; name_en: string | null }>;
    filters: { project_id?: string; status?: string; search?: string };
    can: { create: boolean; issue: boolean; award: boolean };
}

const statusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    issued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    supplier_submissions: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    responses_received: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    evaluation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    awarded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

function statusLabel(s: string): string {
    const map: Record<string, string> = {
        draft: 'Draft',
        issued: 'Sent',
        sent: 'Sent',
        supplier_submissions: 'Responses Received',
        responses_received: 'Responses Received',
        evaluation: 'Evaluation',
        awarded: 'Awarded',
        closed: 'Closed',
    };
    return map[s] ?? s.replace(/_/g, ' ');
}

export default function Index({ rfqs, metrics, projects, filters, can }: IndexProps) {
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
            <Head title="RFQs" />
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">RFQs</h1>
                    {can.create && (
                        <Button asChild>
                            <Link href={route('rfqs.create')}>
                                <Plus className="h-4 w-4" />
                                New RFQ
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total RFQs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold tabular-nums">{metrics.total}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold tabular-nums">{metrics.draft}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold tabular-nums">{metrics.active}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Closed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold tabular-nums">{metrics.closed}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>RFQ list</CardTitle>
                        <CardDescription>Request for Quotation records with filters</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <input
                                type="search"
                                placeholder="Search RFQ number or title..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="h-9 w-[280px] rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                aria-label="Search RFQs"
                            />
                            <Select value={filters.project_id ?? 'all'} onValueChange={handleProjectChange}>
                                <SelectTrigger className="h-9 w-[180px]" aria-label="Filter by project">
                                    <SelectValue placeholder="All projects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All projects</SelectItem>
                                    {projects.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name_en ?? p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filters.status ?? 'all'} onValueChange={handleStatusChange}>
                                <SelectTrigger className="h-9 w-[160px]" aria-label="Filter by status">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="issued">Sent</SelectItem>
                                    <SelectItem value="supplier_submissions">Responses Received</SelectItem>
                                    <SelectItem value="evaluation">Evaluation</SelectItem>
                                    <SelectItem value="awarded">Awarded</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="overflow-x-auto border rounded-md">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted/80 z-10">
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 text-left font-medium">RFQ Number</th>
                                        <th className="px-4 py-3 text-left font-medium">Project</th>
                                        <th className="px-4 py-3 text-left font-medium">Procurement Package</th>
                                        <th className="px-4 py-3 text-center font-medium">Suppliers Invited</th>
                                        <th className="px-4 py-3 text-center font-medium">Quotes Received</th>
                                        <th className="px-4 py-3 text-left font-medium">Created Date</th>
                                        <th className="px-4 py-3 text-left font-medium">Status</th>
                                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rfqs.data.map((row) => (
                                        <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono">
                                                <Link href={route('rfqs.show', row.id)} className="font-medium hover:underline">
                                                    {row.rfq_number}
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
                                            <td className="px-4 py-3 text-center tabular-nums">{row.suppliers_count}</td>
                                            <td className="px-4 py-3 text-center tabular-nums">{row.quotes_count}</td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={statusBadgeClass[row.status] ?? ''}>
                                                    {statusLabel(row.status)}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <Link href={route('rfqs.show', row.id)} aria-label="View">
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    {row.status === 'draft' && (
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <Link href={route('rfqs.show', row.id)} aria-label="Edit">
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
                                                            aria-label="Send RFQ"
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
                                    No RFQs found.
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between gap-4 mt-3">
                            <p className="text-sm text-muted-foreground">
                                Showing {rfqs.data.length} items
                            </p>
                            <div className="flex gap-2">
                                {rfqs.prev_cursor && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyFilters({ cursor: rfqs.prev_cursor! })}
                                    >
                                        Previous
                                    </Button>
                                )}
                                {rfqs.next_cursor && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyFilters({ cursor: rfqs.next_cursor! })}
                                    >
                                        Next
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
