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

interface SystemRow {
    id: string;
    code: string | null;
    name_en: string;
    name_ar: string | null;
    description: string | null;
    owner_user_id: number | null;
    sort_order: number;
    packages_count: number;
    owner?: { id: number; name: string } | null;
}

interface SystemsIndexProps {
    project: ProjectInfo;
    systems: SystemRow[];
    can: { create: boolean; edit: boolean; delete: boolean };
}

export default function Index({ project, systems, can }: SystemsIndexProps) {
    const { confirmDelete } = useConfirm();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingSystem, setEditingSystem] = useState<SystemRow | null>(null);

    const createForm = useForm({
        code: '',
        name_en: '',
        name_ar: '',
        description: '',
        sort_order: 0,
    });

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('projects.systems.store', project.id), {
            onSuccess: () => {
                createForm.reset();
                setShowCreateModal(false);
                toast.success('System created successfully.');
            },
        });
    };

    const handleDelete = (system: SystemRow) => {
        confirmDelete(`Delete system "${system.name_en}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('projects.systems.destroy', { project: project.id, system: system.id }), {
                    onSuccess: () => toast.success('System deleted successfully.'),
                });
            }
        });
    };

    const projectName = project.name_en ?? project.name ?? 'Project';

    return (
        <AppLayout>
            <Head title={`Systems - ${projectName}`} />
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
                        <span className="text-foreground">Systems</span>
                    </nav>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-semibold tracking-tight">Systems</h1>
                        {can.create && (
                            <Button onClick={() => setShowCreateModal(true)}>
                                <Plus className="h-4 w-4" />
                                New System
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
                        <CardTitle>New System</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="create_code">Code</Label>
                                <Input
                                    id="create_code"
                                    value={createForm.data.code}
                                    onChange={(e) => createForm.setData('code', e.target.value)}
                                />
                                {createForm.errors.code && (
                                    <p className="text-sm text-destructive">{createForm.errors.code}</p>
                                )}
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
                                <Label htmlFor="create_description">Description</Label>
                                <textarea
                                    id="create_description"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={createForm.data.description}
                                    onChange={(e) => createForm.setData('description', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create_sort_order">Sort Order</Label>
                                <Input
                                    id="create_sort_order"
                                    type="number"
                                    min={0}
                                    value={createForm.data.sort_order}
                                    onChange={(e) =>
                                        createForm.setData('sort_order', parseInt(e.target.value, 10) || 0)
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

                {editingSystem && (
                    <SystemEditModal
                        project={project}
                        system={editingSystem}
                        onClose={() => setEditingSystem(null)}
                        onSuccess={() => {
                            setEditingSystem(null);
                            toast.success('System updated successfully.');
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
                                    <th className="px-4 py-3 text-left text-sm font-medium">Name (AR)</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Owner</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Packages</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Sort Order</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {systems.map((system) => (
                                    <tr key={system.id} className="border-b border-border hover:bg-muted/30">
                                        <td className="px-4 py-3 text-sm">{system.code ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm font-medium">{system.name_en}</td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {system.name_ar ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {system.owner?.name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">{system.packages_count}</td>
                                        <td className="px-4 py-3 text-sm">{system.sort_order}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                {can.edit && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setEditingSystem(system)}
                                                        aria-label="Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {can.delete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(system)}
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
                        {systems.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                No systems yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function SystemEditModal({
    project,
    system,
    onClose,
    onSuccess,
    canEdit,
}: {
    project: ProjectInfo;
    system: SystemRow;
    onClose: () => void;
    onSuccess: () => void;
    canEdit: boolean;
}) {
    const editForm = useForm({
        code: system.code ?? '',
        name_en: system.name_en,
        name_ar: system.name_ar ?? '',
        description: system.description ?? '',
        sort_order: system.sort_order,
    });

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEdit) return;
        editForm.put(route('projects.systems.update', { project: project.id, system: system.id }), {
            onSuccess,
        });
    };

    return (
        <Modal show onClose={onClose}>
            <Card className="border-0 shadow-none">
                <CardHeader>
                <CardTitle>Edit System</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={submitEdit} className="space-y-4">
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
                        <Label htmlFor="edit_description">Description</Label>
                        <textarea
                            id="edit_description"
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={editForm.data.description}
                            onChange={(e) => editForm.setData('description', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit_sort_order">Sort Order</Label>
                        <Input
                            id="edit_sort_order"
                            type="number"
                            min={0}
                            value={editForm.data.sort_order}
                            onChange={(e) =>
                                editForm.setData('sort_order', parseInt(e.target.value, 10) || 0)
                            }
                        />
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
