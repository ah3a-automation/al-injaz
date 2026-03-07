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
import { Checkbox } from '@/Components/ui/checkbox';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '@/hooks';
import { toast } from 'sonner';

interface CertificationRow {
    id: number;
    name: string;
    name_ar: string | null;
    slug: string;
    issuing_body: string | null;
    requires_expiry: boolean;
    is_active: boolean;
    sort_order: number;
}

interface CertificationsIndexProps {
    certifications: {
        data: CertificationRow[];
        current_page: number;
        last_page: number;
        total: number;
    };
}

export default function Index({ certifications }: CertificationsIndexProps) {
    const { confirmDelete } = useConfirm();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const addForm = useForm({
        name: '',
        name_ar: '',
        issuing_body: '',
        description: '',
        requires_expiry: true,
        is_active: true,
        sort_order: 0,
    });

    const submitAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post(route('admin.certifications.store'), {
            onSuccess: () => {
                addForm.reset();
                setShowAddForm(false);
                toast.success('Certification created.');
            },
        });
    };

    const handleDelete = (cert: CertificationRow) => {
        confirmDelete(`Delete certification "${cert.name}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('admin.certifications.destroy', cert.id), {
                    onSuccess: () => toast.success('Certification deleted.'),
                });
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Certifications" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Certifications</h1>
                    <Button onClick={() => setShowAddForm((s) => !s)}>
                        <Plus className="h-4 w-4" />
                        Add Certification
                    </Button>
                </div>

                {showAddForm && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>Add Certification</CardTitle>
                            <CardDescription>Create a new certification type</CardDescription>
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
                                    <Label htmlFor="add_issuing_body">Issuing Body</Label>
                                    <Input
                                        id="add_issuing_body"
                                        value={addForm.data.issuing_body}
                                        onChange={(e) => addForm.setData('issuing_body', e.target.value)}
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
                                            checked={addForm.data.requires_expiry}
                                            onCheckedChange={(c) =>
                                                addForm.setData('requires_expiry', c === true)
                                            }
                                        />
                                        <span className="text-sm">Requires Expiry</span>
                                    </label>
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
                                    <th className="px-4 py-3 text-left text-sm font-medium">Issuing Body</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Requires Expiry</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Sort</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {certifications.data.map((cert) => (
                                    <CertificationRow
                                        key={cert.id}
                                        certification={cert}
                                        editingId={editingId}
                                        setEditingId={setEditingId}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {certifications.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {certifications.current_page > 1 && (
                            <Link
                                href={route('admin.certifications.index', {
                                    page: certifications.current_page - 1,
                                })}
                            >
                                <Button variant="outline" size="sm">
                                    Previous
                                </Button>
                            </Link>
                        )}
                        <span className="flex items-center px-4 text-sm text-muted-foreground">
                            Page {certifications.current_page} of {certifications.last_page}
                        </span>
                        {certifications.current_page < certifications.last_page && (
                            <Link
                                href={route('admin.certifications.index', {
                                    page: certifications.current_page + 1,
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

function CertificationRow({
    certification,
    editingId,
    setEditingId,
    onDelete,
}: {
    certification: CertificationRow;
    editingId: number | null;
    setEditingId: (id: number | null) => void;
    onDelete: (cert: CertificationRow) => void;
}) {
    const isEditing = editingId === certification.id;
    const editForm = useForm({
        name: certification.name,
        name_ar: certification.name_ar ?? '',
        issuing_body: certification.issuing_body ?? '',
        description: '',
        requires_expiry: certification.requires_expiry,
        is_active: certification.is_active,
        sort_order: certification.sort_order,
    });

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.patch(route('admin.certifications.update', certification.id), {
            onSuccess: () => {
                setEditingId(null);
                toast.success('Certification updated.');
            },
        });
    };

    return (
        <>
            <tr className="border-b border-border hover:bg-muted/30">
                <td className="px-4 py-3 text-sm font-medium">{certification.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                    {certification.name_ar ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                    {certification.issuing_body ?? '—'}
                </td>
                <td className="px-4 py-3">
                    <span
                        className={
                            certification.requires_expiry
                                ? 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800'
                                : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'
                        }
                    >
                        {certification.requires_expiry ? 'Expiry Required' : 'No Expiry'}
                    </span>
                </td>
                <td className="px-4 py-3">
                    <span
                        className={
                            certification.is_active
                                ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800'
                                : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'
                        }
                    >
                        {certification.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className="px-4 py-3 text-sm">{certification.sort_order}</td>
                <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingId(isEditing ? null : certification.id)}
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
                            onClick={() => onDelete(certification)}
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
                    <td colSpan={7} className="px-4 py-4">
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
                                <Label>Issuing Body</Label>
                                <Input
                                    value={editForm.data.issuing_body}
                                    onChange={(e) => editForm.setData('issuing_body', e.target.value)}
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
                                        checked={editForm.data.requires_expiry}
                                        onCheckedChange={(c) =>
                                            editForm.setData('requires_expiry', c === true)
                                        }
                                    />
                                    <span className="text-sm">Requires Expiry</span>
                                </label>
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
