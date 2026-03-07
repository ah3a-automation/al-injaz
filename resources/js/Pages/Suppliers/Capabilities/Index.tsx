import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Checkbox } from '@/Components/ui/checkbox';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '@/hooks';
import { toast } from 'sonner';

interface CapabilityRow {
    id: number;
    name: string;
    name_ar: string | null;
    slug: string;
    category: { id: number; name: string };
    is_active: boolean;
    sort_order: number;
}

interface CapabilitiesIndexProps {
    capabilities: {
        data: CapabilityRow[];
        current_page: number;
        last_page: number;
        total: number;
    };
    categories: Array<{ id: number; name: string }>;
    filters: { category_id?: string };
}

export default function Index({ capabilities, categories, filters }: CapabilitiesIndexProps) {
    const { confirmDelete } = useConfirm();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const addForm = useForm({
        name: '',
        name_ar: '',
        category_id: categories[0]?.id?.toString() ?? '',
        description: '',
        is_active: true,
        sort_order: 0,
    });

    const submitAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post(route('admin.supplier-capabilities.store'), {
            onSuccess: () => {
                addForm.reset('name', 'name_ar', 'description', 'sort_order');
                addForm.setData('category_id', categories[0]?.id?.toString() ?? '');
                setShowAddForm(false);
                toast.success('Capability created.');
            },
        });
    };

    const handleDelete = (cap: CapabilityRow) => {
        confirmDelete(`Delete capability "${cap.name}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('admin.supplier-capabilities.destroy', cap.id), {
                    onSuccess: () => toast.success('Capability deleted.'),
                });
            }
        });
    };

    const filterByCategory = (categoryId: string) => {
        router.get(route('admin.supplier-capabilities.index'), {
            category_id: categoryId === 'all' ? undefined : categoryId,
        });
    };

    return (
        <AppLayout>
            <Head title="Supplier Capabilities" />
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold tracking-tight">Supplier Capabilities</h1>
                    <div className="flex items-center gap-2">
                        <Select
                            value={filters.category_id ?? 'all'}
                            onValueChange={filterByCategory}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={() => setShowAddForm((s) => !s)}>
                            <Plus className="h-4 w-4" />
                            Add Capability
                        </Button>
                    </div>
                </div>

                {showAddForm && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>Add Capability</CardTitle>
                            <CardDescription>Create a new capability linked to a category</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submitAdd} className="flex flex-wrap gap-4">
                                <div className="min-w-[200px] space-y-2">
                                    <Label htmlFor="add_name">Name *</Label>
                                    <Input
                                        id="add_name"
                                        value={addForm.data.name}
                                        onChange={(e) => addForm.setData('name', e.target.value)}
                                        required
                                    />
                                    {addForm.errors.name && (
                                        <p className="text-sm text-destructive">{addForm.errors.name}</p>
                                    )}
                                </div>
                                <div className="min-w-[200px] space-y-2">
                                    <Label htmlFor="add_category">Category *</Label>
                                    <Select
                                        value={addForm.data.category_id}
                                        onValueChange={(v) => addForm.setData('category_id', v)}
                                    >
                                        <SelectTrigger id="add_category">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {addForm.errors.category_id && (
                                        <p className="text-sm text-destructive">
                                            {addForm.errors.category_id}
                                        </p>
                                    )}
                                </div>
                                <div className="min-w-[120px] space-y-2">
                                    <Label htmlFor="add_sort_order">Sort Order</Label>
                                    <Input
                                        id="add_sort_order"
                                        type="number"
                                        min={0}
                                        value={addForm.data.sort_order}
                                        onChange={(e) =>
                                            addForm.setData('sort_order', parseInt(e.target.value, 10) || 0)
                                        }
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <label className="flex items-center gap-2">
                                        <Checkbox
                                            checked={addForm.data.is_active}
                                            onCheckedChange={(c) =>
                                                addForm.setData('is_active', c === true)
                                            }
                                        />
                                        <span className="text-sm">Active</span>
                                    </label>
                                    <Button type="submit" disabled={addForm.processing}>
                                        {addForm.processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Save
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowAddForm(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardContent className="p-0">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Arabic Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Sort</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {capabilities.data.map((cap) => (
                                    <CapabilityRow
                                        key={cap.id}
                                        capability={cap}
                                        categories={categories}
                                        editingId={editingId}
                                        setEditingId={setEditingId}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {capabilities.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {capabilities.current_page > 1 && (
                            <Link
                                href={route('admin.supplier-capabilities.index', {
                                    page: capabilities.current_page - 1,
                                    category_id: filters.category_id,
                                })}
                            >
                                <Button variant="outline" size="sm">
                                    Previous
                                </Button>
                            </Link>
                        )}
                        <span className="flex items-center px-4 text-sm text-muted-foreground">
                            Page {capabilities.current_page} of {capabilities.last_page}
                        </span>
                        {capabilities.current_page < capabilities.last_page && (
                            <Link
                                href={route('admin.supplier-capabilities.index', {
                                    page: capabilities.current_page + 1,
                                    category_id: filters.category_id,
                                })}
                            >
                                <Button variant="outline" size="sm">
                                    Next
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function CapabilityRow({
    capability,
    categories,
    editingId,
    setEditingId,
    onDelete,
}: {
    capability: CapabilityRow;
    categories: Array<{ id: number; name: string }>;
    editingId: number | null;
    setEditingId: (id: number | null) => void;
    onDelete: (cap: CapabilityRow) => void;
}) {
    const isEditing = editingId === capability.id;
    const editForm = useForm({
        name: capability.name,
        name_ar: capability.name_ar ?? '',
        category_id: String(capability.category.id),
        description: '',
        is_active: capability.is_active,
        sort_order: capability.sort_order,
    });

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.patch(route('admin.supplier-capabilities.update', capability.id), {
            onSuccess: () => {
                setEditingId(null);
                toast.success('Capability updated.');
            },
        });
    };

    return (
        <>
            <tr className="border-b border-border hover:bg-muted/30">
                <td className="px-4 py-3 text-sm font-medium">{capability.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                    {capability.name_ar ?? '—'}
                </td>
                <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {capability.category.name}
                    </span>
                </td>
                <td className="px-4 py-3">
                    <span
                        className={
                            capability.is_active
                                ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800'
                                : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'
                        }
                    >
                        {capability.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className="px-4 py-3 text-sm">{capability.sort_order}</td>
                <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingId(isEditing ? null : capability.id)}
                            aria-label={isEditing ? 'Cancel edit' : 'Edit'}
                        >
                            {isEditing ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <Pencil className="h-4 w-4" />
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(capability)}
                            aria-label="Delete"
                            className="text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </td>
            </tr>
            {isEditing && (
                <tr className="border-b border-border bg-muted/20">
                    <td colSpan={6} className="px-4 py-4">
                        <form onSubmit={submitEdit} className="flex flex-wrap gap-4">
                            <div className="min-w-[200px] space-y-2">
                                <Label>Name *</Label>
                                <Input
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="min-w-[200px] space-y-2">
                                <Label>Category *</Label>
                                <Select
                                    value={editForm.data.category_id}
                                    onValueChange={(v) => editForm.setData('category_id', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="min-w-[120px] space-y-2">
                                <Label>Sort Order</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={editForm.data.sort_order}
                                    onChange={(e) =>
                                        editForm.setData('sort_order', parseInt(e.target.value, 10) || 0)
                                    }
                                />
                            </div>
                            <div className="flex items-end gap-2">
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={editForm.data.is_active}
                                        onCheckedChange={(c) =>
                                            editForm.setData('is_active', c === true)
                                        }
                                    />
                                    <span className="text-sm">Active</span>
                                </label>
                                <Button type="submit" disabled={editForm.processing}>
                                    {editForm.processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Update
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingId(null)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </td>
                </tr>
            )}
        </>
    );
}
