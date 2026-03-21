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
import { Textarea } from '@/Components/ui/Textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import type { Supplier } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLocale } from '@/hooks/useLocale';
import {
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Image as ImageIcon,
    MapPin,
    Trash2,
} from 'lucide-react';
import { getLocalizedSupplierName } from '@/utils/supplierDisplay';
import { displayTitleCase } from '@/utils/textDisplay';
import { CategorySelector, type CategoryOption as CategorySelectorOption } from '@/Components/Suppliers/CategorySelector';
import { SupplierImageUploadField } from '@/Components/SupplierPortal/SupplierImageUploadField';
import { DocumentPreviewPanel } from '@/Components/Supplier/Documents/DocumentPreviewPanel';
import { DocumentPreviewModal } from '@/Components/Supplier/Documents/DocumentPreviewModal';
import LinkedExpiryFieldHint from '@/Components/Supplier/Documents/LinkedExpiryFieldHint';
import EditProfileSummaryCard from '@/Components/Supplier/EditProfileSummaryCard';
import ContactCard from '@/Components/Supplier/Contacts/ContactCard';
import {
    ContactFormModal,
    type ContactFormInitialData,
    type ContactFormMode,
} from '@/Components/Supplier/Contacts/ContactFormModal';
import { ImageCropper } from '@/Components/ui/ImageCropper';
import { confirmDelete } from '@/Services/confirm';


interface CategoryOption extends CategorySelectorOption {
    // Keep backward compatibility with older payload shapes.
    supplier_type?: string;
}

interface EditProps {
    supplier: Supplier;
    categories: CategoryOption[];
    locations: Record<string, string[]>;
    supplierTypeCategoryMap?: Record<string, string[]>;
    documentExpiryLinks?: Record<string, { field: string }>;
}

const SUPPLIER_TYPE_KEYS: Record<string, string> = {
    supplier: 'profile_type_supplier',
    subcontractor: 'profile_type_subcontractor',
    service_provider: 'profile_type_service',
    consultant: 'profile_type_consultant',
};

const SAUDI_BANKS: string[] = [
    'Al Rajhi Bank',
    'National Commercial Bank',
    'Riyad Bank',
    'Samba Financial Group',
    'Banque Saudi Fransi',
    'Saudi British Bank',
    'Arab National Bank',
    'Alinma Bank',
    'Bank AlJazira',
    'Saudi Investment Bank',
];

export default function Edit({
    supplier,
    categories,
    locations,
    documentExpiryLinks = {},
}: EditProps) {
    const [crCheckMessage, setCrCheckMessage] = useState<string | null>(null);
    const { t } = useLocale('suppliers');

    const form = useForm({
        legal_name_en: supplier.legal_name_en,
        legal_name_ar: supplier.legal_name_ar ?? '',
        trade_name: supplier.trade_name ?? '',
        supplier_type: supplier.supplier_type,
        country: supplier.country,
        city: supplier.city,
        postal_code: supplier.postal_code ?? '',
        address: supplier.address ?? '',
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        website: supplier.website ?? '',
        notes: supplier.notes ?? '',
        commercial_registration_no: supplier.commercial_registration_no ?? '',
        cr_expiry_date: supplier.cr_expiry_date ? supplier.cr_expiry_date.substring(0, 10) : '',
        vat_number: supplier.vat_number ?? '',
        vat_expiry_date: supplier.vat_expiry_date ? supplier.vat_expiry_date.substring(0, 10) : '',
        unified_number: supplier.unified_number ?? '',
        business_license_number: supplier.business_license_number ?? '',
        license_expiry_date: supplier.license_expiry_date
            ? supplier.license_expiry_date.substring(0, 10)
            : '',
        chamber_of_commerce_number: supplier.chamber_of_commerce_number ?? '',
        classification_grade: supplier.classification_grade ?? '',
        bank_name: supplier.bank_name ?? '',
        bank_country: supplier.bank_country ?? '',
        bank_account_name: supplier.bank_account_name ?? '',
        bank_account_number: supplier.bank_account_number ?? '',
        iban: supplier.iban ?? '',
        swift_code: supplier.swift_code ?? '',
        preferred_currency: supplier.preferred_currency ?? '',
        payment_terms_days: supplier.payment_terms_days ?? '',
        credit_limit: supplier.credit_limit ?? '',
        tax_withholding_rate: supplier.tax_withholding_rate ?? '',
        risk_score: supplier.risk_score ?? '',
        // Media/document uploads (match supplier portal edit experience)
        company_logo: null as File | null,
        credit_application: null as File | null,
        cr_document: null as File | null,
        vat_document: null as File | null,
        unified_document: null as File | null,
        national_address_document: null as File | null,
        bank_certificate: null as File | null,
        category_ids: supplier.categories?.map((c) => c.id) ?? [],
    });

    const checkCr = useCallback(() => {
        const cr = form.data.commercial_registration_no?.trim();
        if (!cr) {
            setCrCheckMessage(null);
            return;
        }
        const url = `${route('suppliers.check-cr')}?cr_number=${encodeURIComponent(cr)}&supplier_id=${encodeURIComponent(supplier.id)}`;
        fetch(url)
            .then((res) => res.json())
            .then((data: { available?: boolean; message?: string }) => {
                setCrCheckMessage(data.message ?? null);
            })
            .catch(() => setCrCheckMessage(t('cr_check_failed', 'suppliers')));
    }, [form.data.commercial_registration_no, supplier.id, t]);

    const toggleCategory = (id: string) => {
        const next = form.data.category_ids.includes(id)
            ? form.data.category_ids.filter((c) => c !== id)
            : [...form.data.category_ids, id];
        form.setData('category_ids', next);
    };

    const locale = (usePage().props as { locale?: string }).locale ?? 'en';
    const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
    const categoryRoots = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
    const getCategoryChildren = useCallback(
        (parentId: string) => categories.filter((c) => c.parent_id === parentId),
        [categories]
    );

    const countries = useMemo(
        () => Array.from(new Set(Object.keys(locations).filter(Boolean))),
        [locations]
    );
    const cities = useMemo(
        () =>
            form.data.country
                ? Array.from(new Set((locations[form.data.country] ?? []).filter(Boolean)))
                : [],
        [form.data.country, locations]
    );

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('suppliers.update', supplier.id), {
            forceFormData: true,
            preserveScroll: true,
            onError: (errors) => {
                const errorFields = Object.keys(errors ?? {});
                const firstError = errorFields[0];

                const fieldToTab = (field?: string): TabId => {
                    switch (field) {
                    case 'legal_name_en':
                    case 'legal_name_ar':
                    case 'supplier_type':
                        return 'section-company';
                    case 'country':
                    case 'city':
                        return 'section-location';
                    case 'email':
                    case 'phone':
                    case 'website':
                        return 'section-contact';
                    case 'commercial_registration_no':
                    case 'cr_expiry_date':
                    case 'vat_expiry_date':
                    case 'license_expiry_date':
                    case 'vat_number':
                    case 'unified_number':
                    case 'business_license_number':
                    case 'chamber_of_commerce_number':
                    case 'classification_grade':
                        return 'section-legal';
                    case 'bank_name':
                    case 'bank_country':
                    case 'bank_account_name':
                    case 'bank_account_number':
                    case 'iban':
                    case 'swift_code':
                        return 'section-banking';
                    case 'preferred_currency':
                    case 'payment_terms_days':
                    case 'tax_withholding_rate':
                    case 'workforce_size':
                    case 'credit_application':
                    case 'notes':
                        return 'section-financial';
                    case 'category_ids':
                    case 'category_ids.*':
                        return 'section-categories';
                    case 'cr_document':
                    case 'vat_document':
                    case 'unified_document':
                    case 'national_address_document':
                    case 'bank_certificate':
                        return 'section-documents';
                    default:
                        return 'section-company';
                    }
                };

                if (firstError) setActiveTabId(fieldToTab(firstError));

                if (typeof window !== 'undefined' && errorFields.length > 0) {
                    const firstEl = document.getElementById(firstError);
                    if (firstEl) {
                        firstEl.focus();
                    } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
            },
            onSuccess: () => {
                setActiveTabId('section-company');
                router.reload({ only: ['supplier'] });
            },
        });
    };

    type TabId =
        | 'section-company'
        | 'section-contact'
        | 'section-location'
        | 'section-legal'
        | 'section-banking'
        | 'section-financial'
        | 'section-categories'
        | 'section-contacts'
        | 'section-documents';

    type TabStatus = 'complete' | 'incomplete' | 'error';

    const sectionOrder: { id: TabId; key: string }[] = [
        { id: 'section-company', key: 'profile_section_basic' },
        { id: 'section-contact', key: 'profile_section_contact' },
        { id: 'section-location', key: 'profile_section_address' },
        { id: 'section-legal', key: 'profile_section_legal' },
        { id: 'section-banking', key: 'profile_section_banking' },
        { id: 'section-financial', key: 'profile_section_financial' },
        { id: 'section-categories', key: 'profile_section_categories' },
        { id: 'section-contacts', key: 'profile_contacts' },
        { id: 'section-documents', key: 'profile_documents' },
    ];

    const getTabStatus = (id: TabId): TabStatus => {
        const errors = form.errors as Record<string, unknown>;

        const hasError =
            id === 'section-company' &&
            ['legal_name_en', 'legal_name_ar', 'supplier_type'].some((f) => !!errors[f]);

        // Tabs with client-side required fields show errors via those fields.
        if (hasError) return 'error';

        if (id === 'section-company') {
            const complete =
                String(form.data.legal_name_en ?? '').trim().length > 0 &&
                String(form.data.legal_name_ar ?? '').trim().length > 0 &&
                String(form.data.supplier_type ?? '').trim().length > 0;
            return complete ? 'complete' : 'incomplete';
        }

        if (id === 'section-location') {
            const hasErr = ['country', 'city'].some((f) => !!errors[f]);
            if (hasErr) return 'error';
            const complete =
                String(form.data.country ?? '').trim().length > 0 &&
                String(form.data.city ?? '').trim().length > 0;
            return complete ? 'complete' : 'incomplete';
        }

        if (id === 'section-categories') {
            const hasErr = !!errors.category_ids;
            if (hasErr) return 'error';
            const complete = (form.data.category_ids?.length ?? 0) > 0;
            return complete ? 'complete' : 'incomplete';
        }

        if (id === 'section-contacts') {
            const contacts = (supplier as any).contacts as unknown[] | undefined;
            const contactsArr = Array.isArray(contacts) ? contacts : [];
            const hasPrimary =
                contactsArr.length > 0 &&
                contactsArr.some((c) => typeof (c as any).is_primary === 'boolean' && (c as any).is_primary);
            return hasPrimary ? 'complete' : 'incomplete';
        }

        if (id === 'section-documents') {
            const summary = ((supplier as any).document_summary ?? null) as
                | {
                    cr?: { file_name?: string | null } | null;
                    vat?: { file_name?: string | null } | null;
                    unified?: { file_name?: string | null } | null;
                    national_address?: { file_name?: string | null } | null;
                }
                | null;

            const hasCr = !!summary?.cr || !!form.data.cr_document;
            const hasVat = !!summary?.vat || !!form.data.vat_document;
            const hasUnified = !!summary?.unified || !!form.data.unified_document;
            const hasNationalAddress =
                !!summary?.national_address || !!form.data.national_address_document;

            const hasErr = ['cr_document', 'vat_document', 'unified_document', 'national_address_document', 'bank_certificate'].some(
                (f) => !!errors[f]
            );
            if (hasErr) return 'error';

            const complete = hasCr && hasVat && hasUnified && hasNationalAddress;
            return complete ? 'complete' : 'incomplete';
        }

        // Other tabs: no required fields.
        return 'complete';
    };

    const [activeTabId, setActiveTabId] = useState<TabId>(() => {
        if (typeof window === 'undefined') {
            return 'section-company';
        }

        if (window.location.hash === '#documents') {
            return 'section-documents';
        }

        if (window.location.hash === '#contacts') {
            return 'section-contacts';
        }

        return 'section-company';
    });

    const tabStatuses = useMemo(() => {
        return sectionOrder.map(({ id }) => ({
            id,
            status: getTabStatus(id),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data, form.errors, supplier]);

    const completedTabs = tabStatuses.filter((s) => s.status === 'complete').length;
    const totalTabs = tabStatuses.length;
    const overallPercent = totalTabs > 0 ? Math.round((completedTabs / totalTabs) * 100) : 0;

    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [contactFormMode, setContactFormMode] = useState<ContactFormMode>('create');
    const [contactFormInitial, setContactFormInitial] = useState<ContactFormInitialData | null>(null);

    const [docPreviewModal, setDocPreviewModal] = useState<{
        label: string;
        fileName?: string | null;
        mimeType?: string | null;
        previewUrl?: string | null;
    } | null>(null);

    const companyLogoInputRef = useRef<HTMLInputElement>(null);
    const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(
        (supplier as any).company_logo_url ?? null
    );
    const logoPreviewObjectUrlRef = useRef<string | null>(null);
    const [logoCropFile, setLogoCropFile] = useState<File | null>(null);
    const [logoCropOpen, setLogoCropOpen] = useState(false);

    const crInputRef = useRef<HTMLInputElement>(null);
    const vatInputRef = useRef<HTMLInputElement>(null);
    const unifiedInputRef = useRef<HTMLInputElement>(null);
    const nationalAddressInputRef = useRef<HTMLInputElement>(null);
    const bankCertInputRef = useRef<HTMLInputElement>(null);
    const creditAppInputRef = useRef<HTMLInputElement>(null);

    const crLocalPreviewRef = useRef<string | null>(null);
    const vatLocalPreviewRef = useRef<string | null>(null);
    const unifiedLocalPreviewRef = useRef<string | null>(null);
    const nationalLocalPreviewRef = useRef<string | null>(null);
    const bankLocalPreviewRef = useRef<string | null>(null);

    const [crLocalPreviewUrl, setCrLocalPreviewUrl] = useState<string | null>(null);
    const [vatLocalPreviewUrl, setVatLocalPreviewUrl] = useState<string | null>(null);
    const [unifiedLocalPreviewUrl, setUnifiedLocalPreviewUrl] = useState<string | null>(null);
    const [nationalLocalPreviewUrl, setNationalLocalPreviewUrl] = useState<string | null>(null);
    const [bankLocalPreviewUrl, setBankLocalPreviewUrl] = useState<string | null>(null);

    const handleDocumentSelection = (
        field: 'cr_document' | 'vat_document' | 'unified_document' | 'national_address_document' | 'bank_certificate',
        file: File | null,
        previewRef: React.MutableRefObject<string | null>,
        setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>
    ) => {
        form.setData(field, file);
        if (previewRef.current) {
            URL.revokeObjectURL(previewRef.current);
            previewRef.current = null;
        }
        if (!file) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        previewRef.current = url;
        setPreviewUrl(url);
    };

    useEffect(() => {
        return () => {
            // Revoke any object URLs to avoid memory leaks.
            [
                crLocalPreviewRef,
                vatLocalPreviewRef,
                unifiedLocalPreviewRef,
                nationalLocalPreviewRef,
                bankLocalPreviewRef,
            ].forEach(
                (r) => {
                    if (r.current) URL.revokeObjectURL(r.current);
                }
            );
            if (logoPreviewObjectUrlRef.current) URL.revokeObjectURL(logoPreviewObjectUrlRef.current);
        };
    }, []);

    const hasAny = useCallback((value: unknown): boolean => {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'number') return !Number.isNaN(value);
        if (typeof value === 'string') return value.trim().length > 0;
        return value !== null && value !== undefined;
    }, []);

    const sectionStatuses = useMemo(() => {
        const companyComplete = hasAny(form.data.legal_name_en) && hasAny(form.data.supplier_type);
        const contactComplete = hasAny(form.data.email) || hasAny(form.data.phone) || hasAny(form.data.website);
        const locationComplete = hasAny(form.data.country) && hasAny(form.data.city);
        const legalComplete = hasAny(form.data.commercial_registration_no) || hasAny(form.data.vat_number);
        const bankingComplete = hasAny(form.data.bank_name) || hasAny(form.data.iban) || hasAny(form.data.bank_account_number);
        const financialComplete = hasAny(form.data.preferred_currency) || hasAny(form.data.payment_terms_days) || hasAny(form.data.credit_limit) || hasAny(form.data.tax_withholding_rate);
        const categoriesComplete = (form.data.category_ids?.length ?? 0) > 0;

        const items = [
            { key: 'company', label: t('section_basic', 'suppliers'), complete: companyComplete },
            { key: 'contact', label: t('section_contact', 'suppliers'), complete: contactComplete },
            { key: 'location', label: t('section_location', 'suppliers'), complete: locationComplete },
            { key: 'legal', label: t('section_legal', 'suppliers'), complete: legalComplete },
            { key: 'banking', label: t('banking', 'suppliers'), complete: bankingComplete },
            { key: 'financial', label: t('section_financial', 'suppliers'), complete: financialComplete },
            { key: 'categories', label: t('tab_categories', 'suppliers'), complete: categoriesComplete },
        ];

        const done = items.filter((i) => i.complete).length;
        const total = items.length;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;

        const missing: string[] = [];
        if (!hasAny(form.data.legal_name_en)) missing.push(t('field_name', 'suppliers') + ' (EN)');
        if (!hasAny(form.data.supplier_type)) missing.push(t('col_type', 'suppliers'));
        if (!hasAny(form.data.country)) missing.push(t('field_country', 'suppliers'));
        if (!hasAny(form.data.city)) missing.push(t('field_city', 'suppliers'));
        if ((form.data.category_ids?.length ?? 0) === 0) missing.push(t('tab_categories', 'suppliers'));

        return { items, done, total, percent, missing };
    }, [form.data, hasAny, t]);

    const supplierDisplayName = displayTitleCase(getLocalizedSupplierName(supplier as unknown as any, locale));
    const supplierStatusLabel = supplier.status
        ? (() => {
            const statusKey = `status_${supplier.status}`;
            const translated = t(statusKey, 'suppliers');

            return translated === statusKey ? displayTitleCase(String(supplier.status)) : translated;
        })()
        : '—';
    const focusLinkedExpiryField = useCallback((fieldId: string) => {
        setActiveTabId('section-legal');

        if (typeof window === 'undefined') {
            return;
        }

        window.requestAnimationFrame(() => {
            window.setTimeout(() => {
                const element = document.getElementById(fieldId) as HTMLInputElement | null;
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element?.focus();
            }, 80);
        });
    }, []);

    const supplierContacts = ((supplier as any).contacts ?? []) as Array<any>;
    const supplierDocumentSummary = ((supplier as any).document_summary ?? null) as
        | Record<string, any>
        | null;

    const documentRows = [
        {
            key: 'cr_document' as const,
            documentType: 'commercial_registration',
            title: t('doc_type_commercial_registration', 'documents'),
            uploadLabel: t('upload_cr_document', 'supplier_portal'),
            helperText: t('upload_document_help', 'supplier_portal'),
            summary: supplierDocumentSummary?.cr ?? null,
            selectedFile: form.data.cr_document,
            selectedPreviewUrl: crLocalPreviewUrl,
            inputRef: crInputRef,
            error: (form.errors as any).cr_document ?? null,
            onSelect: (file: File | null) => handleDocumentSelection('cr_document', file, crLocalPreviewRef, setCrLocalPreviewUrl),
        },
        {
            key: 'vat_document' as const,
            documentType: 'vat_certificate',
            title: t('doc_type_vat_certificate', 'documents'),
            uploadLabel: t('upload_vat_document', 'supplier_portal'),
            helperText: t('upload_document_help', 'supplier_portal'),
            summary: supplierDocumentSummary?.vat ?? null,
            selectedFile: form.data.vat_document,
            selectedPreviewUrl: vatLocalPreviewUrl,
            inputRef: vatInputRef,
            error: (form.errors as any).vat_document ?? null,
            onSelect: (file: File | null) => handleDocumentSelection('vat_document', file, vatLocalPreviewRef, setVatLocalPreviewUrl),
        },
        {
            key: 'unified_document' as const,
            documentType: 'unified_number',
            title: t('doc_type_unified_number', 'documents'),
            uploadLabel: t('upload_unified_document', 'supplier_portal'),
            helperText: t('upload_document_help', 'supplier_portal'),
            summary: supplierDocumentSummary?.unified ?? null,
            selectedFile: form.data.unified_document,
            selectedPreviewUrl: unifiedLocalPreviewUrl,
            inputRef: unifiedInputRef,
            error: (form.errors as any).unified_document ?? null,
            onSelect: (file: File | null) =>
                handleDocumentSelection('unified_document', file, unifiedLocalPreviewRef, setUnifiedLocalPreviewUrl),
        },
        {
            key: 'national_address_document' as const,
            documentType: 'national_address',
            title: t('doc_type_national_address', 'documents'),
            uploadLabel: t('doc_type_national_address', 'documents'),
            helperText: t('upload_document_help', 'supplier_portal'),
            summary: supplierDocumentSummary?.national_address ?? null,
            selectedFile: form.data.national_address_document,
            selectedPreviewUrl: nationalLocalPreviewUrl,
            inputRef: nationalAddressInputRef,
            error: (form.errors as any).national_address_document ?? null,
            onSelect: (file: File | null) =>
                handleDocumentSelection(
                    'national_address_document',
                    file,
                    nationalLocalPreviewRef,
                    setNationalLocalPreviewUrl
                ),
        },
        {
            key: 'bank_certificate' as const,
            documentType: 'bank_letter',
            title: t('doc_type_bank_letter', 'documents'),
            uploadLabel: t('bank_account_certificate', 'supplier_portal'),
            helperText: t('bank_certificate_help', 'supplier_portal'),
            summary: supplierDocumentSummary?.bank_certificate ?? null,
            selectedFile: form.data.bank_certificate,
            selectedPreviewUrl: bankLocalPreviewUrl,
            inputRef: bankCertInputRef,
            error: (form.errors as any).bank_certificate ?? null,
            onSelect: (file: File | null) =>
                handleDocumentSelection('bank_certificate', file, bankLocalPreviewRef, setBankLocalPreviewUrl),
        },
    ];

    const scrollToManagedDocumentUploads = useCallback(() => {
        if (typeof document === 'undefined') {
            return;
        }

        document.getElementById('managed-document-uploads')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (window.location.hash !== '#documents' || activeTabId !== 'section-documents') {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            scrollToManagedDocumentUploads();
        });

        return () => window.cancelAnimationFrame(frame);
    }, [activeTabId, scrollToManagedDocumentUploads]);

    const missingRequiredDocumentTitles = documentRows
        .filter((document) =>
            ['commercial_registration', 'national_address', 'vat_certificate', 'unified_number']
                .includes(document.documentType)
        )
        .filter((document) => !document.summary && !document.selectedFile)
        .map((document) => document.title);
    const requiredDocsStatus =
        missingRequiredDocumentTitles.length === 0
            ? t('edit_required_docs_complete', 'supplier_portal')
            : t('edit_required_docs_missing', 'supplier_portal', {
                count: missingRequiredDocumentTitles.length,
            });
    const requiredDocsDetail =
        missingRequiredDocumentTitles.length > 0
            ? missingRequiredDocumentTitles.join(' • ')
            : null;
    const completedSectionsLabel = t('edit_sections_complete', 'supplier_portal')
        .replace(':done', String(completedTabs))
        .replace(':total', String(totalTabs));

    return (
        <AppLayout>
            <Head title={t('edit_profile', 'supplier_portal')} />
            <div className="space-y-4">
                <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label={t('breadcrumb_aria', 'supplier_portal')}>
                    <Link href={route('suppliers.index')} className="hover:text-foreground">
                        {t('title_index', 'suppliers')}
                    </Link>
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                    <Link href={route('suppliers.show', supplier.id)} className="hover:text-foreground" dir="auto">
                        {supplierDisplayName}
                    </Link>
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="font-medium text-foreground">
                        {t('edit_profile', 'supplier_portal')}
                    </span>
                </nav>

                <div className="rounded-xl border border-border/60 bg-card px-4 py-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1 text-start">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                {t('edit_profile', 'supplier_portal')}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t('edit_profile_helper', 'supplier_portal')}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {supplier.supplier_code && (
                                    <span className="inline-flex items-center gap-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                                            {t('supplier_code', 'supplier_portal')}:
                                        </span>{' '}
                                        <span dir="ltr" className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                                            {supplier.supplier_code}
                                        </span>
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                                    <span>{supplierStatusLabel}</span>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="font-medium text-foreground">
                                        {t('edit_profile_completeness', 'supplier_portal')}:
                                    </span>
                                    <span className="tabular-nums">{overallPercent}%</span>
                                </span>
                                <span>{completedSectionsLabel}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Link href={route('suppliers.show', supplier.id)}>
                                <Button type="button" variant="outline" size="sm">
                                    {t('back_to_profile', 'supplier_portal')}
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                size="sm"
                                form="supplier-admin-edit-form"
                                disabled={form.processing}
                            >
                                {form.processing ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        {t('saving_changes', 'supplier_portal')}
                                    </span>
                                ) : (
                                    t('save_changes', 'supplier_portal')
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                <EditProfileSummaryCard
                    supplierCode={supplier.supplier_code}
                    supplierStatusLabel={supplierStatusLabel}
                    completenessPercent={overallPercent}
                    completedSectionsLabel={completedSectionsLabel}
                    requiredDocsStatus={requiredDocsStatus}
                    requiredDocsDetail={requiredDocsDetail}
                />

                <div className="space-y-6">
                    {/* Tabs */}
                    <div
                        className="flex flex-wrap gap-2"
                        role="tablist"
                        aria-label={t('edit_section_jump', 'supplier_portal')}
                    >
                        {sectionOrder.map(({ id, key }) => {
                            const isActive = activeTabId === id;
                            const status = getTabStatus(id);
                            const baseId = `${id}-tab`;
                            const statusLabelKey =
                                status === 'complete'
                                    ? 'edit_tab_complete'
                                    : status === 'error'
                                      ? 'edit_tab_error'
                                      : 'edit_tab_incomplete';

                            const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
                                const currentIndex = sectionOrder.findIndex((s) => s.id === id);
                                if (currentIndex === -1) return;

                                const isRtl = locale === 'ar';
                                let nextIndex = currentIndex;

                                switch (event.key) {
                                case 'ArrowRight':
                                    nextIndex = isRtl
                                        ? (currentIndex - 1 + sectionOrder.length) % sectionOrder.length
                                        : (currentIndex + 1) % sectionOrder.length;
                                    event.preventDefault();
                                    break;
                                case 'ArrowLeft':
                                    nextIndex = isRtl
                                        ? (currentIndex + 1) % sectionOrder.length
                                        : (currentIndex - 1 + sectionOrder.length) % sectionOrder.length;
                                    event.preventDefault();
                                    break;
                                case 'Home':
                                    nextIndex = 0;
                                    event.preventDefault();
                                    break;
                                case 'End':
                                    nextIndex = sectionOrder.length - 1;
                                    event.preventDefault();
                                    break;
                                case 'Enter':
                                case ' ':
                                    setActiveTabId(id);
                                    event.preventDefault();
                                    return;
                                default:
                                    return;
                                }

                                const nextTab = sectionOrder[nextIndex];
                                setActiveTabId(nextTab.id);
                                const nextButton = document.getElementById(`${nextTab.id}-tab`);
                                nextButton?.focus();
                            };

                            const statusDotClass =
                                status === 'complete'
                                    ? 'bg-emerald-500'
                                    : status === 'error'
                                      ? 'bg-amber-500'
                                      : 'bg-muted-foreground/50';

                            return (
                                <button
                                    key={id}
                                    id={baseId}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    aria-controls={`${id}-panel`}
                                    tabIndex={isActive ? 0 : -1}
                                    onClick={() => setActiveTabId(id)}
                                    onKeyDown={onKeyDown}
                                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition ${
                                        isActive
                                            ? 'border-primary/60 bg-primary/5 text-primary'
                                            : 'border-border/60 bg-card text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    <span>{t(key, 'supplier_portal')}</span>
                                    <span className="ms-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <span
                                            aria-hidden
                                            className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`}
                                        />
                                        <span>{t(statusLabelKey, 'supplier_portal')}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <form id="supplier-admin-edit-form" onSubmit={submit} className="space-y-6">
                    <Card
                        id="section-company-panel"
                        role="tabpanel"
                        aria-labelledby="section-company-tab"
                        hidden={activeTabId !== 'section-company'}
                        className="rounded-xl border border-border/60 bg-card shadow-sm"
                    >
                            <CardHeader className="border-b border-border/40 px-4 py-3">
                                <CardTitle className="text-sm font-semibold">
                                    {t('profile_section_basic', 'supplier_portal')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
                                <div className="space-y-2 text-start">
                                    <Label htmlFor="legal_name_en">
                                        {t('profile_legal_name_en', 'supplier_portal')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="legal_name_en"
                                        aria-invalid={!!form.errors.legal_name_en}
                                        className="capitalize text-start"
                                        value={form.data.legal_name_en}
                                        onChange={(e) => {
                                            form.setData('legal_name_en', e.target.value);
                                            if (form.errors.legal_name_en && e.target.value.trim() !== '') {
                                                form.clearErrors('legal_name_en');
                                            }
                                        }}
                                    />
                                    {form.errors.legal_name_en && (
                                        <p className="text-xs text-destructive">{form.errors.legal_name_en}</p>
                                    )}
                                </div>
                                <div className="space-y-2 text-start">
                                    <Label htmlFor="legal_name_ar">
                                        {t('profile_legal_name_ar', 'supplier_portal')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="legal_name_ar"
                                        value={form.data.legal_name_ar}
                                        dir="ltr"
                                        onChange={(e) => form.setData('legal_name_ar', e.target.value)}
                                        className="text-start"
                                    />
                                    {form.errors.legal_name_ar && (
                                        <p className="text-xs text-destructive">{form.errors.legal_name_ar}</p>
                                    )}
                                </div>
                                <div className="space-y-2 text-start">
                                    <Label htmlFor="trade_name">{t('profile_trade_name', 'supplier_portal')}</Label>
                                    <Input
                                        id="trade_name"
                                        className="uppercase text-start"
                                        value={form.data.trade_name}
                                        onChange={(e) => form.setData('trade_name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 text-start sm:col-span-2">
                                    <SupplierImageUploadField
                                        id="company_logo"
                                        label={t('company_logo_label', 'supplier_portal')}
                                        helperText={t('company_logo_help', 'supplier_portal')}
                                        previewUrl={companyLogoPreview}
                                        error={(form.errors as any).company_logo ?? null}
                                        uploadButtonLabel={t('upload_logo', 'supplier_portal')}
                                        replaceButtonLabel={t('replace_logo', 'supplier_portal')}
                                        inputRef={companyLogoInputRef}
                                        onFileSelect={(file) => {
                                            if (!file) {
                                                form.setData('company_logo', null as File | null);
                                                if (logoPreviewObjectUrlRef.current) {
                                                    URL.revokeObjectURL(logoPreviewObjectUrlRef.current);
                                                    logoPreviewObjectUrlRef.current = null;
                                                }
                                                setCompanyLogoPreview((supplier as any).company_logo_url ?? null);
                                                return;
                                            }
                                            setLogoCropFile(file);
                                            setLogoCropOpen(true);
                                        }}
                                        hasFile={!!(companyLogoPreview || form.data.company_logo)}
                                        previewShape="rounded"
                                        alt={t('company_logo', 'supplier_portal')}
                                    />
                                </div>
                                <div className="space-y-2 text-start">
                                    <Label htmlFor="supplier_type">{t('profile_type', 'supplier_portal')}</Label>
                                    <Select
                                        value={form.data.supplier_type ?? ''}
                                        onValueChange={(v) => {
                                            form.setData('supplier_type', v);
                                            if (form.errors.supplier_type && v) {
                                                form.clearErrors('supplier_type');
                                            }
                                        }}
                                    >
                                        <SelectTrigger id="supplier_type" className="text-start">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(SUPPLIER_TYPE_KEYS).map(([value, key]) => (
                                                <SelectItem key={value} value={value} className="text-start">
                                                    {t(key, 'supplier_portal')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Card
                            id="section-contact-panel"
                            role="tabpanel"
                            aria-labelledby="section-contact-tab"
                            hidden={activeTabId !== 'section-contact'}
                            className="rounded-xl border border-border/60 bg-card shadow-sm"
                        >
                            <CardHeader className="border-b border-border/40 px-4 py-3">
                                <CardTitle className="text-sm font-semibold">
                                    {t('profile_section_contact', 'supplier_portal')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
                                <div className="space-y-2 text-start">
                                    <Label htmlFor="email">{t('field_email', 'supplier_portal')}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        dir="ltr"
                                        aria-invalid={!!form.errors.email}
                                        className="lowercase text-start"
                                        value={form.data.email}
                                        onChange={(e) => {
                                            form.setData('email', e.target.value);
                                            if (form.errors.email && e.target.value.includes('@')) {
                                                form.clearErrors('email');
                                            }
                                        }}
                                    />
                                    {form.errors.email && <p className="text-xs text-destructive">{form.errors.email}</p>}
                                </div>
                                <div className="space-y-2 text-start">
                                    <Label htmlFor="phone">{t('field_phone', 'supplier_portal')}</Label>
                                    <Input
                                        id="phone"
                                        dir="ltr"
                                        value={form.data.phone}
                                        onChange={(e) => form.setData('phone', e.target.value)}
                                        className="text-start"
                                    />
                                </div>
                                <div className="space-y-2 text-start sm:col-span-2">
                                    <Label htmlFor="website">{t('field_website', 'supplier_portal')}</Label>
                                    <Input
                                        id="website"
                                        type="url"
                                        dir="ltr"
                                        className="lowercase text-start"
                                        value={form.data.website}
                                        onChange={(e) => form.setData('website', e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card
                            id="section-location-panel"
                            role="tabpanel"
                            aria-labelledby="section-location-tab"
                            hidden={activeTabId !== 'section-location'}
                            className="rounded-xl border border-border/60 bg-card shadow-sm"
                        >
                            <CardHeader className="border-b border-border/40 px-4 py-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {t('profile_section_address', 'supplier_portal')}
                            </CardTitle>
                            </CardHeader>
                        <CardContent className="space-y-4 p-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2 text-start">
                                    <Label htmlFor="country">{t('country', 'supplier_portal')}</Label>
                                    <Select
                                        value={form.data.country ?? ''}
                                        onValueChange={(v) => {
                                            form.setData('country', v);
                                            form.setData('city', '');
                                            if (form.errors.country && v) {
                                                form.clearErrors('country');
                                            }
                                        }}
                                    >
                                        <SelectTrigger id="country" className="text-start">
                                            <SelectValue placeholder={t('select_country', 'supplier_portal')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {countries.map((c, index) => (
                                                <SelectItem key={`${c}-${index}`} value={c} className="text-start">
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 text-start">
                                    <Label htmlFor="city">{t('city', 'supplier_portal')}</Label>
                                    <Select
                                        value={form.data.city ?? ''}
                                        onValueChange={(v) => {
                                            form.setData('city', v);
                                            if (form.errors.city && v) {
                                                form.clearErrors('city');
                                            }
                                        }}
                                        disabled={!form.data.country}
                                    >
                                        <SelectTrigger id="city" className="text-start">
                                            <SelectValue placeholder={t('select_city', 'supplier_portal')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cities.map((city, index) => (
                                                <SelectItem key={`${city}-${index}`} value={city} className="text-start">
                                                    {city}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2 text-start">
                                    <Label htmlFor="postal_code">{t('postal_code', 'supplier_portal')}</Label>
                                    <Input
                                        id="postal_code"
                                        dir="ltr"
                                        value={form.data.postal_code}
                                        onChange={(e) => form.setData('postal_code', e.target.value)}
                                        className="text-start"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 text-start">
                                <Label htmlFor="address">{t('address', 'supplier_portal')}</Label>
                                <Textarea
                                    id="address"
                                    value={form.data.address}
                                    onChange={(e) => form.setData('address', e.target.value)}
                                    rows={3}
                                    className="resize-none text-start"
                                />
                            </div>
                            </CardContent>
                        </Card>

                            <Card
                                id="section-legal-panel"
                                role="tabpanel"
                                aria-labelledby="section-legal-tab"
                                hidden={activeTabId !== 'section-legal'}
                                className="rounded-xl border border-border/60 bg-card shadow-sm"
                            >
                                <CardHeader className="border-b border-border/40 px-4 py-3">
                                    <CardTitle className="text-sm font-semibold">
                                        {t('profile_section_legal', 'supplier_portal')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="commercial_registration_no">{t('profile_cr_no', 'supplier_portal')}</Label>
                                        <Input
                                            id="commercial_registration_no"
                                            value={form.data.commercial_registration_no}
                                            onChange={(e) => {
                                                form.setData('commercial_registration_no', e.target.value);
                                                setCrCheckMessage(null);
                                            }}
                                            onBlur={checkCr}
                                            dir="ltr"
                                            className="text-start"
                                        />
                                        {crCheckMessage && <p className="text-sm text-muted-foreground">{crCheckMessage}</p>}
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="cr_expiry_date">{t('cr_expiry_date', 'supplier_portal')}</Label>
                                        <Input
                                            id="cr_expiry_date"
                                            type="date"
                                            value={form.data.cr_expiry_date}
                                            onChange={(e) => form.setData('cr_expiry_date', e.target.value)}
                                            className="text-start"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('document_expiry_field_help', 'supplier_portal').replace(
                                                ':document',
                                                t('doc_type_commercial_registration', 'documents')
                                            )}
                                        </p>
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="vat_number">{t('profile_vat_number', 'supplier_portal')}</Label>
                                        <Input
                                            id="vat_number"
                                            value={form.data.vat_number}
                                            onChange={(e) => form.setData('vat_number', e.target.value)}
                                            dir="ltr"
                                            className="text-start"
                                        />
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="vat_expiry_date">{t('vat_expiry_date', 'supplier_portal')}</Label>
                                        <Input
                                            id="vat_expiry_date"
                                            type="date"
                                            value={form.data.vat_expiry_date}
                                            onChange={(e) => form.setData('vat_expiry_date', e.target.value)}
                                            className="text-start"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('document_expiry_field_help', 'supplier_portal').replace(
                                                ':document',
                                                t('doc_type_vat_certificate', 'documents')
                                            )}
                                        </p>
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="business_license_number">{t('business_license_number', 'supplier_portal')}</Label>
                                        <Input
                                            id="business_license_number"
                                            value={form.data.business_license_number}
                                            onChange={(e) => form.setData('business_license_number', e.target.value)}
                                            dir="ltr"
                                            className="text-start"
                                        />
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="license_expiry_date">{t('license_expiry_date', 'supplier_portal')}</Label>
                                        <Input
                                            id="license_expiry_date"
                                            type="date"
                                            value={form.data.license_expiry_date}
                                            onChange={(e) => form.setData('license_expiry_date', e.target.value)}
                                            className="text-start"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('document_expiry_field_help', 'supplier_portal').replace(
                                                ':document',
                                                t('doc_type_business_license', 'documents')
                                            )}
                                        </p>
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="unified_number">{t('unified_number', 'supplier_portal')}</Label>
                                        <Input
                                            id="unified_number"
                                            value={form.data.unified_number}
                                            onChange={(e) => form.setData('unified_number', e.target.value)}
                                            dir="ltr"
                                            className="text-start"
                                        />
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="chamber_of_commerce_number">{t('chamber_of_commerce_number', 'supplier_portal')}</Label>
                                        <Input
                                            id="chamber_of_commerce_number"
                                            value={form.data.chamber_of_commerce_number}
                                            onChange={(e) => form.setData('chamber_of_commerce_number', e.target.value)}
                                            dir="ltr"
                                            className="text-start"
                                        />
                                    </div>
                                    <div className="space-y-1.5 text-start">
                                        <Label htmlFor="classification_grade">{t('classification_grade', 'supplier_portal')}</Label>
                                        <Input
                                            id="classification_grade"
                                            value={form.data.classification_grade}
                                            onChange={(e) => form.setData('classification_grade', e.target.value)}
                                            className="uppercase text-start"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('classification_grade_helper', 'supplier_portal')}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card
                                id="section-banking-panel"
                                role="tabpanel"
                                aria-labelledby="section-banking-tab"
                                hidden={activeTabId !== 'section-banking'}
                                className="rounded-xl border border-border/60 bg-card shadow-sm"
                            >
                                <CardHeader className="border-b border-border/40 px-4 py-3">
                                    <CardTitle className="text-sm font-semibold">
                                        {t('profile_section_banking', 'supplier_portal')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="bank_name">{t('profile_bank_name', 'supplier_portal')}</Label>
                                        <Select
                                            value={form.data.bank_name ?? ''}
                                            onValueChange={(v) => form.setData('bank_name', v)}
                                        >
                                            <SelectTrigger id="bank_name" className="text-start">
                                                <SelectValue placeholder={t('select_bank', 'supplier_portal')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SAUDI_BANKS.map((bank) => (
                                                    <SelectItem key={bank} value={bank} className="text-start">
                                                        {bank}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="bank_country">{t('bank_country', 'supplier_portal')}</Label>
                                        <Select
                                            value={form.data.bank_country ?? ''}
                                            onValueChange={(v) => form.setData('bank_country', v)}
                                        >
                                            <SelectTrigger id="bank_country" className="text-start">
                                                <SelectValue placeholder={t('select_country', 'supplier_portal')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {countries.map((c, index) => (
                                                    <SelectItem
                                                        key={`bank-${c}-${index}`}
                                                        value={c}
                                                        className="text-start"
                                                    >
                                                        {c}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="bank_account_name">{t('profile_account_holder', 'supplier_portal')}</Label>
                                        <Input
                                            id="bank_account_name"
                                            value={form.data.bank_account_name}
                                            onChange={(e) => form.setData('bank_account_name', e.target.value)}
                                            style={{ textTransform: 'capitalize' }}
                                            className="text-start"
                                        />
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="bank_account_number">{t('bank_account_number', 'supplier_portal')}</Label>
                                        <Input
                                            id="bank_account_number"
                                            value={form.data.bank_account_number}
                                            onChange={(e) => form.setData('bank_account_number', e.target.value)}
                                            dir="ltr"
                                            className="font-mono text-start"
                                        />
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="iban">{t('profile_iban', 'supplier_portal')}</Label>
                                        <Input
                                            id="iban"
                                            value={form.data.iban}
                                            onChange={(e) => form.setData('iban', e.target.value)}
                                            dir="ltr"
                                            style={{ textTransform: 'uppercase' }}
                                            className="font-mono text-start"
                                        />
                                    </div>
                                    <div className="space-y-2 text-start">
                                        <Label htmlFor="swift_code">{t('profile_swift', 'supplier_portal')}</Label>
                                        <Input
                                            id="swift_code"
                                            value={form.data.swift_code}
                                            onChange={(e) => form.setData('swift_code', e.target.value)}
                                            dir="ltr"
                                            style={{ textTransform: 'uppercase' }}
                                            className="font-mono text-start"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                        <Card
                            id="section-financial-panel"
                            role="tabpanel"
                            aria-labelledby="section-financial-tab"
                            hidden={activeTabId !== 'section-financial'}
                            className="rounded-xl border border-border/60 bg-card shadow-sm"
                        >
                            <CardHeader className="border-b border-border/40 px-4 py-3">
                                <CardTitle className="text-sm font-semibold">
                                    {t('profile_section_financial', 'supplier_portal')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
                                <div className="space-y-2 text-start">
                                    <Label htmlFor="preferred_currency">
                                        {t('profile_preferred_currency', 'supplier_portal')}
                                    </Label>
                                    <Select
                                        value={form.data.preferred_currency ?? ''}
                                        onValueChange={(v) => form.setData('preferred_currency', v)}
                                    >
                                        <SelectTrigger id="preferred_currency" className="text-start">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['SAR', 'USD', 'EUR', 'AED', 'GBP'].map((c) => (
                                                <SelectItem key={c} value={c} className="text-start">
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 text-start">
                                    <Label htmlFor="payment_terms_days">
                                        {t('profile_payment_terms', 'supplier_portal')}
                                    </Label>
                                    <Select
                                        value={
                                            form.data.payment_terms_days !== '' &&
                                            form.data.payment_terms_days != null
                                                ? String(form.data.payment_terms_days)
                                                : ''
                                        }
                                        onValueChange={(v) =>
                                            form.setData('payment_terms_days', v ? Number(v) : '')
                                        }
                                    >
                                        <SelectTrigger id="payment_terms_days" className="text-start">
                                            <SelectValue
                                                placeholder={t('select_payment_terms', 'supplier_portal')}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[30, 60, 90, 120].map((n) => (
                                                <SelectItem key={n} value={String(n)} className="text-start">
                                                    {n} {t('days', 'supplier_portal')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 text-start sm:col-span-2">
                                    <SupplierImageUploadField
                                        id="credit_application"
                                        accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                                        label={t('credit_application', 'supplier_portal')}
                                        helperText={t('credit_application_help', 'supplier_portal')}
                                        previewUrl={form.data.credit_application ? '__pdf__' : null}
                                        error={(form.errors as any).credit_application ?? null}
                                        uploadButtonLabel={t('upload_document', 'supplier_portal')}
                                        replaceButtonLabel={t('replace_document', 'supplier_portal')}
                                        inputRef={creditAppInputRef}
                                        onFileSelect={(file) => form.setData('credit_application', file)}
                                        hasFile={!!form.data.credit_application}
                                        previewShape="rectangle"
                                        alt={t('credit_application', 'supplier_portal')}
                                    />
                                </div>

                                <div className="space-y-2 text-start sm:col-span-2">
                                    <Label htmlFor="notes">{t('notes', 'supplier_portal')}</Label>
                                    <Textarea
                                        id="notes"
                                        value={form.data.notes ?? ''}
                                        onChange={(e) => form.setData('notes', e.target.value)}
                                        rows={3}
                                        className="resize-none text-start"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card
                            id="section-categories-panel"
                            role="tabpanel"
                            aria-labelledby="section-categories-tab"
                            hidden={activeTabId !== 'section-categories'}
                            className="rounded-xl border border-border/60 bg-card shadow-sm"
                        >
                            <CardHeader className="border-b border-border/40 px-4 py-3">
                                <CardTitle className="text-sm font-semibold">
                                    {t('profile_section_categories', 'supplier_portal')}
                                </CardTitle>
                                <CardDescription className="text-start">
                                    {t('categories_search_hint', 'supplier_portal')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4">
                                <CategorySelector
                                    categories={categories}
                                    value={form.data.category_ids}
                                    onChange={(ids) => form.setData('category_ids', ids)}
                                    locale={(locale === 'ar' ? 'ar' : 'en') as 'en' | 'ar'}
                                    maxSelections={20}
                                    placeholder={t('categories_search_placeholder', 'supplier_portal')}
                                    aria-label={t('categories_search_placeholder', 'supplier_portal')}
                                    size="large"
                                    showQuickFilters
                                    searchHighlight={false}
                                />
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {t('edit_categories_type_hint', 'supplier_portal')}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t('edit_selected_categories_count', 'supplier_portal')
                                        .replace(':count', String(form.data.category_ids.length))
                                        .replace(':max', '20')}
                                </p>
                                {form.errors.category_ids && (
                                    <p className="mt-2 text-sm text-destructive">
                                        {t('edit_category_type_mismatch', 'supplier_portal')}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* 8. Contacts */}
                        <Card
                            id="section-contacts-panel"
                            role="tabpanel"
                            aria-labelledby="section-contacts-tab"
                            hidden={activeTabId !== 'section-contacts'}
                            className="rounded-xl border border-border/60 bg-card shadow-sm"
                        >
                            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 border-b border-border/40">
                                <div>
                                    <CardTitle className="text-sm font-semibold">
                                        {t('profile_contacts', 'supplier_portal')}
                                    </CardTitle>
                                    <CardDescription className="text-start">
                                        {t('contacts_workspace', 'supplier_portal')}
                                    </CardDescription>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    type="button"
                                    onClick={() => {
                                        setContactFormMode('create');
                                        setContactFormInitial({
                                            name: '',
                                            job_title: '',
                                            department: '',
                                            contact_type: 'sales',
                                            email: '',
                                            phone: '',
                                            mobile: '',
                                            avatar_url: null,
                                            business_card_front_url: null,
                                            business_card_back_url: null,
                                            is_primary: false,
                                        });
                                        setContactModalOpen(true);
                                    }}
                                >
                                    {t('add_contact', 'supplier_portal')}
                                </Button>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {supplierContacts.length > 0 ? (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {supplierContacts.map((contact) => (
                                            <ContactCard
                                                key={contact.id}
                                                contact={contact}
                                                setPrimaryHref={route('suppliers.contacts.set-primary', [
                                                    supplier.id,
                                                    contact.id,
                                                ])}
                                                renderActions={(c) => (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs text-destructive"
                                                        type="button"
                                                        onClick={() => {
                                                            void confirmDelete(
                                                                t('confirm_delete_contact_body')
                                                            ).then((ok) => {
                                                                if (ok) {
                                                                    router.delete(
                                                                        route('suppliers.contacts.destroy', [
                                                                            supplier.id,
                                                                            c.id,
                                                                        ])
                                                                    );
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        <Trash2 className="me-1 h-3.5 w-3.5" />
                                                        {t('action_delete', 'suppliers')}
                                                    </Button>
                                                )}
                                                onEditInline={(c) => {
                                                    setContactFormMode('edit');
                                                    setContactFormInitial({
                                                        id: c.id,
                                                        name: c.name,
                                                        job_title: c.job_title ?? '',
                                                        department: c.department ?? '',
                                                        contact_type: c.contact_type,
                                                        email: c.email ?? '',
                                                        phone: c.phone ?? '',
                                                        mobile: c.mobile ?? '',
                                                        avatar_url: c.avatar_url ?? null,
                                                        business_card_front_url: c.business_card_front_url ?? null,
                                                        business_card_back_url: c.business_card_back_url ?? null,
                                                        is_primary: c.is_primary,
                                                    });
                                                    setContactModalOpen(true);
                                                }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        {t('no_contacts_yet', 'supplier_portal')}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* 9. Documents */}
                        <div
                            id="section-documents-panel"
                            role="tabpanel"
                            aria-labelledby="section-documents-tab"
                            hidden={activeTabId !== 'section-documents'}
                            className="space-y-4"
                        >
                            <Card
                                id="managed-document-uploads"
                                className="rounded-xl border border-border/60 bg-card shadow-sm"
                            >
                                <CardHeader className="border-b border-border/40 px-4 py-3">
                                    <CardTitle className="text-sm font-semibold">
                                        {t('profile_upload_document_btn', 'supplier_portal')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 p-4">
                                    {documentRows.map((document) => {
                                        const fileName =
                                            document.selectedFile?.name ?? document.summary?.file_name ?? null;
                                        const mimeType =
                                            document.selectedFile?.type ?? document.summary?.mime_type ?? null;
                                        const linkedExpiryField =
                                            documentExpiryLinks[document.documentType]?.field ?? null;
                                        const linkedExpiryLabel = linkedExpiryField
                                            ? t(linkedExpiryField, 'supplier_portal')
                                            : null;
                                        const linkedExpiryValue = linkedExpiryField
                                            ? ((form.data as Record<string, unknown>)[linkedExpiryField] as string | null | undefined)
                                            : null;

                                        // Use backend-provided `preview_url` for persisted documents,
                                        // and object URLs for newly selected uploads.
                                        const previewUrl = document.selectedFile
                                            ? document.selectedPreviewUrl
                                            : (document.summary?.preview_url ?? null);

                                        const hasDocument = !!document.summary || !!document.selectedFile;
                                        const statusChipClass = hasDocument
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';

                                        return (
                                            <div
                                                key={document.key}
                                                className={`flex flex-col gap-4 rounded-lg border border-border/50 bg-muted/40 p-3 ${
                                                    locale === 'ar'
                                                        ? 'md:flex-row-reverse md:items-start'
                                                        : 'md:flex-row md:items-start'
                                                }`}
                                            >
                                            <div className="w-full md:w-[190px] md:flex-none">
                                                <DocumentPreviewPanel
                                                    label={document.title}
                                                    fileName={fileName}
                                                    mimeType={mimeType}
                                                    previewUrl={previewUrl}
                                                    emptyText={t('no_documents', 'documents')}
                                                    onClick={
                                                        previewUrl
                                                            ? () =>
                                                                  setDocPreviewModal({
                                                                      label: document.title,
                                                                      fileName,
                                                                      mimeType,
                                                                      previewUrl,
                                                                  })
                                                            : undefined
                                                    }
                                                />
                                            </div>

                                            <div
                                                className={`flex min-w-0 flex-1 flex-col gap-3 ${
                                                    locale === 'ar'
                                                        ? 'md:flex-row-reverse md:items-start md:justify-between'
                                                        : 'md:flex-row md:items-start md:justify-between'
                                                }`}
                                            >
                                                <div className="min-w-0 flex-1 space-y-2 text-start">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="text-sm font-medium text-foreground">
                                                            {document.title}
                                                        </h4>
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusChipClass}`}
                                                        >
                                                            {hasDocument ? t('profile_latest', 'supplier_portal') : t('missing', 'ui')}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-0.5 text-xs text-muted-foreground">
                                                        {fileName && (
                                                            <div dir="auto" className="truncate">
                                                                {fileName}
                                                            </div>
                                                        )}
                                                        {!!document.summary?.version && (
                                                            <div>
                                                                {t('version', 'ui')}{' '}
                                                                {document.summary.version}
                                                            </div>
                                                        )}
                                                        {linkedExpiryField && linkedExpiryLabel && (
                                                            <LinkedExpiryFieldHint
                                                                fieldLabel={linkedExpiryLabel}
                                                                currentValue={linkedExpiryValue ?? null}
                                                                onEditField={() =>
                                                                    focusLinkedExpiryField(linkedExpiryField)
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                <div
                                                    className={`flex w-full flex-col gap-2 md:w-[220px] md:flex-none ${
                                                        locale === 'ar' ? 'md:items-start' : 'md:items-end'
                                                    }`}
                                                >
                                                    <input
                                                        ref={document.inputRef}
                                                        id={document.key}
                                                        type="file"
                                                        accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0] ?? null;
                                                            document.onSelect(file);
                                                            e.target.value = '';
                                                        }}
                                                    />

                                                    <div
                                                        className={`flex flex-wrap gap-2 ${
                                                            locale === 'ar' ? 'md:justify-start' : 'md:justify-end'
                                                        }`}
                                                    >
                                                    {/* This card stays focused on upload and replace actions. */}
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => document.inputRef.current?.click()}
                                                        >
                                                            {document.summary || document.selectedFile
                                                                ? t('replace_document', 'supplier_portal')
                                                                : t('upload_document', 'supplier_portal')}
                                                        </Button>
                                                    </div>

                                                    <p
                                                        className={`text-[11px] text-muted-foreground ${
                                                            locale === 'ar' ? 'md:text-start' : 'md:text-end'
                                                        }`}
                                                    >
                                                        {document.uploadLabel}
                                                    </p>
                                                    <p
                                                        className={`text-[11px] text-muted-foreground ${
                                                            locale === 'ar' ? 'md:text-start' : 'md:text-end'
                                                        }`}
                                                    >
                                                        {document.helperText}
                                                    </p>

                                                    {document.error && (
                                                        <p
                                                            className={`text-xs text-destructive ${
                                                                locale === 'ar' ? 'md:text-start' : 'md:text-end'
                                                            }`}
                                                        >
                                                            {document.error}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </div>

                    </form>

                    {docPreviewModal && (
                        <DocumentPreviewModal
                            open={!!docPreviewModal}
                            onClose={() => setDocPreviewModal(null)}
                            label={docPreviewModal.label}
                            fileName={docPreviewModal.fileName}
                            mimeType={docPreviewModal.mimeType}
                            previewUrl={docPreviewModal.previewUrl}
                        />
                    )}

                    <ContactFormModal
                        open={contactModalOpen}
                        mode={contactFormMode}
                        initialData={contactFormInitial}
                        onClose={() => setContactModalOpen(false)}
                        onSaved={() => {
                            // Contacts are refreshed inside modal after save.
                        }}
                        createUrl={route('suppliers.contacts.store', supplier.id)}
                        updateUrl={
                            contactFormInitial?.id
                                ? route('suppliers.contacts.update', [supplier.id, contactFormInitial.id])
                                : undefined
                        }
                        includeIsPrimaryInPayload
                        shouldCallSetPrimaryRoute={false}
                    />

                    {logoCropFile && logoCropOpen && (
                        <ImageCropper
                            file={logoCropFile}
                            open={logoCropOpen}
                            onCancel={() => {
                                setLogoCropOpen(false);
                                setLogoCropFile(null);
                            }}
                            onCropComplete={(croppedFile) => {
                                setLogoCropOpen(false);
                                setLogoCropFile(null);
                                form.setData('company_logo', croppedFile);
                                if (logoPreviewObjectUrlRef.current) {
                                    URL.revokeObjectURL(logoPreviewObjectUrlRef.current);
                                }
                                const newUrl = URL.createObjectURL(croppedFile);
                                logoPreviewObjectUrlRef.current = newUrl;
                                setCompanyLogoPreview(newUrl);
                            }}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function buildPathForCategory(
    categoryId: string,
    byId: Map<string, CategoryOption>,
    locale: string
): string {
    const cat = byId.get(categoryId);
    if (!cat) return '';
    const name = locale === 'ar' ? cat.name_ar : cat.name_en;
    if (!cat.parent_id) return name;
    const parentPath = buildPathForCategory(cat.parent_id, byId, locale);
    return parentPath ? `${parentPath} > ${name}` : name;
}

function EditCategoryTreeSection({
    category,
    getChildren,
    byId,
    locale,
    selectedIds,
    onToggle,
    depth = 0,
}: {
    category: CategoryOption;
    getChildren: (parentId: string) => CategoryOption[];
    byId: Map<string, CategoryOption>;
    locale: string;
    selectedIds: string[];
    onToggle: (id: string) => void;
    depth?: number;
}) {
    const children = getChildren(category.id);
    const [open, setOpen] = useState(depth < 1);
    const pathLabel = buildPathForCategory(category.id, byId, locale);
    return (
        <div className="rounded border border-transparent hover:bg-muted/30" style={{ marginLeft: depth * 12 }}>
            <div className="flex items-center gap-2 py-1">
                {children.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                        aria-label={open ? 'Collapse' : 'Expand'}
                    >
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                ) : (
                    <span className="h-6 w-6 shrink-0" />
                )}
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <Checkbox
                        checked={selectedIds.includes(category.id)}
                        onCheckedChange={() => onToggle(category.id)}
                    />
                    <span className="truncate text-sm" title={pathLabel}>
                        {pathLabel}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">({category.code})</span>
                </label>
            </div>
            {open && children.length > 0 && (
                <div className="ms-6 border-s border-border ps-2">
                    {children.map((child) => (
                        <EditCategoryTreeSection
                            key={child.id}
                            category={child}
                            getChildren={getChildren}
                            byId={byId}
                            locale={locale}
                            selectedIds={selectedIds}
                            onToggle={onToggle}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
