import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Head, Link, router } from '@inertiajs/react';

interface ProjectInfo {
    id: string;
    name: string;
    name_en?: string | null;
    name_ar?: string | null;
    code?: string | null;
}

interface BoqVersionInfo {
    id: string;
    version_no: number;
    label: string | null;
    status: string;
    item_count: number;
    total_revenue: string;
    total_planned_cost: string;
}

interface BoqItemRow {
    id: string;
    code: string;
    description_en: string | null;
    unit: string | null;
    qty: string | null;
    unit_price: string | null;
    revenue_amount: string;
    planned_cost: string;
}

interface PaginatedItems {
    data: BoqItemRow[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface BoqShowProps {
    project: ProjectInfo;
    boqVersion: BoqVersionInfo | null;
    items: PaginatedItems;
}

export default function BoqShow({ project, boqVersion, items }: BoqShowProps) {
    const projectName = project.name_en ?? project.name ?? 'Project';

    return (
        <AppLayout>
            <Head title={`BOQ - ${projectName}`} />
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link href={route('projects.index')} className="hover:text-foreground">
                            Projects
                        </Link>
                        <span>/</span>
                        <Link
                            href={route('projects.show', project.id)}
                            className="hover:text-foreground"
                        >
                            {projectName}
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">BOQ</span>
                    </nav>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-semibold tracking-tight">Bill of Quantities</h1>
                        <Button variant="outline" asChild>
                            <Link href={route('projects.boq-import.show', project.id)}>
                                Import BOQ
                            </Link>
                        </Button>
                    </div>
                </div>

                {boqVersion ? (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Active version</CardTitle>
                                <CardDescription>
                                    Version {boqVersion.version_no} — {boqVersion.label ?? '—'} · {boqVersion.item_count} items
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                Total revenue: {parseFloat(boqVersion.total_revenue ?? '0').toLocaleString()} · 
                                Total planned cost: {parseFloat(boqVersion.total_planned_cost ?? '0').toLocaleString()}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Items</CardTitle>
                                <CardDescription>50 per page</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Description (EN)</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Unit</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium">Qty</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium">Unit price</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium">Revenue</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium">Planned cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.data.map((row) => (
                                            <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                                                <td className="px-4 py-3 font-mono text-sm">{row.code}</td>
                                                <td className="px-4 py-3">{row.description_en ?? '—'}</td>
                                                <td className="px-4 py-3">{row.unit ?? '—'}</td>
                                                <td className="px-4 py-3 text-right">{row.qty ?? '—'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {row.unit_price != null ? parseFloat(row.unit_price).toLocaleString() : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {parseFloat(row.revenue_amount ?? '0').toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {parseFloat(row.planned_cost ?? '0').toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {items.data.length === 0 && (
                                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                        No BOQ items in this version.
                                    </div>
                                )}
                                {items.links && items.links.length > 0 && (
                                    <div className="flex flex-wrap items-center justify-between gap-4 border-t px-4 py-3">
                                        <span className="text-sm text-muted-foreground">
                                            Showing {items.from ?? 0}–{items.to ?? 0} of {items.total ?? 0}
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {items.links.map((link, i) => (
                                                <Button
                                                    key={i}
                                                    size="sm"
                                                    variant={link.active ? 'default' : 'outline'}
                                                    disabled={!link.url}
                                                    onClick={() => link.url && router.visit(link.url, { preserveScroll: true })}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            <p>No active BOQ version. Import a BOQ and activate a version to view items.</p>
                            <Button asChild className="mt-4">
                                <Link href={route('projects.boq-import.show', project.id)}>Import BOQ</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
