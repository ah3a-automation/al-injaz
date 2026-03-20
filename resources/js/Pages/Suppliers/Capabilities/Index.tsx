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
import { useLocale } from '@/hooks/useLocale';

interface CapabilityRow {
    id: number;
    name: string;
    name_ar: string | null;
    slug: string;
    category: { id: string; code: string; name_en: string; name_ar: string };
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
    categories: Array<{ id: string; code: string; name_en: string; name_ar: string }>;
    filters: { category_id?: string };
}

export default function Index({ capabilities, categories, filters }: CapabilitiesIndexProps) {
    const { confirmDelete } = useConfirm();
    const { t } = useLocale();
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
                toast.success(t('capabilities_created', 'admin'));
            },
        });
    };

    const handleDelete = (cap: CapabilityRow) => {
        confirmDelete(
            t('capabilities_confirm_delete', 'admin', { name: cap.name })
        ).then((confirmed) => {
            if (confirmed) {
                router.delete(route('admin.supplier-capabilities.destroy', cap.id), {
                    onSuccess: () => toast.success(t('capabilities_deleted', 'admin')),
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
            <Head title={t('capabilities_title', 'admin')} />
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('capabilities_title', 'admin')}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Select
                            value={filters.category_id ?? 'all'}
                            onValueChange={filterByCategory}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue
                                    placeholder={t('categories_title', 'admin')}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {t('categories_title', 'admin')}
                                </SelectItem>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name_en}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={() => setShowAddForm((s) => !s)}>
                            <Plus className="h-4 w-4" />
                            {t('capabilities_add', 'admin')}
                        </Button>
                    </div>
                </div>

                {showAddForm && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>{t('capabilities_add', 'admin')}</CardTitle>
                            <CardDescription>
                                {t('capabilities_field_desc', 'admin')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submitAdd} className="flex flex-wrap gap-4">
                                <div className="min-w-[200px] space-y-2">
                                    <Label htmlFor="add_name">
                                        {t('capabilities_field_name', 'admin')} *
                                    </Label>
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
                                    <Label htmlFor="add_category">
                                        {t('categories_field_name', 'admin')} *
                                    </Label>
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
                                                    {c.name_en}
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
                                    <Label htmlFor="add_sort_order">
                                        {t('sort_order', 'admin')}
                                    </Label>
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
                                        <span className="text-sm">
                                            {t('users_status_active', 'admin')}
                                        </span>
                                    </label>
                                    <Button type="submit" disabled={addForm.processing}>
                                        {addForm.processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {t('action_save', 'admin')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowAddForm(false)}
                                    >
                                        {t('action_cancel', 'admin')}
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
                                    <th className="px-4 py-3 text-start text-sm font-medium">
                                        {t('capabilities_col_name', 'admin')}
                                    </th>
                                    <th className="px-4 py-3 text-start text-sm font-medium">
                                        {t('capabilities_col_name', 'admin')} (AR)
                                    </th>
                                    <th className="px-4 py-3 text-start text-sm font-medium">
                                        {t('categories_title', 'admin')}
                                    </th>
                                    <th className="px-4 py-3 text-start text-sm font-medium">
                                        {t('users_col_status', 'admin')}
                                    </th>
                                    <th className="px-4 py-3 text-start text-sm font-medium">
                                        {t('sort_order', 'admin')}
                                    </th>
                                    <th className="px-4 py-3 text-end text-sm font-medium">
                                        {t('users_col_actions', 'admin')}
                                    </th>
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
                                    {t('previous', 'admin')}
                                </Button>
                            </Link>
                        )}
                        <span className="flex items-center px-4 text-sm text-muted-foreground">
                            {t('page_of', 'admin', {
                                page: capabilities.current_page,
                                total: capabilities.last_page,
                            })}
                        </span>
                        {capabilities.current_page < capabilities.last_page && (
                            <Link
                                href={route('admin.supplier-capabilities.index', {
                                    page: capabilities.current_page + 1,
                                    category_id: filters.category_id,
                                })}
                            >
                                <Button variant="outline" size="sm">
                                    {t('next', 'admin')}
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
    categories: Array<{ id: string; code: string; name_en: string; name_ar: string }>;
    editingId: number | null;
    setEditingId: (id: number | null) => void;
    onDelete: (cap: CapabilityRow) => void;
}) {
    const isEditing = editingId === capability.id;
    const { t } = useLocale();
    const editForm = useForm({
        name: capability.name,
        name_ar: capability.name_ar ?? '',
        category_id: capability.category.id,
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
                        {capability.category.name_en}
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
                        {capability.is_active
                            ? t('users_status_active', 'admin')
                            : t('users_status_inactive', 'admin')}
                    </span>
                </td>
                <td className="px-4 py-3 text-sm">
                    <span dir="ltr" className="font-mono tabular-nums">
                        {capability.sort_order}
                    </span>
                </td>
                <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingId(isEditing ? null : capability.id)}
                            aria-label={
                                isEditing
                                    ? t('action_cancel', 'admin')
                                    : t('action_edit', 'admin')
                            }
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
                            aria-label={t('action_delete', 'admin')}
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
                                <Label>
                                    {t('capabilities_field_name', 'admin')} *
                                </Label>
                                <Input
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="min-w-[200px] space-y-2">
                                <Label>
                                    {t('categories_field_name', 'admin')} *
                                </Label>
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
                                                {c.name_en}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="min-w-[120px] space-y-2">
                                <Label>{t('sort_order', 'admin')}</Label>
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
                                    <span className="text-sm">
                                        {t('users_status_active', 'admin')}
                                    </span>
                                </label>
                                <Button type="submit" disabled={editForm.processing}>
                                    {editForm.processing && (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                    {t('action_save', 'admin')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingId(null)}
                                >
                                    {t('action_cancel', 'admin')}
                                </Button>
                            </div>
                        </form>
                    </td>
                </tr>
            )}
        </>
    );
}
