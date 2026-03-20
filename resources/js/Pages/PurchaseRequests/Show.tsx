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
import { Badge } from '@/Components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import Modal from '@/Components/Modal';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { CheckCircle, Loader2, Pencil, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '@/hooks';
import { toast } from 'sonner';
import { useLocale } from '@/hooks/useLocale';

interface PurchaseRequestItemRow {
    id: string;
    description_en: string;
    description_ar: string | null;
    unit: string | null;
    qty: string | null;
    estimated_cost: string;
    notes: string | null;
    boq_item?: { id: string; code: string; description_en: string } | null;
    package?: { id: string; name_en: string; code: string | null } | null;
}

interface PurchaseRequestDetail {
    id: string;
    pr_number: string;
    title_en: string;
    title_ar: string | null;
    description: string | null;
    status: string;
    priority: string;
    needed_by_date: string | null;
    rejected_reason: string | null;
    project?: { id: string; name: string; name_en: string | null } | null;
    package?: { id: string; name_en: string; code: string | null } | null;
    requested_by?: { id: number; name: string } | null;
    reviewed_by?: { id: number; name: string } | null;
    approved_by?: { id: number; name: string } | null;
    items: PurchaseRequestItemRow[];
}

interface PackageOption {
    id: string;
    name_en: string;
    code: string | null;
}

interface ShowProps {
    pr: PurchaseRequestDetail;
    packages: PackageOption[];
    can: {
        submit: boolean;
        approve: boolean;
        reject: boolean;
        convert: boolean;
        edit: boolean;
        delete: boolean;
    };
}

const statusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    converted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const priorityBadgeClass: Record<string, string> = {
    low: 'bg-slate-100 text-slate-700',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
};

export default function Show({ pr, packages, can }: ShowProps) {
    const { t } = useLocale();
    const { confirmDelete } = useConfirm();
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const rejectForm = useForm({ rejected_reason: '' });
    const editForm = useForm({
        title_en: pr.title_en,
        title_ar: pr.title_ar ?? '',
        description: pr.description ?? '',
        priority: pr.priority,
        needed_by_date: pr.needed_by_date
            ? pr.needed_by_date.substring(0, 10)
            : '',
        package_id: pr.package?.id ?? '',
    });

    const handleSubmit = () => {
        router.post(route('purchase-requests.submit', pr.id), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('submitted_toast', 'purchase_requests')),
        });
    };

    const handleApprove = () => {
        router.post(route('purchase-requests.approve', pr.id), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('approved_toast', 'purchase_requests')),
        });
    };

    const handleReject = (e: React.FormEvent) => {
        e.preventDefault();
        rejectForm.post(route('purchase-requests.reject', pr.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowRejectModal(false);
                rejectForm.reset();
                toast.success(t('rejected_toast', 'purchase_requests'));
            },
        });
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.transform((data) => ({
            ...data,
            package_id: data.package_id && data.package_id !== 'none' ? data.package_id : null,
        }));
        editForm.put(route('purchase-requests.update', pr.id), {
            onSuccess: () => {
                setShowEditModal(false);
                toast.success(t('updated', 'purchase_requests'));
            },
        });
    };

    const handleDelete = () => {
        confirmDelete(t('confirm_delete_body', 'purchase_requests', { reference: pr.pr_number })).then((confirmed) => {
            if (confirmed) {
                router.delete(route('purchase-requests.destroy', pr.id), {
                    onSuccess: () => toast.success(t('deleted', 'purchase_requests')),
                });
            }
        });
    };

    const statusKey = pr.status === 'converted' ? 'status_converted' : pr.status === 'closed' ? 'status_closed' : `status_${pr.status}`;
    const priorityKey = pr.priority === 'normal' ? 'priority_normal' : `priority_${pr.priority}`;

    return (
        <AppLayout>
            <Head title={`PR ${pr.pr_number}`} />
            <div className="space-y-6">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('purchase-requests.index')} className="hover:text-foreground">
                        {t('breadcrumb_index', 'purchase_requests')}
                    </Link>
                    <span>/</span>
                    <span className="text-foreground" dir="ltr">{pr.pr_number}</span>
                </nav>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        <span dir="ltr" className="font-mono tabular-nums">{pr.pr_number}</span>
                    </h1>
                    <div className="flex flex-wrap gap-2">
                        {can.submit && (
                            <Button onClick={handleSubmit}>
                                {t('action_submit', 'purchase_requests')}
                            </Button>
                        )}
                        {can.approve && (
                            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="h-4 w-4" />
                                {t('action_approve', 'purchase_requests')}
                            </Button>
                        )}
                        {can.reject && (
                            <Button
                                variant="destructive"
                                onClick={() => setShowRejectModal(true)}
                            >
                                <XCircle className="h-4 w-4" />
                                {t('action_reject', 'purchase_requests')}
                            </Button>
                        )}
                        {can.edit && (
                            <Button variant="outline" onClick={() => setShowEditModal(true)}>
                                <Pencil className="h-4 w-4" />
                                {t('action_edit', 'purchase_requests')}
                            </Button>
                        )}
                        {can.delete && (
                            <Button variant="destructive" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                                {t('action_delete', 'purchase_requests')}
                            </Button>
                        )}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('section_details', 'purchase_requests')}</CardTitle>
                        <CardDescription>{t('section_details_desc', 'purchase_requests')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('field_pr_number', 'purchase_requests')}</p>
                                <p className="mt-1 font-medium"><span dir="ltr" className="font-mono tabular-nums">{pr.pr_number}</span></p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('col_project', 'purchase_requests')}</p>
                                <p className="mt-1">{pr.project?.name_en ?? pr.project?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('field_package', 'purchase_requests')}</p>
                                <p className="mt-1">{pr.package?.name_en ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('col_status', 'purchase_requests')}</p>
                                <Badge
                                    variant="outline"
                                    className={`mt-1 ${statusBadgeClass[pr.status] ?? ''}`}
                                >
                                    {t(statusKey, 'purchase_requests')}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('col_priority', 'purchase_requests')}</p>
                                <Badge
                                    variant="outline"
                                    className={`mt-1 ${priorityBadgeClass[pr.priority] ?? ''}`}
                                >
                                    {t(priorityKey, 'purchase_requests')}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('field_requested_by', 'purchase_requests')}</p>
                                <p className="mt-1">{pr.requested_by?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('field_needed_by', 'purchase_requests')}</p>
                                <p className="mt-1">
                                    {pr.needed_by_date ? (
                                        <span dir="ltr" className="font-mono tabular-nums">{new Date(pr.needed_by_date).toLocaleDateString()}</span>
                                    ) : (
                                        '—'
                                    )}
                                </p>
                            </div>
                        </div>
                        {pr.description && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('field_description', 'purchase_requests')}</p>
                                <p className="mt-1 whitespace-pre-wrap">{pr.description}</p>
                            </div>
                        )}
                        {pr.status === 'rejected' && pr.rejected_reason && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('field_rejection_reason', 'purchase_requests')}</p>
                                <p className="mt-1 text-destructive">{pr.rejected_reason}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('section_line_items', 'purchase_requests')}</CardTitle>
                        <CardDescription>{t('section_line_items_desc', 'purchase_requests')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3 text-start text-sm font-medium">{t('field_description_en', 'purchase_requests')}</th>
                                    <th className="px-4 py-3 text-start text-sm font-medium">{t('item_unit', 'purchase_requests')}</th>
                                    <th className="px-4 py-3 text-start text-sm font-medium">{t('field_qty', 'purchase_requests')}</th>
                                    <th className="px-4 py-3 text-start text-sm font-medium">{t('item_estimated_cost', 'purchase_requests')}</th>
                                    <th className="px-4 py-3 text-start text-sm font-medium">{t('field_boq_item', 'purchase_requests')}</th>
                                    <th className="px-4 py-3 text-start text-sm font-medium">{t('item_notes', 'purchase_requests')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pr.items.map((item) => (
                                    <tr key={item.id} className="border-b border-border">
                                        <td className="px-4 py-3 text-sm">{item.description_en}</td>
                                        <td className="px-4 py-3 text-sm">{item.unit ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm"><span dir="ltr" className="font-mono tabular-nums">{item.qty ?? '—'}</span></td>
                                        <td className="px-4 py-3 text-sm">
                                            <span dir="ltr" className="font-mono tabular-nums">{parseFloat(item.estimated_cost || '0').toLocaleString()}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {item.boq_item ? (
                                                <>
                                                    <span dir="ltr" className="font-mono tabular-nums">{item.boq_item.code}</span>
                                                    {' — '}
                                                    {item.boq_item.description_en}
                                                </>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm">{item.notes ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {showRejectModal && (
                    <Modal show onClose={() => setShowRejectModal(false)}>
                        <Card className="border-0 shadow-none">
                            <CardHeader>
                                <CardTitle>{t('reject_modal_title', 'purchase_requests')}</CardTitle>
                                <CardDescription>{t('reject_modal_desc', 'purchase_requests')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleReject} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="rejected_reason">{t('field_reason', 'purchase_requests')} *</Label>
                                        <textarea
                                            id="rejected_reason"
                                            required
                                            maxLength={1000}
                                            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={rejectForm.data.rejected_reason}
                                            onChange={(e) =>
                                                rejectForm.setData('rejected_reason', e.target.value)
                                            }
                                        />
                                        {rejectForm.errors.rejected_reason && (
                                            <p className="text-sm text-destructive">
                                                {rejectForm.errors.rejected_reason}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowRejectModal(false)}
                                        >
                                            {t('action_cancel', 'purchase_requests')}
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            disabled={rejectForm.processing}
                                        >
                                            {rejectForm.processing && (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            )}
                                            {t('action_reject', 'purchase_requests')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </Modal>
                )}

                {showEditModal && (
                    <EditModal
                        pr={pr}
                        packages={packages}
                        editForm={editForm}
                        onClose={() => setShowEditModal(false)}
                        onSubmit={handleEdit}
                        t={t}
                    />
                )}
            </div>
        </AppLayout>
    );
}

function EditModal({
    pr,
    packages,
    editForm,
    onClose,
    onSubmit,
    t,
}: {
    pr: PurchaseRequestDetail;
    packages: PackageOption[];
    editForm: ReturnType<typeof useForm<{
        title_en: string;
        title_ar: string;
        description: string;
        priority: string;
        needed_by_date: string;
        package_id: string;
    }>>;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    t: (key: string, ns: 'purchase_requests') => string;
}) {
    return (
        <Modal show onClose={onClose}>
            <Card className="border-0 shadow-none">
                <CardHeader>
                    <CardTitle>{t('edit_modal_title', 'purchase_requests')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit_title_en">{t('field_title_en', 'purchase_requests')} *</Label>
                            <Input
                                id="edit_title_en"
                                value={editForm.data.title_en}
                                onChange={(e) => editForm.setData('title_en', e.target.value)}
                                required
                            />
                            {editForm.errors.title_en && (
                                <p className="text-sm text-destructive">{editForm.errors.title_en}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_title_ar">{t('field_title_ar', 'purchase_requests')}</Label>
                            <Input
                                id="edit_title_ar"
                                value={editForm.data.title_ar}
                                onChange={(e) => editForm.setData('title_ar', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_description">{t('field_description', 'purchase_requests')}</Label>
                            <textarea
                                id="edit_description"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={editForm.data.description}
                                onChange={(e) => editForm.setData('description', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_priority">{t('field_priority', 'purchase_requests')}</Label>
                            <Select
                                value={editForm.data.priority}
                                onValueChange={(v) => editForm.setData('priority', v)}
                            >
                                <SelectTrigger id="edit_priority">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">{t('priority_low', 'purchase_requests')}</SelectItem>
                                    <SelectItem value="normal">{t('priority_normal', 'purchase_requests')}</SelectItem>
                                    <SelectItem value="high">{t('priority_high', 'purchase_requests')}</SelectItem>
                                    <SelectItem value="urgent">{t('priority_urgent', 'purchase_requests')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_needed_by_date">{t('field_needed_by_date', 'purchase_requests')}</Label>
                            <Input
                                id="edit_needed_by_date"
                                type="date"
                                value={editForm.data.needed_by_date}
                                onChange={(e) => editForm.setData('needed_by_date', e.target.value)}
                            />
                        </div>
                        {packages.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="edit_package_id">{t('field_package', 'purchase_requests')}</Label>
                                <Select
                                    value={editForm.data.package_id || 'none'}
                                    onValueChange={(v) =>
                                        editForm.setData('package_id', v === 'none' ? '' : v)
                                    }
                                >
                                    <SelectTrigger id="edit_package_id">
                                        <SelectValue placeholder={t('select_package', 'purchase_requests')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('select_package_none', 'purchase_requests')}</SelectItem>
                                        {packages.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name_en}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onClose}>
                                {t('action_cancel', 'purchase_requests')}
                            </Button>
                            <Button type="submit" disabled={editForm.processing}>
                                {editForm.processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('action_update', 'purchase_requests')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </Modal>
    );
}
