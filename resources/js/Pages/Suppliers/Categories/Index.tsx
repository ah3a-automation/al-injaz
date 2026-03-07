import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Checkbox } from '@/Components/ui/checkbox';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ChevronDown, ChevronUp, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '@/hooks';
import { toast } from 'sonner';

interface CategoryRow {
    id: number;
    name: string;
    name_ar: string | null;
    slug: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    suppliers_count: number;
    capabilities_count: number;
}

interface CategoriesIndexProps {
    categories: {
        data: CategoryRow[];
        current_page: number;
        last_page: number;
        total: number;
    };
}

export default function Index({ categories }: CategoriesIndexProps) {
    const { confirmDelete } = useConfirm();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const addForm = useForm({
        name: '',
        name_ar: '',
        description: '',
        is_active: true,
        sort_order: 0,
    });

    const submitAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post(route('admin.supplier-categories.store'), {
            onSuccess: () => {
                addForm.reset();
                setShowAddForm(false);
                toast.success('Category created.');
            },
        });
    };

    const handleDelete = (cat: CategoryRow) => {
        confirmDelete(`Delete category "${cat.name}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('admin.supplier-categories.destroy', cat.id), {
                    onSuccess: () => toast.success('Category deleted.'),
                });
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Supplier Categories" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Supplier Categories</h1>
                    <Button onClick={() => setShowAddForm((s) => !s)}>
                        <Plus className="h-4 w-4" />
                        Add Category
                    </Button>
                </div>

                {showAddForm && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>Add Category</CardTitle>
                            <CardDescription>Create a new supplier category</CardDescription>
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
                                    <Label htmlFor="add_name_ar">Arabic Name</Label>
                                    <Input
                                        id="add_name_ar"
                                        value={addForm.data.name_ar}
                                        onChange={(e) => addForm.setData('name_ar', e.target.value)}
                                    />
                                </div>
                                <div className="min-w-[200px] space-y-2">
                                    <Label htmlFor="add_description">Description</Label>
                                    <Input
                                        id="add_description"
                                        value={addForm.data.description}
                                        onChange={(e) => addForm.setData('description', e.target.value)}
                                    />
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
                                    <th className="px-4 py-3 text-left text-sm font-medium">Slug</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Suppliers</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Capabilities</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Sort</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.data.map((cat) => (
                                    <CategoryRow
                                        key={cat.id}
                                        category={cat}
                                        editingId={editingId}
                                        setEditingId={setEditingId}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {categories.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {categories.current_page > 1 && (
                            <Link
                                href={route('admin.supplier-categories.index', {
                                    page: categories.current_page - 1,
                                })}
                            >
                                <Button variant="outline" size="sm">
                                    Previous
                                </Button>
                            </Link>
                        )}
                        <span className="flex items-center px-4 text-sm text-muted-foreground">
                            Page {categories.current_page} of {categories.last_page}
                        </span>
                        {categories.current_page < categories.last_page && (
                            <Link
                                href={route('admin.supplier-categories.index', {
                                    page: categories.current_page + 1,
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

function CategoryRow({
    category,
    editingId,
    setEditingId,
    onDelete,
}: {
    category: CategoryRow;
    editingId: number | null;
    setEditingId: (id: number | null) => void;
    onDelete: (cat: CategoryRow) => void;
}) {
    const isEditing = editingId === category.id;
    const editForm = useForm({
        name: category.name,
        name_ar: category.name_ar ?? '',
        description: category.description ?? '',
        is_active: category.is_active,
        sort_order: category.sort_order,
    });

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.patch(route('admin.supplier-categories.update', category.id), {
            onSuccess: () => {
                setEditingId(null);
                toast.success('Category updated.');
            },
        });
    };

    return (
        <>
            <tr className="border-b border-border hover:bg-muted/30">
                <td className="px-4 py-3 text-sm font-medium">{category.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                    {category.name_ar ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{category.slug}</td>
                <td className="px-4 py-3 text-sm">{category.suppliers_count}</td>
                <td className="px-4 py-3 text-sm">{category.capabilities_count}</td>
                <td className="px-4 py-3">
                    <span
                        className={
                            category.is_active
                                ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800'
                                : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'
                        }
                    >
                        {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className="px-4 py-3 text-sm">{category.sort_order}</td>
                <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingId(isEditing ? null : category.id)}
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
                            onClick={() => onDelete(category)}
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
                    <td colSpan={8} className="px-4 py-4">
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
                                <Label>Arabic Name</Label>
                                <Input
                                    value={editForm.data.name_ar}
                                    onChange={(e) => editForm.setData('name_ar', e.target.value)}
                                />
                            </div>
                            <div className="min-w-[200px] space-y-2">
                                <Label>Description</Label>
                                <Input
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                />
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
