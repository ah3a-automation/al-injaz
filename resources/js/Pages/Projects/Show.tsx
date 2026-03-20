import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { ActivityTimeline, type TimelineEvent } from '@/Components/ActivityTimeline';
import { Clock } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { ProjectNavTabs } from '@/Components/ProjectNavTabs';
import type { Project, ProjectStatus } from '@/types/projects';
import { confirmDelete } from '@/Services/confirm';
import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';

interface ShowProps {
    project: Project;
    can: { update: boolean; delete: boolean };
    timeline: TimelineEvent[];
}

const statusBadgeClass: Record<ProjectStatus, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

function formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
}

function formatContractValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num)) return '—';
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function Show({ project, can, timeline }: ShowProps) {
    const { t } = useLocale();
    const handleDelete = () => {
        confirmDelete(`Delete project "${project.name}"?`).then((confirmed) => {
            if (confirmed) router.delete(route('projects.destroy', project.id));
        });
    };

    const projectForNav = { id: typeof project.id === 'string' ? project.id : (project as { id: string }).id, name: project.name, name_en: (project as { name_en?: string | null }).name_en };

    return (
        <AppLayout>
            <Head title={project.name} />
            <div className="space-y-6">
                <ProjectNavTabs project={projectForNav} activeTab="overview" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
                    <div className="flex gap-2">
                        {can.update && (
                            <Button asChild>
                                <Link href={route('projects.edit', project.id)}>
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                </Link>
                            </Button>
                        )}
                        {can.delete && (
                            <Button variant="destructive" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                        )}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                        <CardDescription>Project information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Code</p>
                                <p className="mt-1">{project.code ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Name EN</p>
                                <p className="mt-1">{project.name_en ?? project.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Name AR</p>
                                <p className="mt-1">{project.name_ar ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Client</p>
                                <p className="mt-1">{project.client ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Contract Value</p>
                                <p className="mt-1">{formatContractValue(project.contract_value)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Currency</p>
                                <p className="mt-1">{project.currency ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <span
                                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[project.status] ?? statusBadgeClass.active}`}
                                >
                                    {project.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Start date</p>
                                <p className="mt-1">{formatDate(project.start_date)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">End date</p>
                                <p className="mt-1">{formatDate(project.end_date)}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Description</p>
                            <p className="mt-1 whitespace-pre-wrap">{project.description || '—'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Owner</p>
                            <p className="mt-1">{project.owner?.name ?? '—'}</p>
                        </div>
                    </CardContent>
                </Card>

                {can.update && (
                    <Card>
                        <CardHeader>
                            <CardTitle>BOQ &amp; Procurement</CardTitle>
                            <CardDescription>Bill of quantities and procurement packages</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            <Button variant="outline" asChild>
                                <Link href={route('projects.boq.show', project.id)}>View BOQ</Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={route('projects.procurement-packages.index', project.id)}>Procurement packages</Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={route('projects.boq-import.show', project.id)}>Import BOQ</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Tasks</CardTitle>
                        <CardDescription>Project tasks</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Coming soon</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Members</CardTitle>
                        <CardDescription>Project members</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Coming soon</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('activity_timeline', 'activity')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ActivityTimeline events={timeline} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
