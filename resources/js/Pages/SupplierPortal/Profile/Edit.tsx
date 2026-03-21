import { ActivityTimeline, type TimelineEvent } from '@/Components/ActivityTimeline';
import { CapabilitiesSection } from '@/Components/Suppliers/CapabilitiesSection';
import { ContactsSection } from '@/Components/Suppliers/ContactsSection';
import { DocumentsSection } from '@/Components/Suppliers/DocumentsSection';
import SupplierIdentityCard from '@/Components/Supplier/Sidebar/SupplierIdentityCard';
import SupplierQuickStatsCard from '@/Components/Supplier/Sidebar/SupplierQuickStatsCard';
import { ProfileSkeleton } from '@/Components/Supplier/ProfileSkeleton';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import SupplierPortalLayout from '@/Layouts/SupplierPortalLayout';
import type { Supplier } from '@/types';
import {
    formatCurrency,
    getComplianceColor,
    getMandatoryDocumentStatus,
    getStatusColor,
    getTypeColor,
} from '@/utils/suppliers';
import { displayTitleCase, displayUppercase } from '@/utils/textDisplay';
import { Head, Link, usePage } from '@inertiajs/react';
import { Clock, FilePlus2, FileText, Pencil, UserPlus2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type SupplierData = Supplier & {
    company_logo_url: string | null;
};

interface Completeness {
    percent: number;
    fields_done: number;
    fields_total: number;
    docs_done: number;
    docs_total: number;
    missing_fields: string[];
    missing_docs: string[];
}

interface EditProps {
    supplier: SupplierData;
    completeness: Completeness;
    timeline?: TimelineEvent[];
}

type ComplianceItemStatus = 'missing' | 'expired' | 'expiring_soon' | 'valid' | 'info_only';

const EXPIRY_SOON_DAYS = 30;

const LEGAL_DOC_TYPES = {
    commercial_registration: 'commercial_registration',
    vat_certificate: 'vat_certificate',
    unified_number: 'unified_number',
    business_license: 'business_license',
} as const;

const BANK_DOC_TYPE = 'bank_letter';
const CREDIT_DOC_TYPE = 'credit_application';

const SECTION_IDS = {
    executiveOverview: 'executive-overview',
    categories: 'categories',
    legalCompliance: 'legal-compliance',
    banking: 'banking',
    paymentPreferences: 'payment-preferences',
    documents: 'documents',
    contacts: 'contacts',
    certifications: 'certifications',
    activityLog: 'activity-log',
} as const;

function getScrollContainer(): HTMLElement | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const byId = document.getElementById('app-main-scroll');
    if (byId) {
        return byId;
    }

    const main = document.querySelector('main');
    return main instanceof HTMLElement ? main : null;
}

function getRemainingDays(expiryDate: string | null | undefined): number | null {
    if (!expiryDate) return null;

    const exp = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);

    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getComplianceItemStatus(
    expiryDate: string | null | undefined,
    hasValue: boolean,
    hasDoc: boolean,
    expectsExpiry: boolean,
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

export default function SupplierPortalProfileEdit({
    supplier,
    completeness,
    timeline = [],
}: EditProps) {
    const { t, locale } = useLocale();
    const { flash } = usePage().props as { flash?: { scroll_to?: string } };
    const [activeSectionId, setActiveSectionId] = useState<string>(SECTION_IDS.executiveOverview);

    const scrollToSection = (id: string): void => {
        const mainEl = getScrollContainer();
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
        const remainingBelow = mainEl.scrollHeight - (clampedStart + mainEl.clientHeight);
        const top = remainingBelow < nearBottomMinRemaining ? maxTop : clampedStart;

        mainEl.scrollTo({ top, behavior: 'smooth' });
    };

    useEffect(() => {
        if (!flash?.scroll_to) return;

        const targetId =
            flash.scroll_to === 'documents' || flash.scroll_to === 'contacts'
                ? flash.scroll_to
                : document.getElementById(flash.scroll_to)
                  ? flash.scroll_to
                  : null;

        if (!targetId) return;

        requestAnimationFrame(() => {
            scrollToSection(targetId);
        });
    }, [flash?.scroll_to]);

    if (!supplier) {
        return (
            <SupplierPortalLayout>
                <Head title={t('title_supplier_profile', 'supplier_portal')} />
                <ProfileSkeleton />
            </SupplierPortalLayout>
        );
    }

    const categories = supplier.categories ?? [];
    const documents = supplier.documents ?? [];
    const totalCategories = categories.length;
    const activeCategories = categories.filter((category) => category.is_active !== false).length;
    const inactiveCategories = totalCategories - activeCategories;
    const distinctLevels = Array.from(
        new Set(categories.map((category) => category.level).filter((level): level is number => level != null)),
    );

    const legalItems = useMemo(() => {
        const docsByType = new Map<string, { file_name: string; expiry_date: string | null; id: string }>();

        for (const document of documents) {
            const current = docsByType.get(document.document_type);
            const preferThis = !current || document.is_current === true;

            if (preferThis) {
                docsByType.set(document.document_type, {
                    file_name: document.file_name,
                    expiry_date: document.expiry_date ?? null,
                    id: String(document.id),
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
    }, [documents, supplier]);

    const bankEvidence = useMemo(() => {
        const bankDoc = documents.find((document) => document.document_type === BANK_DOC_TYPE && document.is_current !== false) ?? null;
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
        };
    }, [
        documents,
        supplier.bank_account_name,
        supplier.bank_account_number,
        supplier.bank_name,
        supplier.iban,
    ]);

    const creditApplicationDoc = useMemo(
        () => documents.find((document) => document.document_type === CREDIT_DOC_TYPE && document.is_current !== false) ?? null,
        [documents],
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
            hasTerms,
            hasCreditLimit: supplier.credit_limit != null,
            hasCreditApplication: creditApplicationDoc !== null,
        };
    }, [
        creditApplicationDoc,
        supplier.credit_limit,
        supplier.payment_terms_days,
        supplier.preferred_currency,
        supplier.tax_withholding_rate,
    ]);

    const contactCoverage = useMemo(() => {
        const contacts = supplier.contacts ?? [];

        return {
            total: contacts.length,
            hasPrimary: contacts.some((contact) => contact.is_primary),
            hasFinance: contacts.some((contact) => contact.contact_type === 'finance'),
            hasTechnical: contacts.some((contact) => contact.contact_type === 'technical'),
            hasSales: contacts.some((contact) => contact.contact_type === 'sales'),
        };
    }, [supplier.contacts]);

    const documentHealth = useMemo(() => {
        const { complete, missing } = getMandatoryDocumentStatus(documents);
        let expired = 0;
        let expiringSoon = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const document of documents) {
            if (!document.expiry_date) continue;

            const expiryDate = new Date(document.expiry_date);
            expiryDate.setHours(0, 0, 0, 0);

            const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) expired += 1;
            else if (diffDays <= 30) expiringSoon += 1;
        }

        return {
            expired,
            expiringSoon,
            mandatoryMissingCount: complete ? 0 : missing.length,
        };
    }, [documents]);

    const lastActivity = useMemo(() => {
        if (timeline.length === 0) return null;

        return timeline
            .map((event) => new Date(event.timestamp).getTime())
            .reduce((max, timestamp) => (timestamp > max ? timestamp : max), 0);
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
                item.expectsExpiry,
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

        if (completeness.missing_fields.length > 0) {
            alerts.push({
                severity: 'warning',
                label: `${t('missing_required_fields', 'supplier_portal')} (${completeness.missing_fields.length})`,
                targetId: SECTION_IDS.executiveOverview,
            });
        }

        if (totalCategories === 0) {
            alerts.push({
                severity: 'warning',
                label: t('alert_no_categories', 'suppliers'),
                targetId: SECTION_IDS.categories,
            });
        }

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

        if (documentHealth.mandatoryMissingCount > 0) {
            alerts.push({
                severity: 'critical',
                label: t('alert_docs_mandatory_missing', 'suppliers', {
                    count: documentHealth.mandatoryMissingCount,
                }),
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
        alerts.sort((left, right) => severityRank[left.severity] - severityRank[right.severity]);

        return {
            visible: alerts.slice(0, 6),
            isCapped: alerts.length > 6,
        };
    }, [
        bankEvidence.bankDoc,
        bankEvidence.status,
        completeness.missing_fields.length,
        complianceSummary.expired,
        complianceSummary.expiringSoon,
        complianceSummary.missing,
        contactCoverage.hasFinance,
        contactCoverage.hasPrimary,
        contactCoverage.hasSales,
        contactCoverage.hasTechnical,
        documentHealth.expired,
        documentHealth.expiringSoon,
        documentHealth.mandatoryMissingCount,
        paymentProfile.hasCreditApplication,
        paymentProfile.status,
        t,
        totalCategories,
    ]);

    const sectionNavItems = useMemo(
        (): Array<{ id: string; label: string; badge?: string }> => [
            { id: SECTION_IDS.executiveOverview, label: t('nav_overview', 'suppliers') },
            {
                id: SECTION_IDS.categories,
                label: t('nav_categories', 'suppliers'),
                badge: totalCategories > 0 ? String(totalCategories) : undefined,
            },
            { id: SECTION_IDS.legalCompliance, label: t('nav_compliance', 'suppliers') },
            { id: SECTION_IDS.banking, label: t('nav_banking', 'suppliers') },
            { id: SECTION_IDS.paymentPreferences, label: t('nav_payment', 'suppliers') },
            {
                id: SECTION_IDS.documents,
                label: t('nav_documents', 'suppliers'),
                badge: documents.length > 0 ? String(documents.length) : undefined,
            },
            {
                id: SECTION_IDS.contacts,
                label: t('nav_contacts', 'suppliers'),
                badge: (supplier.contacts?.length ?? 0) > 0 ? String(supplier.contacts?.length ?? 0) : undefined,
            },
            { id: SECTION_IDS.certifications, label: t('tab_certifications', 'suppliers') },
            { id: SECTION_IDS.activityLog, label: t('nav_activity', 'suppliers') },
        ],
        [documents.length, supplier.contacts?.length, t, totalCategories],
    );

    useEffect(() => {
        const mainEl = getScrollContainer();
        const nodes = sectionNavItems
            .map((item) => document.getElementById(item.id))
            .filter((node): node is HTMLElement => !!node);

        if (nodes.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries.filter((entry) => entry.isIntersecting);
                if (visibleEntries.length === 0) return;

                const best = visibleEntries.reduce((left, right) =>
                    right.intersectionRatio > left.intersectionRatio ? right : left,
                );
                const id = best.target.getAttribute('id');
                if (id) {
                    setActiveSectionId(id);
                }
            },
            {
                root: mainEl ?? null,
                rootMargin: '-120px 0px -60% 0px',
                threshold: [0.15, 0.2, 0.3, 0.5],
            },
        );

        for (const node of nodes) {
            observer.observe(node);
        }

        return () => observer.disconnect();
    }, [sectionNavItems]);

    return (
        <SupplierPortalLayout>
            <Head title={displayTitleCase(supplier.legal_name_en)} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {displayTitleCase(supplier.legal_name_en)}
                        </h1>
                        <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getTypeColor(
                                supplier.supplier_type,
                            )}`}
                        >
                            {t(`type_${supplier.supplier_type}` as 'type_supplier', 'suppliers')}
                        </span>
                        <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                                supplier.status,
                            )}`}
                        >
                            {t(
                                `status_${supplier.status.replace(/-/g, '_')}` as 'status_approved',
                                'suppliers',
                            )}
                        </span>
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
                    <Button size="sm" variant="outline" className="rounded-lg font-medium" asChild>
                        <Link href={route('supplier.profile.edit')}>
                            <Pencil className="h-4 w-4" />
                            {t('edit_profile', 'supplier_portal')}
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                <aside
                    id="overview"
                    className="order-2 flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start lg:order-1"
                >
                    <SupplierIdentityCard
                        companyLogoUrl={supplier.company_logo_url}
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
                        documents={documents}
                        categoriesCount={categories.length}
                        certificationsCount={supplier.certifications?.length ?? 0}
                    />

                    <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm" className="w-full" asChild>
                            <Link href={route('supplier.profile.edit')}>
                                <Pencil className="h-4 w-4" />
                                {t('edit_profile', 'supplier_portal')}
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="w-full" asChild>
                            <Link href={route('supplier.profile.edit') + '#documents'}>
                                <FilePlus2 className="h-4 w-4" />
                                {t('upload_document_short', 'supplier_portal')}
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="w-full" asChild>
                            <Link href={route('supplier.contacts.create')}>
                                <UserPlus2 className="h-4 w-4" />
                                {t('add_contact', 'supplier_portal')}
                            </Link>
                        </Button>
                    </div>
                </aside>

                <div className="order-1 min-w-0 space-y-6 lg:order-2">
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
                                                        isActive
                                                            ? 'bg-primary/15 text-primary'
                                                            : 'bg-background text-muted-foreground'
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
                                            {attentionAlerts.visible.map((alert, index) => {
                                                const classes =
                                                    alert.severity === 'critical'
                                                        ? 'border-red-200 bg-red-50 text-red-800'
                                                        : alert.severity === 'warning'
                                                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                                                          : 'border-border bg-muted text-muted-foreground';

                                                return (
                                                    <button
                                                        key={`${alert.targetId}-${index}`}
                                                        type="button"
                                                        onClick={() => scrollToSection(alert.targetId)}
                                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:text-foreground ${classes}`}
                                                    >
                                                        <span className="truncate">{alert.label}</span>
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

                    <section id={SECTION_IDS.executiveOverview}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {t('section_executive_overview', 'suppliers')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                        <p className="text-xs text-muted-foreground">
                                            {t('col_status', 'suppliers')}
                                        </p>
                                        <span
                                            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                                                supplier.status,
                                            )}`}
                                        >
                                            {t(
                                                `status_${supplier.status.replace(/-/g, '_')}` as 'status_approved',
                                                'suppliers',
                                            )}
                                        </span>
                                    </div>
                                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                        <p className="text-xs text-muted-foreground">
                                            {t('overview_compliance_readiness', 'suppliers')}
                                        </p>
                                        {(() => {
                                            const state =
                                                complianceSummary.expired > 0 || complianceSummary.missing > 0
                                                    ? 'critical'
                                                    : complianceSummary.expiringSoon > 0
                                                      ? 'needs_attention'
                                                      : 'ready';
                                            const classes =
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
                                                <span
                                                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
                                                >
                                                    {label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                        <p className="text-xs text-muted-foreground">
                                            {t('overview_banking_readiness', 'suppliers')}
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
                                            {t('overview_payment_readiness', 'suppliers')}
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
                                            {t('overview_contact_coverage', 'suppliers')}
                                        </p>
                                        {(() => {
                                            const covered =
                                                contactCoverage.total > 0 &&
                                                contactCoverage.hasPrimary &&
                                                contactCoverage.hasFinance &&
                                                contactCoverage.hasTechnical &&
                                                contactCoverage.hasSales;

                                            return (
                                                <span
                                                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
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
                                        <p className="text-xs text-muted-foreground">
                                            {t('overview_document_health', 'suppliers')}
                                        </p>
                                        {(() => {
                                            const state =
                                                documentHealth.expired > 0 ||
                                                documentHealth.mandatoryMissingCount > 0
                                                    ? 'issues'
                                                    : documentHealth.expiringSoon > 0
                                                      ? 'attention'
                                                      : 'healthy';
                                            const classes =
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
                                                <span
                                                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
                                                >
                                                    {label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                        <p className="text-xs text-muted-foreground">
                                            {t('overview_categories_assigned', 'suppliers')}
                                        </p>
                                        <p className="mt-1 text-sm font-medium tabular-nums">
                                            {totalCategories > 0 ? totalCategories : t('none', 'suppliers')}
                                        </p>
                                    </div>
                                    {lastActivity !== null && (
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">
                                                {t('overview_last_activity', 'suppliers')}
                                            </p>
                                            <p className="mt-1 text-sm font-medium" dir="ltr">
                                                {new Date(lastActivity).toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-lg border border-border/60 bg-card p-4">
                                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                                        {t('section_company_summary', 'suppliers')}
                                    </h3>
                                    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                                        <div>
                                            <dt className="inline text-muted-foreground">
                                                {t('legal_name_label', 'suppliers')}
                                            </dt>
                                            <dd className="ms-2 inline font-medium" dir="auto">
                                                {displayTitleCase(supplier.legal_name_en)}
                                            </dd>
                                        </div>
                                        {supplier.trade_name && (
                                            <div>
                                                <dt className="inline text-muted-foreground">
                                                    {t('trade_name_label', 'suppliers')}
                                                </dt>
                                                <dd className="ms-2 inline font-medium">
                                                    {displayUppercase(supplier.trade_name)}
                                                </dd>
                                            </div>
                                        )}
                                        {supplier.commercial_registration_no && (
                                            <div>
                                                <dt className="inline text-muted-foreground">
                                                    {t('field_cr_number', 'suppliers')}
                                                </dt>
                                                <dd className="ms-2 inline font-mono text-xs" dir="ltr">
                                                    {supplier.commercial_registration_no}
                                                </dd>
                                            </div>
                                        )}
                                        {supplier.vat_number && (
                                            <div>
                                                <dt className="inline text-muted-foreground">
                                                    {t('field_vat_number', 'suppliers')}
                                                </dt>
                                                <dd className="ms-2 inline font-mono text-xs" dir="ltr">
                                                    {supplier.vat_number}
                                                </dd>
                                            </div>
                                        )}
                                        {supplier.unified_number && (
                                            <div>
                                                <dt className="inline text-muted-foreground">
                                                    {t('unified_number', 'suppliers')}
                                                </dt>
                                                <dd className="ms-2 inline font-mono text-xs" dir="ltr">
                                                    {supplier.unified_number}
                                                </dd>
                                            </div>
                                        )}
                                        <div>
                                            <dt className="inline text-muted-foreground">
                                                {t('filter_type', 'suppliers')}
                                            </dt>
                                            <dd className="ms-2 inline">
                                                {t(`type_${supplier.supplier_type}` as 'type_supplier', 'suppliers')}
                                            </dd>
                                        </div>
                                        {supplier.classification_grade && (
                                            <div>
                                                <dt className="inline text-muted-foreground">
                                                    {t('classification_grade', 'suppliers')}
                                                </dt>
                                                <dd className="ms-2 inline">
                                                    {supplier.classification_grade}
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    <section id={SECTION_IDS.categories}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {t('section_categories_360', 'suppliers')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {totalCategories === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                                        <p>{t('no_categories', 'suppliers')}</p>
                                        <div className="mt-3">
                                            <Button asChild size="sm">
                                                <Link href={route('supplier.profile.edit')}>
                                                    <Pencil className="h-4 w-4" />
                                                    {t('edit_profile', 'supplier_portal')}
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid gap-3 text-sm sm:grid-cols-3">
                                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {t('categories', 'suppliers')}
                                                </p>
                                                <p className="mt-1 font-medium tabular-nums">{totalCategories}</p>
                                            </div>
                                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {t('active', 'supplier_categories')}
                                                </p>
                                                <p className="mt-1 font-medium tabular-nums">
                                                    {activeCategories}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {t('inactive', 'supplier_categories')}
                                                </p>
                                                <p className="mt-1 font-medium tabular-nums">
                                                    {inactiveCategories}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {distinctLevels.map((level) => {
                                                const levelItems = categories.filter((category) => category.level === level);
                                                if (levelItems.length === 0) return null;

                                                return (
                                                    <div key={level}>
                                                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                            {t('category_level_label', 'suppliers', { level })}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {levelItems.map((category) => {
                                                                const name =
                                                                    locale === 'ar' && category.name_ar
                                                                        ? category.name_ar
                                                                        : category.name_en;
                                                                const isInactive = category.is_active === false;

                                                                return (
                                                                    <div
                                                                        key={category.id}
                                                                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-xs"
                                                                    >
                                                                        <span className="font-medium" dir="auto">
                                                                            {name}
                                                                        </span>
                                                                        <span className="text-[10px] text-muted-foreground" dir="ltr">
                                                                            ({category.code})
                                                                        </span>
                                                                        {category.supplier_type && (
                                                                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                                                {category.supplier_type}
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

                                            {categories.filter((category) => category.level == null).length > 0 && (
                                                <div>
                                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                        {t('category_level_other', 'suppliers')}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {categories
                                                            .filter((category) => category.level == null)
                                                            .map((category) => {
                                                                const name =
                                                                    locale === 'ar' && category.name_ar
                                                                        ? category.name_ar
                                                                        : category.name_en;
                                                                const isInactive = category.is_active === false;

                                                                return (
                                                                    <div
                                                                        key={category.id}
                                                                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-xs"
                                                                    >
                                                                        <span className="font-medium" dir="auto">
                                                                            {name}
                                                                        </span>
                                                                        <span className="text-[10px] text-muted-foreground" dir="ltr">
                                                                            ({category.code})
                                                                        </span>
                                                                        {category.supplier_type && (
                                                                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                                                {category.supplier_type}
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

                    <section id={SECTION_IDS.legalCompliance}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        {t('section_legal_compliance', 'suppliers')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">
                                                {t('col_compliance', 'suppliers')}
                                            </p>
                                            <span
                                                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getComplianceColor(
                                                    supplier.compliance_status,
                                                )}`}
                                            >
                                                {supplier.compliance_status}
                                            </span>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">
                                                {t('compliance_tracked_items', 'suppliers')}
                                            </p>
                                            <p className="mt-1 font-medium tabular-nums">
                                                {complianceSummary.total}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">
                                                {t('compliance_expired', 'suppliers')}
                                            </p>
                                            <p className="mt-1 font-medium tabular-nums text-red-700">
                                                {complianceSummary.expired}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">
                                                {t('compliance_expiring_soon', 'suppliers')}
                                            </p>
                                            <p className="mt-1 font-medium tabular-nums text-amber-700">
                                                {complianceSummary.expiringSoon}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">
                                                {t('compliance_missing', 'suppliers')}
                                            </p>
                                            <p className="mt-1 font-medium tabular-nums text-slate-600">
                                                {complianceSummary.missing}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {legalItems.map((item) => {
                                            const hasValue = !!item.number;
                                            const hasDoc = !!item.doc;
                                            const status = getComplianceItemStatus(
                                                item.expiry,
                                                hasValue,
                                                hasDoc,
                                                item.expectsExpiry,
                                            );
                                            const remainingDays =
                                                item.expectsExpiry && item.expiry
                                                    ? getRemainingDays(item.expiry)
                                                    : null;

                                            return (
                                                <div
                                                    key={item.key}
                                                    className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-foreground">
                                                            {t(item.titleKey, 'suppliers')}
                                                        </p>
                                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                            {item.number ? (
                                                                <span
                                                                    dir="ltr"
                                                                    className="font-mono text-xs tabular-nums text-muted-foreground"
                                                                >
                                                                    {item.number}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">
                                                                    —
                                                                </span>
                                                            )}
                                                            {item.expiry && (
                                                                <span
                                                                    className="text-xs text-muted-foreground"
                                                                    dir="ltr"
                                                                >
                                                                    {t('compliance_expiry', 'suppliers')}: {item.expiry}
                                                                </span>
                                                            )}
                                                            {hasDoc && (
                                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                    {item.doc?.file_name ??
                                                                        t('document_attached', 'suppliers')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-shrink-0 items-center gap-2">
                                                        {remainingDays !== null && (
                                                            <span
                                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getRemainingDaysColor(
                                                                    remainingDays,
                                                                )}`}
                                                                title={item.expiry ?? undefined}
                                                            >
                                                                {remainingDays <= 0
                                                                    ? t('status_expired', 'suppliers')
                                                                    : t('compliance_days_remaining', 'suppliers', {
                                                                          days: remainingDays,
                                                                      })}
                                                            </span>
                                                        )}
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getComplianceStatusColor(
                                                                status,
                                                            )}`}
                                                        >
                                                            {status === 'missing' &&
                                                                t('status_missing', 'suppliers')}
                                                            {status === 'expired' &&
                                                                t('status_expired', 'suppliers')}
                                                            {status === 'expiring_soon' &&
                                                                t('status_expiring_soon', 'suppliers')}
                                                            {status === 'valid' &&
                                                                t('status_valid', 'suppliers')}
                                                            {status === 'info_only' &&
                                                                t('status_info_only', 'suppliers')}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            <div id={SECTION_IDS.banking}>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            {t('section_banking_snapshot', 'suppliers')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
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
                                                    {supplier.bank_account_name
                                                        ? t('yes', 'suppliers')
                                                        : t('no', 'suppliers')}
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
                                                            <span
                                                                className="truncate"
                                                                title={bankEvidence.bankDoc.file_name}
                                                            >
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

                                        <div className="grid gap-4 md:grid-cols-2">
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

                                            <div className="space-y-1.5 text-sm">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    {t('bank_account', 'suppliers')}
                                                </p>
                                                <p>
                                                    <span className="text-muted-foreground">
                                                        {t('bank_account_name', 'suppliers')}:
                                                    </span>{' '}
                                                    {supplier.bank_account_name ? (
                                                        <span>
                                                            {displayTitleCase(supplier.bank_account_name)}
                                                        </span>
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

                                        {!supplier.bank_name &&
                                            !supplier.bank_account_name &&
                                            !supplier.iban &&
                                            !supplier.bank_account_number && (
                                                <p className="border-t border-border/60 pt-2 text-xs text-amber-700">
                                                    {t('bank_missing_core_warning', 'suppliers')}
                                                </p>
                                            )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </section>

                    <section id={SECTION_IDS.paymentPreferences}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {t('section_payment_preferences', 'suppliers')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
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
                                            {paymentProfile.hasTerms
                                                ? t('yes', 'suppliers')
                                                : t('no', 'suppliers')}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                        <p className="text-xs text-muted-foreground">
                                            {t('credit_limit_present', 'suppliers')}
                                        </p>
                                        <p className="mt-1 font-medium">
                                            {paymentProfile.hasCreditLimit
                                                ? t('yes', 'suppliers')
                                                : t('no', 'suppliers')}
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
                                                        supplier.preferred_currency ?? undefined,
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

                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {t('payment_supporting_docs', 'suppliers')}
                                    </p>
                                    {creditApplicationDoc ? (
                                        <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs">
                                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span
                                                className="truncate"
                                                title={creditApplicationDoc.file_name}
                                            >
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

                    <section id={SECTION_IDS.documents}>
                        <DocumentsSection
                            supplier={supplier}
                            manageHref={route('supplier.profile.edit') + '#documents'}
                            manageLabel={t('upload_document_short', 'supplier_portal')}
                            emptyActionLabel={t('profile_upload_first_document', 'supplier_portal')}
                            showDeleteAction={false}
                        />
                    </section>

                    <section id={SECTION_IDS.contacts}>
                        <ContactsSection
                            supplier={supplier}
                            addContactHref={route('supplier.contacts.create')}
                            addContactLabel={t('add_contact', 'supplier_portal')}
                            showInlineManageActions={false}
                        />
                    </section>

                    <section id={SECTION_IDS.certifications}>
                        <CapabilitiesSection supplier={supplier} />
                    </section>

                    <section id={SECTION_IDS.activityLog}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
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
        </SupplierPortalLayout>
    );
}
