import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { SupplierImageUploadField } from '@/Components/SupplierPortal/SupplierImageUploadField';
import { ImageCropModal } from '@/Components/ImageCropModal';
import { isAvatarWithinLimit, isBusinessCardWithinLimit } from '@/utils/contactFileLimits';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

type CropFieldType = 'avatar' | 'business_card_front' | 'business_card_back';

const CONTACT_TYPES = [
    { value: 'sales', labelKey: 'contact_type_sales' as const },
    { value: 'technical', labelKey: 'contact_type_technical' as const },
    { value: 'finance', labelKey: 'contact_type_finance' as const },
    { value: 'contracts', labelKey: 'contact_type_contracts' as const },
    { value: 'management', labelKey: 'contact_type_management' as const },
];

export type ContactFormMode = 'create' | 'edit';

export interface ContactFormInitialData {
    id?: string;
    name: string;
    job_title: string;
    department: string;
    contact_type: string;
    email: string;
    phone: string;
    mobile: string;
    avatar_url?: string | null;
    business_card_front_url?: string | null;
    business_card_back_url?: string | null;
    is_primary?: boolean;
}

interface ContactFormModalProps {
    open: boolean;
    mode: ContactFormMode;
    initialData: ContactFormInitialData | null;
    onClose: () => void;
    onSaved: () => void;
    createUrl?: string;
    updateUrl?: string;
    setPrimaryUrl?: string;
    /**
     * When true, include `is_primary` in the payload (admin controllers validate this).
     * When false (supplier portal default), primary contact is handled via the set-primary endpoint.
     */
    includeIsPrimaryInPayload?: boolean;
    /**
     * When true, calls the set-primary endpoint after saving (supplier portal behavior).
     * When false, primary is expected to be handled by `includeIsPrimaryInPayload`.
     */
    shouldCallSetPrimaryRoute?: boolean;
}

export function ContactFormModal({
    open,
    mode,
    initialData,
    onClose,
    onSaved,
    createUrl,
    updateUrl,
    setPrimaryUrl,
    includeIsPrimaryInPayload = false,
    shouldCallSetPrimaryRoute = true,
}: ContactFormModalProps) {
    const { t, locale } = useLocale();
    const [submitting, setSubmitting] = useState(false);
    const [makePrimary, setMakePrimary] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar_url ?? null);
    const [cardFrontPreview, setCardFrontPreview] = useState<string | null>(initialData?.business_card_front_url ?? null);
    const [cardBackPreview, setCardBackPreview] = useState<string | null>(initialData?.business_card_back_url ?? null);
    const [cropModal, setCropModal] = useState<{ src: string; aspect: number | undefined; field: CropFieldType } | null>(null);
    const [fileSizeErrors, setFileSizeErrors] = useState<Record<CropFieldType, string | null>>({
        avatar: null,
        business_card_front: null,
        business_card_back: null,
    });
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const cardFrontInputRef = useRef<HTMLInputElement>(null);
    const cardBackInputRef = useRef<HTMLInputElement>(null);

    const avatarObjectUrlRef = useRef<string | null>(null);
    const cardFrontObjectUrlRef = useRef<string | null>(null);
    const cardBackObjectUrlRef = useRef<string | null>(null);

    const [formData, setFormData] = useState<{
        name: string;
        job_title: string;
        department: string;
        contact_type: string;
        email: string;
        phone: string;
        mobile: string;
        avatar: File | null;
        business_card_front: File | null;
        business_card_back: File | null;
    }>({
        name: initialData?.name ?? '',
        job_title: initialData?.job_title ?? '',
        department: initialData?.department ?? '',
        contact_type: initialData?.contact_type ?? 'sales',
        email: initialData?.email ?? '',
        phone: initialData?.phone ?? '',
        mobile: initialData?.mobile ?? '',
        avatar: null,
        business_card_front: null,
        business_card_back: null,
    });

    const buildInitialFormState = (data: ContactFormInitialData | null): typeof formData => ({
        name: data?.name ?? '',
        job_title: data?.job_title ?? '',
        department: data?.department ?? '',
        contact_type: data?.contact_type ?? 'sales',
        email: data?.email ?? '',
        phone: data?.phone ?? '',
        mobile: data?.mobile ?? '',
        avatar: null,
        business_card_front: null,
        business_card_back: null,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        // Reset form + errors + file errors
        setFormData(buildInitialFormState(initialData));
        setErrors({});
        setFileSizeErrors({
            avatar: null,
            business_card_front: null,
            business_card_back: null,
        });
        setCropModal(null);

        // Reset makePrimary based on mode + current contact
        setMakePrimary(mode === 'edit' ? !!initialData?.is_primary : false);

        // Clean up any previous object URLs
        if (avatarObjectUrlRef.current) {
            URL.revokeObjectURL(avatarObjectUrlRef.current);
            avatarObjectUrlRef.current = null;
        }
        if (cardFrontObjectUrlRef.current) {
            URL.revokeObjectURL(cardFrontObjectUrlRef.current);
            cardFrontObjectUrlRef.current = null;
        }
        if (cardBackObjectUrlRef.current) {
            URL.revokeObjectURL(cardBackObjectUrlRef.current);
            cardBackObjectUrlRef.current = null;
        }

        // Set previews from existing URLs
        setAvatarPreview(initialData?.avatar_url ?? null);
        setCardFrontPreview(initialData?.business_card_front_url ?? null);
        setCardBackPreview(initialData?.business_card_back_url ?? null);
    }, [open, mode, initialData]);

    useEffect(() => {
        return () => {
            if (avatarObjectUrlRef.current) {
                URL.revokeObjectURL(avatarObjectUrlRef.current);
            }
            if (cardFrontObjectUrlRef.current) {
                URL.revokeObjectURL(cardFrontObjectUrlRef.current);
            }
            if (cardBackObjectUrlRef.current) {
                URL.revokeObjectURL(cardBackObjectUrlRef.current);
            }
            if (cropModal?.src) {
                URL.revokeObjectURL(cropModal.src);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!open || !initialData) return null;

    const clearInput = (field: CropFieldType) => {
        if (field === 'avatar' && avatarInputRef.current) avatarInputRef.current.value = '';
        if (field === 'business_card_front' && cardFrontInputRef.current) cardFrontInputRef.current.value = '';
        if (field === 'business_card_back' && cardBackInputRef.current) cardBackInputRef.current.value = '';
    };

    const handleFileSelect = (field: CropFieldType, file: File | null) => {
        if (!file || !file.type.startsWith('image/')) return;
        const overLimit =
            field === 'avatar' ? !isAvatarWithinLimit(file) : !isBusinessCardWithinLimit(file);
        if (overLimit) {
            setFileSizeErrors((prev) => ({
                ...prev,
                [field]: t('file_too_large', 'supplier_portal'),
            }));
            clearInput(field);
            return;
        }
        setFileSizeErrors((prev) => ({ ...prev, [field]: null }));
        const aspect = field === 'avatar' ? 1 : 1.6;
        const url = URL.createObjectURL(file);
        setCropModal({ src: url, aspect, field });
    };

    const onCropComplete = (file: File) => {
        if (!cropModal) return;
        setFormData((prev) => ({
            ...prev,
            [cropModal.field]: file,
        }));
        const setter =
            cropModal.field === 'avatar'
                ? setAvatarPreview
                : cropModal.field === 'business_card_front'
                  ? setCardFrontPreview
                  : setCardBackPreview;

        const currentRef =
            cropModal.field === 'avatar'
                ? avatarObjectUrlRef
                : cropModal.field === 'business_card_front'
                  ? cardFrontObjectUrlRef
                  : cardBackObjectUrlRef;

        if (currentRef.current) {
            URL.revokeObjectURL(currentRef.current);
        }
        const nextUrl = URL.createObjectURL(file);
        currentRef.current = nextUrl;
        setter(nextUrl);
        setCropModal(null);
    };

    const handleClose = () => {
        if (submitting) return;
        setErrors({});
        setMakePrimary(false);
        setFileSizeErrors({
            avatar: null,
            business_card_front: null,
            business_card_back: null,
        });
        setCropModal(null);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setErrors({});

        const csrf =
            (document.querySelector('meta[name=\"csrf-token\"]') as HTMLMetaElement | null)
                ?.content ?? '';

        const body = new FormData();
        body.append('name', formData.name);
        body.append('job_title', formData.job_title);
        body.append('department', formData.department);
        body.append('contact_type', formData.contact_type);
        body.append('email', formData.email);
        body.append('phone', formData.phone);
        body.append('mobile', formData.mobile);
        if (includeIsPrimaryInPayload) {
            body.append('is_primary', makePrimary ? '1' : '0');
        }
        if (formData.avatar) body.append('avatar', formData.avatar);
        if (formData.business_card_front) {
            body.append('business_card_front', formData.business_card_front);
        }
        if (formData.business_card_back) {
            body.append('business_card_back', formData.business_card_back);
        }
        if (mode === 'edit') {
            body.append('_method', 'patch');
        }

        const url =
            mode === 'create'
                ? (createUrl ?? route('supplier.contacts.store'))
                : (updateUrl ?? route('supplier.contacts.update', initialData.id as string));

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body,
                redirect: 'manual',
            });

            if (res.status === 422) {
                const data = (await res.json()) as { errors?: Record<string, string[]> };
                const fieldErrors: Record<string, string> = {};
                Object.entries(data.errors ?? {}).forEach(([field, messages]) => {
                    if (messages && messages.length > 0) {
                        fieldErrors[field] = messages[0];
                    }
                });
                setErrors(fieldErrors);
                return;
            }

            if (shouldCallSetPrimaryRoute && !includeIsPrimaryInPayload && makePrimary && initialData.id) {
                await fetch(setPrimaryUrl ?? route('supplier.contacts.set-primary', initialData.id), {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrf,
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    redirect: 'manual',
                });
            }

            router.reload({ only: ['supplier'] });
            toast.success(
                t(
                    mode === 'create'
                        ? 'contact_added_success'
                        : 'contact_updated_success',
                    'supplier_portal'
                )
            );
            if (makePrimary) {
                toast.success(
                    t('primary_contact_updated_success', 'supplier_portal')
                );
            }
            onSaved();
            handleClose();
        } catch {
            // swallow network errors; UI already shows busy state
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="flex w-full max-w-[920px] max-h-[85vh] flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
                    <form onSubmit={handleSubmit} className="flex h-full flex-col">
                        <div className="flex items-start justify-between gap-2 border-b border-border/40 px-4 py-3">
                            <div>
                                <h2 className="text-sm font-semibold">
                                    {mode === 'create'
                                        ? t('title_add_contact', 'supplier_portal')
                                        : t('title_edit_contact', 'supplier_portal')}
                                </h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t('contacts_workspace', 'supplier_portal')}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleClose}
                            >
                                ×
                            </Button>
                        </div>

                        <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
                            {/* Basic information */}
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                <Label htmlFor="contact-name">
                                    {t('field_name', 'supplier_portal')} *
                                </Label>
                                <Input
                                    id="contact-name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                />
                                {errors.name && (
                                    <p className="text-xs text-destructive">{errors.name}</p>
                                )}
                                </div>
                                <div className="space-y-1.5">
                                <Label htmlFor="contact-job-title">
                                    {t('field_position', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="contact-job-title"
                                    value={formData.job_title}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            job_title: e.target.value,
                                        }))
                                    }
                                />
                                </div>
                            </div>

                            {/* Contact details */}
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                <Label htmlFor="contact-department">
                                    {t('field_department', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="contact-department"
                                    value={formData.department}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            department: e.target.value,
                                        }))
                                    }
                                />
                                </div>
                                <div className="space-y-1.5">
                                <Label htmlFor="contact-type">
                                    {t('field_contact_type', 'supplier_portal')}
                                </Label>
                                <select
                                    id="contact-type"
                                    value={formData.contact_type}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            contact_type: e.target.value,
                                        }))
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                    dir={locale === 'ar' ? 'rtl' : 'ltr'}
                                >
                                    {CONTACT_TYPES.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {t(opt.labelKey, 'supplier_portal')}
                                        </option>
                                    ))}
                                </select>
                                {errors.contact_type && (
                                    <p className="text-xs text-destructive">
                                        {errors.contact_type}
                                    </p>
                                )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="contact-email">
                                {t('field_email', 'supplier_portal')} *
                                </Label>
                                <Input
                                id="contact-email"
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        email: e.target.value,
                                    }))
                                }
                                />
                                {errors.email && (
                                <p className="text-xs text-destructive">{errors.email}</p>
                                )}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="contact-phone">
                                        {t('field_phone', 'supplier_portal')}
                                    </Label>
                                    <Input
                                        id="contact-phone"
                                        value={formData.phone}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                phone: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="contact-mobile">
                                        {t('field_mobile', 'supplier_portal')}
                                    </Label>
                                    <Input
                                        id="contact-mobile"
                                        value={formData.mobile}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                mobile: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            {/* Media uploads */}
                            <div className="space-y-2 border-t border-border pt-3">
                                <Label className="text-xs font-medium">
                                    {t('avatar_business_cards', 'supplier_portal')}
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    {t('image_max_2mb', 'supplier_portal')}
                                </p>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <SupplierImageUploadField
                                    id="inline-contact-avatar"
                                    label={t('avatar', 'supplier_portal')}
                                    helperText={t('upload_avatar_help', 'supplier_portal')}
                                    previewUrl={avatarPreview}
                                    error={fileSizeErrors.avatar ?? errors.avatar ?? null}
                                    uploadButtonLabel={t('upload_avatar', 'supplier_portal')}
                                    replaceButtonLabel={t('replace_avatar', 'supplier_portal')}
                                    inputRef={avatarInputRef}
                                    onFileSelect={(file) => handleFileSelect('avatar', file)}
                                    hasFile={!!formData.avatar || !!initialData.avatar_url}
                                    previewShape="circle"
                                    alt={t('avatar', 'supplier_portal')}
                                    size="compact"
                                />
                                    <SupplierImageUploadField
                                    id="inline-contact-card-front"
                                    label={t('card_front', 'supplier_portal')}
                                    helperText={t('upload_business_card_help', 'supplier_portal')}
                                    previewUrl={cardFrontPreview}
                                    error={
                                        fileSizeErrors.business_card_front ??
                                        errors.business_card_front ??
                                        null
                                    }
                                    uploadButtonLabel={t('upload_front', 'supplier_portal')}
                                    replaceButtonLabel={t('replace_front', 'supplier_portal')}
                                    inputRef={cardFrontInputRef}
                                    onFileSelect={(file) =>
                                        handleFileSelect('business_card_front', file)
                                    }
                                    hasFile={
                                        !!formData.business_card_front ||
                                        !!initialData.business_card_front_url
                                    }
                                    previewShape="rounded"
                                    alt={t('card_front', 'supplier_portal')}
                                    size="compact"
                                />
                                    <SupplierImageUploadField
                                    id="inline-contact-card-back"
                                    label={t('card_back', 'supplier_portal')}
                                    helperText={t('upload_business_card_help', 'supplier_portal')}
                                    previewUrl={cardBackPreview}
                                    error={
                                        fileSizeErrors.business_card_back ??
                                        errors.business_card_back ??
                                        null
                                    }
                                    uploadButtonLabel={t('upload_back', 'supplier_portal')}
                                    replaceButtonLabel={t('replace_back', 'supplier_portal')}
                                    inputRef={cardBackInputRef}
                                    onFileSelect={(file) =>
                                        handleFileSelect('business_card_back', file)
                                    }
                                    hasFile={
                                        !!formData.business_card_back ||
                                        !!initialData.business_card_back_url
                                    }
                                    previewShape="rounded"
                                    alt={t('card_back', 'supplier_portal')}
                                    size="compact"
                                />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-1 border-t border-border/40">
                                <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                                <input
                                    type="checkbox"
                                    checked={makePrimary}
                                    onChange={(e) => setMakePrimary(e.target.checked)}
                                />
                                <span>{t('set_primary_contact', 'supplier_portal')}</span>
                            </label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClose}
                                    disabled={submitting}
                                >
                                    {t('cancel', 'ui')}
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={
                                        submitting || Object.values(fileSizeErrors).some(Boolean)
                                    }
                                >
                                    {submitting
                                        ? t('saving', 'supplier_portal')
                                        : mode === 'create'
                                          ? t('add_contact', 'supplier_portal')
                                          : t('save_changes', 'supplier_portal')}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {cropModal && (
                <ImageCropModal
                    imageSrc={cropModal.src}
                    aspect={cropModal.aspect}
                    fileName={`${cropModal.field}.jpg`}
                    onComplete={onCropComplete}
                    onCancel={() => {
                        URL.revokeObjectURL(cropModal.src);
                        setCropModal(null);
                    }}
                />
            )}
        </>
    );
}
