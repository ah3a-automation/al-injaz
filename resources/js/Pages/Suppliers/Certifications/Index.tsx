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
import { useLocale } from '@/hooks/useLocale';

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
    const { t } = useLocale();
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
                toast.success(t('certifications_created', 'admin'));
            },
        });
    };

    const handleDelete = (cert: CertificationRow) => {
        confirmDelete(
            t('certifications_confirm_delete', 'admin', { name: cert.name })
        ).then((confirmed) => {
            if (confirmed) {
                router.delete(route('admin.certifications.destroy', cert.id), {
                    onSuccess: () => toast.success(t('certifications_deleted', 'admin')),
                });
            }
        });
    };

    return (
        <AppLayout>
            <Head title={t('certifications_title', 'admin')} />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('certifications_title', 'admin')}
                    </h1>
                    <Button onClick={() => setShowAddForm((s) => !s)}>
                        <Plus className="h-4 w-4" />
                        {t('certifications_add', 'admin')}
                    </Button>
                </div>

                {showAddForm && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>{t('certifications_add', 'admin')}</CardTitle>
                            <CardDescription>
                                {t('certifications_field_desc', 'admin')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submitAdd} className="flex flex-wrap gap-4">
                                <div className="min-w-[200px] space-y-2">
                                    <Label htmlFor="add_name">
                                        {t('certifications_field_name', 'admin')} *
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
                                    <Label htmlFor="add_issuing_body">
                                        {t('certifications_field_body', 'admin')}
                                    </Label>
                                    <Input
                                        id="add_issuing_body"
                                        value={addForm.data.issuing_body}
                                        onChange={(e) => addForm.setData('issuing_body', e.target.value)}
                                    />
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
                                            checked={addForm.data.requires_expiry}
                                            onCheckedChange={(c) =>
                                                addForm.setData('requires_expiry', c === true)
                                            }
                                        />
                                        <span className="text-sm">
                                            {t('requires_expiry', 'admin')}
                                        </span>
                                    </label>
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
                                        {t('certifications_col_name', 'admin')}
                                    </th>
                                    <th className="px-4 py-3 text-start text-sm font-medium">
                                        {t('certifications_col_name', 'admin')} (AR)
                                    </th>
                                    <th className="px-4 py-3 text-start text-sm font-medium">
                                        {t('certifications_field_body', 'admin')}
                                    </th>
                                    <th className="px-4 py-3 text-start text-sm font-medium">
                                        {t('requires_expiry', 'admin')}
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
                                    {t('previous', 'admin')}
                                </Button>
                            </Link>
                        )}
                        <span className="flex items-center px-4 text-sm text-muted-foreground">
                            {t('page_of', 'admin', {
                                page: certifications.current_page,
                                total: certifications.last_page,
                            })}
                        </span>
                        {certifications.current_page < certifications.last_page && (
                            <Link
                                href={route('admin.certifications.index', {
                                    page: certifications.current_page + 1,
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
    const { t } = useLocale();
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
                        {certification.requires_expiry
                            ? t('expiry_required', 'admin')
                            : t('no_expiry', 'admin')}
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
                        {certification.is_active
                            ? t('users_status_active', 'admin')
                            : t('users_status_inactive', 'admin')}
                    </span>
                </td>
                <td className="px-4 py-3 text-sm">
                    <span dir="ltr" className="font-mono tabular-nums">
                        {certification.sort_order}
                    </span>
                </td>
                <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingId(isEditing ? null : certification.id)}
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
                            onClick={() => onDelete(certification)}
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
                    <td colSpan={7} className="px-4 py-4">
                        <form onSubmit={submitEdit} className="flex flex-wrap gap-4">
                            <div className="min-w-[200px] space-y-2">
                                <Label>
                                    {t('certifications_field_name', 'admin')} *
                                </Label>
                                <Input
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="min-w-[200px] space-y-2">
                                <Label>{t('certifications_field_body', 'admin')}</Label>
                                <Input
                                    value={editForm.data.issuing_body}
                                    onChange={(e) => editForm.setData('issuing_body', e.target.value)}
                                />
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
                                        checked={editForm.data.requires_expiry}
                                        onCheckedChange={(c) =>
                                            editForm.setData('requires_expiry', c === true)
                                        }
                                    />
                                    <span className="text-sm">
                                        {t('requires_expiry', 'admin')}
                                    </span>
                                </label>
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
