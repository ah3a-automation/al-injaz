import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import Modal from '@/Components/Modal';
import { Head, router, useForm } from '@inertiajs/react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '@/hooks';
import { toast } from 'sonner';

interface ProjectInfo {
    id: string;
    name: string;
    name_en: string | null;
    name_ar: string | null;
    code: string | null;
}

interface SystemOption {
    id: string;
    name_en: string;
    name_ar: string | null;
    code: string | null;
}

interface PackageRow {
    id: string;
    code: string | null;
    name_en: string;
    name_ar: string | null;
    scope_type: string;
    budget_cost: string;
    planned_cost: string;
    awarded_cost: string;
    forecast_cost: string;
    status: string;
    system_id: string | null;
    boq_items_count: number;
    system?: { id: string; name_en: string; code: string | null } | null;
}

interface PackagesIndexProps {
    project: ProjectInfo;
    packages: PackageRow[];
    systems: SystemOption[];
    can: { create: boolean; edit: boolean; delete: boolean };
}

const statusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    awarded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const scopeBadgeClass: Record<string, string> = {
    general: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    supply: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    works: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    services: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function Index({ project, packages, systems, can }: PackagesIndexProps) {
    const { confirmDelete } = useConfirm();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingPackage, setEditingPackage] = useState<PackageRow | null>(null);

    const createForm = useForm({
        system_id: '' as string,
        code: '',
        name_en: '',
        name_ar: '',
        scope_type: 'general',
        budget_cost: 0 as number,
        planned_cost: 0 as number,
    });

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.transform((data) => ({
            ...data,
            system_id: data.system_id && data.system_id !== 'none' ? data.system_id : null,
        }));
        createForm.post(route('projects.packages.store', project.id), {
            onSuccess: () => {
                createForm.reset();
                setShowCreateModal(false);
                toast.success('Package created successfully.');
            },
        });
    };

    const handleDelete = (pkg: PackageRow) => {
        confirmDelete(`Delete package "${pkg.name_en}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('projects.packages.destroy', { project: project.id, package: pkg.id }), {
                    onSuccess: () => toast.success('Package deleted successfully.'),
                });
            }
        });
    };

    const projectName = project.name_en ?? project.name ?? 'Project';

    return (
        <AppLayout>
            <Head title={`Packages - ${projectName}`} />
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                        <a href={route('projects.index')} className="hover:text-foreground">
                            Projects
                        </a>
                        <span>/</span>
                        <a
                            href={route('projects.show', project.id)}
                            className="hover:text-foreground"
                        >
                            {projectName}
                        </a>
                        <span>/</span>
                        <span className="text-foreground">Packages</span>
                    </nav>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-semibold tracking-tight">Packages</h1>
                        {can.create && (
                            <Button onClick={() => setShowCreateModal(true)}>
                                <Plus className="h-4 w-4" />
                                New Package
                            </Button>
                        )}
                    </div>
                </div>

                <Modal
                    show={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                >
                    <Card className="border-0 shadow-none">
                        <CardHeader>
                            <CardTitle>New Package</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submitCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="create_system_id">System</Label>
                                    <Select
                                        value={createForm.data.system_id || 'none'}
                                        onValueChange={(v) =>
                                            createForm.setData('system_id', v === 'none' ? '' : v)
                                        }
                                    >
                                        <SelectTrigger id="create_system_id">
                                            <SelectValue placeholder="Select system" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">— None —</SelectItem>
                                            {systems.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.name_en}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_code">Code</Label>
                                    <Input
                                        id="create_code"
                                        value={createForm.data.code}
                                        onChange={(e) => createForm.setData('code', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_name_en">Name (EN) *</Label>
                                    <Input
                                        id="create_name_en"
                                        value={createForm.data.name_en}
                                        onChange={(e) => createForm.setData('name_en', e.target.value)}
                                        required
                                    />
                                    {createForm.errors.name_en && (
                                        <p className="text-sm text-destructive">{createForm.errors.name_en}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_name_ar">Name (AR)</Label>
                                    <Input
                                        id="create_name_ar"
                                        value={createForm.data.name_ar}
                                        onChange={(e) => createForm.setData('name_ar', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_scope_type">Scope Type</Label>
                                    <Select
                                        value={createForm.data.scope_type}
                                        onValueChange={(v) => createForm.setData('scope_type', v)}
                                    >
                                        <SelectTrigger id="create_scope_type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="general">General</SelectItem>
                                            <SelectItem value="supply">Supply</SelectItem>
                                            <SelectItem value="works">Works</SelectItem>
                                            <SelectItem value="services">Services</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_budget_cost">Budget Cost</Label>
                                    <Input
                                        id="create_budget_cost"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={createForm.data.budget_cost || ''}
                                        onChange={(e) =>
                                            createForm.setData(
                                                'budget_cost',
                                                parseFloat(e.target.value) || 0
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_planned_cost">Planned Cost</Label>
                                    <Input
                                        id="create_planned_cost"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={createForm.data.planned_cost || ''}
                                        onChange={(e) =>
                                            createForm.setData(
                                                'planned_cost',
                                                parseFloat(e.target.value) || 0
                                            )
                                        }
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={createForm.processing}>
                                        {createForm.processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Create
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </Modal>

                {editingPackage && (
                    <PackageEditModal
                        project={project}
                        pkg={editingPackage}
                        systems={systems}
                        onClose={() => setEditingPackage(null)}
                        onSuccess={() => {
                            setEditingPackage(null);
                            toast.success('Package updated successfully.');
                        }}
                        canEdit={can.edit}
                    />
                )}

                <Card>
                    <CardContent className="p-0">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Name (EN)</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">System</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Scope Type</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Budget Cost</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">BOQ Items</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {packages.map((pkg) => (
                                    <tr key={pkg.id} className="border-b border-border hover:bg-muted/30">
                                        <td className="px-4 py-3 text-sm">{pkg.code ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm font-medium">{pkg.name_en}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {pkg.system?.name_en ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={scopeBadgeClass[pkg.scope_type] ?? ''}
                                            >
                                                {pkg.scope_type}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {parseFloat(pkg.budget_cost || '0').toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={statusBadgeClass[pkg.status] ?? ''}
                                            >
                                                {pkg.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{pkg.boq_items_count}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                {can.edit && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setEditingPackage(pkg)}
                                                        aria-label="Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {can.delete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(pkg)}
                                                        aria-label="Delete"
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {packages.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                No packages yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function PackageEditModal({
    project,
    pkg,
    systems,
    onClose,
    onSuccess,
    canEdit,
}: {
    project: ProjectInfo;
    pkg: PackageRow;
    systems: SystemOption[];
    onClose: () => void;
    onSuccess: () => void;
    canEdit: boolean;
}) {
    const editForm = useForm({
        system_id: pkg.system_id ?? '',
        code: pkg.code ?? '',
        name_en: pkg.name_en,
        name_ar: pkg.name_ar ?? '',
        scope_type: pkg.scope_type,
        budget_cost: parseFloat(pkg.budget_cost || '0'),
        planned_cost: parseFloat(pkg.planned_cost || '0'),
        status: pkg.status,
    });

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEdit) return;
        editForm.put(route('projects.packages.update', { project: project.id, package: pkg.id }), {
            onSuccess,
        });
    };

    return (
        <Modal show onClose={onClose}>
            <Card className="border-0 shadow-none">
                <CardHeader>
                    <CardTitle>Edit Package</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submitEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit_system_id">System</Label>
                            <Select
                                value={editForm.data.system_id || 'none'}
                                onValueChange={(v) =>
                                    editForm.setData('system_id', v === 'none' ? '' : v)
                                }
                            >
                                <SelectTrigger id="edit_system_id">
                                    <SelectValue placeholder="Select system" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">— None —</SelectItem>
                                    {systems.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name_en}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_code">Code</Label>
                            <Input
                                id="edit_code"
                                value={editForm.data.code}
                                onChange={(e) => editForm.setData('code', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_name_en">Name (EN) *</Label>
                            <Input
                                id="edit_name_en"
                                value={editForm.data.name_en}
                                onChange={(e) => editForm.setData('name_en', e.target.value)}
                                required
                            />
                            {editForm.errors.name_en && (
                                <p className="text-sm text-destructive">{editForm.errors.name_en}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_name_ar">Name (AR)</Label>
                            <Input
                                id="edit_name_ar"
                                value={editForm.data.name_ar}
                                onChange={(e) => editForm.setData('name_ar', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_scope_type">Scope Type</Label>
                            <Select
                                value={editForm.data.scope_type}
                                onValueChange={(v) => editForm.setData('scope_type', v)}
                            >
                                <SelectTrigger id="edit_scope_type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="supply">Supply</SelectItem>
                                    <SelectItem value="works">Works</SelectItem>
                                    <SelectItem value="services">Services</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_budget_cost">Budget Cost</Label>
                            <Input
                                id="edit_budget_cost"
                                type="number"
                                min={0}
                                step="0.01"
                                value={editForm.data.budget_cost || ''}
                                onChange={(e) =>
                                    editForm.setData(
                                        'budget_cost',
                                        parseFloat(e.target.value) || 0
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_planned_cost">Planned Cost</Label>
                            <Input
                                id="edit_planned_cost"
                                type="number"
                                min={0}
                                step="0.01"
                                value={editForm.data.planned_cost || ''}
                                onChange={(e) =>
                                    editForm.setData(
                                        'planned_cost',
                                        parseFloat(e.target.value) || 0
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_status">Status</Label>
                            <Select
                                value={editForm.data.status}
                                onValueChange={(v) => editForm.setData('status', v)}
                            >
                                <SelectTrigger id="edit_status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="awarded">Awarded</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editForm.processing || !canEdit}>
                                {editForm.processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                Update
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </Modal>
    );
}
