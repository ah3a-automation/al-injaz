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
            onSuccess: () => toast.success('Purchase request submitted for review.'),
        });
    };

    const handleApprove = () => {
        router.post(route('purchase-requests.approve', pr.id), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success('Purchase request approved.'),
        });
    };

    const handleReject = (e: React.FormEvent) => {
        e.preventDefault();
        rejectForm.post(route('purchase-requests.reject', pr.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowRejectModal(false);
                rejectForm.reset();
                toast.success('Purchase request rejected.');
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
                toast.success('Purchase request updated.');
            },
        });
    };

    const handleDelete = () => {
        confirmDelete(`Delete purchase request "${pr.pr_number}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('purchase-requests.destroy', pr.id), {
                    onSuccess: () => toast.success('Purchase request deleted.'),
                });
            }
        });
    };

    return (
        <AppLayout>
            <Head title={`PR ${pr.pr_number}`} />
            <div className="space-y-6">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('purchase-requests.index')} className="hover:text-foreground">
                        Purchase Requests
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">{pr.pr_number}</span>
                </nav>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">{pr.pr_number}</h1>
                    <div className="flex flex-wrap gap-2">
                        {can.submit && (
                            <Button onClick={handleSubmit}>
                                Submit
                            </Button>
                        )}
                        {can.approve && (
                            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="h-4 w-4" />
                                Approve
                            </Button>
                        )}
                        {can.reject && (
                            <Button
                                variant="destructive"
                                onClick={() => setShowRejectModal(true)}
                            >
                                <XCircle className="h-4 w-4" />
                                Reject
                            </Button>
                        )}
                        {can.edit && (
                            <Button variant="outline" onClick={() => setShowEditModal(true)}>
                                <Pencil className="h-4 w-4" />
                                Edit
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
                        <CardDescription>Purchase request information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">PR Number</p>
                                <p className="mt-1 font-medium">{pr.pr_number}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Project</p>
                                <p className="mt-1">{pr.project?.name_en ?? pr.project?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Package</p>
                                <p className="mt-1">{pr.package?.name_en ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <Badge
                                    variant="outline"
                                    className={`mt-1 ${statusBadgeClass[pr.status] ?? ''}`}
                                >
                                    {pr.status}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Priority</p>
                                <Badge
                                    variant="outline"
                                    className={`mt-1 ${priorityBadgeClass[pr.priority] ?? ''}`}
                                >
                                    {pr.priority}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Requested By</p>
                                <p className="mt-1">{pr.requested_by?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Needed By</p>
                                <p className="mt-1">
                                    {pr.needed_by_date
                                        ? new Date(pr.needed_by_date).toLocaleDateString()
                                        : '—'}
                                </p>
                            </div>
                        </div>
                        {pr.description && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Description</p>
                                <p className="mt-1 whitespace-pre-wrap">{pr.description}</p>
                            </div>
                        )}
                        {pr.status === 'rejected' && pr.rejected_reason && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Rejection Reason</p>
                                <p className="mt-1 text-destructive">{pr.rejected_reason}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Line Items</CardTitle>
                        <CardDescription>Items in this purchase request</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3 text-left text-sm font-medium">Description (EN)</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Unit</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Qty</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Estimated Cost</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">BOQ Item</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pr.items.map((item) => (
                                    <tr key={item.id} className="border-b border-border">
                                        <td className="px-4 py-3 text-sm">{item.description_en}</td>
                                        <td className="px-4 py-3 text-sm">{item.unit ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm">{item.qty ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {parseFloat(item.estimated_cost || '0').toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {item.boq_item
                                                ? `${item.boq_item.code} — ${item.boq_item.description_en}`
                                                : '—'}
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
                                <CardTitle>Reject Purchase Request</CardTitle>
                                <CardDescription>Provide a reason for rejection (required)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleReject} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="rejected_reason">Reason *</Label>
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
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            disabled={rejectForm.processing}
                                        >
                                            {rejectForm.processing && (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            )}
                                            Reject
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
}) {
    return (
        <Modal show onClose={onClose}>
            <Card className="border-0 shadow-none">
                <CardHeader>
                    <CardTitle>Edit Purchase Request</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit_title_en">Title (EN) *</Label>
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
                            <Label htmlFor="edit_title_ar">Title (AR)</Label>
                            <Input
                                id="edit_title_ar"
                                value={editForm.data.title_ar}
                                onChange={(e) => editForm.setData('title_ar', e.target.value)}
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
                            <Label htmlFor="edit_priority">Priority</Label>
                            <Select
                                value={editForm.data.priority}
                                onValueChange={(v) => editForm.setData('priority', v)}
                            >
                                <SelectTrigger id="edit_priority">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_needed_by_date">Needed By Date</Label>
                            <Input
                                id="edit_needed_by_date"
                                type="date"
                                value={editForm.data.needed_by_date}
                                onChange={(e) => editForm.setData('needed_by_date', e.target.value)}
                            />
                        </div>
                        {packages.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="edit_package_id">Package</Label>
                                <Select
                                    value={editForm.data.package_id || 'none'}
                                    onValueChange={(v) =>
                                        editForm.setData('package_id', v === 'none' ? '' : v)
                                    }
                                >
                                    <SelectTrigger id="edit_package_id">
                                        <SelectValue placeholder="Select package" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">— None —</SelectItem>
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
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editForm.processing}>
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
