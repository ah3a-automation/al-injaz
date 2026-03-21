import SupplierPortalLayout from '@/Layouts/SupplierPortalLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { getLocalizedSupplierName } from '@/utils/supplierDisplay';
import { displayTitleCase } from '@/utils/textDisplay';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Textarea } from '@/Components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { ChevronRight, ChevronLeft, Loader2, MapPin } from 'lucide-react';
import { CategorySelector, type CategoryOption } from '@/Components/Suppliers/CategorySelector';
import { SupplierImageUploadField } from '@/Components/SupplierPortal/SupplierImageUploadField';
import SupplierDocumentsCard from '@/Components/Supplier/Documents/SupplierDocumentsCard';
import LinkedExpiryFieldHint from '@/Components/Supplier/Documents/LinkedExpiryFieldHint';
import EditProfileSummaryCard from '@/Components/Supplier/EditProfileSummaryCard';
import { DocumentPreviewPanel } from '@/Components/Supplier/Documents/DocumentPreviewPanel';
import { DocumentPreviewModal } from '@/Components/Supplier/Documents/DocumentPreviewModal';
import ContactCard from '@/Components/Supplier/Contacts/ContactCard';
import {
    ContactFormModal,
    type ContactFormInitialData,
    type ContactFormMode,
} from '@/Components/Supplier/Contacts/ContactFormModal';
import { toast } from 'sonner';
import { ImageCropper } from '@/Components/ui/ImageCropper';

type SupplierDocumentSummaryItem = {
    id: string;
    file_name: string;
    document_type: string;
    version?: number | null;
    mime_type?: string | null;
    preview_url?: string | null;
};

interface SupplierFullData {
    id: string;
    supplier_code?: string | null;
    status?: string | null;
    company_logo_url?: string | null;
    legal_name_en: string;
    legal_name_ar: string | null;
    trade_name: string | null;
    supplier_type: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    commercial_registration_no: string | null;
    cr_expiry_date: string | null;
    vat_number: string | null;
    unified_number: string | null;
    business_license_number: string | null;
    chamber_of_commerce_number: string | null;
    classification_grade: string | null;
    license_expiry_date: string | null;
    insurance_expiry_date: string | null;
    vat_expiry_date: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
    bank_name: string | null;
    bank_country: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
    iban: string | null;
    swift_code: string | null;
    preferred_currency: string | null;
    payment_terms_days: number | null;
    tax_withholding_rate: string | number | null;
    workforce_size: number | null;
    notes: string | null;
    categories?: Array<{
        id: string | number;
        name_en?: string;
        name_ar?: string | null;
        name?: string;
        code?: string;
    }>;
    contacts?: Array<{
        id: string;
        name: string;
        job_title: string | null;
        department: string | null;
        contact_type: string;
        email: string | null;
        phone: string | null;
        mobile: string | null;
        is_primary: boolean;
        avatar_url?: string | null;
        business_card_front_url?: string | null;
        business_card_back_url?: string | null;
    }>;
    documents?: Array<{
        id: string;
        document_type: string;
        file_name: string;
        file_path: string;
        mime_type?: string | null;
        expiry_date: string | null;
        version?: number | null;
        is_current?: boolean | null;
        created_at?: string | null;
        source?: string | null;
        preview_url?: string | null;
        download_url?: string | null;
    }>;
    document_summary?: {
        cr?: SupplierDocumentSummaryItem | null;
        vat?: SupplierDocumentSummaryItem | null;
        unified?: SupplierDocumentSummaryItem | null;
        national_address?: SupplierDocumentSummaryItem | null;
        bank_certificate?: SupplierDocumentSummaryItem | null;
        credit_application?: SupplierDocumentSummaryItem | null;
    } | null;
}

interface EditFullProps {
    supplier: SupplierFullData;
    locations: Record<string, string[]>;
    categories: CategoryOption[];
    supplierTypeCategoryMap: Record<string, string[]>;
    documentExpiryLinks?: Record<string, { field: string }>;
}

const SUPPLIER_TYPE_KEYS: Record<string, string> = {
    supplier: 'profile_type_supplier',
    subcontractor: 'profile_type_subcontractor',
    service_provider: 'profile_type_service',
    consultant: 'profile_type_consultant',
};

const SMALL_WORDS = new Set([
    'and',
    'of',
    'the',
    'in',
    'for',
    'to',
    'on',
    'at',
    'by',
    'from',
]);

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

const toDateInputValue = (value?: string | null): string => {
    if (!value) return '';
    return value.slice(0, 10);
};

const normalizeEnglishCompanyName = (value: string): string => {
    const lower = value.trim().toLowerCase();
    if (!lower) return value;
    return lower
        .split(/\s+/)
        .map((word, index) => {
            if (index > 0 && SMALL_WORDS.has(word)) {
                return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
};

type FormDataShape = {
    [K in keyof ReturnType<typeof useForm>['data']]: ReturnType<typeof useForm>['data'][K];
};

type NormalizedFormSnapshot = Record<string, string | string[]>;

const DRAFT_VERSION = 'v1';

const getDraftStorageKey = (supplierId: string): string =>
    `supplier-profile-edit-draft:${supplierId}`;

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

const TAB_FIELD_MAP: Record<
    TabId,
    {
        fields: string[];
        required: string[];
    }
> = {
    'section-company': {
        fields: ['legal_name_en', 'legal_name_ar', 'trade_name', 'supplier_type'],
        required: ['legal_name_en', 'legal_name_ar', 'supplier_type'],
    },
    'section-contact': {
        fields: ['email', 'phone', 'website'],
        required: [],
    },
    'section-location': {
        fields: ['country', 'city', 'postal_code', 'address'],
        required: ['country', 'city'],
    },
    'section-legal': {
        fields: [
            'commercial_registration_no',
            'cr_expiry_date',
            'vat_number',
            'vat_expiry_date',
            'unified_number',
            'business_license_number',
            'license_expiry_date',
            'chamber_of_commerce_number',
            'classification_grade',
        ],
        required: [],
    },
    'section-banking': {
        fields: [
            'bank_name',
            'bank_country',
            'bank_account_name',
            'bank_account_number',
            'iban',
            'swift_code',
        ],
        required: [],
    },
    'section-financial': {
        fields: ['preferred_currency', 'payment_terms_days', 'notes'],
        required: [],
    },
    'section-categories': {
        fields: ['category_ids'],
        required: ['category_ids'],
    },
    'section-contacts': {
        fields: ['__contacts__'],
        required: ['__contacts__'],
    },
    'section-documents': {
        fields: ['cr_document', 'vat_document', 'unified_document', 'national_address_document', 'bank_certificate'],
        required: ['__documents__'],
    },
};

const normalizeFormDataForCompare = (data: any): NormalizedFormSnapshot => {
    const normalized: NormalizedFormSnapshot = {};
    Object.entries(data).forEach(([key, rawValue]) => {
        let value = rawValue;
        if (Array.isArray(value)) {
            if (key === 'category_ids') {
                normalized[key] = [...value].map(String).sort();
            } else {
                normalized[key] = [...value].map(String);
            }
            return;
        }
        if (value === null || value === undefined) {
            value = '';
        }
        if (key.endsWith('_date') && typeof value === 'string') {
            normalized[key] = toDateInputValue(value);
            return;
        }
        normalized[key] = String(value);
    });
    return normalized;
};

const areFormSnapshotsEqual = (a: NormalizedFormSnapshot, b: NormalizedFormSnapshot): boolean => {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i += 1) {
        if (aKeys[i] !== bKeys[i]) return false;
        const key = aKeys[i];
        const aVal = a[key];
        const bVal = b[key];
        if (Array.isArray(aVal) || Array.isArray(bVal)) {
            const aArr = Array.isArray(aVal) ? aVal : [aVal];
            const bArr = Array.isArray(bVal) ? bVal : [bVal];
            if (aArr.length !== bArr.length) return false;
            for (let j = 0; j < aArr.length; j += 1) {
                if (aArr[j] !== bArr[j]) return false;
            }
        } else if (aVal !== bVal) {
            return false;
        }
    }
    return true;
};

type SaveStatus = 'saved' | 'unsaved' | 'saving_draft' | 'draft_saved' | 'saving';

type DocumentUploadField =
    | 'cr_document'
    | 'vat_document'
    | 'unified_document'
    | 'national_address_document'
    | 'bank_certificate';

interface DraftPayload {
    supplierId: string;
    version: string;
    savedAt: string;
    data: any;
}

export default function SupplierPortalProfileEditFull({
    supplier,
    locations,
    categories,
    supplierTypeCategoryMap,
    documentExpiryLinks = {},
}: EditFullProps) {
    const { t, locale } = useLocale();
    const isRtl = locale === 'ar';
const rawSupplierName = getLocalizedSupplierName(supplier, locale);
const supplierDisplayName = locale === "ar" ? rawSupplierName : displayTitleCase(rawSupplierName);

    const companyLogoInputRef = useRef<HTMLInputElement>(null);
    const crInputRef = useRef<HTMLInputElement>(null);
    const vatInputRef = useRef<HTMLInputElement>(null);
    const unifiedInputRef = useRef<HTMLInputElement>(null);
    const bankCertInputRef = useRef<HTMLInputElement>(null);
    const nationalAddressInputRef = useRef<HTMLInputElement>(null);
    const creditAppInputRef = useRef<HTMLInputElement>(null);

    const crLocalPreviewRef = useRef<string | null>(null);
    const vatLocalPreviewRef = useRef<string | null>(null);
    const unifiedLocalPreviewRef = useRef<string | null>(null);
    const bankLocalPreviewRef = useRef<string | null>(null);
    const nationalLocalPreviewRef = useRef<string | null>(null);

    const [crLocalPreviewUrl, setCrLocalPreviewUrl] = useState<string | null>(null);
    const [vatLocalPreviewUrl, setVatLocalPreviewUrl] = useState<string | null>(null);
    const [unifiedLocalPreviewUrl, setUnifiedLocalPreviewUrl] = useState<string | null>(null);
    const [bankLocalPreviewUrl, setBankLocalPreviewUrl] = useState<string | null>(null);
    const [nationalLocalPreviewUrl, setNationalLocalPreviewUrl] = useState<string | null>(null);

    const [docPreviewModal, setDocPreviewModal] = useState<{
        label: string;
        fileName: string | null;
        mimeType: string | null;
        previewUrl: string | null;
    } | null>(null);

    const form = useForm({
        legal_name_en: supplier.legal_name_en ?? '',
        legal_name_ar: supplier.legal_name_ar ?? '',
        trade_name: supplier.trade_name ?? '',
        supplier_type: supplier.supplier_type ?? 'supplier',
        email: supplier.email ?? '',
        phone: supplier.phone ?? '',
        website: supplier.website ?? '',
        commercial_registration_no: supplier.commercial_registration_no ?? '',
        cr_expiry_date: toDateInputValue(supplier.cr_expiry_date) || '',
        vat_number: supplier.vat_number ?? '',
        unified_number: supplier.unified_number ?? '',
        business_license_number: supplier.business_license_number ?? '',
        chamber_of_commerce_number: supplier.chamber_of_commerce_number ?? '',
        classification_grade: supplier.classification_grade ?? '',
        license_expiry_date: toDateInputValue(supplier.license_expiry_date) || '',
        insurance_expiry_date: toDateInputValue(supplier.insurance_expiry_date) || '',
        vat_expiry_date: toDateInputValue(supplier.vat_expiry_date) || '',
        address: supplier.address ?? '',
        city: supplier.city ?? '',
        postal_code: supplier.postal_code ?? '',
        country: supplier.country ?? '',
        bank_name: supplier.bank_name ?? '',
        bank_country: supplier.bank_country ?? '',
        bank_account_name: supplier.bank_account_name ?? '',
        bank_account_number: supplier.bank_account_number ?? '',
        iban: supplier.iban ?? '',
        swift_code: supplier.swift_code ?? '',
        preferred_currency: supplier.preferred_currency ?? 'SAR',
        payment_terms_days: supplier.payment_terms_days ?? '',
        tax_withholding_rate: supplier.tax_withholding_rate ?? '',
        workforce_size: supplier.workforce_size ?? '',
        credit_application: null as File | null,
        notes: supplier.notes ?? '',
        category_ids: (supplier.categories ?? []).map((c) => String(c.id)),
        company_logo: null as File | null,
        cr_document: null as File | null,
        vat_document: null as File | null,
        unified_document: null as File | null,
        national_address_document: null as File | null,
        bank_certificate: null as File | null,
    });

    const handleDocumentSelection = (
        field: DocumentUploadField,
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

    const initialNormalizedSnapshot = useMemo(() => {
        return normalizeFormDataForCompare({
            ...form.data,
            company_logo: null,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [baselineSnapshot, setBaselineSnapshot] = useState<NormalizedFormSnapshot>(
        initialNormalizedSnapshot
    );
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const persistedDocuments = useMemo(
        () =>
            (supplier.documents ?? []).map((document) => ({
                ...document,
                mime_type: document.mime_type ?? null,
                created_at: document.created_at ?? null,
                preview_url: document.preview_url ?? null,
                download_url: document.download_url ?? document.preview_url ?? null,
            })),
        [supplier.documents]
    );

    useEffect(
        () => () => {
            if (crLocalPreviewRef.current) {
                URL.revokeObjectURL(crLocalPreviewRef.current);
            }
            if (vatLocalPreviewRef.current) {
                URL.revokeObjectURL(vatLocalPreviewRef.current);
            }
            if (unifiedLocalPreviewRef.current) {
                URL.revokeObjectURL(unifiedLocalPreviewRef.current);
            }
            if (bankLocalPreviewRef.current) {
                URL.revokeObjectURL(bankLocalPreviewRef.current);
            }
            if (nationalLocalPreviewRef.current) {
                URL.revokeObjectURL(nationalLocalPreviewRef.current);
            }
        },
        []
    );
    const draftBannerDismissedRef = useRef(false);
    const [hasDraft, setHasDraft] = useState<{
        savedAt: string | null;
    } | null>(null);
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [contactFormMode, setContactFormMode] = useState<ContactFormMode>('create');
    const [contactFormInitial, setContactFormInitial] = useState<ContactFormInitialData | null>(
        null
    );

    const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(
        supplier.company_logo_url ?? null
    );
    const logoPreviewObjectUrlRef = useRef<string | null>(null);
    const [logoCropFile, setLogoCropFile] = useState<File | null>(null);
    const [logoCropOpen, setLogoCropOpen] = useState(false);

    const countries = useMemo(
        () => Array.from(new Set(Object.keys(locations).filter(Boolean))),
        [locations]
    );
    const cities = useMemo(
        () =>
            form.data.country
                ? Array.from(
                      new Set((locations[form.data.country] ?? []).filter(Boolean))
                  )
                : [],
        [form.data.country, locations]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Lightweight client-side validation for obvious required fields
        const clientErrors: Record<string, string> = {};
        if (!form.data.legal_name_en || form.data.legal_name_en.trim() === '') {
            clientErrors.legal_name_en = t('field_required', 'supplier_portal');
        }
        if (!form.data.supplier_type || form.data.supplier_type.trim() === '') {
            clientErrors.supplier_type = t('field_required', 'supplier_portal');
        }
        if (!form.data.legal_name_ar || form.data.legal_name_ar.trim() === '') {
            clientErrors.legal_name_ar = t('field_required', 'supplier_portal');
        }
        if (!form.data.country || form.data.country.trim() === '') {
            clientErrors.country = t('field_required', 'supplier_portal');
        }
        if (!form.data.city || form.data.city.trim() === '') {
            clientErrors.city = t('field_required', 'supplier_portal');
        }
        if (form.data.email && !form.data.email.includes('@')) {
            clientErrors.email = t('field_invalid_email', 'supplier_portal');
        }

        if (Object.keys(clientErrors).length > 0) {
            form.setError(clientErrors);
            const firstErrorField = Object.keys(clientErrors)[0];
            const targetTabEntry = sectionOrder.find(({ id }) =>
                TAB_FIELD_MAP[id].fields.includes(firstErrorField)
            );
            if (targetTabEntry) {
                setActiveTabId(targetTabEntry.id);
            }
            if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                    const el = document.getElementById(firstErrorField);
                    el?.focus();
                }, 200);
            }
            return;
        }

        const hadNewLogo = !!form.data.company_logo;

        form.patch(route('supplier.profile.update'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(getDraftStorageKey(supplier.id));
                }
                form.setData('company_logo', null as File | null);
                const normalizedAfterSave = normalizeFormDataForCompare({
                    ...form.data,
                    company_logo: null,
                });
                setBaselineSnapshot(normalizedAfterSave);
                setSaveStatus('saved');
                setLastSavedAt(new Date().toISOString());
                setLastDraftSavedAt(null);
                toast.success(t('profile_saved_success', 'supplier_portal'));
                if (hadNewLogo) {
                    toast.success(t('logo_updated_success', 'supplier_portal'));
                }
                router.reload({ only: ['supplier'] });
            },
            onError: (errors) => {
                const errorFields = Object.keys(errors ?? {});
                const targetTabEntry = sectionOrder.find(({ id }) =>
                    errorFields.some((field) => TAB_FIELD_MAP[id].fields.includes(field))
                );
                if (targetTabEntry) {
                    setActiveTabId(targetTabEntry.id);
                }
                if (typeof window !== 'undefined' && errorFields.length > 0) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setTimeout(() => {
                        const el = document.getElementById(errorFields[0]);
                        el?.focus();
                    }, 200);
                }
            },
        });
    };

    const currentSnapshot = useMemo(
        () => normalizeFormDataForCompare(form.data),
        [form.data]
    );

    const hasUnsavedChanges = useMemo(
        () => !areFormSnapshotsEqual(currentSnapshot, baselineSnapshot),
        [currentSnapshot, baselineSnapshot]
    );

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

    const [activeTabId, setActiveTabId] = useState<TabId>('section-company');
    const focusLinkedExpiryField = (fieldId: string) => {
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
    };

    const getTabStatus = (id: TabId): TabStatus => {
        const config = TAB_FIELD_MAP[id];
        const hasError = config.fields.some(
            (field) => form.errors[field as keyof typeof form.errors]
        );
        if (hasError) return 'error';

        const allRequiredFilled = config.required.every((field) => {
            if (field === '__contacts__') {
                const contacts = supplier.contacts ?? [];
                return contacts.length > 0 && contacts.some((c) => c.is_primary);
            }
            if (field === '__documents__') {
                const summary = supplier.document_summary;
                const hasCr = !!summary?.cr || !!form.data.cr_document;
                const hasVat = !!summary?.vat || !!form.data.vat_document;
                const hasUnified = !!summary?.unified || !!form.data.unified_document;
                const hasNationalAddress =
                    !!summary?.national_address || !!form.data.national_address_document;
                return hasCr && hasVat && hasUnified && hasNationalAddress;
            }
            const value = (form.data as any)[field];
            if (Array.isArray(value)) {
                return value.length > 0;
            }
            return value !== null && value !== undefined && String(value).trim() !== '';
        });

        return allRequiredFilled ? 'complete' : 'incomplete';
    };

    // Draft restore banner check
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (draftBannerDismissedRef.current) return;
        const raw = window.localStorage.getItem(getDraftStorageKey(supplier.id));
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw) as DraftPayload;
            if (!parsed || parsed.version !== DRAFT_VERSION || parsed.supplierId !== supplier.id) {
                return;
            }
            const draftSnapshot = normalizeFormDataForCompare(parsed.data);
            if (areFormSnapshotsEqual(draftSnapshot, baselineSnapshot)) {
                return;
            }
            setHasDraft({ savedAt: parsed.savedAt });
        } catch {
            // ignore malformed draft
        }
    }, [baselineSnapshot, supplier.id]);

    // Autosave draft with debounce
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!hasUnsavedChanges || form.processing) {
            return;
        }
        setSaveStatus((prev) => (prev === 'saving' ? prev : 'saving_draft'));
        const timer = window.setTimeout(() => {
            try {
                const payload: DraftPayload = {
                    supplierId: supplier.id,
                    version: DRAFT_VERSION,
                    savedAt: new Date().toISOString(),
                    data: form.data,
                };
                window.localStorage.setItem(
                    getDraftStorageKey(supplier.id),
                    JSON.stringify(payload)
                );
                setLastDraftSavedAt(payload.savedAt);
                setSaveStatus('draft_saved');
            } catch {
                // ignore storage errors
            }
        }, 800);
        return () => window.clearTimeout(timer);
    }, [form.data, form.processing, hasUnsavedChanges, supplier.id]);

    // Track saving state from form.processing
    useEffect(() => {
        if (form.processing) {
            setSaveStatus('saving');
        } else if (!hasUnsavedChanges) {
            setSaveStatus('saved');
        } else if (lastDraftSavedAt) {
            setSaveStatus('draft_saved');
        } else {
            setSaveStatus('unsaved');
        }
    }, [form.processing, hasUnsavedChanges, lastDraftSavedAt]);

    // beforeunload warning
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = (event: BeforeUnloadEvent) => {
            if (!hasUnsavedChanges) {
                return;
            }
            event.preventDefault();
            // eslint-disable-next-line no-param-reassign
            event.returnValue = '';
        };
        if (hasUnsavedChanges) {
            window.addEventListener('beforeunload', handler);
        }
        return () => {
            window.removeEventListener('beforeunload', handler);
        };
    }, [hasUnsavedChanges]);

    const confirmLeaveIfNeeded = (event: React.MouseEvent, url: string) => {
        if (!hasUnsavedChanges) {
            event.preventDefault();
            router.visit(url);
            return;
        }
        const message = t('edit_leave_confirm', 'supplier_portal');
        // eslint-disable-next-line no-alert
        const ok = window.confirm(message);
        if (!ok) {
            event.preventDefault();
            return;
        }
        event.preventDefault();
        router.visit(url);
    };

    const handleRestoreDraft = () => {
        if (typeof window === 'undefined') return;
        const raw = window.localStorage.getItem(getDraftStorageKey(supplier.id));
        if (!raw) {
            setHasDraft(null);
            return;
        }
        try {
            const parsed = JSON.parse(raw) as DraftPayload;
            if (!parsed || parsed.version !== DRAFT_VERSION || parsed.supplierId !== supplier.id) {
                setHasDraft(null);
                return;
            }
            form.setData(parsed.data as any);
            setHasDraft(null);
            setSaveStatus('unsaved');
        } catch {
            setHasDraft(null);
        }
    };

    const handleDismissDraft = () => {
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(getDraftStorageKey(supplier.id));
        }
        draftBannerDismissedRef.current = true;
        setHasDraft(null);
    };

    const statusLabel = (() => {
        switch (saveStatus) {
        case 'saving':
            return t('edit_status_saving', 'supplier_portal');
        case 'saving_draft':
            return t('edit_status_saving_draft', 'supplier_portal');
        case 'draft_saved':
            return t('edit_status_draft_saved', 'supplier_portal');
        case 'unsaved':
            return t('edit_status_unsaved', 'supplier_portal');
        case 'saved':
        default:
            return t('edit_status_saved', 'supplier_portal');
        }
    })();
    const supplierStatusLabel = supplier.status
        ? (() => {
            const statusKey = `status_${supplier.status}`;
            const translated = t(statusKey, 'suppliers');

            return translated === statusKey ? displayTitleCase(String(supplier.status)) : translated;
        })()
        : '—';

    const tabStatuses: TabStatus[] = sectionOrder.map(({ id }) => getTabStatus(id));
    const completedTabs = tabStatuses.filter((s) => s === 'complete').length;
    const totalTabs = tabStatuses.length;
    const overallPercent = totalTabs > 0 ? Math.round((completedTabs / totalTabs) * 100) : 0;
    const completedSectionsLabel = t('edit_sections_complete', 'supplier_portal')
        .replace(':done', String(completedTabs))
        .replace(':total', String(totalTabs));

    useEffect(() => {
        if (!form.data.company_logo && supplier.company_logo_url !== companyLogoPreview) {
            if (logoPreviewObjectUrlRef.current) {
                URL.revokeObjectURL(logoPreviewObjectUrlRef.current);
                logoPreviewObjectUrlRef.current = null;
            }
            setCompanyLogoPreview(supplier.company_logo_url ?? null);
        }
    }, [supplier.company_logo_url, form.data.company_logo, companyLogoPreview]);

    useEffect(() => {
        return () => {
            if (logoPreviewObjectUrlRef.current) {
                URL.revokeObjectURL(logoPreviewObjectUrlRef.current);
            }
        };
    }, []);

    const changesByTab: Record<TabId, string[]> = useMemo(() => {
        if (!hasUnsavedChanges) return {} as Record<TabId, string[]>;
        const changes: Record<TabId, string[]> = {} as Record<TabId, string[]>;

        const push = (id: TabId, message: string) => {
            if (!changes[id]) changes[id] = [];
            if (!changes[id].includes(message)) {
                changes[id].push(message);
            }
        };

        const differ = (field: string) =>
            currentSnapshot[field] !== undefined &&
            baselineSnapshot[field] !== undefined &&
            currentSnapshot[field] !== baselineSnapshot[field];

        // Company
        if (
            ['legal_name_en', 'legal_name_ar', 'trade_name', 'supplier_type'].some(differ) ||
            form.data.company_logo
        ) {
            push('section-company', t('edit_changed_company', 'supplier_portal'));
            if (form.data.company_logo) {
                push('section-company', t('edit_logo_updated', 'supplier_portal'));
            }
        }

        // Contact details
        if (['email', 'phone', 'website'].some(differ)) {
            push('section-contact', t('edit_changed_contact', 'supplier_portal'));
        }

        // Address
        if (['country', 'city', 'postal_code', 'address'].some(differ)) {
            push('section-location', t('edit_changed_address', 'supplier_portal'));
        }

        // Legal
        if (
            [
                'commercial_registration_no',
                'vat_number',
                'unified_number',
                'business_license_number',
                'chamber_of_commerce_number',
                'classification_grade',
                'license_expiry_date',
                'insurance_expiry_date',
                'vat_expiry_date',
            ].some(differ)
        ) {
            push('section-legal', t('edit_changed_legal', 'supplier_portal'));
        }

        // Banking
        if (
            [
                'bank_name',
                'bank_country',
                'bank_account_name',
                'bank_account_number',
                'iban',
                'swift_code',
            ].some(differ)
        ) {
            push('section-banking', t('edit_changed_banking', 'supplier_portal'));
        }

        // Financial
        if (['preferred_currency', 'payment_terms_days', 'notes'].some(differ)) {
            push('section-financial', t('edit_changed_financial', 'supplier_portal'));
        }

        // Categories
        if (!areFormSnapshotsEqual(
            { category_ids: currentSnapshot.category_ids ?? [] },
            { category_ids: baselineSnapshot.category_ids ?? [] }
        )) {
            push('section-categories', t('edit_changed_categories', 'supplier_portal'));
        }

        // Documents (new uploads this session)
        if (
            form.data.cr_document ||
            form.data.vat_document ||
            form.data.unified_document ||
            form.data.national_address_document ||
            form.data.bank_certificate
        ) {
            push('section-documents', t('edit_changed_documents', 'supplier_portal'));
        }

        // Contacts — we don't mutate contacts here; just flag if tab completeness is not complete
        const contactsStatus = getTabStatus('section-contacts');
        if (contactsStatus !== 'complete') {
            push('section-contacts', t('edit_changed_contacts', 'supplier_portal'));
        }

        return changes;
    }, [hasUnsavedChanges, currentSnapshot, baselineSnapshot, form.data, t]);

    const documentRows = [
        {
            key: 'cr_document' as const,
            documentType: 'commercial_registration',
            title: t('doc_type_commercial_registration', 'documents'),
            uploadLabel: t('upload_cr_document', 'supplier_portal'),
            helperText: t('upload_document_help', 'supplier_portal'),
            summary: supplier.document_summary?.cr ?? null,
            selectedFile: form.data.cr_document,
            selectedPreviewUrl: crLocalPreviewUrl,
            inputRef: crInputRef,
            error: form.errors.cr_document ?? null,
            onSelect: (file: File | null) =>
                handleDocumentSelection('cr_document', file, crLocalPreviewRef, setCrLocalPreviewUrl),
        },
        {
            key: 'vat_document' as const,
            documentType: 'vat_certificate',
            title: t('doc_type_vat_certificate', 'documents'),
            uploadLabel: t('upload_vat_document', 'supplier_portal'),
            helperText: t('upload_document_help', 'supplier_portal'),
            summary: supplier.document_summary?.vat ?? null,
            selectedFile: form.data.vat_document,
            selectedPreviewUrl: vatLocalPreviewUrl,
            inputRef: vatInputRef,
            error: form.errors.vat_document ?? null,
            onSelect: (file: File | null) =>
                handleDocumentSelection('vat_document', file, vatLocalPreviewRef, setVatLocalPreviewUrl),
        },
        {
            key: 'unified_document' as const,
            documentType: 'unified_number',
            title: t('doc_type_unified_number', 'documents'),
            uploadLabel: t('upload_unified_document', 'supplier_portal'),
            helperText: t('upload_document_help', 'supplier_portal'),
            summary: supplier.document_summary?.unified ?? null,
            selectedFile: form.data.unified_document,
            selectedPreviewUrl: unifiedLocalPreviewUrl,
            inputRef: unifiedInputRef,
            error: form.errors.unified_document ?? null,
            onSelect: (file: File | null) =>
                handleDocumentSelection(
                    'unified_document',
                    file,
                    unifiedLocalPreviewRef,
                    setUnifiedLocalPreviewUrl
                ),
        },
        {
            key: 'national_address_document' as const,
            documentType: 'national_address',
            title: t('doc_type_national_address', 'documents'),
            uploadLabel: t('doc_type_national_address', 'documents'),
            helperText: t('upload_document_help', 'supplier_portal'),
            summary: supplier.document_summary?.national_address ?? null,
            selectedFile: form.data.national_address_document,
            selectedPreviewUrl: nationalLocalPreviewUrl,
            inputRef: nationalAddressInputRef,
            error: form.errors.national_address_document ?? null,
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
            summary: supplier.document_summary?.bank_certificate ?? null,
            selectedFile: form.data.bank_certificate,
            selectedPreviewUrl: bankLocalPreviewUrl,
            inputRef: bankCertInputRef,
            error: form.errors.bank_certificate ?? null,
            onSelect: (file: File | null) =>
                handleDocumentSelection(
                    'bank_certificate',
                    file,
                    bankLocalPreviewRef,
                    setBankLocalPreviewUrl
                ),
        },
    ];
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

    const scrollToManagedDocumentUploads = () => {
        if (typeof document === 'undefined') {
            return;
        }

        document.getElementById('managed-document-uploads')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    return (
        <SupplierPortalLayout>
            <Head title={t('edit_profile', 'supplier_portal')} />
            <div className="space-y-5 pb-12">
                {/* Breadcrumb */}
                <nav
                    className="flex items-center gap-1 text-sm text-muted-foreground"
                    aria-label={t('breadcrumb_aria', 'supplier_portal')}
                    dir={locale === 'ar' ? 'rtl' : 'ltr'}
                >
                    {locale === 'ar' ? (
                        <>
                            <span className="font-medium text-foreground">
                                {t('edit_profile', 'supplier_portal')}
                            </span>
                            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                            <Link
                                href={route('supplier.profile')}
                                className="hover:text-foreground"
                                onClick={(e) => confirmLeaveIfNeeded(e, route('supplier.profile'))}
                            >
                                <span dir="auto">{supplierDisplayName}</span>
                            </Link>
                            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                            <Link
                                href={route('supplier.dashboard')}
                                className="hover:text-foreground"
                                onClick={(e) => confirmLeaveIfNeeded(e, route('supplier.dashboard'))}
                            >
                                {t('breadcrumb_dashboard', 'supplier_portal')}
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                href={route('supplier.dashboard')}
                                className="hover:text-foreground"
                                onClick={(e) => confirmLeaveIfNeeded(e, route('supplier.dashboard'))}
                            >
                                {t('breadcrumb_dashboard', 'supplier_portal')}
                            </Link>
                            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                            <Link
                                href={route('supplier.profile')}
                                className="hover:text-foreground"
                                onClick={(e) => confirmLeaveIfNeeded(e, route('supplier.profile'))}
                            >
                                <span dir="auto">{supplierDisplayName}</span>
                            </Link>
                            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                            <span className="font-medium text-foreground">
                                {t('edit_profile', 'supplier_portal')}
                            </span>
                        </>
                    )}
                </nav>

                {/* Page header / intro + actions */}
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
                                    <span>{statusLabel}</span>
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
                            <Link
                                href={route('supplier.profile')}
                                onClick={(e) => confirmLeaveIfNeeded(e, route('supplier.profile'))}
                            >
                                <Button type="button" variant="outline" size="sm">
                                    {t('back_to_profile', 'supplier_portal')}
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                form="supplier-profile-edit-form"
                                size="sm"
                                disabled={form.processing || !hasUnsavedChanges}
                            >
                                {form.processing ? (
                                    <>
                                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                        {t('saving_changes', 'supplier_portal')}
                                    </>
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

                {/* Review Changes Summary */}
                {hasUnsavedChanges && Object.keys(changesByTab).length > 0 && (
                    <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
                        <CardContent className="space-y-3 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="space-y-1 text-start">
                                    <p className="text-sm font-semibold">
                                        {t('edit_review_changes', 'supplier_portal')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('edit_review_changes_helper', 'supplier_portal')}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2 text-xs">
                                {sectionOrder
                                    .filter(({ id }) => changesByTab[id] && changesByTab[id].length > 0)
                                    .map(({ id, key }) => (
                                        <div
                                            key={id}
                                            className="flex flex-col gap-1 rounded-lg border border-border/40 bg-muted/40 px-2 py-1.5"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center gap-2 text-[11px] font-medium text-foreground">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                    {t(key, 'supplier_portal')}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTabId(id)}
                                                    className="text-[11px] font-medium text-primary hover:text-primary/90"
                                                >
                                                    {t('edit_go_to_section', 'supplier_portal')}
                                                </button>
                                            </div>
                                            <ul className="ms-4 list-disc space-y-0.5 text-[11px] text-muted-foreground">
                                                {changesByTab[id].map((msg) => (
                                                    <li key={msg}>{msg}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {hasDraft && (
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-50">
                        <div className="space-y-1 text-start text-sm">
                            <p className="font-medium">
                                {t('edit_draft_found', 'supplier_portal')}
                            </p>
                            {hasDraft.savedAt && (
                                <p className="text-xs text-amber-800 dark:text-amber-100/80">
                                    {t('edit_last_saved_at', 'supplier_portal').replace(
                                        ':time',
                                        new Date(hasDraft.savedAt).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')
                                    )}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-shrink-0 gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleDismissDraft}
                            >
                                {t('edit_draft_dismiss', 'supplier_portal')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleRestoreDraft}
                            >
                                {t('edit_draft_restore', 'supplier_portal')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div
                    className="flex flex-wrap gap-2"
                    role="tablist"
                    aria-label={t('edit_section_jump', 'supplier_portal')}
                >
                    {sectionOrder.map(({ id, key }, index) => {
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

                <form id="supplier-profile-edit-form" onSubmit={handleSubmit} className="space-y-6">
                    {/* 1. Company Information */}
                    <Card
                        id="section-company-panel"
                        role="tabpanel"
                        aria-labelledby="section-company-tab"
                        hidden={activeTabId !== 'section-company'}
                        className="rounded-xl border border-border/60 bg-card shadow-sm"
                    >
                        <CardHeader className="border-b border-border/40 px-4 py-3">
                            <CardTitle className="text-sm font-semibold">{t('profile_section_basic', 'supplier_portal')}</CardTitle>
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
                                    {t('profile_legal_name_ar', 'supplier_portal')}{' '}
                                    <span className="text-destructive">*</span>
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
                                    error={form.errors.company_logo ?? null}
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
                                            setCompanyLogoPreview(supplier.company_logo_url ?? null);
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

                    {/* 2. Contact Details */}
                    <Card
                        id="section-contact-panel"
                        role="tabpanel"
                        aria-labelledby="section-contact-tab"
                        hidden={activeTabId !== 'section-contact'}
                        className="rounded-xl border border-border/60 bg-card shadow-sm"
                    >
                        <CardHeader className="border-b border-border/40 px-4 py-3">
                            <CardTitle className="text-sm font-semibold">{t('profile_section_contact', 'supplier_portal')}</CardTitle>
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

                    {/* 3. Address & Location */}
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

                    {/* 4. Commercial & Legal */}
                    <Card
                        id="section-legal-panel"
                        role="tabpanel"
                        aria-labelledby="section-legal-tab"
                        hidden={activeTabId !== 'section-legal'}
                        className="rounded-xl border border-border/60 bg-card shadow-sm"
                    >
                        <CardHeader className="border-b border-border/40 px-4 py-3">
                            <CardTitle className="text-sm font-semibold">{t('profile_section_legal', 'supplier_portal')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
                            <div className="space-y-2 text-start">
                                <Label htmlFor="commercial_registration_no">
                                    {t('profile_cr_no', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="commercial_registration_no"
                                    value={form.data.commercial_registration_no}
                                    onChange={(e) =>
                                        form.setData('commercial_registration_no', e.target.value)
                                    }
                                    dir="ltr"
                                    className="text-start"
                                />
                            </div>
                            <div className="space-y-2 text-start">
                                <Label htmlFor="cr_expiry_date">
                                    {t('cr_expiry_date', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="cr_expiry_date"
                                    type="date"
                                    value={form.data.cr_expiry_date}
                                    onChange={(e) =>
                                        form.setData('cr_expiry_date', e.target.value)
                                    }
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
                                <Label htmlFor="vat_number">
                                    {t('profile_vat_number', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="vat_number"
                                    value={form.data.vat_number}
                                    onChange={(e) => form.setData('vat_number', e.target.value)}
                                    dir="ltr"
                                    className="text-start"
                                />
                            </div>
                            <div className="space-y-2 text-start">
                                <Label htmlFor="vat_expiry_date">
                                    {t('vat_expiry_date', 'supplier_portal')}
                                </Label>
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
                                <Label htmlFor="business_license_number">
                                    {t('business_license_number', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="business_license_number"
                                    value={form.data.business_license_number}
                                    onChange={(e) => form.setData('business_license_number', e.target.value)}
                                    dir="ltr"
                                    className="text-start"
                                />
                            </div>
                            <div className="space-y-2 text-start">
                                <Label htmlFor="license_expiry_date">
                                    {t('license_expiry_date', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="license_expiry_date"
                                    type="date"
                                    value={form.data.license_expiry_date}
                                    onChange={(e) =>
                                        form.setData('license_expiry_date', e.target.value)
                                    }
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
                                <Label htmlFor="unified_number">
                                    {t('unified_number', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="unified_number"
                                    value={form.data.unified_number}
                                    onChange={(e) => form.setData('unified_number', e.target.value)}
                                    dir="ltr"
                                    className="text-start"
                                />
                            </div>
                            <div className="space-y-2 text-start">
                                <Label htmlFor="chamber_of_commerce_number">
                                    {t('chamber_of_commerce_number', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="chamber_of_commerce_number"
                                    value={form.data.chamber_of_commerce_number}
                                    onChange={(e) =>
                                        form.setData('chamber_of_commerce_number', e.target.value)
                                    }
                                    dir="ltr"
                                    className="text-start"
                                />
                            </div>
                            <div className="space-y-1.5 text-start">
                                <Label htmlFor="classification_grade">
                                    {t('classification_grade', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="classification_grade"
                                    value={form.data.classification_grade}
                                    onChange={(e) =>
                                        form.setData('classification_grade', e.target.value)
                                    }
                                    className="uppercase text-start"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    {t('classification_grade_helper', 'supplier_portal')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 5. Banking */}
                    <Card
                        id="section-banking-panel"
                        role="tabpanel"
                        aria-labelledby="section-banking-tab"
                        hidden={activeTabId !== 'section-banking'}
                        className="rounded-xl border border-border/60 bg-card shadow-sm"
                    >
                        <CardHeader className="border-b border-border/40 px-4 py-3">
                            <CardTitle className="text-sm font-semibold">{t('profile_section_banking', 'supplier_portal')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
                            <div className="space-y-2 text-start">
                                <Label htmlFor="bank_name">
                                    {t('profile_bank_name', 'supplier_portal')}
                                </Label>
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
                                <Label htmlFor="bank_country">
                                    {t('bank_country', 'supplier_portal')}
                                </Label>
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
                                <Label htmlFor="bank_account_name">
                                    {t('profile_account_holder', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="bank_account_name"
                                    value={form.data.bank_account_name}
                                    onChange={(e) =>
                                        form.setData('bank_account_name', e.target.value)
                                    }
                                    style={{ textTransform: 'capitalize' }}
                                    className="text-start"
                                />
                            </div>
                            <div className="space-y-2 text-start">
                                <Label htmlFor="bank_account_number">
                                    {t('bank_account_number', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="bank_account_number"
                                    value={form.data.bank_account_number}
                                    onChange={(e) =>
                                        form.setData('bank_account_number', e.target.value)
                                    }
                                    dir="ltr"
                                    className="font-mono text-start"
                                />
                            </div>
                            <div className="space-y-2 text-start">
                                <Label htmlFor="iban">
                                    {t('profile_iban', 'supplier_portal')}
                                </Label>
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
                                <Label htmlFor="swift_code">
                                    {t('profile_swift', 'supplier_portal')}
                                </Label>
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

                    {/* 6. Financial & Capacity */}
                    <Card
                        id="section-financial-panel"
                        role="tabpanel"
                        aria-labelledby="section-financial-tab"
                        hidden={activeTabId !== 'section-financial'}
                        className="rounded-xl border border-border/60 bg-card shadow-sm"
                    >
                        <CardHeader className="border-b border-border/40 px-4 py-3">
                            <CardTitle className="text-sm font-semibold">{t('profile_section_financial', 'supplier_portal')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
                            <div className="space-y-2 text-start">
                                <Label htmlFor="preferred_currency">{t('profile_preferred_currency', 'supplier_portal')}</Label>
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
                                <Label htmlFor="payment_terms_days">{t('profile_payment_terms', 'supplier_portal')}</Label>
                                <Select
                                    value={form.data.payment_terms_days !== '' && form.data.payment_terms_days != null ? String(form.data.payment_terms_days) : ''}
                                    onValueChange={(v) => form.setData('payment_terms_days', v ? Number(v) : '')}
                                >
                                    <SelectTrigger id="payment_terms_days" className="text-start">
                                        <SelectValue placeholder={t('select_payment_terms', 'supplier_portal')} />
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
                                    error={form.errors.credit_application ?? null}
                                    uploadButtonLabel={t('upload_document', 'supplier_portal')}
                                    replaceButtonLabel={t('replace_document', 'supplier_portal')}
                                    inputRef={creditAppInputRef}
                                    onFileSelect={(file) =>
                                        form.setData('credit_application', file)
                                    }
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

                    {/* 7. Categories */}
                    <Card
                        id="section-categories-panel"
                        role="tabpanel"
                        aria-labelledby="section-categories-tab"
                        hidden={activeTabId !== 'section-categories'}
                        className="rounded-xl border border-border/60 bg-card shadow-sm"
                    >
                        <CardHeader className="border-b border-border/40 px-4 py-3">
                            <CardTitle className="text-sm font-semibold">{t('profile_section_categories', 'supplier_portal')}</CardTitle>
                            <CardDescription className="text-start">
                                {t('categories_search_hint', 'supplier_portal')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            <CategorySelector
                                categories={categories}
                                value={form.data.category_ids}
                                onChange={(ids) => form.setData('category_ids', ids)}
                                locale={locale as 'en' | 'ar'}
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
                        <CardHeader className="border-b border-border/40 px-4 py-3 flex flex-row items-center justify-between gap-2">
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
                            {supplier.contacts && supplier.contacts.length > 0 ? (
                                <div className="grid gap-3 md:grid-cols-2">
                                    {supplier.contacts.map((contact) => (
                                        <ContactCard
                                            key={contact.id}
                                            contact={contact}
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
                                                    business_card_front_url:
                                                        c.business_card_front_url ?? null,
                                                    business_card_back_url:
                                                        c.business_card_back_url ?? null,
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
                        <SupplierDocumentsCard
                            documents={persistedDocuments}
                            actionLabel={t('upload_document_short', 'supplier_portal')}
                            emptyActionLabel={t('profile_upload_first_document', 'supplier_portal')}
                            onActionClick={scrollToManagedDocumentUploads}
                        />

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
                                const previewUrl = document.selectedFile
                                    ? document.selectedPreviewUrl
                                    : document.summary?.preview_url ?? null;
                                const hasStoredDocument = !!document.summary;
                                const hasDocument = hasStoredDocument || !!document.selectedFile;
                                const statusChipClass = hasDocument
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';

                                return (
                                    <div
                                        key={document.key}
                                        className={`flex flex-col gap-4 rounded-lg border border-border/50 bg-muted/40 p-3 ${
                                            isRtl
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
                                                isRtl
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
                                                        {hasDocument
                                                            ? t('profile_latest', 'supplier_portal')
                                                            : t('missing', 'ui')}
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
                                                    {!hasDocument && (
                                                        <div>{document.helperText}</div>
                                                    )}
                                                    {document.selectedFile && (
                                                        <div className="text-emerald-700 dark:text-emerald-300">
                                                            {t('edit_changed_documents', 'supplier_portal')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                                <div
                                                    className={`flex w-full flex-col gap-2 md:w-[220px] md:flex-none ${
                                                        isRtl
                                                            ? 'md:items-start'
                                                            : 'md:items-end'
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
                                                        isRtl ? 'md:justify-start' : 'md:justify-end'
                                                    }`}
                                                >
                                                    {/*
                                                      Persisted view/download is handled by the shared documents table above.
                                                      This upload manager stays focused on replace/upload actions.
                                                    */}
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => document.inputRef.current?.click()}
                                                    >
                                                        {t(
                                                            document.summary || document.selectedFile
                                                                ? 'replace_document'
                                                                : 'upload_document',
                                                            'supplier_portal'
                                                        )}
                                                    </Button>
                                                </div>

                                                <p
                                                    className={`text-[11px] text-muted-foreground ${
                                                        isRtl ? 'md:text-start' : 'md:text-end'
                                                    }`}
                                                >
                                                    {document.uploadLabel}
                                                </p>
                                                <p
                                                    className={`text-[11px] text-muted-foreground ${
                                                        isRtl ? 'md:text-start' : 'md:text-end'
                                                    }`}
                                                >
                                                    {document.helperText}
                                                </p>
                                                {document.error && (
                                                    <p
                                                        className={`text-xs text-destructive ${
                                                            isRtl ? 'md:text-start' : 'md:text-end'
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
                        // refresh supplier data already handled inside modal via router.reload
                    }}
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
        </SupplierPortalLayout>
    );
}
