import { Head, useForm, usePage, Link } from '@inertiajs/react';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { WizardProgress, type WizardStep } from '@/Components/Suppliers/WizardProgress';
import { isValidEmail, isValidUrl } from '@/utils/suppliers';
import GuestSupplierLayout from '@/Layouts/GuestSupplierLayout';
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    Check,
    Loader2,
    XCircle,
    AlertCircle,
    Eye,
    EyeOff,
    Save,
} from 'lucide-react';
import { ImageCropModal } from '@/Components/ImageCropModal';
import { SupplierImageUploadField } from '@/Components/SupplierPortal/SupplierImageUploadField';
import { CategorySelector } from '@/Components/Suppliers/CategorySelector';
import { CategorySuggestions } from '@/Components/Suppliers/CategorySuggestions';
import { displayLowercase, displayTitleCase, displayUppercase } from '@/utils/textDisplay';
import { useCategorySuggestions } from '@/hooks/useCategorySuggestions';
import MapPicker from '@/Components/Maps/MapPicker';
import {
    getPasswordPolicyFailureKeys,
    passwordMeetsRegistrationPolicy,
} from '@/utils/passwordPolicy';

interface ContactFormItem {
    name: string;
    job_title: string;
    department: string;
    contact_type: string;
    email: string;
    phone: string;
    mobile: string;
    is_primary: boolean;
    business_card_front: File | null;
    business_card_back: File | null;
}

interface RegistrationForm {
    legal_name_en: string;
    legal_name_ar: string;
    trade_name: string;
    supplier_type: string;
    country: string;
    city: string;
    postal_code: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    phone: string;
    email: string;
    password: string;
    password_confirmation: string;
    website: string;
    category_ids: string[];
    commercial_registration_no: string;
    cr_expiry_date: string;
    vat_number: string;
    unified_number: string;
    business_license_number: string;
    license_expiry_date: string;
    chamber_of_commerce_number: string;
    classification_grade: string;
    contacts: ContactFormItem[];
    bank_name: string;
    bank_country: string;
    bank_account_name: string;
    bank_account_number: string;
    iban: string;
    swift_code: string;
    preferred_currency: string;
    payment_terms_days: string;
    avatar: File | null;
    company_logo: File | null;
    cr_document: File | null;
    vat_document: File | null;
    unified_document: File | null;
    bank_certificate: File | null;
}

const emptyContact: ContactFormItem = {
    name: '',
    job_title: '',
    department: '',
    contact_type: 'sales',
    email: '',
    phone: '',
    mobile: '',
    is_primary: true,
    business_card_front: null,
    business_card_back: null,
};

interface CategoryOption {
    id: string;
    code: string;
    name_en: string;
    name_ar: string;
    supplier_type: string;
    parent_id: string | null;
    level?: number;
    is_leaf?: boolean;
    full_path_en?: string;
    full_path_ar?: string;
}

interface SupplierRegisterProps {
    categories: CategoryOption[];
    locations: Record<string, string[]>;
}

function buildFullPath(
    categoryId: string,
    byId: Map<string, CategoryOption>,
    locale: 'en' | 'ar'
): string {
    const cat = byId.get(categoryId);
    if (!cat) return '';
    const name = locale === 'ar' ? (cat.name_ar ?? cat.name_en) : (cat.name_en ?? cat.name_ar);
    if (!cat.parent_id) return name;
    const parentPath = buildFullPath(cat.parent_id, byId, locale);
    return parentPath ? `${parentPath} > ${name}` : name;
}

const STEP_LABEL_KEYS = ['step_company_info', 'step_legal', 'step_contacts', 'step_bank', 'step_review'] as const;

const TOTAL_STEPS = 5;
const STEP_COMPANY = 1;
const STEP_LEGAL = 2;
const STEP_CONTACTS = 3;
const STEP_BANK = 4;
const STEP_REVIEW = 5;
const DRAFT_KEY = 'supplier_registration_draft';

const COUNTRY_FLAGS: Record<string, string> = {
    'Saudi Arabia': '🇸🇦',
    'United Arab Emirates': '🇦🇪',
    'Egypt': '🇪🇬',
    'Jordan': '🇯🇴',
    'Kuwait': '🇰🇼',
    'Bahrain': '🇧🇭',
    'Oman': '🇴🇲',
    'Qatar': '🇶🇦',
    'India': '🇮🇳',
    'United Kingdom': '🇬🇧',
    'United States': '🇺🇸',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'China': '🇨🇳',
    'Turkey': '🇹🇷',
    'Pakistan': '🇵🇰',
    'Other': '🌐',
};

export default function SupplierRegister({ categories, locations }: SupplierRegisterProps) {
    const { t } = useLocale();
    const locale = (usePage().props as { locale?: string }).locale ?? 'en';
    const STEPS: WizardStep[] = useMemo(
        () => STEP_LABEL_KEYS.map((key) => ({ label: t(key, 'supplier_portal') })),
        [t]
    );
    const [currentStep, setCurrentStep] = useState(1);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentStep]);
    const [crStatus, setCrStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [declared, setDeclared] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [agreedPrivacy, setAgreedPrivacy] = useState(false);
    const [showDraftBanner, setShowDraftBanner] = useState(false);
    const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);
    const [crDocPreview, setCrDocPreview] = useState<string | null>(null);
    const [vatDocPreview, setVatDocPreview] = useState<string | null>(null);
    const [unifiedDocPreview, setUnifiedDocPreview] = useState<string | null>(null);
    const [bankCertPreview, setBankCertPreview] = useState<string | null>(null);
    const [contactPreviews, setContactPreviews] = useState<Record<number, { bc_front?: string; bc_back?: string }>>({});
    /** Preserves File objects when Inertia clears inputs after a 422 response. */
    const registrationFileBackupRef = useRef<{
        avatar: File | null;
        company_logo: File | null;
        cr_document: File | null;
        vat_document: File | null;
        unified_document: File | null;
        bank_certificate: File | null;
        contacts: Array<{ business_card_front: File | null; business_card_back: File | null }>;
    } | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const companyLogoInputRef = useRef<HTMLInputElement>(null);
    const crDocRef = useRef<HTMLInputElement>(null);
    const vatDocRef = useRef<HTMLInputElement>(null);
    const unifiedDocRef = useRef<HTMLInputElement>(null);
    const bankCertRef = useRef<HTMLInputElement>(null);
    const bcFrontRefsList = useRef<React.RefObject<HTMLInputElement | null>[]>(
        [...Array(10)].map(() => ({ current: null }))
    ).current;
    const bcBackRefsList = useRef<React.RefObject<HTMLInputElement | null>[]>(
        [...Array(10)].map(() => ({ current: null }))
    ).current;
    type CropField = 'avatar' | 'company_logo' | `contact_bc_front_${number}` | `contact_bc_back_${number}`;
    const [cropModal, setCropModal] = useState<{ src: string; aspect: number; field: CropField } | null>(null);

    const form = useForm<RegistrationForm>({
        legal_name_en: '',
        legal_name_ar: '',
        trade_name: '',
        supplier_type: 'supplier',
        country: '',
        city: '',
        postal_code: '',
        address: '',
        latitude: null,
        longitude: null,
        phone: '',
        email: '',
        password: '',
        password_confirmation: '',
        website: '',
        category_ids: [],
        commercial_registration_no: '',
        cr_expiry_date: '',
        vat_number: '',
        unified_number: '',
        business_license_number: '',
        license_expiry_date: '',
        chamber_of_commerce_number: '',
        classification_grade: '',
        contacts: [{ ...emptyContact }],
        bank_name: '',
        bank_country: '',
        bank_account_name: '',
        bank_account_number: '',
        iban: '',
        swift_code: '',
        preferred_currency: 'SAR',
        payment_terms_days: '',
        avatar: null,
        company_logo: null,
        cr_document: null,
        vat_document: null,
        unified_document: null,
        bank_certificate: null,
    });

    const checkCrAvailability = useCallback(async (value: string) => {
        const crNumber = value.trim();
        if (!crNumber) {
            setCrStatus('idle');
            return;
        }

        setCrStatus('checking');

        try {
            const res = await fetch(
                `/register/supplier/check-cr?cr_number=${encodeURIComponent(crNumber)}`,
                {
                    headers: {
                        Accept: 'application/json',
                    },
                }
            );

            if (!res.ok) {
                setCrStatus('idle');
                return;
            }

            const data = (await res.json()) as { available?: boolean };
            if (typeof data.available !== 'boolean') {
                setCrStatus('idle');
                return;
            }

            setCrStatus(data.available ? 'available' : 'taken');
        } catch {
            setCrStatus('idle');
        }
    }, []);

    function validateStep(step: number): boolean {
        if (step === 1) {
            if (!form.data.legal_name_en.trim()) return false;
            if (!form.data.legal_name_ar.trim()) return false;
            if (!form.data.supplier_type) return false;
            if (!form.data.country.trim()) return false;
            if (!form.data.city.trim()) return false;
            if (!form.data.email.trim() || !isValidEmail(form.data.email)) return false;
            if (!passwordMeetsRegistrationPolicy(form.data.password)) return false;
            if (form.data.password !== form.data.password_confirmation) return false;
            if (form.data.website?.trim()) {
                const u = form.data.website.trim();
                const withProtocol = u.startsWith('http') ? u : 'https://' + u;
                if (!isValidUrl(withProtocol)) return false;
            }
            return true;
        }
        if (step === 2) {
            if (!form.data.commercial_registration_no.trim()) return false;
            if (!form.data.unified_number.trim()) return false;
            if (crStatus === 'taken') return false;
            if (crStatus === 'checking') return false;
            if (form.data.cr_expiry_date) {
                const crExpiry = new Date(form.data.cr_expiry_date);
                if (crExpiry < new Date()) return false;
            }
            if (form.data.license_expiry_date) {
                const licenseExpiry = new Date(form.data.license_expiry_date);
                if (licenseExpiry < new Date()) return false;
            }
            return true;
        }
        if (step === 3) {
            if (form.data.contacts.length === 0) return false;
            for (const c of form.data.contacts) {
                if (!c.name.trim()) return false;
            }
            const hasPrimary = form.data.contacts.some((c) => c.is_primary);
            if (!hasPrimary) return false;
            return true;
        }
        if (step === 4 || step === 5) return true;
        return true;
    }

    function getStepErrors(step: number): string[] {
        const errors: string[] = [];
        if (step === STEP_COMPANY) {
            if (!form.data.legal_name_en.trim()) errors.push(`${t('legal_name_en', 'supplier_portal')} ${t('is_required', 'supplier_portal')}`);
            if (!form.data.legal_name_ar.trim()) errors.push(`${t('legal_name_ar_label', 'supplier_portal')} ${t('is_required', 'supplier_portal')}`);
            if (!form.data.supplier_type) errors.push(`${t('supplier_type', 'supplier_portal')} ${t('is_required', 'supplier_portal')}`);
            if (!form.data.country.trim()) errors.push(`${t('country', 'supplier_portal')} ${t('is_required', 'supplier_portal')}`);
            if (!form.data.city.trim()) errors.push(`${t('city', 'supplier_portal')} ${t('is_required', 'supplier_portal')}`);
            if (!form.data.email.trim() || !isValidEmail(form.data.email)) errors.push(`${t('email', 'supplier_portal')} ${t('is_required_or_invalid', 'supplier_portal')}`);
            getPasswordPolicyFailureKeys(form.data.password).forEach((key) => {
                errors.push(t(key, 'supplier_portal'));
            });
            if (form.data.password !== form.data.password_confirmation) errors.push(t('passwords_do_not_match', 'supplier_portal'));
        }
        if (step === STEP_LEGAL) {
            if (!form.data.commercial_registration_no.trim()) errors.push(`${t('commercial_registration_no', 'supplier_portal')} ${t('is_required', 'supplier_portal')}`);
            if (!form.data.unified_number.trim()) {
                errors.push(`${t('unified_number_700_label', 'supplier_portal')} ${t('is_required', 'supplier_portal')}`);
            }
            if (form.data.cr_expiry_date) {
                const crExpiry = new Date(form.data.cr_expiry_date);
                if (crExpiry < new Date()) {
                    errors.push(t('cr_expiry_expired', 'supplier_portal'));
                } else {
                    const daysLeft = Math.floor((crExpiry.getTime() - Date.now()) / 86400000);
                    if (daysLeft < 90) errors.push(t('cr_expiry_soon', 'supplier_portal').replace(':days', String(daysLeft)));
                }
            }
            if (form.data.license_expiry_date) {
                const licenseExpiry = new Date(form.data.license_expiry_date);
                if (licenseExpiry < new Date()) errors.push(t('license_expiry_expired', 'supplier_portal'));
            }
        }
        if (step === STEP_CONTACTS) {
            if (form.data.contacts.length === 0) errors.push(t('at_least_one_contact', 'supplier_portal'));
            form.data.contacts.forEach((c, i) => {
                if (!c.name.trim()) errors.push(`${t('contact', 'supplier_portal')} ${i + 1}: ${t('name_required', 'supplier_portal')}`);
            });
        }
        return errors;
    }

    function validateAllSteps(): boolean {
        return (
            validateStep(STEP_COMPANY) &&
            validateStep(STEP_LEGAL) &&
            validateStep(STEP_CONTACTS) &&
            validateStep(STEP_BANK) &&
            validateStep(STEP_REVIEW)
        );
    }

    function getAllStepErrors(): string[] {
        return [
            ...getStepErrors(STEP_COMPANY),
            ...getStepErrors(STEP_LEGAL),
            ...getStepErrors(STEP_CONTACTS),
            ...getStepErrors(STEP_BANK),
        ];
    }

    function handleNext() {
        if (validateStep(currentStep)) setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }

    function backupRegistrationFiles(): void {
        registrationFileBackupRef.current = {
            avatar: form.data.avatar,
            company_logo: form.data.company_logo,
            cr_document: form.data.cr_document,
            vat_document: form.data.vat_document,
            unified_document: form.data.unified_document,
            bank_certificate: form.data.bank_certificate,
            contacts: form.data.contacts.map((c) => ({
                business_card_front: c.business_card_front,
                business_card_back: c.business_card_back,
            })),
        };
    }

    function restoreRegistrationFilesFromBackup(): void {
        const b = registrationFileBackupRef.current;
        if (!b) return;
        form.setData('avatar', b.avatar);
        form.setData('company_logo', b.company_logo);
        form.setData('cr_document', b.cr_document);
        form.setData('vat_document', b.vat_document);
        form.setData('unified_document', b.unified_document);
        form.setData('bank_certificate', b.bank_certificate);
        form.setData(
            'contacts',
            form.data.contacts.map((c, i) => ({
                ...c,
                business_card_front: b.contacts[i]?.business_card_front ?? c.business_card_front,
                business_card_back: b.contacts[i]?.business_card_back ?? c.business_card_back,
            }))
        );
    }

    function submitRegistration(): void {
        if (!validateAllSteps()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        backupRegistrationFiles();
        form.post('/register/supplier', {
            preserveScroll: true,
            onSuccess: () => {
                localStorage.removeItem(DRAFT_KEY);
            },
            onError: () => {
                restoreRegistrationFilesFromBackup();
            },
        });
    }

    const getSupplierTypeLabel = (type: string): string => {
        switch (type) {
            case 'supplier':
                return t('supplier', 'supplier_portal');
            case 'subcontractor':
                return t('subcontractor', 'supplier_portal');
            case 'service_provider':
                return t('service_provider', 'supplier_portal');
            case 'consultant':
                return t('consultant', 'supplier_portal');
            default:
                return type;
        }
    };

    function setContactPrimary(index: number) {
        const updated = form.data.contacts.map((c, i) => ({
            ...c,
            is_primary: i === index,
        }));
        form.setData('contacts', updated);
    }

    function addContact() {
        form.setData('contacts', [...form.data.contacts, { ...emptyContact, is_primary: false }]);
    }

    function removeContact(index: number) {
        const next = form.data.contacts.filter((_, i) => i !== index);
        if (next.length > 0 && form.data.contacts[index].is_primary) {
            next[0].is_primary = true;
        }
        form.setData('contacts', next);
    }

    const onCropComplete = (file: File) => {
        if (!cropModal) return;
        const field = cropModal.field;
        if (field === 'avatar') {
            form.setData('avatar', file);
            setAvatarPreview(URL.createObjectURL(file));
        } else if (field === 'company_logo') {
            form.setData('company_logo', file);
            setCompanyLogoPreview(URL.createObjectURL(file));
        } else {
            const frontMatch = field.match(/^contact_bc_front_(\d+)$/);
            const backMatch = field.match(/^contact_bc_back_(\d+)$/);
            const idx = frontMatch ? +frontMatch[1] : backMatch ? +backMatch[1] : -1;
            const side = frontMatch ? 'bc_front' : 'bc_back';
            const contactKey = frontMatch ? 'business_card_front' : 'business_card_back';
            if (idx >= 0) {
                const next = [...form.data.contacts];
                next[idx] = { ...next[idx], [contactKey]: file };
                form.setData('contacts', next);
                setContactPreviews((prev) => ({
                    ...prev,
                    [idx]: { ...prev[idx], [side]: URL.createObjectURL(file) },
                }));
            }
        }
        setCropModal(null);
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            try {
                const saveable = {
                    ...form.data,
                    password: '',
                    password_confirmation: '',
                    avatar: null,
                    company_logo: null,
                    cr_document: null,
                    vat_document: null,
                    unified_document: null,
                    bank_certificate: null,
                    contacts: form.data.contacts.map((c) => ({
                        ...c,
                        business_card_front: null,
                        business_card_back: null,
                    })),
                };
                const payload = { data: saveable, step: currentStep, savedAt: new Date().toISOString() };
                localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
                setLastSavedAt(new Date());
            } catch {}
        }, 1000);
        return () => clearTimeout(timeout);
    }, [form.data, currentStep]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw) as { data?: Record<string, unknown>; step?: number; savedAt?: string };
            if (draft?.data) {
                Object.entries(draft.data).forEach(([key, value]) => {
                    if (value !== null && value !== '') {
                        form.setData(key as keyof RegistrationForm, value as never);
                    }
                });
            }
            if (draft?.savedAt) setDraftSavedAt(draft.savedAt);
            if (draft?.step && draft.step > 1) setShowDraftBanner(true);
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const errs = form.errors;
        if (!errs || Object.keys(errs).length === 0) {
            return;
        }
        if (errs.password || errs.password_confirmation || errs.email) {
            setCurrentStep(STEP_COMPANY);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (errs.commercial_registration_no) {
            setCurrentStep(STEP_LEGAL);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [form.errors]);

    const categoryMap = useMemo(
        () => new Map(categories.map((c) => [c.id, c])),
        [categories]
    );
    const getFullPath = useCallback(
        (id: string, loc: 'en' | 'ar') => buildFullPath(id, categoryMap, loc),
        [categoryMap]
    );

    const { suggestions: suggestedCategories, aiSuggestionIds, isAiLoading } = useCategorySuggestions({
        categories,
        supplierType: form.data.supplier_type,
        legalNameEn: form.data.legal_name_en,
        legalNameAr: form.data.legal_name_ar,
        tradeName: form.data.trade_name,
        website: form.data.website,
        locale: locale as 'en' | 'ar',
        selectedIds: form.data.category_ids,
        /** Empty = all selectable leaf categories (no supplier_type ↔ category filter). */
        allowedCategoryTypes: [],
    });

    return (
        <GuestSupplierLayout title={t('public_register_title', 'supplier_portal')}>
            <Head title={t('public_register_title', 'supplier_portal')} />
            <div className="mb-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {t('public_register_title', 'supplier_portal')}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
                    {t('public_register_subtitle', 'supplier_portal')}
                </p>
            </div>

            {showDraftBanner && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-primary">
                        <Save className="h-4 w-4" />
                        <span>
                            {t('draft_restored', 'supplier_portal')}
                            {draftSavedAt && (
                                <span className="ms-1 text-xs text-muted-foreground">
                                    ({t('saved_on', 'supplier_portal')} {new Date(draftSavedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')})
                                </span>
                            )}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            localStorage.removeItem(DRAFT_KEY);
                            setShowDraftBanner(false);
                            setDraftSavedAt(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                        {t('clear_draft', 'supplier_portal')}
                    </button>
                </div>
            )}

            <WizardProgress currentStep={currentStep} steps={STEPS} />

            {/* Step 1 — Company Info + Categories */}
            {currentStep === STEP_COMPANY && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('company_information', 'supplier_portal')}</CardTitle>
                            <CardDescription>{t('basic_company_details', 'supplier_portal')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="legal_name_en">
                                    {t('legal_name_en', 'supplier_portal')} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="legal_name_en"
                                    style={{ textTransform: 'capitalize' }}
                                    value={form.data.legal_name_en}
                                    onChange={(e) => form.setData('legal_name_en', e.target.value)}
                                    aria-required="true"
                                    aria-invalid={!!form.errors.legal_name_en}
                                    aria-describedby={
                                        form.errors.legal_name_en ? 'err-legal_name_en' : undefined
                                    }
                                />
                                {form.errors.legal_name_en && (
                                    <p
                                        id="err-legal_name_en"
                                        role="alert"
                                        className="text-sm text-destructive mt-1"
                                    >
                                        {form.errors.legal_name_en}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="legal_name_ar">
                                    {t('legal_name_ar_label', 'supplier_portal')}
                                    <span className="text-destructive ms-1">*</span>
                                </Label>
                                <Input
                                    id="legal_name_ar"
                                    value={form.data.legal_name_ar}
                                    onChange={(e) => form.setData('legal_name_ar', e.target.value)}
                                    dir="rtl"
                                    aria-required="true"
                                    aria-invalid={!!form.errors.legal_name_ar}
                                    aria-describedby={
                                        form.errors.legal_name_ar ? 'err-legal_name_ar' : undefined
                                    }
                                />
                                {form.errors.legal_name_ar && (
                                    <p
                                        id="err-legal_name_ar"
                                        role="alert"
                                        className="text-sm text-destructive mt-1"
                                    >
                                        {form.errors.legal_name_ar}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="trade_name">{t('trade_name', 'supplier_portal')}</Label>
                                <Input
                                    id="trade_name"
                                    style={{ textTransform: 'uppercase' }}
                                    value={form.data.trade_name}
                                    onChange={(e) => form.setData('trade_name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="supplier_type">
                                    {t('supplier_type', 'supplier_portal')} <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={form.data.supplier_type}
                                    onValueChange={(v) => form.setData('supplier_type', v)}
                                >
                                    <SelectTrigger id="supplier_type" aria-required="true">
                                        <SelectValue placeholder={t('select_supplier_type', 'supplier_portal')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="supplier">{t('supplier', 'supplier_portal')}</SelectItem>
                                        <SelectItem value="subcontractor">{t('subcontractor', 'supplier_portal')}</SelectItem>
                                        <SelectItem value="service_provider">{t('service_provider', 'supplier_portal')}</SelectItem>
                                        <SelectItem value="consultant">{t('consultant', 'supplier_portal')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">
                                    {t('email', 'supplier_portal')} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    style={{ textTransform: 'lowercase' }}
                                    className="text-start"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    dir="ltr"
                                    aria-required="true"
                                    autoComplete="email"
                                    aria-invalid={!!form.errors.email}
                                    aria-describedby={form.errors.email ? 'err-email' : undefined}
                                />
                                {form.errors.email && (
                                    <p id="err-email" role="alert" className="text-sm text-destructive mt-1">
                                        {form.errors.email}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">
                                    {t('password', 'supplier_portal')} <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.data.password}
                                        onChange={(e) => form.setData('password', e.target.value)}
                                        autoComplete="new-password"
                                        className="pr-9 text-start"
                                        dir="ltr"
                                        aria-required="true"
                                        aria-invalid={!!form.errors.password}
                                        aria-describedby={[
                                            form.errors.password ? 'err-password' : null,
                                            'hint-password',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((p) => !p)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label={
                                            showPassword
                                                ? t('password_hide', 'supplier_portal')
                                                : t('password_show', 'supplier_portal')
                                        }
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {form.errors.password && (
                                    <p id="err-password" role="alert" className="text-sm text-destructive">
                                        {form.errors.password}
                                    </p>
                                )}
                                <p id="hint-password" className="text-xs text-muted-foreground">
                                    {t('password_hint', 'supplier_portal')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation">
                                    {t('confirm_password', 'supplier_portal')} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="password_confirmation"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.data.password_confirmation}
                                    onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                    autoComplete="new-password"
                                    dir="ltr"
                                    className="text-start"
                                    aria-required="true"
                                    aria-invalid={!!form.errors.password_confirmation}
                                    aria-describedby={
                                        form.errors.password_confirmation
                                            ? 'err-password_confirmation'
                                            : undefined
                                    }
                                />
                                {form.errors.password_confirmation && (
                                    <p
                                        id="err-password_confirmation"
                                        role="alert"
                                        className="text-sm text-destructive"
                                    >
                                        {form.errors.password_confirmation}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">
                                    {t('phone', 'supplier_portal')}
                                    <span className="ms-1 text-xs text-muted-foreground">({t('landline_only', 'supplier_portal')})</span>
                                </Label>
                                <Input
                                    id="phone"
                                    value={form.data.phone}
                                    onChange={(e) => form.setData('phone', e.target.value)}
                                    placeholder="+966 11 234 5678"
                                    pattern="^\+?[0-9\s\-\(\)]{7,20}$"
                                    inputMode="tel"
                                    dir="ltr"
                                    className="text-start"
                                    aria-invalid={!!form.errors.phone}
                                    aria-describedby={[
                                        form.errors.phone ? 'err-phone' : null,
                                        'hint-phone',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                />
                                <p id="hint-phone" className="text-xs text-muted-foreground">
                                    {t('phone_format_hint', 'supplier_portal')}
                                </p>
                                {form.errors.phone && (
                                    <p id="err-phone" role="alert" className="text-sm text-destructive">
                                        {form.errors.phone}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                <Input
                                    id="website"
                                    type="text"
                                    style={{ textTransform: 'lowercase' }}
                                    className="text-start"
                                    value={form.data.website}
                                    onChange={(e) => form.setData('website', e.target.value)}
                                    placeholder="www.example.com"
                                    dir="ltr"
                                    aria-invalid={!!form.errors.website}
                                    aria-describedby={[
                                        form.errors.website ? 'err-website' : null,
                                        'hint-website',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                />
                                <p id="hint-website" className="text-xs text-muted-foreground">
                                    {t('website_example', 'supplier_portal')}
                                </p>
                                {form.errors.website && (
                                    <p id="err-website" role="alert" className="text-sm text-destructive mt-1">
                                        {form.errors.website}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('location', 'supplier_portal')}</CardTitle>
                            <CardDescription className="text-start">{t('address_and_region', 'supplier_portal')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="country">
                                        {t('country', 'supplier_portal')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form.data.country || undefined}
                                        onValueChange={(v) => {
                                            form.setData('country', v);
                                            form.setData('city', '');
                                        }}
                                    >
                                        <SelectTrigger
                                            id="country"
                                            aria-required="true"
                                            aria-invalid={!!form.errors.country}
                                            aria-describedby={form.errors.country ? 'err-country' : undefined}
                                        >
                                            <SelectValue placeholder={t('select_country', 'supplier_portal')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(locations).map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    {COUNTRY_FLAGS[c] ? `${COUNTRY_FLAGS[c]} ` : ''}{c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.country && (
                                        <p id="err-country" role="alert" className="text-sm text-destructive mt-1">
                                            {form.errors.country}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">
                                        {t('city', 'supplier_portal')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form.data.city || undefined}
                                        onValueChange={(v) => form.setData('city', v)}
                                        disabled={!form.data.country}
                                    >
                                        <SelectTrigger
                                            id="city"
                                            aria-required="true"
                                            aria-invalid={!!form.errors.city}
                                            aria-describedby={form.errors.city ? 'err-city' : undefined}
                                        >
                                            <SelectValue
                                                placeholder={
                                                    form.data.country
                                                        ? t('select_city', 'supplier_portal')
                                                        : t('select_country_first', 'supplier_portal')
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(form.data.country ? (locations[form.data.country] ?? []) : []).map((city) => (
                                                <SelectItem key={city} value={city}>{city}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.city && (
                                        <p id="err-city" role="alert" className="text-sm text-destructive">
                                            {form.errors.city}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="postal_code">{t('postal_code', 'supplier_portal')}</Label>
                                <Input
                                    id="postal_code"
                                    value={form.data.postal_code}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        form.setData('postal_code', value);
                                    }}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={10}
                                    dir="ltr"
                                    className="text-start"
                                    placeholder="12345"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('postal_code_hint', 'supplier_portal')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <textarea
                                    id="address"
                                    value={form.data.address}
                                    onChange={(e) => form.setData('address', e.target.value)}
                                    rows={2}
                                    dir="auto"
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-colors resize-none capitalize"
                                    aria-invalid={!!form.errors.address}
                                    aria-describedby={form.errors.address ? 'err-address' : undefined}
                                />
                                {form.errors.address && (
                                    <p id="err-address" role="alert" className="text-sm text-destructive mt-1">
                                        {form.errors.address}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label id="label-location-map">{t('location_on_map', 'supplier_portal')}</Label>
                                <MapPicker
                                    ariaLabel={t('location_on_map', 'supplier_portal')}
                                    latitude={form.data.latitude}
                                    longitude={form.data.longitude}
                                    onChange={(lat, lng) => {
                                        form.setData('latitude', lat);
                                        form.setData('longitude', lng);
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('categories', 'supplier_portal')} — {t('categories_hint_title', 'supplier_portal')}</CardTitle>
                            <CardDescription className="text-start">
                                {t('categories_search_hint', 'supplier_portal')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <CategorySuggestions
                                categories={categories}
                                suggestedCategories={suggestedCategories}
                                selectedIds={form.data.category_ids}
                                locale={locale as 'en' | 'ar'}
                                maxSelections={20}
                                onAddCategory={(id) => {
                                    if (form.data.category_ids.includes(id)) return;
                                    if (form.data.category_ids.length >= 20) return;
                                    form.setData('category_ids', [...form.data.category_ids, id]);
                                }}
                                getFullPath={getFullPath}
                                aiSuggestionIds={aiSuggestionIds}
                                isAiLoading={isAiLoading}
                            />
                            <CategorySelector
                                categories={categories}
                                value={form.data.category_ids}
                                onChange={(ids) => form.setData('category_ids', ids)}
                                locale={locale as 'en' | 'ar'}
                                maxSelections={20}
                                placeholder={t('categories_search_placeholder', 'supplier_portal')}
                                aria-label={t('categories_search_placeholder', 'supplier_portal')}
                            />
                            {form.errors.category_ids && (
                                <p className="mt-2 text-sm text-destructive">{form.errors.category_ids}</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('company_logo_title', 'supplier_portal')}</CardTitle>
                            <CardDescription>{t('upload_company_logo_help', 'supplier_portal')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <SupplierImageUploadField
                                id="register-company-logo"
                                label={t('company_logo_title', 'supplier_portal')}
                                helperText={t('upload_company_logo_help', 'supplier_portal')}
                                previewUrl={companyLogoPreview}
                                error={form.errors.company_logo ?? null}
                                uploadButtonLabel={t('upload_logo', 'supplier_portal')}
                                replaceButtonLabel={t('replace_logo', 'supplier_portal')}
                                inputRef={companyLogoInputRef}
                                onFileSelect={(file) => {
                                    if (!file || !file.type.startsWith('image/')) return;
                                    setCropModal({ src: URL.createObjectURL(file), aspect: 1, field: 'company_logo' });
                                }}
                                hasFile={!!form.data.company_logo}
                                previewShape="rounded"
                                alt={t('company_logo_title', 'supplier_portal')}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 2 — Legal & Compliance */}
            {currentStep === STEP_LEGAL && (
                <div className="space-y-6">
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                        <span>{t('legal_registration_prompt', 'supplier_portal')}</span>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('legal_information', 'supplier_portal')}</CardTitle>
                            <CardDescription>{t('legal_compliance_desc', 'supplier_portal')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="unified_number">
                                    {t('unified_number_700_label', 'supplier_portal')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="unified_number"
                                    value={form.data.unified_number}
                                    onChange={(e) => form.setData('unified_number', e.target.value)}
                                    dir="ltr"
                                    className="text-start"
                                />
                                {form.errors.unified_number && (
                                    <p className="text-sm text-destructive mt-1">{form.errors.unified_number}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <SupplierImageUploadField
                                    id="unified_document"
                                    label={t('upload_unified_document', 'supplier_portal')}
                                    helperText={t('upload_document_help', 'supplier_portal')}
                                    previewUrl={unifiedDocPreview}
                                    error={form.errors.unified_document ?? null}
                                    uploadButtonLabel={t('upload_document', 'supplier_portal')}
                                    replaceButtonLabel={t('replace_document', 'supplier_portal')}
                                    inputRef={unifiedDocRef}
                                    onFileSelect={(file) => {
                                        if (!file) return;
                                        form.setData('unified_document', file);
                                        setUnifiedDocPreview(file.type === 'application/pdf' ? '__pdf__' : URL.createObjectURL(file));
                                    }}
                                    hasFile={!!form.data.unified_document}
                                    previewShape="rounded"
                                    alt="Unified Number Document"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="commercial_registration_no">
                                        {t('commercial_registration_no', 'supplier_portal')} <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="commercial_registration_no"
                                            value={form.data.commercial_registration_no}
                                            onChange={(e) => {
                                                form.setData('commercial_registration_no', e.target.value);
                                                setCrStatus('idle');
                                            }}
                                            onBlur={(e) => checkCrAvailability(e.target.value)}
                                            dir="ltr"
                                            className="text-start"
                                        />
                                        {crStatus === 'checking' && (
                                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {t('cr_checking', 'supplier_portal')}
                                            </span>
                                        )}
                                        {crStatus === 'available' && (
                                            <span className="flex items-center gap-1 text-sm text-green-600">
                                                <Check className="h-4 w-4" />
                                                {t('cr_available', 'supplier_portal')}
                                            </span>
                                        )}
                                        {crStatus === 'taken' && (
                                            <span className="flex items-center gap-1 text-sm text-destructive">
                                                <XCircle className="h-4 w-4" />
                                                {t('cr_already_registered', 'supplier_portal')}
                                            </span>
                                        )}
                                    </div>
                                    {form.errors.commercial_registration_no && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.commercial_registration_no}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cr_expiry_date">{t('cr_expiry_date', 'supplier_portal')}</Label>
                                    <Input
                                        id="cr_expiry_date"
                                        type="date"
                                        value={form.data.cr_expiry_date}
                                        onChange={(e) => form.setData('cr_expiry_date', e.target.value)}
                                    />
                                    {form.data.cr_expiry_date && new Date(form.data.cr_expiry_date) < new Date() && (
                                        <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{t('cr_expiry_expired', 'supplier_portal')}</span>
                                        </div>
                                    )}
                                    {form.data.cr_expiry_date && (() => {
                                        const days = Math.floor((new Date(form.data.cr_expiry_date).getTime() - Date.now()) / 86400000);
                                        return days >= 0 && days < 90 ? (
                                            <div key="cr-soon" className="flex items-center gap-1.5 text-xs text-amber-600 mt-1">
                                                <AlertCircle className="h-3 w-3 shrink-0" />
                                                <span>{t('cr_expiry_soon', 'supplier_portal').replace(':days', String(days))}</span>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <SupplierImageUploadField
                                    id="cr_document"
                                    label={t('upload_cr_document', 'supplier_portal')}
                                    helperText={t('upload_document_help', 'supplier_portal')}
                                    previewUrl={crDocPreview}
                                    error={form.errors.cr_document ?? null}
                                    uploadButtonLabel={t('upload_document', 'supplier_portal')}
                                    replaceButtonLabel={t('replace_document', 'supplier_portal')}
                                    inputRef={crDocRef}
                                    onFileSelect={(file) => {
                                        if (!file) return;
                                        form.setData('cr_document', file);
                                        setCrDocPreview(file.type === 'application/pdf' ? '__pdf__' : URL.createObjectURL(file));
                                    }}
                                    hasFile={!!form.data.cr_document}
                                    previewShape="rounded"
                                    alt="CR Document"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vat_number">{t('vat_number', 'supplier_portal')}</Label>
                                <Input
                                    id="vat_number"
                                    placeholder="3XXXXXXXXXX3"
                                    value={form.data.vat_number}
                                    onChange={(e) => form.setData('vat_number', e.target.value)}
                                    dir="ltr"
                                    className="text-start"
                                />
                                {form.errors.vat_number && (
                                    <p className="text-sm text-destructive mt-1">{form.errors.vat_number}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <SupplierImageUploadField
                                    id="vat_document"
                                    label={t('upload_vat_document', 'supplier_portal')}
                                    helperText={t('upload_document_help', 'supplier_portal')}
                                    previewUrl={vatDocPreview}
                                    error={form.errors.vat_document ?? null}
                                    uploadButtonLabel={t('upload_document', 'supplier_portal')}
                                    replaceButtonLabel={t('replace_document', 'supplier_portal')}
                                    inputRef={vatDocRef}
                                    onFileSelect={(file) => {
                                        if (!file) return;
                                        form.setData('vat_document', file);
                                        setVatDocPreview(file.type === 'application/pdf' ? '__pdf__' : URL.createObjectURL(file));
                                    }}
                                    hasFile={!!form.data.vat_document}
                                    previewShape="rounded"
                                    alt="VAT Document"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="business_license_number">{t('business_license_number', 'supplier_portal')}</Label>
                                    <Input
                                        id="business_license_number"
                                        value={form.data.business_license_number}
                                        onChange={(e) => form.setData('business_license_number', e.target.value)}
                                        dir="ltr"
                                        className="text-start"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="license_expiry_date">{t('license_expiry_date', 'supplier_portal')}</Label>
                                    <Input
                                        id="license_expiry_date"
                                        type="date"
                                        value={form.data.license_expiry_date}
                                        onChange={(e) => form.setData('license_expiry_date', e.target.value)}
                                    />
                                    {form.data.license_expiry_date && new Date(form.data.license_expiry_date) < new Date() && (
                                        <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{t('license_expiry_expired', 'supplier_portal')}</span>
                                        </div>
                                    )}
                                    {form.data.license_expiry_date && (() => {
                                        const days = Math.floor((new Date(form.data.license_expiry_date).getTime() - Date.now()) / 86400000);
                                        return days >= 0 && days < 90 ? (
                                            <div key="lic-soon" className="flex items-center gap-1.5 text-xs text-amber-600 mt-1">
                                                <AlertCircle className="h-3 w-3 shrink-0" />
                                                <span>{t('license_expiry_soon', 'supplier_portal').replace(':days', String(days))}</span>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="chamber_of_commerce_number">{t('chamber_of_commerce_number', 'supplier_portal')}</Label>
                                <Input
                                    id="chamber_of_commerce_number"
                                    value={form.data.chamber_of_commerce_number}
                                    onChange={(e) => form.setData('chamber_of_commerce_number', e.target.value)}
                                    dir="ltr"
                                    className="text-start"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="classification_grade">{t('classification_grade', 'supplier_portal')}</Label>
                                <Input
                                    id="classification_grade"
                                    value={form.data.classification_grade}
                                    onChange={(e) => form.setData('classification_grade', e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">{t('classification_grade_hint', 'supplier_portal')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    {crStatus === 'taken' && (
                        <p className="text-sm text-destructive">
                            {t('cr_number_taken', 'supplier_portal')}
                        </p>
                    )}
                </div>
            )}

            {/* Step 3 — Contacts */}
            {currentStep === STEP_CONTACTS && (
                <div className="space-y-6">
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                        <span>{t('at_least_one_contact_required', 'supplier_portal')}</span>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('company_contacts', 'supplier_portal')}</CardTitle>
                            <CardDescription>{t('at_least_one_contact_required', 'supplier_portal')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {form.data.contacts.map((contact, index) => (
                                <div key={index} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-foreground">{t('contact_num', 'supplier_portal')} {index + 1}</span>
                                        {form.data.contacts.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive"
                                                onClick={() => removeContact(index)}
                                            >
                                                {t('remove', 'supplier_portal')}
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`contact_name_${index}`}>
                                            {t('contact_name', 'supplier_portal')} <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id={`contact_name_${index}`}
                                            style={{ textTransform: 'capitalize' }}
                                            value={contact.name}
                                            onChange={(e) => {
                                                const next = [...form.data.contacts];
                                                next[index] = { ...next[index], name: e.target.value };
                                                form.setData('contacts', next);
                                            }}
                                            aria-required="true"
                                        />
                                    </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor={`contact_job_title_${index}`}>{t('job_title', 'supplier_portal')}</Label>
                                                <Input
                                                    id={`contact_job_title_${index}`}
                                                    style={{ textTransform: 'capitalize' }}
                                                    value={contact.job_title}
                                                    onChange={(e) => {
                                                        const next = [...form.data.contacts];
                                                        next[index] = { ...next[index], job_title: e.target.value };
                                                        form.setData('contacts', next);
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor={`contact_department_${index}`}>{t('department', 'supplier_portal')}</Label>
                                                <Input
                                                    id={`contact_department_${index}`}
                                                    style={{ textTransform: 'capitalize' }}
                                                    value={contact.department}
                                                    onChange={(e) => {
                                                        const next = [...form.data.contacts];
                                                        next[index] = { ...next[index], department: e.target.value };
                                                        form.setData('contacts', next);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`contact_type_${index}`}>
                                                {t('contact_type', 'supplier_portal')} <span className="text-destructive">*</span>
                                            </Label>
                                            <Select
                                                value={contact.contact_type}
                                                onValueChange={(v) => {
                                                    const next = [...form.data.contacts];
                                                    next[index] = { ...next[index], contact_type: v };
                                                    form.setData('contacts', next);
                                                }}
                                            >
                                                <SelectTrigger id={`contact_type_${index}`} aria-required="true">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="sales">{t('sales', 'supplier_portal')}</SelectItem>
                                                    <SelectItem value="technical">{t('technical', 'supplier_portal')}</SelectItem>
                                                    <SelectItem value="finance">{t('finance', 'supplier_portal')}</SelectItem>
                                                    <SelectItem value="contracts">{t('contracts', 'supplier_portal')}</SelectItem>
                                                    <SelectItem value="management">{t('management', 'supplier_portal')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor={`contact_email_${index}`}>{t('email', 'supplier_portal')}</Label>
                                                <Input
                                                    id={`contact_email_${index}`}
                                                    type="email"
                                                    className="lowercase"
                                                    value={contact.email}
                                                    onChange={(e) => {
                                                        const next = [...form.data.contacts];
                                                        next[index] = { ...next[index], email: e.target.value };
                                                        form.setData('contacts', next);
                                                    }}
                                                    autoComplete="email"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor={`contact_phone_${index}`}>{t('phone', 'supplier_portal')}</Label>
                                                <Input
                                                    id={`contact_phone_${index}`}
                                                    type="tel"
                                                    value={contact.phone}
                                                    onChange={(e) => {
                                                        const next = [...form.data.contacts];
                                                        next[index] = { ...next[index], phone: e.target.value };
                                                        form.setData('contacts', next);
                                                    }}
                                                    placeholder="+966 11 234 5678"
                                                    pattern="^\+?[0-9\s\-\(\)]{7,20}$"
                                                    inputMode="tel"
                                                    dir="ltr"
                                                    aria-describedby={`contact_phone_hint_${index}`}
                                                />
                                                <p id={`contact_phone_hint_${index}`} className="text-xs text-muted-foreground">{t('phone_format_hint', 'supplier_portal')}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`contact_mobile_${index}`}>{t('mobile', 'supplier_portal')}</Label>
                                            <Input
                                                id={`contact_mobile_${index}`}
                                                type="tel"
                                                value={contact.mobile}
                                                onChange={(e) => {
                                                    const next = [...form.data.contacts];
                                                    next[index] = { ...next[index], mobile: e.target.value };
                                                    form.setData('contacts', next);
                                                }}
                                                placeholder="+966 50 123 4567"
                                                pattern="^\+?[0-9\s\-\(\)]{9,20}$"
                                                inputMode="tel"
                                                dir="ltr"
                                                aria-describedby={`contact_mobile_hint_${index}`}
                                            />
                                            <p id={`contact_mobile_hint_${index}`} className="text-xs text-muted-foreground">{t('mobile_format_hint', 'supplier_portal')}</p>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <SupplierImageUploadField
                                                id={`contact_bc_front_${index}`}
                                                label={t('business_card_front', 'supplier_portal')}
                                                helperText={t('business_card_front_help', 'supplier_portal')}
                                                previewUrl={contactPreviews[index]?.bc_front ?? null}
                                                error={null}
                                                uploadButtonLabel={t('upload', 'supplier_portal')}
                                                replaceButtonLabel={t('replace', 'supplier_portal')}
                                                inputRef={bcFrontRefsList[Math.min(index, 9)] as React.RefObject<HTMLInputElement>}
                                                onFileSelect={(file) => {
                                                    if (!file || !file.type.startsWith('image/')) return;
                                                    setCropModal({
                                                        src: URL.createObjectURL(file),
                                                        aspect: 1.75,
                                                        field: `contact_bc_front_${index}` as CropField,
                                                    });
                                                }}
                                                hasFile={!!contact.business_card_front}
                                                previewShape="rectangle"
                                                alt="Business Card Front"
                                            />
                                            <SupplierImageUploadField
                                                id={`contact_bc_back_${index}`}
                                                label={t('business_card_back', 'supplier_portal')}
                                                helperText={t('business_card_back_help', 'supplier_portal')}
                                                previewUrl={contactPreviews[index]?.bc_back ?? null}
                                                error={null}
                                                uploadButtonLabel={t('upload', 'supplier_portal')}
                                                replaceButtonLabel={t('replace', 'supplier_portal')}
                                                inputRef={bcBackRefsList[Math.min(index, 9)] as React.RefObject<HTMLInputElement>}
                                                onFileSelect={(file) => {
                                                    if (!file || !file.type.startsWith('image/')) return;
                                                    setCropModal({
                                                        src: URL.createObjectURL(file),
                                                        aspect: 1.75,
                                                        field: `contact_bc_back_${index}` as CropField,
                                                    });
                                                }}
                                                hasFile={!!contact.business_card_back}
                                                previewShape="rectangle"
                                                alt="Business Card Back"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer rounded-md border border-border px-3 py-2 hover:bg-muted/50 transition-colors">
                                            <input
                                                type="radio"
                                                name={`primary_${index}`}
                                                checked={contact.is_primary}
                                                onChange={() => setContactPrimary(index)}
                                                className="accent-primary"
                                            />
                                            <span className="text-sm font-medium text-foreground">{t('set_as_primary', 'supplier_portal')}</span>
                                        </label>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={addContact}>
                                {t('add_another_contact', 'supplier_portal')}
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('primary_contact_avatar_title', 'supplier_portal')}</CardTitle>
                            <CardDescription>{t('upload_avatar_help', 'supplier_portal')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <SupplierImageUploadField
                                id="register-avatar"
                                label={t('primary_contact_avatar_title', 'supplier_portal')}
                                helperText={t('upload_avatar_help', 'supplier_portal')}
                                previewUrl={avatarPreview}
                                error={form.errors.avatar ?? null}
                                uploadButtonLabel={t('upload_avatar', 'supplier_portal')}
                                replaceButtonLabel={t('replace_avatar', 'supplier_portal')}
                                inputRef={avatarInputRef}
                                onFileSelect={(file) => {
                                    if (!file || !file.type.startsWith('image/')) return;
                                    setCropModal({ src: URL.createObjectURL(file), aspect: 1, field: 'avatar' });
                                }}
                                hasFile={!!form.data.avatar}
                                previewShape="circle"
                                alt={t('primary_contact_avatar_title', 'supplier_portal')}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 4 — Bank Details */}
            {currentStep === STEP_BANK && (
                <div className="space-y-6">
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                        <span>Bank details are optional but required for payment processing.</span>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('bank_account', 'supplier_portal')}</CardTitle>
                            <CardDescription>{t('bank_account_desc', 'supplier_portal')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="bank_name">{t('bank_name', 'supplier_portal')}</Label>
                                    <Input
                                        id="bank_name"
                                        value={form.data.bank_name}
                                        onChange={(e) => form.setData('bank_name', e.target.value)}
                                        dir="ltr"
                                        className="text-start"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bank_country">{t('bank_country', 'supplier_portal')}</Label>
                                    <Input
                                        id="bank_country"
                                        value={form.data.bank_country}
                                        onChange={(e) => form.setData('bank_country', e.target.value)}
                                        dir="ltr"
                                        className="text-start"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="bank_account_name">{t('bank_account_name', 'supplier_portal')}</Label>
                                <Input
                                    id="bank_account_name"
                                    value={form.data.bank_account_name}
                                    onChange={(e) => form.setData('bank_account_name', e.target.value)}
                                    dir="ltr"
                                    style={{ textTransform: 'capitalize' }}
                                    className="text-start"
                                />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bank_account_number">{t('bank_account_number', 'supplier_portal')}</Label>
                                    <Input
                                        id="bank_account_number"
                                        value={form.data.bank_account_number}
                                        onChange={(e) => form.setData('bank_account_number', e.target.value)}
                                        dir="ltr"
                                        className="text-start"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="iban">{t('iban', 'supplier_portal')}</Label>
                                <Input
                                    id="iban"
                                    placeholder="SA + 22 digits"
                                    value={form.data.iban}
                                    onChange={(e) => form.setData('iban', e.target.value)}
                                    dir="ltr"
                                    style={{ textTransform: 'uppercase' }}
                                    className="text-start"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="swift_code">{t('swift_code', 'supplier_portal')}</Label>
                                <Input
                                    id="swift_code"
                                    value={form.data.swift_code}
                                    onChange={(e) => form.setData('swift_code', e.target.value)}
                                    dir="ltr"
                                    style={{ textTransform: 'uppercase' }}
                                    className="text-start"
                                />
                            </div>
                            <div className="space-y-2">
                                <SupplierImageUploadField
                                    id="bank_certificate"
                                    label={t('bank_certificate', 'supplier_portal')}
                                    helperText={t('bank_certificate_help', 'supplier_portal')}
                                    previewUrl={bankCertPreview}
                                    error={form.errors.bank_certificate ?? null}
                                    uploadButtonLabel={t('upload_document', 'supplier_portal')}
                                    replaceButtonLabel={t('replace_document', 'supplier_portal')}
                                    inputRef={bankCertRef}
                                    onFileSelect={(file) => {
                                        if (!file) return;
                                        form.setData('bank_certificate', file);
                                        setBankCertPreview(file.type === 'application/pdf' ? '__pdf__' : URL.createObjectURL(file));
                                    }}
                                    hasFile={!!form.data.bank_certificate}
                                    previewShape="rounded"
                                    alt="Bank Certificate"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('payment_preferences', 'supplier_portal')}</CardTitle>
                            <CardDescription>{t('bank_payment_desc', 'supplier_portal')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="preferred_currency">{t('preferred_currency', 'supplier_portal')}</Label>
                                <Select
                                    value={form.data.preferred_currency || undefined}
                                    onValueChange={(v) => form.setData('preferred_currency', v)}
                                >
                                    <SelectTrigger id="preferred_currency">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SAR">SAR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="AED">AED</SelectItem>
                                        <SelectItem value="GBP">GBP</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="payment_terms_days">{t('payment_terms_days', 'supplier_portal')}</Label>
                                <Select
                                    value={form.data.payment_terms_days ? String(form.data.payment_terms_days) : 'none'}
                                    onValueChange={(v) => form.setData('payment_terms_days', v === 'none' ? '' : v)}
                                >
                                    <SelectTrigger id="payment_terms_days">
                                        <SelectValue placeholder="—" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">—</SelectItem>
                                        <SelectItem value="30">30</SelectItem>
                                        <SelectItem value="60">60</SelectItem>
                                        <SelectItem value="90">90</SelectItem>
                                        <SelectItem value="120">120</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 5 — Review & Submit */}
            {currentStep === STEP_REVIEW && (
                <div className="space-y-6">
                    {!validateAllSteps() && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            <div className="flex items-center gap-2 font-medium mb-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {t('fix_before_continue', 'supplier_portal')}
                            </div>
                            <ul className="space-y-1 list-inside list-disc text-xs">
                                {getAllStepErrors().map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {showDraftBanner && !passwordMeetsRegistrationPolicy(form.data.password) && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                            {t('draft_reenter_password', 'supplier_portal')}
                        </div>
                    )}
                    {(() => {
                        const warnings: string[] = [];
                        if (!form.data.vat_document) warnings.push(t('vat_number', 'supplier_portal'));
                        if (!form.data.cr_document) warnings.push(t('commercial_registration_no', 'supplier_portal'));
                        if (!form.data.unified_document) warnings.push(t('upload_unified_document', 'supplier_portal'));
                        if (!form.data.bank_certificate) warnings.push(t('bank_certificate', 'supplier_portal'));
                        if (!form.data.bank_name) warnings.push(t('bank_name', 'supplier_portal'));
                        return warnings.length > 0 ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 mb-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {t('review_missing_optional', 'supplier_portal')}
                                </div>
                                <ul className="space-y-1">
                                    {warnings.map((w, i) => (
                                        <li key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                            <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                                            {w} — {t('not_uploaded', 'supplier_portal')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null;
                    })()}
                    {Object.keys(form.errors).length > 0 && (
                        <div className="space-y-3">
                            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                                {Object.entries(form.errors).map(([key, msg]) => (
                                    <p key={key}>{String(msg)}</p>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">{t('validation_files_kept', 'supplier_portal')}</p>
                            {(form.errors.email || form.errors.commercial_registration_no) && (
                                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                                    <p className="text-muted-foreground mb-2">
                                        {t('registration_duplicate_actions_hint', 'supplier_portal')}
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <Link
                                            href={route('login')}
                                            className="text-primary font-medium underline underline-offset-2"
                                        >
                                            {t('login', 'supplier_portal')}
                                        </Link>
                                        <button
                                            type="button"
                                            className="text-muted-foreground underline underline-offset-2"
                                            onClick={() => {
                                                localStorage.removeItem(DRAFT_KEY);
                                                window.location.reload();
                                            }}
                                        >
                                            {t('clear_draft', 'supplier_portal')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('company_information', 'supplier_portal')}</CardTitle>
                            <CardDescription className="text-start">{t('basic_company_details', 'supplier_portal')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                    <dt className="text-muted-foreground shrink-0">{t('legal_name_en', 'supplier_portal')}</dt>
                                    <dd className="font-medium text-end">{displayTitleCase(form.data.legal_name_en)}</dd>
                                </div>
                                {form.data.legal_name_ar && (
                                    <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                        <dt className="text-muted-foreground shrink-0">{t('legal_name_ar_label', 'supplier_portal')}</dt>
                                        <dd className="font-medium text-end" dir="rtl">{form.data.legal_name_ar}</dd>
                                    </div>
                                )}
                                {form.data.trade_name && (
                                    <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                        <dt className="text-muted-foreground shrink-0">{t('trade_name', 'supplier_portal')}</dt>
                                        <dd className="font-medium text-end">{displayUppercase(form.data.trade_name)}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                    <dt className="text-muted-foreground shrink-0">{t('supplier_type', 'supplier_portal')}</dt>
                                    <dd className="font-medium text-end">{getSupplierTypeLabel(form.data.supplier_type)}</dd>
                                </div>
                                <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                    <dt className="text-muted-foreground shrink-0">{t('email', 'supplier_portal')}</dt>
                                    <dd className="font-medium text-end">{displayLowercase(form.data.email)}</dd>
                                </div>
                                {form.data.phone && (
                                    <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                        <dt className="text-muted-foreground shrink-0">{t('phone', 'supplier_portal')}</dt>
                                        <dd className="font-medium text-end">{form.data.phone}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                    <dt className="text-muted-foreground shrink-0">{t('location', 'supplier_portal')}</dt>
                                    <dd className="font-medium text-end">
                                        {displayTitleCase(form.data.country)}, {displayTitleCase(form.data.city)}
                                    </dd>
                                </div>
                                {form.data.category_ids.length > 0 && (
                                    <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                        <dt className="text-muted-foreground shrink-0">{t('categories', 'supplier_portal')}</dt>
                                        <dd className="font-medium text-end">
                                            <div className="flex flex-col gap-1 items-end">
                                                {form.data.category_ids.map((id) => {
                                                    const pathLabel = getFullPath(id, locale as 'en' | 'ar');
                                                    return pathLabel ? (
                                                        <span key={id} className="rounded bg-muted px-2 py-0.5 text-xs text-end max-w-full truncate" title={pathLabel}>
                                                            {pathLabel}
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('legal_information', 'supplier_portal')}</CardTitle>
                            <CardDescription className="text-start">{t('legal_compliance_desc', 'supplier_portal')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                    <dt className="text-muted-foreground shrink-0">{t('commercial_registration_no', 'supplier_portal')}</dt>
                                    <dd className="font-medium text-end">{form.data.commercial_registration_no}</dd>
                                </div>
                                {form.data.cr_expiry_date && (
                                    <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                        <dt className="text-muted-foreground shrink-0">{t('cr_expiry_date', 'supplier_portal')}</dt>
                                        <dd className="font-medium text-end">{form.data.cr_expiry_date}</dd>
                                    </div>
                                )}
                                {form.data.vat_number && (
                                    <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                        <dt className="text-muted-foreground shrink-0">{t('vat_number', 'supplier_portal')}</dt>
                                        <dd className="font-medium text-end">{form.data.vat_number}</dd>
                                    </div>
                                )}
                                {form.data.unified_number && (
                                    <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                        <dt className="text-muted-foreground shrink-0">{t('unified_number_700_label', 'supplier_portal')}</dt>
                                        <dd className="font-medium text-end">{form.data.unified_number}</dd>
                                    </div>
                                )}
                            </dl>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('contacts', 'supplier_portal')} ({form.data.contacts.length})</CardTitle>
                            <CardDescription className="text-start">{t('contacts_desc', 'supplier_portal')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {form.data.contacts.map((c, i) => (
                                <p key={i} className="text-sm text-foreground text-start">
                                    {displayTitleCase(c.name)} — {t(c.contact_type as 'sales' | 'technical' | 'finance' | 'contracts' | 'management', 'supplier_portal')}
                                    {c.email && ` — ${displayLowercase(c.email)}`}
                                    {c.is_primary && (
                                        <span className="ms-1 rounded bg-primary/10 px-1 text-xs text-primary">{t('primary', 'supplier_portal')}</span>
                                    )}
                                </p>
                            ))}
                            {form.data.avatar && (
                                <p className="text-sm text-muted-foreground mt-2 text-start">{t('primary_contact_avatar_title', 'supplier_portal')}: {t('attached', 'supplier_portal')}</p>
                            )}
                            {form.data.company_logo && (
                                <p className="text-sm text-muted-foreground mt-2 text-start">{t('company_logo_title', 'supplier_portal')}: {t('attached', 'supplier_portal')}</p>
                            )}
                        </CardContent>
                    </Card>
                    {(form.data.bank_name || form.data.iban) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('bank_details', 'supplier_portal')}</CardTitle>
                                <CardDescription className="text-start">{t('bank_account_desc', 'supplier_portal')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <dl className="space-y-2 text-sm">
                                    {form.data.bank_name && (
                                        <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                            <dt className="text-muted-foreground shrink-0">{t('bank_name', 'supplier_portal')}</dt>
                                            <dd className="font-medium text-end">{displayTitleCase(form.data.bank_name)}</dd>
                                        </div>
                                    )}
                                    {form.data.iban && (
                                        <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                            <dt className="text-muted-foreground shrink-0">{t('iban', 'supplier_portal')}</dt>
                                            <dd className="font-medium text-end">****{displayUppercase(form.data.iban.slice(-4))}</dd>
                                        </div>
                                    )}
                                    {form.data.preferred_currency && (
                                        <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                            <dt className="text-muted-foreground shrink-0">{t('preferred_currency', 'supplier_portal')}</dt>
                                            <dd className="font-medium text-end">{form.data.preferred_currency}</dd>
                                        </div>
                                    )}
                                    {form.data.payment_terms_days && (
                                        <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
                                            <dt className="text-muted-foreground shrink-0">{t('payment_terms_days', 'supplier_portal')}</dt>
                                            <dd className="font-medium text-end">{form.data.payment_terms_days} days</dd>
                                        </div>
                                    )}
                                </dl>
                            </CardContent>
                        </Card>
                    )}
                    {/* Agreement section */}
                    <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">
                            {t('agreements_required', 'supplier_portal')}
                        </h3>

                        <label className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                                checked={agreedTerms}
                                onCheckedChange={(v) => setAgreedTerms(Boolean(v))}
                                className="mt-0.5 shrink-0"
                            />
                            <span className="text-sm text-muted-foreground leading-relaxed">
                                {t('i_agree_to', 'supplier_portal')}{' '}
                                <a
                                    href={route('terms-and-conditions')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline hover:no-underline"
                                >
                                    {t('terms_conditions', 'supplier_portal')}
                                </a>
                                {' '}{t('and', 'supplier_portal')}{' '}
                                <a
                                    href={route('terms-of-use')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline hover:no-underline"
                                >
                                    {t('terms_of_use', 'supplier_portal')}
                                </a>
                            </span>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                                checked={agreedPrivacy}
                                onCheckedChange={(v) => setAgreedPrivacy(Boolean(v))}
                                className="mt-0.5 shrink-0"
                            />
                            <span className="text-sm text-muted-foreground leading-relaxed">
                                {t('i_agree_to', 'supplier_portal')}{' '}
                                <a
                                    href={route('privacy-policy')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline hover:no-underline"
                                >
                                    {t('privacy_policy', 'supplier_portal')}
                                </a>
                            </span>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                                checked={declared}
                                onCheckedChange={(v) => setDeclared(Boolean(v))}
                                className="mt-0.5 shrink-0"
                            />
                            <span className="text-sm text-muted-foreground leading-relaxed">
                                {t('declaration_accuracy', 'supplier_portal')}
                            </span>
                        </label>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="mt-8 border-t border-border pt-6">
                {currentStep < TOTAL_STEPS && !validateStep(currentStep) && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 mb-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {t('fix_before_continue', 'supplier_portal')}
                        </div>
                        <ul className="space-y-1">
                            {getStepErrors(currentStep).map((err, i) => (
                                <li key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                    <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                                    {err}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                            disabled={currentStep === STEP_COMPANY}
                            className="gap-1.5"
                        >
                            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                            {t('back', 'supplier_portal')}
                        </Button>
                        {lastSavedAt && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Save className="h-3 w-3" />
                                <span>
                                    {t('auto_saved_at', 'supplier_portal').replace(
                                        ':time',
                                        lastSavedAt.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {t('step_of', 'supplier_portal').replace(':current', String(currentStep)).replace(':total', String(TOTAL_STEPS))}
                    </div>
                    {currentStep < TOTAL_STEPS ? (
                        <Button
                            type="button"
                            onClick={handleNext}
                            disabled={!validateStep(currentStep)}
                            className="gap-1.5"
                        >
                            {t('next', 'supplier_portal')}
                            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            disabled={
                                !declared ||
                                !agreedTerms ||
                                !agreedPrivacy ||
                                !validateAllSteps() ||
                                form.processing
                            }
                            onClick={submitRegistration}
                            className="gap-1.5 min-w-[160px]"
                        >
                            {form.processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t('submitting', 'supplier_portal')}
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" />
                                    {t('submit_registration', 'supplier_portal')}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
            {cropModal && (
                <ImageCropModal
                    imageSrc={cropModal.src}
                    aspect={cropModal.aspect}
                    fileName={cropModal.field === 'avatar' ? 'avatar.jpg' : 'company-logo.jpg'}
                    onComplete={onCropComplete}
                    onCancel={() => {
                        URL.revokeObjectURL(cropModal.src);
                        setCropModal(null);
                    }}
                />
            )}
        </GuestSupplierLayout>
    );
}
