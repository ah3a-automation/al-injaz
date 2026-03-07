import AppLayout from '@/Layouts/AppLayout';
import { ProjectNavTabs } from '@/Components/ProjectNavTabs';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Head, Link, router } from '@inertiajs/react';
import { Eye, Plus, Send, Pencil } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ProjectInfo {
    id: string;
    name: string;
    name_en?: string | null;
    name_ar?: string | null;
    code?: string | null;
}

interface RfqRow {
    id: string;
    rfq_number: string;
    title: string;
    status: string;
    submission_deadline: string | null;
    created_at: string;
    project?: { id: string; name: string; name_en: string | null } | null;
    procurement_package?: { id: string; package_no: string | null; name: string } | null;
    suppliers_count: number;
    quotes_count: number;
}

interface CursorPaginator {
    data: RfqRow[];
    path: string;
    per_page: number;
    next_cursor: string | null;
    prev_cursor: string | null;
}

interface IndexProps {
    project: ProjectInfo;
    rfqs: CursorPaginator;
    filters: { search?: string; status?: string };
    can: { create: boolean; issue: boolean };
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

export default function ProjectRfqsIndex({ project, rfqs, filters, can }: IndexProps) {
    const projectName = project.name_en ?? project.name ?? 'Project';
    const [searchInput, setSearchInput] = useState(filters.search ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setSearchInput(filters.search ?? '');
    }, [filters.search]);

    const applyFilters = useCallback(
        (overrides: Record<string, string | undefined>) => {
            const params: Record<string, string> = {
                search: filters.search ?? '',
                status: filters.status ?? '',
            };
            Object.assign(params, overrides);
            const clean = Object.fromEntries(
                Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
            ) as Record<string, string>;
            router.get(route('projects.rfqs.index', project.id), clean, { preserveState: true, replace: true });
        },
        [project.id, filters]
    );

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            applyFilters({ search: searchInput || undefined });
            debounceRef.current = null;
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchInput, applyFilters]);

    return (
        <AppLayout>
            <Head title={`RFQs - ${projectName}`} />
            <div className="space-y-6">
                <ProjectNavTabs project={project} activeTab="rfqs" />
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('projects.index')} className="hover:text-foreground">
                        Projects
                    </Link>
                    <span>/</span>
                    <Link href={route('projects.show', project.id)} className="hover:text-foreground">
                        {projectName}
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">RFQs</span>
                </nav>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">RFQs</h1>
                    <Button variant="outline" asChild>
                        <Link href={route('projects.procurement-packages.index', project.id)}>
                            Back to packages
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Project RFQs</CardTitle>
                    </CardHeader>
                    <CardContent>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <input
                                    type="search"
                                    placeholder="Search RFQ number or title..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="h-9 w-[280px] rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                    aria-label="Search RFQs"
                                />
                            </div>
                            <div className="overflow-x-auto border rounded-md">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-muted/80 z-10">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left font-medium">RFQ Number</th>
                                            <th className="px-4 py-3 text-left font-medium">Procurement Package</th>
                                            <th className="px-4 py-3 text-center font-medium">Suppliers</th>
                                            <th className="px-4 py-3 text-center font-medium">Quotes</th>
                                            <th className="px-4 py-3 text-left font-medium">Created</th>
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
                                                    {row.procurement_package ? (
                                                        <Link
                                                            href={route('projects.procurement-packages.show', [project.id, row.procurement_package.id])}
                                                            className="hover:underline"
                                                        >
                                                            {row.procurement_package.package_no ?? row.procurement_package.name}
                                                        </Link>
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
                                        No RFQs for this project yet. Create an RFQ from a procurement package.
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between gap-4 mt-3">
                                <p className="text-sm text-muted-foreground">
                                    Showing {rfqs.data.length} items
                                </p>
                                <div className="flex gap-2">
                                    {(rfqs as { prev_cursor?: string | null }).prev_cursor && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyFilters({ cursor: (rfqs as { prev_cursor: string }).prev_cursor })}
                                        >
                                            Previous
                                        </Button>
                                    )}
                                    {(rfqs as { next_cursor?: string | null }).next_cursor && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyFilters({ cursor: (rfqs as { next_cursor: string }).next_cursor })}
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
