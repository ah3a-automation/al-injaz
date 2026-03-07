import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import Modal from '@/Components/Modal';
import type { Supplier, SupplierCapability } from '@/types';
import {
    getStatusColor,
    getStatusLabel,
    getTypeColor,
    getTypeLabel,
    getComplianceColor,
    formatCurrency,
    getMandatoryDocumentStatus,
    canPerformAction,
    getProficiencyColor,
    getProficiencyLabel,
} from '@/utils/suppliers';
import { ContactsSection } from '@/Components/Suppliers/ContactsSection';
import { DocumentsSection } from '@/Components/Suppliers/DocumentsSection';
import { Head, Link, router } from '@inertiajs/react';
import {
    Pencil,
    Trash2,
    Loader2,
    Check,
    XCircle,
    MessageSquareWarning,
    Ban,
    RotateCcw,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useConfirm } from '@/hooks';

interface ShowProps {
    supplier: Supplier;
    canApprove: boolean;
    can: { update: boolean; delete: boolean };
}

interface ApprovalModal {
    open: boolean;
    action: string;
    title: string;
    requiresReason: boolean;
    requiresNotes: boolean;
    confirmLabel: string;
    confirmVariant: 'default' | 'destructive';
}

const MODAL_CONFIG: Record<
    string,
    Omit<ApprovalModal, 'open'>
> = {
    approve: {
        action: 'approve',
        title: 'Approve Supplier',
        requiresReason: false,
        requiresNotes: false,
        confirmLabel: 'Approve Supplier',
        confirmVariant: 'default',
    },
    reject: {
        action: 'reject',
        title: 'Reject Supplier',
        requiresReason: true,
        requiresNotes: false,
        confirmLabel: 'Reject',
        confirmVariant: 'destructive',
    },
    request_info: {
        action: 'request_info',
        title: 'Request More Information',
        requiresReason: false,
        requiresNotes: true,
        confirmLabel: 'Send Request',
        confirmVariant: 'default',
    },
    suspend: {
        action: 'suspend',
        title: 'Suspend Supplier',
        requiresReason: false,
        requiresNotes: false,
        confirmLabel: 'Suspend',
        confirmVariant: 'destructive',
    },
    blacklist: {
        action: 'blacklist',
        title: 'Blacklist Supplier',
        requiresReason: true,
        requiresNotes: false,
        confirmLabel: 'Blacklist',
        confirmVariant: 'destructive',
    },
    reactivate: {
        action: 'reactivate',
        title: 'Reactivate Supplier',
        requiresReason: false,
        requiresNotes: false,
        confirmLabel: 'Reactivate',
        confirmVariant: 'default',
    },
};

function formatDate(s: string | null | undefined): string {
    if (!s) return '—';
    return new Date(s).toLocaleString();
}

type CapTab = 'capabilities' | 'certifications' | 'zones' | 'capacity';

function CapabilitiesSection({ supplier }: { supplier: Supplier }) {
    const [activeTab, setActiveTab] = useState<CapTab>('capabilities');
    const today = new Date().toISOString().slice(0, 10);

    const capabilitiesByCategory = useMemo(() => {
        const caps = supplier.capabilities ?? [];
        const map = new Map<string, SupplierCapability[]>();
        for (const c of caps) {
            const catName = c.category?.name ?? 'Other';
            if (!map.has(catName)) map.set(catName, []);
            map.get(catName)!.push(c);
        }
        return map;
    }, [supplier.capabilities]);

    const getExpiryBadge = (expiresAt: string | null) => {
        if (!expiresAt) return null;
        const exp = new Date(expiresAt).toISOString().slice(0, 10);
        if (exp < today) return { label: 'Expired', class: 'bg-red-100 text-red-800' };
        const daysLeft = Math.ceil((new Date(exp).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 60) return { label: `Expiring Soon ${exp}`, class: 'bg-amber-100 text-amber-800' };
        return { label: `Valid until ${exp}`, class: 'bg-green-100 text-green-800' };
    };

    const tabs: { id: CapTab; label: string }[] = [
        { id: 'capabilities', label: 'Capabilities' },
        { id: 'certifications', label: 'Certifications' },
        { id: 'zones', label: 'Service Zones' },
        { id: 'capacity', label: 'Capacity' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Capabilities & Qualifications</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 border-b border-border mb-4">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveTab(t.id)}
                            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                                activeTab === t.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'capabilities' && (
                    <div>
                        {supplier.capabilities && supplier.capabilities.length > 0 ? (
                            Array.from(capabilitiesByCategory.entries()).map(([catName, caps]) => (
                                <div key={catName} className="mb-4">
                                    <p className="text-sm font-medium text-muted-foreground mb-2">{catName}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {caps.map((c) => {
                                            const level = (c.pivot?.proficiency_level ?? 'standard') as 'basic' | 'standard' | 'advanced' | 'expert';
                                            const years = c.pivot?.years_experience;
                                            return (
                                                <span
                                                    key={c.id}
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getProficiencyColor(level)}`}
                                                >
                                                    {c.name}
                                                    <span className="opacity-80">({getProficiencyLabel(level)})</span>
                                                    {years != null && ` · ${years} yrs`}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No capabilities assigned</p>
                        )}
                    </div>
                )}

                {activeTab === 'certifications' && (
                    <div>
                        {supplier.certifications && supplier.certifications.length > 0 ? (
                            <ul className="space-y-3">
                                {supplier.certifications.map((cert) => (
                                    <li key={cert.id} className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{cert.name}</span>
                                        {cert.issuing_body && (
                                            <span className="text-sm text-muted-foreground">
                                                ({cert.issuing_body})
                                            </span>
                                        )}
                                        {cert.pivot?.certificate_number && (
                                            <span className="text-sm">Cert #: {cert.pivot.certificate_number}</span>
                                        )}
                                        {cert.pivot?.expires_at && (
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs ${getExpiryBadge(cert.pivot.expires_at)?.class ?? ''}`}
                                            >
                                                {getExpiryBadge(cert.pivot.expires_at)?.label}
                                            </span>
                                        )}
                                        {cert.pivot?.is_verified && (
                                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                                                ✓ Verified
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No certifications</p>
                        )}
                    </div>
                )}

                {activeTab === 'zones' && (
                    <div>
                        {supplier.zones && supplier.zones.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {supplier.zones.map((z) => (
                                    <span
                                        key={z.id}
                                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                                    >
                                        {z.zone_name}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No service zones defined</p>
                        )}
                    </div>
                )}

                {activeTab === 'capacity' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Max Contract Value</p>
                            <p className="font-medium">
                                {supplier.max_contract_value != null
                                    ? formatCurrency(supplier.max_contract_value, 'SAR')
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Workforce Size</p>
                            <p className="font-medium">
                                {supplier.workforce_size != null
                                    ? `${supplier.workforce_size} employees`
                                    : '—'}
                            </p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">Equipment List</p>
                            <p className="text-sm">{supplier.equipment_list || '—'}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">Capacity Notes</p>
                            <p className="text-sm">{supplier.capacity_notes || '—'}</p>
                        </div>
                        {supplier.capacity_updated_at && (
                            <p className="col-span-2 text-xs text-muted-foreground">
                                Last updated: {formatDate(supplier.capacity_updated_at)}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function Show({ supplier, canApprove, can }: ShowProps) {
    const { confirmDelete } = useConfirm();
    const [modal, setModal] = useState<ApprovalModal>({
        open: false,
        action: '',
        title: '',
        requiresReason: false,
        requiresNotes: false,
        confirmLabel: 'Confirm',
        confirmVariant: 'default',
    });
    const [notes, setNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    function openModal(config: Omit<ApprovalModal, 'open'>): void {
        setNotes('');
        setRejectionReason('');
        setModal({ ...config, open: true });
    }

    function submitApproval(): void {
        if (modal.requiresReason && !rejectionReason.trim()) return;
        if (modal.requiresNotes && !notes.trim()) return;
        setProcessing(true);
        router.post(`/suppliers/${supplier.id}/approval`, {
            action: modal.action,
            notes: notes || undefined,
            rejection_reason: rejectionReason || undefined,
        }, {
            onFinish: () => setProcessing(false),
            onSuccess: () => setModal((prev) => ({ ...prev, open: false })),
        });
    }

    const handleResetLogin = () => {
        confirmDelete('Send a new set-password email to this supplier?').then((confirmed) => {
            if (confirmed) {
                router.post(route('suppliers.reset-login', supplier.id));
            }
        });
    };

    const handleDelete = () => {
        confirmDelete(`Delete supplier "${supplier.legal_name_en}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('suppliers.destroy', supplier.id));
            }
        });
    };

    const hasHistory =
        supplier.approved_at ||
        supplier.rejected_at ||
        supplier.more_info_notes ||
        supplier.suspended_at ||
        supplier.blacklisted_at;

    return (
        <AppLayout>
            <Head title={supplier.legal_name_en} />
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {supplier.legal_name_en}
                            </h1>
                            <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getTypeColor(supplier.supplier_type)}`}
                            >
                                {getTypeLabel(supplier.supplier_type)}
                            </span>
                            <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(supplier.status)}`}
                            >
                                {getStatusLabel(supplier.status)}
                            </span>
                            {canApprove && (
                                <div className="flex flex-wrap gap-2">
                                    {canPerformAction(supplier.status, 'approve') && (
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => openModal(MODAL_CONFIG.approve)}
                                        >
                                            <Check className="h-4 w-4" />
                                            Approve
                                        </Button>
                                    )}
                                    {canPerformAction(supplier.status, 'request_info') && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-amber-500 text-amber-700 hover:bg-amber-50"
                                            onClick={() => openModal(MODAL_CONFIG.request_info)}
                                        >
                                            <MessageSquareWarning className="h-4 w-4" />
                                            Request Info
                                        </Button>
                                    )}
                                    {canPerformAction(supplier.status, 'reject') && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-red-500 text-red-700 hover:bg-red-50"
                                            onClick={() => openModal(MODAL_CONFIG.reject)}
                                        >
                                            <XCircle className="h-4 w-4" />
                                            Reject
                                        </Button>
                                    )}
                                    {canPerformAction(supplier.status, 'suspend') && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-orange-500 text-orange-700 hover:bg-orange-50"
                                            onClick={() => openModal(MODAL_CONFIG.suspend)}
                                        >
                                            <Ban className="h-4 w-4" />
                                            Suspend
                                        </Button>
                                    )}
                                    {canPerformAction(supplier.status, 'blacklist') && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-red-600 text-red-700 hover:bg-red-50"
                                            onClick={() => openModal(MODAL_CONFIG.blacklist)}
                                        >
                                            Blacklist
                                        </Button>
                                    )}
                                    {canPerformAction(supplier.status, 'reactivate') && (
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => openModal(MODAL_CONFIG.reactivate)}
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Reactivate
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                        {supplier.status === 'blacklisted' && (
                            <div className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                This supplier is blacklisted. Their CR number is blocked from re-registration.
                            </div>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground">
                            {supplier.supplier_code}
                            {supplier.trade_name && ` · ${supplier.trade_name}`}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {can.update && (
                            <Button variant="outline" asChild>
                                <Link href={route('suppliers.edit', supplier.id)}>
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

                <Modal
                    show={modal.open}
                    onClose={() => !processing && setModal((p) => ({ ...p, open: false }))}
                    closeable={!processing}
                >
                    <div className="p-6">
                        <h3 className="text-lg font-semibold">{modal.title}</h3>
                        {modal.action === 'blacklist' && (
                            <p className="mt-2 text-sm text-amber-700">
                                This action will prevent future registration with the same CR number.
                            </p>
                        )}
                        {modal.requiresReason && (
                            <div className="mt-4">
                                <label className="text-sm font-medium">Reason (required)</label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    required
                                    rows={4}
                                    className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                                {!rejectionReason.trim() && (
                                    <p className="mt-1 text-xs text-red-500">Reason is required</p>
                                )}
                            </div>
                        )}
                        <div className="mt-4">
                            <label className="text-sm font-medium">
                                {modal.requiresNotes ? 'Notes (required)' : 'Notes (optional)'}
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder={modal.action === 'approve' ? 'Approval notes (optional)' : ''}
                                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setModal((p) => ({ ...p, open: false }))}
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant={modal.confirmVariant}
                                onClick={submitApproval}
                                disabled={
                                    processing ||
                                    (modal.requiresReason && !rejectionReason.trim()) ||
                                    (modal.requiresNotes && !notes.trim())
                                }
                            >
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {modal.confirmLabel}
                            </Button>
                        </div>
                    </div>
                </Modal>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Company details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p>
                                    <span className="text-muted-foreground">Location:</span>{' '}
                                    {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                                </p>
                                {supplier.address && (
                                    <p>
                                        <span className="text-muted-foreground">Address:</span>{' '}
                                        {supplier.address}
                                    </p>
                                )}
                                {supplier.phone && (
                                    <p>
                                        <span className="text-muted-foreground">Phone:</span>{' '}
                                        {supplier.phone}
                                    </p>
                                )}
                                {supplier.email && (
                                    <p>
                                        <span className="text-muted-foreground">Email:</span>{' '}
                                        {supplier.email}
                                    </p>
                                )}
                                {supplier.website && (
                                    <p>
                                        <span className="text-muted-foreground">Website:</span>{' '}
                                        <a
                                            href={supplier.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            {supplier.website}
                                        </a>
                                    </p>
                                )}
                                {supplier.notes && (
                                    <p className="border-t border-border pt-2">
                                        <span className="text-muted-foreground">Notes:</span>{' '}
                                        {supplier.notes}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Legal & compliance</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p>
                                    <span className="text-muted-foreground">Compliance:</span>{' '}
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getComplianceColor(supplier.compliance_status)}`}
                                    >
                                        {supplier.compliance_status}
                                    </span>
                                </p>
                                {supplier.commercial_registration_no && (
                                    <p>
                                        <span className="text-muted-foreground">CR number:</span>{' '}
                                        {supplier.commercial_registration_no}
                                    </p>
                                )}
                                {supplier.cr_expiry_date && (
                                    <p>
                                        <span className="text-muted-foreground">CR expiry:</span>{' '}
                                        {supplier.cr_expiry_date}
                                    </p>
                                )}
                                {supplier.vat_number && (
                                    <p>
                                        <span className="text-muted-foreground">VAT:</span>{' '}
                                        {supplier.vat_number}
                                    </p>
                                )}
                                {supplier.unified_number && (
                                    <p>
                                        <span className="text-muted-foreground">Unified number:</span>{' '}
                                        {supplier.unified_number}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Financial</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {supplier.bank_name && (
                                    <p>
                                        <span className="text-muted-foreground">Bank:</span>{' '}
                                        {supplier.bank_name}
                                    </p>
                                )}
                                {supplier.preferred_currency && (
                                    <p>
                                        <span className="text-muted-foreground">Currency:</span>{' '}
                                        {supplier.preferred_currency}
                                    </p>
                                )}
                                {supplier.payment_terms_days != null && (
                                    <p>
                                        <span className="text-muted-foreground">Payment terms:</span>{' '}
                                        {supplier.payment_terms_days} days
                                    </p>
                                )}
                                {supplier.credit_limit != null && (
                                    <p>
                                        <span className="text-muted-foreground">Credit limit:</span>{' '}
                                        {formatCurrency(supplier.credit_limit, supplier.preferred_currency ?? undefined)}
                                    </p>
                                )}
                                {supplier.tax_withholding_rate != null && (
                                    <p>
                                        <span className="text-muted-foreground">Tax withholding:</span>{' '}
                                        {supplier.tax_withholding_rate}%
                                    </p>
                                )}
                                {supplier.risk_score != null && (
                                    <p>
                                        <span className="text-muted-foreground">Risk score:</span>{' '}
                                        {supplier.risk_score}
                                    </p>
                                )}
                                {!supplier.bank_name &&
                                    !supplier.preferred_currency &&
                                    supplier.payment_terms_days == null &&
                                    supplier.credit_limit == null && (
                                        <p className="text-sm text-muted-foreground">No financial details.</p>
                                    )}
                            </CardContent>
                        </Card>

                        <ContactsSection supplier={supplier} canEdit={can.update} />
                        <DocumentsSection supplier={supplier} canEdit={can.update} />

                        <CapabilitiesSection supplier={supplier} />

                        <Card>
                            <CardHeader>
                                <CardTitle>Approval History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!hasHistory ? (
                                    <p className="text-sm text-muted-foreground">No approval actions recorded yet.</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {supplier.approved_at && (
                                            <li className="flex gap-2">
                                                <span className="h-2 w-2 shrink-0 rounded-full bg-green-500 mt-1.5" />
                                                <div>
                                                    <p>Approved by {supplier.approver?.name ?? 'Unknown'} on {formatDate(supplier.approved_at)}</p>
                                                    {supplier.approval_notes && (
                                                        <p className="mt-1 text-sm text-muted-foreground">{supplier.approval_notes}</p>
                                                    )}
                                                </div>
                                            </li>
                                        )}
                                        {supplier.rejected_at && (
                                            <li className="flex gap-2">
                                                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 mt-1.5" />
                                                <div>
                                                    <p>Rejected by {supplier.rejector?.name ?? 'Unknown'} on {formatDate(supplier.rejected_at)}</p>
                                                    {supplier.rejection_reason && (
                                                        <p className="mt-1 text-sm text-muted-foreground">{supplier.rejection_reason}</p>
                                                    )}
                                                </div>
                                            </li>
                                        )}
                                        {supplier.more_info_notes && (
                                            <li className="flex gap-2">
                                                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500 mt-1.5" />
                                                <div>
                                                    <p>More information requested</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">{supplier.more_info_notes}</p>
                                                </div>
                                            </li>
                                        )}
                                        {supplier.suspended_at && (
                                            <li className="flex gap-2">
                                                <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500 mt-1.5" />
                                                <p>Suspended on {formatDate(supplier.suspended_at)}</p>
                                            </li>
                                        )}
                                        {supplier.blacklisted_at && (
                                            <li className="flex gap-2">
                                                <span className="h-2 w-2 shrink-0 rounded-full bg-gray-800 mt-1.5" />
                                                <p>Blacklisted on {formatDate(supplier.blacklisted_at)}</p>
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Meta</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {supplier.creator && (
                                    <p>
                                        <span className="text-muted-foreground">Created by:</span>{' '}
                                        {supplier.creator.name}
                                    </p>
                                )}
                                <p>
                                    <span className="text-muted-foreground">Created:</span>{' '}
                                    {new Date(supplier.created_at).toLocaleString()}
                                </p>
                                <p>
                                    <span className="text-muted-foreground">Updated:</span>{' '}
                                    {new Date(supplier.updated_at).toLocaleString()}
                                </p>
                                <p>
                                    <span className="text-muted-foreground">Verified:</span>{' '}
                                    {supplier.is_verified ? 'Yes' : 'No'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Categories</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {supplier.categories && supplier.categories.length > 0 ? (
                                    <ul className="space-y-1">
                                        {supplier.categories.map((c) => (
                                            <li key={c.id} className="text-sm">
                                                {c.name}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No categories.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Quick stats</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p>
                                    <span className="text-muted-foreground">Contacts:</span>{' '}
                                    {supplier.contacts?.length ?? 0}
                                </p>
                                <p>
                                    <span className="text-muted-foreground">Documents:</span>{' '}
                                    {supplier.documents?.length ?? 0}
                                </p>
                                <p>
                                    <span className="text-muted-foreground">Mandatory docs:</span>{' '}
                                    {getMandatoryDocumentStatus(supplier.documents).complete ? (
                                        <span className="text-green-600">Complete</span>
                                    ) : (
                                        <span className="text-amber-600">
                                            Missing {getMandatoryDocumentStatus(supplier.documents).missing.join(', ')}
                                        </span>
                                    )}
                                </p>
                            </CardContent>
                        </Card>

                        {canApprove && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Supplier Portal Access</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {!supplier.supplier_user_id ? (
                                        <>
                                            <p className="text-sm text-muted-foreground">No login account created yet.</p>
                                            {supplier.status === 'approved' && (
                                                <p className="mt-2 text-sm text-amber-600">
                                                    Login creation failed — check logs.
                                                </p>
                                            )}
                                        </>
                                    ) : supplier.supplier_user ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                                                    {supplier.supplier_user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{supplier.supplier_user.name}</p>
                                                    <p className="text-sm text-muted-foreground">{supplier.supplier_user.email}</p>
                                                </div>
                                            </div>
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    supplier.supplier_user.status === 'active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : supplier.supplier_user.status === 'suspended'
                                                          ? 'bg-orange-100 text-orange-800'
                                                          : 'bg-gray-100 text-gray-700'
                                                }`}
                                            >
                                                {supplier.supplier_user.status.charAt(0).toUpperCase() + supplier.supplier_user.status.slice(1)}
                                            </span>
                                            <div className="pt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleResetLogin}
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                    Reset Login
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No login account created yet.</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
