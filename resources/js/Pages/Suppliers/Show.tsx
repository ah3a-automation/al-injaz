import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import Modal from '@/Components/Modal';
import type { Supplier } from '@/types';
import {
    getStatusColor,
    getStatusLabel,
    getTypeColor,
    getTypeLabel,
    getComplianceColor,
    formatCurrency,
    getMandatoryDocumentStatus,
    canPerformAction,
} from '@/utils/suppliers';
import { ContactsSection } from '@/Components/Suppliers/ContactsSection';
import { DocumentsSection } from '@/Components/Suppliers/DocumentsSection';
import { CapabilitiesSection } from '@/Components/Suppliers/CapabilitiesSection';
import SupplierIdentityCard from '@/Components/Supplier/Sidebar/SupplierIdentityCard';
import SupplierQuickStatsCard from '@/Components/Supplier/Sidebar/SupplierQuickStatsCard';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Pencil,
    Trash2,
    Loader2,
    Check,
    XCircle,
    MessageSquareWarning,
    Ban,
    RotateCcw,
    Clock,
    FilePlus2,
    UserPlus2,
    FileText,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useConfirm } from '@/hooks';
import { useLocale } from '@/hooks/useLocale';
import { ActivityTimeline, type TimelineEvent } from '@/Components/ActivityTimeline';
import { displayTitleCase, displayUppercase } from '@/utils/textDisplay';

interface ShowProps {
    supplier: Supplier;
    canApprove: boolean;
    can: { update: boolean; delete: boolean };
    timeline: TimelineEvent[];
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

const EXPIRY_SOON_DAYS = 30;

function getRemainingDays(expiryDate: string | null | undefined): number | null {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
}

type ComplianceItemStatus = 'missing' | 'expired' | 'expiring_soon' | 'valid' | 'info_only';

function getComplianceItemStatus(
    expiryDate: string | null | undefined,
    hasValue: boolean,
    hasDoc: boolean,
    expectsExpiry: boolean
): ComplianceItemStatus {
    if (!expectsExpiry) return 'info_only';
    if (!hasValue && !hasDoc) return 'missing';
    if (!expiryDate) return hasValue || hasDoc ? 'info_only' : 'missing';
    const days = getRemainingDays(expiryDate);
    if (days === null) return 'info_only';
    if (days <= 0) return 'expired';
    if (days <= EXPIRY_SOON_DAYS) return 'expiring_soon';
    return 'valid';
}

function getComplianceStatusColor(status: ComplianceItemStatus): string {
    switch (status) {
        case 'expired':
            return 'bg-red-100 text-red-800';
        case 'expiring_soon':
            return 'bg-amber-100 text-amber-800';
        case 'valid':
            return 'bg-green-100 text-green-800';
        case 'missing':
            return 'bg-slate-100 text-slate-600';
        case 'info_only':
        default:
            return 'bg-muted text-muted-foreground';
    }
}

function getRemainingDaysColor(days: number | null): string {
    if (days === null) return 'bg-muted text-muted-foreground';
    if (days <= 0) return 'bg-red-100 text-red-800';
    if (days <= 30) return 'bg-amber-100 text-amber-800';
    if (days <= 90) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
}

const LEGAL_DOC_TYPES = {
    commercial_registration: 'commercial_registration',
    vat_certificate: 'vat_certificate',
    unified_number: 'unified_number',
    business_license: 'business_license',
} as const;

const BANK_DOC_TYPE = 'bank_letter';
const CREDIT_DOC_TYPE = 'credit_application';

export default function Show({ supplier, canApprove, can, timeline }: ShowProps) {
    const { confirmDelete } = useConfirm();
    const { t } = useLocale();
    const locale = (usePage().props as { locale?: string }).locale ?? 'en';
    const companyLogoUrl = ((supplier as any).company_logo_url as string | null) ?? null;
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
        confirmDelete(t('confirm_reset_login', 'suppliers')).then((confirmed) => {
            if (confirmed) {
                router.post(route('suppliers.reset-login', supplier.id));
            }
        });
    };

    const handleDelete = () => {
        confirmDelete(
            t('confirm_delete_body', 'suppliers', { name: supplier.legal_name_en })
        ).then((confirmed) => {
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

    const categories = supplier.categories ?? [];
    const totalCategories = categories.length;
    const activeCategories = categories.filter((c) => c.is_active !== false).length;
    const inactiveCategories = totalCategories - activeCategories;
    const distinctLevels = Array.from(
        new Set(categories.map((c) => c.level).filter((l): l is number => l != null))
    );

    const SECTION_IDS = {
        executiveOverview: 'executive-overview',
        categories: 'categories',
        workflowHistory: 'workflow-history',
        legalCompliance: 'legal-compliance',
        banking: 'banking',
        paymentPreferences: 'payment-preferences',
        documents: 'documents',
        contacts: 'contacts',
        certifications: 'certifications',
        internalNotes: 'internal-notes',
        activityLog: 'activity-log',
    } as const;

    const scrollToSection = (id: string): void => {
        const mainEl = document.getElementById('app-main-scroll');
        const el = document.getElementById(id);
        if (!mainEl || !el) return;

        const offset = 96;
        const nearBottomMinRemaining = 160;
        const targetRect = el.getBoundingClientRect();
        const containerRect = mainEl.getBoundingClientRect();
        const elementTopInScroll = targetRect.top - containerRect.top + mainEl.scrollTop;
        const startTop = elementTopInScroll - offset;

        const maxTop = Math.max(0, mainEl.scrollHeight - mainEl.clientHeight);
        const clampedStart = Math.min(Math.max(0, startTop), maxTop);

        // If aligning to the top would leave a large empty-looking area below (because we're near the end),
        // scroll to the natural end of content instead.
        const remainingBelow = mainEl.scrollHeight - (clampedStart + mainEl.clientHeight);
        const top = remainingBelow < nearBottomMinRemaining ? maxTop : clampedStart;

        mainEl.scrollTo({ top, behavior: 'smooth' });
    };

    const documents = supplier.documents ?? [];
    const legalItems = useMemo(() => {
        const docsByType = new Map<string, { file_name: string; expiry_date: string | null; id: string }>();
        for (const d of documents) {
            const current = docsByType.get(d.document_type);
            const preferThis = !current || d.is_current === true;
            if (preferThis) {
                docsByType.set(d.document_type, {
                    file_name: d.file_name,
                    expiry_date: d.expiry_date ?? null,
                    id: String(d.id),
                });
            }
        }
        const vatDoc = docsByType.get(LEGAL_DOC_TYPES.vat_certificate);
        const crDoc = docsByType.get(LEGAL_DOC_TYPES.commercial_registration);
        const unifiedDoc = docsByType.get(LEGAL_DOC_TYPES.unified_number);
        const licenseDoc = docsByType.get(LEGAL_DOC_TYPES.business_license);

        return [
            {
                key: 'cr',
                titleKey: 'legal_item_cr' as const,
                number: supplier.commercial_registration_no ?? null,
                expiry: supplier.cr_expiry_date ?? crDoc?.expiry_date ?? null,
                expectsExpiry: true,
                doc: crDoc ?? null,
            },
            {
                key: 'vat',
                titleKey: 'legal_item_vat' as const,
                number: supplier.vat_number ?? null,
                expiry: supplier.vat_expiry_date ?? vatDoc?.expiry_date ?? null,
                expectsExpiry: true,
                doc: vatDoc ?? null,
            },
            {
                key: 'unified',
                titleKey: 'legal_item_unified' as const,
                number: supplier.unified_number ?? null,
                expiry: null,
                expectsExpiry: false,
                doc: unifiedDoc ?? null,
            },
            {
                key: 'business_license',
                titleKey: 'legal_item_business_license' as const,
                number: supplier.business_license_number ?? null,
                expiry: supplier.license_expiry_date ?? licenseDoc?.expiry_date ?? null,
                expectsExpiry: true,
                doc: licenseDoc ?? null,
            },
            {
                key: 'chamber',
                titleKey: 'legal_item_chamber' as const,
                number: supplier.chamber_of_commerce_number ?? null,
                expiry: null,
                expectsExpiry: false,
                doc: null,
            },
            {
                key: 'classification',
                titleKey: 'legal_item_classification' as const,
                number: supplier.classification_grade ?? null,
                expiry: null,
                expectsExpiry: false,
                doc: null,
            },
        ];
    }, [supplier, documents]);

    const bankEvidence = useMemo(() => {
        const bankDoc = documents.find((d) => d.document_type === BANK_DOC_TYPE && d.is_current !== false);
        const hasCoreBank =
            !!supplier.bank_name &&
            !!supplier.bank_account_name &&
            (!!supplier.iban || !!supplier.bank_account_number);
        const hasPartialBank =
            !!supplier.bank_name ||
            !!supplier.bank_account_name ||
            !!supplier.iban ||
            !!supplier.bank_account_number;

        const status: 'complete' | 'partial' | 'missing' =
            hasCoreBank ? 'complete' : hasPartialBank ? 'partial' : 'missing';

        return {
            bankDoc,
            status,
            hasCoreBank,
        };
    }, [documents, supplier.bank_name, supplier.bank_account_name, supplier.iban, supplier.bank_account_number]);

    const creditApplicationDoc = useMemo(
        () => documents.find((d) => d.document_type === CREDIT_DOC_TYPE && d.is_current !== false) ?? null,
        [documents]
    );

    const paymentProfile = useMemo(() => {
        const hasCurrency = !!supplier.preferred_currency;
        const hasTerms = supplier.payment_terms_days != null;
        const hasAnySupport =
            supplier.credit_limit != null ||
            supplier.tax_withholding_rate != null ||
            creditApplicationDoc !== null;

        const status: 'complete' | 'partial' | 'missing' =
            hasCurrency && hasTerms && hasAnySupport
                ? 'complete'
                : hasCurrency || hasTerms || hasAnySupport
                ? 'partial'
                : 'missing';

        return {
            status,
            hasCurrency,
            hasTerms,
            hasCreditLimit: supplier.credit_limit != null,
            hasTaxWithholding: supplier.tax_withholding_rate != null,
            hasCreditApplication: creditApplicationDoc !== null,
        };
    }, [
        supplier.preferred_currency,
        supplier.payment_terms_days,
        supplier.credit_limit,
        supplier.tax_withholding_rate,
        creditApplicationDoc,
    ]);

    const contactCoverage = useMemo(() => {
        const contacts = supplier.contacts ?? [];
        return {
            total: contacts.length,
            hasPrimary: contacts.some((c) => c.is_primary),
            hasFinance: contacts.some((c) => c.contact_type === 'finance'),
            hasTechnical: contacts.some((c) => c.contact_type === 'technical'),
            hasSales: contacts.some((c) => c.contact_type === 'sales'),
        };
    }, [supplier.contacts]);

    const documentHealth = useMemo(() => {
        const docs = supplier.documents ?? [];
        const { complete, missing } = getMandatoryDocumentStatus(docs);
        let expired = 0;
        let expiringSoon = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (const d of docs) {
            if (!d.expiry_date) continue;
            const exp = new Date(d.expiry_date);
            exp.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) expired += 1;
            else if (diffDays <= 30) expiringSoon += 1;
        }
        return {
            total: docs.length,
            expired,
            expiringSoon,
            mandatoryComplete: complete,
            mandatoryMissingCount: missing.length,
        };
    }, [supplier.documents]);

    const lastActivity = useMemo(() => {
        if (!timeline || timeline.length === 0) return null;
        return timeline
            .map((e) => new Date(e.timestamp).getTime())
            .reduce((max, t) => (t > max ? t : max), 0);
    }, [timeline]);

    const complianceSummary = useMemo(() => {
        let expired = 0;
        let expiringSoon = 0;
        let missing = 0;
        for (const item of legalItems) {
            const status = getComplianceItemStatus(
                item.expiry,
                !!(item.number || item.doc),
                !!item.doc,
                item.expectsExpiry
            );
            if (status === 'expired') expired += 1;
            else if (status === 'expiring_soon') expiringSoon += 1;
            else if (status === 'missing') missing += 1;
        }
        return {
            total: legalItems.length,
            expired,
            expiringSoon,
            missing,
        };
    }, [legalItems]);

    const attentionAlerts = useMemo(() => {
        type Severity = 'critical' | 'warning' | 'info';
        const alerts: Array<{ severity: Severity; label: string; targetId: string }> = [];

        // Categories
        if (totalCategories === 0) {
            alerts.push({
                severity: 'warning',
                label: t('alert_no_categories', 'suppliers'),
                targetId: SECTION_IDS.categories,
            });
        }

        // Legal & compliance
        if (complianceSummary.expired > 0) {
            alerts.push({
                severity: 'critical',
                label: t('alert_legal_expired', 'suppliers', { count: complianceSummary.expired }),
                targetId: SECTION_IDS.legalCompliance,
            });
        }
        if (complianceSummary.expiringSoon > 0) {
            alerts.push({
                severity: 'warning',
                label: t('alert_legal_expiring', 'suppliers', { count: complianceSummary.expiringSoon }),
                targetId: SECTION_IDS.legalCompliance,
            });
        }
        if (complianceSummary.missing > 0) {
            alerts.push({
                severity: 'warning',
                label: t('alert_legal_missing', 'suppliers', { count: complianceSummary.missing }),
                targetId: SECTION_IDS.legalCompliance,
            });
        }

        // Banking
        if (bankEvidence.status === 'missing') {
            alerts.push({
                severity: 'critical',
                label: t('alert_bank_missing', 'suppliers'),
                targetId: SECTION_IDS.banking,
            });
        } else if (bankEvidence.status === 'partial') {
            alerts.push({
                severity: 'warning',
                label: t('alert_bank_incomplete', 'suppliers'),
                targetId: SECTION_IDS.banking,
            });
        }
        if (!bankEvidence.bankDoc) {
            alerts.push({
                severity: 'info',
                label: t('alert_bank_no_evidence', 'suppliers'),
                targetId: SECTION_IDS.banking,
            });
        }

        // Payment preferences
        if (paymentProfile.status === 'missing') {
            alerts.push({
                severity: 'critical',
                label: t('alert_payment_missing', 'suppliers'),
                targetId: SECTION_IDS.paymentPreferences,
            });
        } else if (paymentProfile.status === 'partial') {
            alerts.push({
                severity: 'warning',
                label: t('alert_payment_incomplete', 'suppliers'),
                targetId: SECTION_IDS.paymentPreferences,
            });
        }
        if (!paymentProfile.hasCreditApplication) {
            alerts.push({
                severity: 'info',
                label: t('alert_payment_no_credit_app', 'suppliers'),
                targetId: SECTION_IDS.paymentPreferences,
            });
        }

        // Contacts coverage
        if (!contactCoverage.hasPrimary) {
            alerts.push({
                severity: 'warning',
                label: t('alert_no_primary_contact', 'suppliers'),
                targetId: SECTION_IDS.contacts,
            });
        }
        if (!contactCoverage.hasFinance) {
            alerts.push({
                severity: 'info',
                label: t('alert_no_finance_contact', 'suppliers'),
                targetId: SECTION_IDS.contacts,
            });
        }
        if (!contactCoverage.hasTechnical) {
            alerts.push({
                severity: 'info',
                label: t('alert_no_technical_contact', 'suppliers'),
                targetId: SECTION_IDS.contacts,
            });
        }
        if (!contactCoverage.hasSales) {
            alerts.push({
                severity: 'info',
                label: t('alert_no_sales_contact', 'suppliers'),
                targetId: SECTION_IDS.contacts,
            });
        }

        // Documents health (reuse documentHealth)
        if (documentHealth.mandatoryMissingCount > 0) {
            alerts.push({
                severity: 'critical',
                label: t('alert_docs_mandatory_missing', 'suppliers', { count: documentHealth.mandatoryMissingCount }),
                targetId: SECTION_IDS.documents,
            });
        }
        if (documentHealth.expired > 0) {
            alerts.push({
                severity: 'warning',
                label: t('alert_docs_expired', 'suppliers', { count: documentHealth.expired }),
                targetId: SECTION_IDS.documents,
            });
        }
        if (documentHealth.expiringSoon > 0) {
            alerts.push({
                severity: 'info',
                label: t('alert_docs_expiring', 'suppliers', { count: documentHealth.expiringSoon }),
                targetId: SECTION_IDS.documents,
            });
        }

        const severityRank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
        alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

        return {
            all: alerts,
            visible: alerts.slice(0, 6),
            isCapped: alerts.length > 6,
        };
    }, [
        t,
        totalCategories,
        complianceSummary,
        bankEvidence,
        paymentProfile,
        contactCoverage,
        documentHealth,
    ]);

    const sectionNavItems = useMemo((): Array<{ id: string; label: string; badge?: string }> => {
        return [
            { id: SECTION_IDS.executiveOverview, label: t('nav_overview', 'suppliers') },
            { id: SECTION_IDS.categories, label: t('nav_categories', 'suppliers'), badge: totalCategories > 0 ? String(totalCategories) : undefined },
            { id: SECTION_IDS.workflowHistory, label: t('nav_workflow', 'suppliers') },
            { id: SECTION_IDS.legalCompliance, label: t('nav_compliance', 'suppliers') },
            { id: SECTION_IDS.banking, label: t('nav_banking', 'suppliers') },
            { id: SECTION_IDS.paymentPreferences, label: t('nav_payment', 'suppliers') },
            {
                id: SECTION_IDS.documents,
                label: t('nav_documents', 'suppliers'),
                badge: (supplier.documents?.length ?? 0) > 0 ? String(supplier.documents?.length ?? 0) : undefined,
            },
            {
                id: SECTION_IDS.contacts,
                label: t('nav_contacts', 'suppliers'),
                badge: (supplier.contacts?.length ?? 0) > 0 ? String(supplier.contacts?.length ?? 0) : undefined,
            },
            { id: SECTION_IDS.certifications, label: t('tab_certifications', 'suppliers') },
            { id: SECTION_IDS.internalNotes, label: t('nav_notes', 'suppliers') },
            { id: SECTION_IDS.activityLog, label: t('nav_activity', 'suppliers') },
        ];
    }, [t, supplier.contacts?.length, supplier.documents?.length, totalCategories]);

    const [activeSectionId, setActiveSectionId] = useState<string>(SECTION_IDS.executiveOverview);

    useEffect(() => {
        const mainEl = document.getElementById('app-main-scroll');
        const ids = sectionNavItems.map((i) => i.id);
        const nodes = ids
            .map((id) => document.getElementById(id))
            .filter((n): n is HTMLElement => !!n);

        if (nodes.length === 0) return;

        const obs = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting);
                if (visible.length === 0) return;
                const best = visible.reduce((a, b) => (b.intersectionRatio > a.intersectionRatio ? b : a));
                const id = best.target.getAttribute('id');
                if (id) setActiveSectionId(id);
            },
            {
                root: mainEl ?? null,
                rootMargin: '-120px 0px -60% 0px',
                threshold: [0.15, 0.2, 0.3, 0.5],
            }
        );

        for (const n of nodes) obs.observe(n);
        return () => obs.disconnect();
    }, [sectionNavItems]);

    return (
        <AppLayout>
            <Head title={displayTitleCase(supplier.legal_name_en)} />

            {/* Page header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-semibold tracking-tight">
                                {displayTitleCase(supplier.legal_name_en)}
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
                                            {t('action_approve', 'suppliers')}
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
                                            {t('request_info', 'suppliers')}
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
                                            {t('action_reject', 'suppliers')}
                                        </Button>
                                    )}
                                    {canPerformAction(supplier.status, 'suspend') && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-lg font-medium border border-amber-500 text-amber-600 bg-transparent hover:bg-amber-500 hover:text-white transition"
                                            onClick={() => openModal(MODAL_CONFIG.suspend)}
                                        >
                                            <Ban className="h-4 w-4" />
                                            {t('action_suspend', 'suppliers')}
                                        </Button>
                                    )}
                                    {canPerformAction(supplier.status, 'blacklist') && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-lg font-medium border border-red-600 text-red-600 bg-transparent hover:bg-red-600 hover:text-white transition"
                                            onClick={() => openModal(MODAL_CONFIG.blacklist)}
                                        >
                                            {t('blacklist', 'suppliers')}
                                        </Button>
                                    )}
                                    {canPerformAction(supplier.status, 'reactivate') && (
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => openModal(MODAL_CONFIG.reactivate)}
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            {t('reactivate', 'suppliers')}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                        {supplier.status === 'blacklisted' && (
                            <div className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                {t('blacklisted_notice', 'suppliers')}
                            </div>
                        )}
                                <p className="mt-1 text-sm text-muted-foreground">
                                <span dir="ltr" className="font-mono tabular-nums">
                                    {supplier.supplier_code}
                                </span>
                                {supplier.trade_name && ` · ${displayUppercase(supplier.trade_name)}`}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {can.update && (
                            <Button size="sm" variant="outline" className="rounded-lg font-medium" asChild>
                                <Link href={route('suppliers.edit', supplier.id)}>
                                    <Pencil className="h-4 w-4" />
                                    {t('title_edit', 'suppliers')}
                                </Link>
                            </Button>
                        )}
                        {can.delete && (
                            <Button size="sm" variant="destructive" className="rounded-lg font-medium" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                                {t('action_delete', 'suppliers')}
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
                                {t('blacklist_warning', 'suppliers')}
                            </p>
                        )}
                        {modal.requiresReason && (
                            <div className="mt-4">
                                <label className="text-sm font-medium">
                                    {t('reason_required', 'suppliers')}
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    required
                                    rows={4}
                                    className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                                {!rejectionReason.trim() && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {t('reason_required', 'suppliers')}
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="mt-4">
                            <label className="text-sm font-medium">
                                {modal.requiresNotes
                                    ? t('notes_required', 'suppliers')
                                    : t('notes_optional', 'suppliers')}
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder={
                                    modal.action === 'approve'
                                        ? t('approval_notes_placeholder', 'suppliers')
                                        : ''
                                }
                                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setModal((p) => ({ ...p, open: false }))}
                                disabled={processing}
                            >
                                {t('action_cancel', 'suppliers')}
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

                <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    {/* LEFT IDENTITY RAIL — sticky on desktop, stacks on mobile */}
                    <aside id="overview" className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start order-2 lg:order-1">
                        <SupplierIdentityCard
                            companyLogoUrl={companyLogoUrl}
                            legalNameEn={supplier.legal_name_en}
                            legalNameAr={supplier.legal_name_ar}
                            tradeName={supplier.trade_name}
                            supplierCode={supplier.supplier_code}
                            status={supplier.status}
                            supplierType={supplier.supplier_type}
                            city={supplier.city}
                            country={supplier.country}
                            email={supplier.email}
                            phone={supplier.phone}
                            website={supplier.website}
                            complianceStatus={supplier.compliance_status}
                            isVerified={supplier.is_verified}
                        />

                        <SupplierQuickStatsCard
                            contactsCount={supplier.contacts?.length ?? 0}
                            documents={supplier.documents ?? []}
                            categoriesCount={supplier.categories?.length ?? 0}
                            certificationsCount={supplier.certifications?.length ?? 0}
                        />

                        {/* Quick actions */}
                        <div className="flex flex-col gap-2">
                            {can.update && (
                                <>
                                    <Button variant="outline" size="sm" className="w-full" asChild>
                                        <Link href={route('suppliers.edit', supplier.id)}>
                                            <Pencil className="h-4 w-4" />
                                            {t('title_edit', 'suppliers')}
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" className="w-full" asChild>
                                        <Link href={route('suppliers.edit', supplier.id) + '#documents'}>
                                            <FilePlus2 className="h-4 w-4" />
                                            {t('add_document', 'suppliers')}
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" className="w-full" asChild>
                                        <Link href={route('suppliers.edit', supplier.id) + '#contacts'}>
                                            <UserPlus2 className="h-4 w-4" />
                                            {t('add_contact', 'suppliers')}
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </aside>

                    {/* RIGHT MAIN COLUMN */}
                    <div className="space-y-6 min-w-0 order-1 lg:order-2">
                        {/* Sticky section navigation */}
                        <div className="sticky top-0 z-20 -mx-1 rounded-b-lg border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                            <div className="px-1">
                                <div className="flex gap-2 overflow-x-auto whitespace-nowrap py-2">
                                    {sectionNavItems.map((item) => {
                                        const isActive = activeSectionId === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    setActiveSectionId(item.id);
                                                    scrollToSection(item.id);
                                                }}
                                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                                    isActive
                                                        ? 'border-primary/30 bg-primary/10 text-primary'
                                                        : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                <span>{item.label}</span>
                                                {item.badge && (
                                                    <span
                                                        className={`inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-[10px] tabular-nums ${
                                                            isActive ? 'bg-primary/15 text-primary' : 'bg-background text-muted-foreground'
                                                        }`}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Attention Required */}
                        <div id="attention-required">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('attention_required', 'suppliers')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {attentionAlerts.visible.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            {t('attention_required_none', 'suppliers')}
                                        </p>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap gap-2">
                                                {attentionAlerts.visible.map((a, idx) => {
                                                    const cls =
                                                        a.severity === 'critical'
                                                            ? 'border-red-200 bg-red-50 text-red-800'
                                                            : a.severity === 'warning'
                                                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                                                            : 'border-border bg-muted text-muted-foreground';
                                                    return (
                                                        <button
                                                            key={`${a.targetId}-${idx}`}
                                                            type="button"
                                                            onClick={() => scrollToSection(a.targetId)}
                                                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:text-foreground ${cls}`}
                                                        >
                                                            <span className="truncate">{a.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {attentionAlerts.isCapped && (
                                                <p className="text-xs text-muted-foreground">
                                                    {t('attention_required_more', 'suppliers')}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* 1. Executive Overview */}
                        <section id="executive-overview">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('section_executive_overview', 'suppliers')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">{t('col_status', 'suppliers')}</p>
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${getStatusColor(supplier.status)}`}>
                                                {getStatusLabel(supplier.status)}
                                            </span>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">{t('overview_compliance_readiness', 'suppliers')}</p>
                                            {(() => {
                                                const state =
                                                    complianceSummary.expired > 0 || complianceSummary.missing > 0
                                                        ? 'critical'
                                                        : complianceSummary.expiringSoon > 0
                                                        ? 'needs_attention'
                                                        : 'ready';
                                                const cls =
                                                    state === 'critical'
                                                        ? 'bg-red-100 text-red-800'
                                                        : state === 'needs_attention'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-green-100 text-green-800';
                                                const label =
                                                    state === 'critical'
                                                        ? t('readiness_critical', 'suppliers')
                                                        : state === 'needs_attention'
                                                        ? t('readiness_needs_attention', 'suppliers')
                                                        : t('readiness_ready', 'suppliers');
                                                return (
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${cls}`}>
                                                        {label}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">{t('overview_banking_readiness', 'suppliers')}</p>
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${
                                                    bankEvidence.status === 'complete'
                                                        ? 'bg-green-100 text-green-800'
                                                        : bankEvidence.status === 'partial'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}
                                            >
                                                {bankEvidence.status === 'complete' && t('bank_status_complete', 'suppliers')}
                                                {bankEvidence.status === 'partial' && t('bank_status_partial', 'suppliers')}
                                                {bankEvidence.status === 'missing' && t('bank_status_missing', 'suppliers')}
                                            </span>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">{t('overview_payment_readiness', 'suppliers')}</p>
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${
                                                    paymentProfile.status === 'complete'
                                                        ? 'bg-green-100 text-green-800'
                                                        : paymentProfile.status === 'partial'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}
                                            >
                                                {paymentProfile.status === 'complete' && t('payment_status_complete', 'suppliers')}
                                                {paymentProfile.status === 'partial' && t('payment_status_partial', 'suppliers')}
                                                {paymentProfile.status === 'missing' && t('payment_status_missing', 'suppliers')}
                                            </span>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">{t('overview_contact_coverage', 'suppliers')}</p>
                                            {(() => {
                                                const covered =
                                                    contactCoverage.total > 0 &&
                                                    contactCoverage.hasPrimary &&
                                                    contactCoverage.hasFinance &&
                                                    contactCoverage.hasTechnical &&
                                                    contactCoverage.hasSales;
                                                return (
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${
                                                            covered
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-amber-100 text-amber-800'
                                                        }`}
                                                    >
                                                        {covered
                                                            ? t('coverage_covered', 'suppliers')
                                                            : t('coverage_incomplete', 'suppliers')}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">{t('overview_document_health', 'suppliers')}</p>
                                            {(() => {
                                                const state =
                                                    documentHealth.expired > 0 || documentHealth.mandatoryMissingCount > 0
                                                        ? 'issues'
                                                        : documentHealth.expiringSoon > 0
                                                        ? 'attention'
                                                        : 'healthy';
                                                const cls =
                                                    state === 'issues'
                                                        ? 'bg-red-100 text-red-800'
                                                        : state === 'attention'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-green-100 text-green-800';
                                                const label =
                                                    state === 'issues'
                                                        ? t('documents_issues_found', 'suppliers')
                                                        : state === 'attention'
                                                        ? t('readiness_needs_attention', 'suppliers')
                                                        : t('documents_healthy', 'suppliers');
                                                return (
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${cls}`}>
                                                        {label}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">{t('overview_categories_assigned', 'suppliers')}</p>
                                            <p className="text-sm font-medium mt-1 tabular-nums">
                                                {totalCategories > 0
                                                    ? totalCategories
                                                    : t('none', 'suppliers')}
                                            </p>
                                        </div>
                                        {lastActivity !== null && (
                                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                                <p className="text-xs text-muted-foreground">{t('overview_last_activity', 'suppliers')}</p>
                                                <p className="text-sm font-medium mt-1" dir="ltr">
                                                    {new Date(lastActivity).toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="rounded-lg border border-border/60 bg-card p-4">
                                        <h3 className="text-sm font-semibold text-foreground mb-3">{t('section_company_summary', 'suppliers')}</h3>
                                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                            <div><dt className="text-muted-foreground inline">{t('legal_name_label', 'suppliers')}</dt><dd className="font-medium inline ms-2" dir="auto">{displayTitleCase(supplier.legal_name_en)}</dd></div>
                                            {supplier.trade_name && <div><dt className="text-muted-foreground inline">{t('trade_name_label', 'suppliers')}</dt><dd className="font-medium inline ms-2">{displayUppercase(supplier.trade_name)}</dd></div>}
                                            {supplier.commercial_registration_no && <div><dt className="text-muted-foreground inline">{t('field_cr_number', 'suppliers')}</dt><dd className="font-mono text-xs inline ms-2" dir="ltr">{supplier.commercial_registration_no}</dd></div>}
                                            {supplier.vat_number && <div><dt className="text-muted-foreground inline">{t('field_vat_number', 'suppliers')}</dt><dd className="font-mono text-xs inline ms-2" dir="ltr">{supplier.vat_number}</dd></div>}
                                            {supplier.unified_number && <div><dt className="text-muted-foreground inline">{t('unified_number', 'suppliers')}</dt><dd className="font-mono text-xs inline ms-2" dir="ltr">{supplier.unified_number}</dd></div>}
                                            <div><dt className="text-muted-foreground inline">{t('filter_type', 'suppliers')}</dt><dd className="inline ms-2">{getTypeLabel(supplier.supplier_type)}</dd></div>
                                            {supplier.classification_grade && <div><dt className="text-muted-foreground inline">{t('classification_grade', 'suppliers')}</dt><dd className="inline ms-2">{supplier.classification_grade}</dd></div>}
                                        </dl>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        {/* 2. Categories */}
                        <section id="categories">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('section_categories_360', 'suppliers')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {totalCategories === 0 ? (
                                        <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                                            <p>{t('no_categories', 'suppliers')}</p>
                                            {can.update && (
                                                <div className="mt-3">
                                                    <Button asChild size="sm">
                                                        <Link href={route('suppliers.edit', supplier.id) + '#categories'}>
                                                            <Pencil className="h-4 w-4" />
                                                            {t('title_edit', 'suppliers')}
                                                        </Link>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid gap-3 sm:grid-cols-3 text-sm">
                                                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                                    <p className="text-xs text-muted-foreground">{t('categories', 'suppliers')}</p>
                                                    <p className="mt-1 font-medium tabular-nums">{totalCategories}</p>
                                                </div>
                                                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                                    <p className="text-xs text-muted-foreground">{t('active', 'supplier_categories')}</p>
                                                    <p className="mt-1 font-medium tabular-nums">{activeCategories}</p>
                                                </div>
                                                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                                    <p className="text-xs text-muted-foreground">{t('inactive', 'supplier_categories')}</p>
                                                    <p className="mt-1 font-medium tabular-nums">{inactiveCategories}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                {distinctLevels.map((level) => {
                                                    const levelItems = categories.filter((c) => c.level === level);
                                                    if (levelItems.length === 0) return null;
                                                    return (
                                                        <div key={level}>
                                                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                                {t('category_level_label', 'suppliers', { level })}
                                                            </p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {levelItems.map((cat) => {
                                                                    const name =
                                                                        locale === 'ar' && cat.name_ar
                                                                            ? cat.name_ar
                                                                            : cat.name_en;
                                                                    const isInactive = cat.is_active === false;
                                                                    return (
                                                                        <div
                                                                            key={cat.id}
                                                                            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-xs"
                                                                        >
                                                                            <span className="font-medium" dir="auto">
                                                                                {name}
                                                                            </span>
                                                                            <span className="text-[10px] text-muted-foreground" dir="ltr">
                                                                                ({cat.code})
                                                                            </span>
                                                                            {cat.supplier_type && (
                                                                                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                                                    {cat.supplier_type}
                                                                                </span>
                                                                            )}
                                                                            {isInactive && (
                                                                                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">
                                                                                    {t('inactive', 'supplier_categories')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {categories.filter((c) => c.level == null).length > 0 && (
                                                    <div>
                                                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                            {t('category_level_other', 'suppliers')}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {categories
                                                                .filter((c) => c.level == null)
                                                                .map((cat) => {
                                                                    const name =
                                                                        locale === 'ar' && cat.name_ar
                                                                            ? cat.name_ar
                                                                            : cat.name_en;
                                                                    const isInactive = cat.is_active === false;
                                                                    return (
                                                                        <div
                                                                            key={cat.id}
                                                                            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-xs"
                                                                        >
                                                                            <span className="font-medium" dir="auto">
                                                                                {name}
                                                                            </span>
                                                                            <span className="text-[10px] text-muted-foreground" dir="ltr">
                                                                                ({cat.code})
                                                                            </span>
                                                                            {cat.supplier_type && (
                                                                                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                                                    {cat.supplier_type}
                                                                                </span>
                                                                            )}
                                                                            {isInactive && (
                                                                                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">
                                                                                    {t('inactive', 'supplier_categories')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </section>

                        {/* 3. Approval & Workflow History */}
                        <section id="workflow-history">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('approval_workflow_history', 'suppliers')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {!hasHistory ? (
                                        <p className="text-sm text-muted-foreground">
                                            {t('no_approval_history', 'suppliers')}
                                        </p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {supplier.approved_at && (
                                                <li className="flex gap-2">
                                                    <span className="h-2 w-2 shrink-0 rounded-full bg-green-500 mt-1.5" />
                                                    <div>
                                                        <p>
                                                            {t('approved_by_on', 'suppliers', {
                                                                name: supplier.approver?.name ?? t('unknown', 'suppliers'),
                                                                date: formatDate(supplier.approved_at),
                                                            })}
                                                        </p>
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
                                                        <p>
                                                            {t('rejected_by_on', 'suppliers', {
                                                                name: supplier.rejector?.name ?? t('unknown', 'suppliers'),
                                                                date: formatDate(supplier.rejected_at),
                                                            })}
                                                        </p>
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
                                                        <p>{t('more_info_requested', 'suppliers')}</p>
                                                        <p className="mt-1 text-sm text-muted-foreground">{supplier.more_info_notes}</p>
                                                    </div>
                                                </li>
                                            )}
                                            {supplier.suspended_at && (
                                                <li className="flex gap-2">
                                                    <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500 mt-1.5" />
                                                    <p>
                                                        {t('suspended_on', 'suppliers', { date: formatDate(supplier.suspended_at) })}
                                                    </p>
                                                </li>
                                            )}
                                            {supplier.blacklisted_at && (
                                                <li className="flex gap-2">
                                                    <span className="h-2 w-2 shrink-0 rounded-full bg-gray-800 mt-1.5" />
                                                    <p>
                                                        {t('blacklisted_on', 'suppliers', { date: formatDate(supplier.blacklisted_at) })}
                                                    </p>
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        </section>

                        {/* 3. Legal & Compliance + Banking snapshot */}
                        <section id="legal-compliance">
                            <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('section_legal_compliance', 'suppliers')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Summary strip */}
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm">
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">{t('col_compliance', 'suppliers')}</p>
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${getComplianceColor(
                                                    supplier.compliance_status
                                                )}`}
                                            >
                                                {supplier.compliance_status}
                                            </span>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">{t('compliance_tracked_items', 'suppliers')}</p>
                                            <p className="mt-1 font-medium tabular-nums">{complianceSummary.total}</p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">{t('compliance_expired', 'suppliers')}</p>
                                            <p className="mt-1 font-medium tabular-nums text-red-700">{complianceSummary.expired}</p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">{t('compliance_expiring_soon', 'suppliers')}</p>
                                            <p className="mt-1 font-medium tabular-nums text-amber-700">{complianceSummary.expiringSoon}</p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">{t('compliance_missing', 'suppliers')}</p>
                                            <p className="mt-1 font-medium tabular-nums text-slate-600">{complianceSummary.missing}</p>
                                        </div>
                                    </div>
                                    {/* Legal/compliance items list */}
                                    <div className="space-y-3">
                                        {legalItems.map((item) => {
                                            const hasValue = !!item.number;
                                            const hasDoc = !!item.doc;
                                            const status = getComplianceItemStatus(
                                                item.expiry,
                                                hasValue,
                                                hasDoc,
                                                item.expectsExpiry
                                            );
                                            const remainingDays = item.expectsExpiry && item.expiry ? getRemainingDays(item.expiry) : null;
                                            return (
                                                <div
                                                    key={item.key}
                                                    className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-foreground">{t(item.titleKey, 'suppliers')}</p>
                                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                            {item.number ? (
                                                                <span dir="ltr" className="font-mono text-xs tabular-nums text-muted-foreground">
                                                                    {item.number}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                            {item.expiry && (
                                                                <span className="text-xs text-muted-foreground" dir="ltr">
                                                                    {t('compliance_expiry', 'suppliers')}: {item.expiry}
                                                                </span>
                                                            )}
                                                            {hasDoc && (
                                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                    {item.doc?.file_name ?? t('document_attached', 'suppliers')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-shrink-0 items-center gap-2">
                                                        {remainingDays !== null && (
                                                            <span
                                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getRemainingDaysColor(remainingDays)}`}
                                                                title={item.expiry ?? undefined}
                                                            >
                                                                {remainingDays <= 0
                                                                    ? t('status_expired', 'suppliers')
                                                                    : t('compliance_days_remaining', 'suppliers', { days: remainingDays })}
                                                            </span>
                                                        )}
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getComplianceStatusColor(status)}`}
                                                        >
                                                            {status === 'missing' && t('status_missing', 'suppliers')}
                                                            {status === 'expired' && t('status_expired', 'suppliers')}
                                                            {status === 'expiring_soon' && t('status_expiring_soon', 'suppliers')}
                                                            {status === 'valid' && t('status_valid', 'suppliers')}
                                                            {status === 'info_only' && t('status_info_only', 'suppliers')}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            <div id="banking">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">{t('section_banking_snapshot', 'suppliers')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Banking summary strip */}
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm">
                                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {t('bank_status', 'suppliers')}
                                                </p>
                                                <span
                                                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                        bankEvidence.status === 'complete'
                                                            ? 'bg-green-100 text-green-800'
                                                            : bankEvidence.status === 'partial'
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    {bankEvidence.status === 'complete' &&
                                                        t('bank_status_complete', 'suppliers')}
                                                    {bankEvidence.status === 'partial' &&
                                                        t('bank_status_partial', 'suppliers')}
                                                    {bankEvidence.status === 'missing' &&
                                                        t('bank_status_missing', 'suppliers')}
                                                </span>
                                            </div>
                                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {t('bank_primary_currency', 'suppliers')}
                                                </p>
                                                <p className="mt-1 font-medium tabular-nums" dir="ltr">
                                                    {supplier.preferred_currency ?? '—'}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {t('bank_account_name_present', 'suppliers')}
                                                </p>
                                                <p className="mt-1 font-medium">
                                                    {supplier.bank_account_name ? t('yes', 'suppliers') : t('no', 'suppliers')}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {t('bank_iban_present', 'suppliers')}
                                                </p>
                                                <p className="mt-1 font-medium">
                                                    {supplier.iban ? t('yes', 'suppliers') : t('no', 'suppliers')}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {t('bank_evidence_attached', 'suppliers')}
                                                </p>
                                                <div className="mt-1 flex items-center gap-1.5 text-xs">
                                                    {bankEvidence.bankDoc ? (
                                                        <>
                                                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <span className="truncate" title={bankEvidence.bankDoc.file_name}>
                                                                {bankEvidence.bankDoc.file_name}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            {t('no', 'suppliers')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Banking detail groups */}
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {/* Bank identity */}
                                            <div className="space-y-1.5 text-sm">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    {t('bank_identity', 'suppliers')}
                                                </p>
                                                <p>
                                                    <span className="text-muted-foreground">
                                                        {t('bank_name', 'suppliers')}:
                                                    </span>{' '}
                                                    {supplier.bank_name ? (
                                                        <span>{displayTitleCase(supplier.bank_name)}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </p>
                                                <p>
                                                    <span className="text-muted-foreground">
                                                        {t('bank_country', 'suppliers')}:
                                                    </span>{' '}
                                                    {supplier.bank_country ? (
                                                        <span>{supplier.bank_country}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </p>
                                            </div>

                                            {/* Account details */}
                                            <div className="space-y-1.5 text-sm">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    {t('bank_account', 'suppliers')}
                                                </p>
                                                <p>
                                                    <span className="text-muted-foreground">
                                                        {t('bank_account_name', 'suppliers')}:
                                                    </span>{' '}
                                                    {supplier.bank_account_name ? (
                                                        <span>{displayTitleCase(supplier.bank_account_name)}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </p>
                                                <p>
                                                    <span className="text-muted-foreground">
                                                        {t('bank_account_number', 'suppliers')}:
                                                    </span>{' '}
                                                    <span dir="ltr" className="font-mono text-xs tabular-nums">
                                                        {supplier.bank_account_number || '—'}
                                                    </span>
                                                </p>
                                                <p>
                                                    <span className="text-muted-foreground">
                                                        {t('iban', 'suppliers')}:
                                                    </span>{' '}
                                                    <span dir="ltr" className="font-mono text-xs tabular-nums">
                                                        {supplier.iban || '—'}
                                                    </span>
                                                </p>
                                                <p>
                                                    <span className="text-muted-foreground">
                                                        {t('swift_code', 'suppliers')}:
                                                    </span>{' '}
                                                    <span dir="ltr" className="font-mono text-xs tabular-nums">
                                                        {supplier.swift_code ?? '—'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Financial snapshot: keep risk score only for now */}
                                        <div className="space-y-1.5 text-sm pt-2 border-t border-border/60">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                {t('financial_snapshot', 'suppliers')}
                                            </p>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <p>
                                                    <span className="text-muted-foreground">
                                                        {t('risk_score', 'suppliers')}:
                                                    </span>{' '}
                                                    {supplier.risk_score != null ? (
                                                        <span dir="ltr" className="font-mono text-xs tabular-nums">
                                                            {supplier.risk_score}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </p>
                                            </div>
                                            {!supplier.bank_name &&
                                                !supplier.bank_account_name &&
                                                !supplier.iban &&
                                                !supplier.bank_account_number && (
                                                    <p className="text-xs text-amber-700">
                                                        {t('bank_missing_core_warning', 'suppliers')}
                                                    </p>
                                                )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            </div>
                        </section>

                        {/* 5. Payment Preferences — full width */}
                        <section id="payment-preferences">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        {t('section_payment_preferences', 'suppliers')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    {/* Summary strip */}
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">
                                                {t('payment_profile_status', 'suppliers')}
                                            </p>
                                            <span
                                                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    paymentProfile.status === 'complete'
                                                        ? 'bg-green-100 text-green-800'
                                                        : paymentProfile.status === 'partial'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}
                                            >
                                                {paymentProfile.status === 'complete' &&
                                                    t('payment_status_complete', 'suppliers')}
                                                {paymentProfile.status === 'partial' &&
                                                    t('payment_status_partial', 'suppliers')}
                                                {paymentProfile.status === 'missing' &&
                                                    t('payment_status_missing', 'suppliers')}
                                            </span>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">
                                                {t('bank_primary_currency', 'suppliers')}
                                            </p>
                                            <p className="mt-1 font-medium tabular-nums" dir="ltr">
                                                {supplier.preferred_currency ?? '—'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">
                                                {t('payment_terms_present', 'suppliers')}
                                            </p>
                                            <p className="mt-1 font-medium">
                                                {paymentProfile.hasTerms ? t('yes', 'suppliers') : t('no', 'suppliers')}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">
                                                {t('credit_limit_present', 'suppliers')}
                                            </p>
                                            <p className="mt-1 font-medium">
                                                {paymentProfile.hasCreditLimit ? t('yes', 'suppliers') : t('no', 'suppliers')}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">
                                                {t('credit_application_present', 'suppliers')}
                                            </p>
                                            <p className="mt-1 font-medium">
                                                {paymentProfile.hasCreditApplication
                                                    ? t('yes', 'suppliers')
                                                    : t('no', 'suppliers')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Commercial terms */}
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            {t('commercial_terms', 'suppliers')}
                                        </p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <p>
                                                <span className="text-muted-foreground">
                                                    {t('bank_primary_currency', 'suppliers')}:
                                                </span>{' '}
                                                {supplier.preferred_currency ? (
                                                    <span dir="ltr" className="font-mono text-xs tabular-nums">
                                                        {supplier.preferred_currency}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </p>
                                            <p>
                                                <span className="text-muted-foreground">
                                                    {t('payment_terms', 'suppliers')}:
                                                </span>{' '}
                                                {supplier.payment_terms_days != null ? (
                                                    t('payment_terms_value', 'suppliers', {
                                                        days: supplier.payment_terms_days ?? 0,
                                                    })
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </p>
                                            <p>
                                                <span className="text-muted-foreground">
                                                    {t('credit_limit', 'suppliers')}:
                                                </span>{' '}
                                                {supplier.credit_limit != null ? (
                                                    <span dir="ltr" className="font-mono text-xs tabular-nums">
                                                        {formatCurrency(
                                                            supplier.credit_limit,
                                                            supplier.preferred_currency ?? undefined
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </p>
                                            <p>
                                                <span className="text-muted-foreground">
                                                    {t('tax_withholding', 'suppliers')}:
                                                </span>{' '}
                                                {supplier.tax_withholding_rate != null ? (
                                                    <span dir="ltr" className="font-mono text-xs tabular-nums">
                                                        {supplier.tax_withholding_rate}%
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Credit application / supporting doc */}
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            {t('payment_supporting_docs', 'suppliers')}
                                        </p>
                                        {creditApplicationDoc ? (
                                            <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs">
                                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="truncate" title={creditApplicationDoc.file_name}>
                                                    {creditApplicationDoc.file_name}
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                {t('no_credit_application', 'suppliers')}
                                            </p>
                                        )}
                                    </div>

                                    {paymentProfile.status !== 'complete' && (
                                        <p className="text-xs text-amber-700">
                                            {t('payment_profile_incomplete_warning', 'suppliers')}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </section>

                        {/* 6. Documents — full width — BEFORE contacts */}
                        <section id="documents">
                            <DocumentsSection supplier={supplier} canEdit={can.update} />
                        </section>

                        {/* 5. Contacts */}
                        <section id="contacts">
                            <ContactsSection supplier={supplier} canEdit={can.update} />
                        </section>

                        {/* 6. Capability Matrix — AFTER contacts */}
                        <section id="certifications">
                            <CapabilitiesSection supplier={supplier} />
                        </section>

                        {/* 7. Internal Notes */}
                        <section id="internal-notes">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        {t('section_internal_notes', 'suppliers')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {supplier.notes ? (
                                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                            {supplier.notes}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            {t('no_internal_notes', 'suppliers')}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </section>

                        {/* 8. Activity Log */}
                        <section id="activity-log">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        {t('activity_timeline', 'activity')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ActivityTimeline events={timeline} />
                                </CardContent>
                            </Card>
                        </section>
                    </div>
                </div>
        </AppLayout>
    );
}
