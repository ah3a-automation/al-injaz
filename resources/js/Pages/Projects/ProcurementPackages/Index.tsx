import AppLayout from '@/Layouts/AppLayout';
import { ProjectNavTabs } from '@/Components/ProjectNavTabs';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Eye } from 'lucide-react';

interface ProjectInfo {
    id: string;
    name: string;
    name_en?: string | null;
    name_ar?: string | null;
    code?: string | null;
}

interface ProcurementPackageRow {
    id: string;
    package_no: string | null;
    name: string;
    description: string | null;
    currency: string;
    needed_by_date: string | null;
    status: string;
    estimated_revenue: string;
    estimated_cost: string;
    actual_cost: string;
    boq_items_count: number;
    created_at: string;
    created_by_user?: { id: number; name: string } | null;
    estimated_profit?: number;
    estimated_profit_pct?: number | null;
}

interface IndexProps {
    project: ProjectInfo;
    packages: ProcurementPackageRow[];
}

const statusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    rfq_created: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    awarded: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    contracted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

function formatNum(v: string | number | undefined): string {
    if (v === undefined || v === null) return '—';
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isNaN(n) ? '—' : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatPct(v: number | null | undefined): string {
    if (v === undefined || v === null) return '—';
    return `${Number(v).toFixed(1)}%`;
}

export default function ProcurementPackagesIndex({ project, packages }: IndexProps) {
    const projectName = project.name_en ?? project.name ?? 'Project';

    return (
        <AppLayout>
            <Head title={`Procurement packages - ${projectName}`} />
            <div className="space-y-6">
                <ProjectNavTabs project={project} activeTab="procurement-packages" />
                <div className="flex flex-col gap-2">
                    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link href={route('projects.index')} className="hover:text-foreground">
                            Projects
                        </Link>
                        <span>/</span>
                        <Link href={route('projects.show', project.id)} className="hover:text-foreground">
                            {projectName}
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">Procurement packages</span>
                    </nav>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-semibold tracking-tight">Procurement packages</h1>
                        <Button asChild>
                            <Link href={route('projects.procurement-packages.create', project.id)}>
                                <Plus className="h-4 w-4" />
                                New package
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Packages</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3 text-left text-sm font-medium">Package #</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Currency</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Needed by</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Items</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Revenue</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Est. cost</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Est. profit %</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Actual cost</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {packages.map((pkg) => (
                                    <tr key={pkg.id} className="border-b border-border hover:bg-muted/30">
                                        <td className="px-4 py-3 font-mono text-sm">{pkg.package_no ?? '—'}</td>
                                        <td className="px-4 py-3 font-medium">{pkg.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[pkg.status] ?? ''}`}>
                                                {pkg.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{pkg.currency}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {pkg.needed_by_date ? new Date(pkg.needed_by_date).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">{pkg.boq_items_count}</td>
                                        <td className="px-4 py-3 text-right">{formatNum(pkg.estimated_revenue)}</td>
                                        <td className="px-4 py-3 text-right">{formatNum(pkg.estimated_cost)}</td>
                                        <td className="px-4 py-3 text-right">{formatPct(pkg.estimated_profit_pct)}</td>
                                        <td className="px-4 py-3 text-right">{formatNum(pkg.actual_cost)}</td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {pkg.created_at ? new Date(pkg.created_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={route('projects.procurement-packages.show', [project.id, pkg.id])}>
                                                        <Eye className="h-4 w-4" />
                                                        View
                                                    </Link>
                                                </Button>
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={route('projects.procurement-packages.rfqs.create', [project.id, pkg.id])}>
                                                        Create RFQ
                                                    </Link>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {packages.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                No procurement packages yet. Create one from the BOQ items.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
