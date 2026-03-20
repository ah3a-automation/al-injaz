import SupplierPortalLayout from '@/Layouts/SupplierPortalLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { ImageCropModal } from '@/Components/ImageCropModal';
import { SupplierImageUploadField } from '@/Components/SupplierPortal/SupplierImageUploadField';
import { Head, Link, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { isAvatarWithinLimit, isBusinessCardWithinLimit } from '@/utils/contactFileLimits';

type CropFieldType = 'avatar' | 'business_card_front' | 'business_card_back';

interface Contact {
    id: string;
    name: string;
    job_title: string | null;
    department: string | null;
    contact_type: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    is_primary: boolean;
    avatar_url: string | null;
    business_card_front_url: string | null;
    business_card_back_url: string | null;
}

interface EditProps {
    contact: Contact;
}

const CONTACT_TYPES = [
    { value: 'sales', labelKey: 'contact_type_sales' as const },
    { value: 'technical', labelKey: 'contact_type_technical' as const },
    { value: 'finance', labelKey: 'contact_type_finance' as const },
    { value: 'contracts', labelKey: 'contact_type_contracts' as const },
    { value: 'management', labelKey: 'contact_type_management' as const },
];

export default function SupplierPortalContactsEdit({ contact }: EditProps) {
    const { t } = useLocale();
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [cardFrontPreview, setCardFrontPreview] = useState<string | null>(null);
    const [cardBackPreview, setCardBackPreview] = useState<string | null>(null);
    const [cropModal, setCropModal] = useState<{ src: string; aspect: number | undefined; field: CropFieldType } | null>(null);
    const [fileSizeErrors, setFileSizeErrors] = useState<Record<CropFieldType, string | null>>({
        avatar: null,
        business_card_front: null,
        business_card_back: null,
    });
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const cardFrontInputRef = useRef<HTMLInputElement>(null);
    const cardBackInputRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        name: contact.name ?? '',
        job_title: contact.job_title ?? '',
        department: contact.department ?? '',
        contact_type: contact.contact_type ?? 'sales',
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        mobile: contact.mobile ?? '',
        avatar: null as File | null,
        business_card_front: null as File | null,
        business_card_back: null as File | null,
        _method: 'patch' as string,
    });

    const clearInput = (field: CropFieldType) => {
        if (field === 'avatar') avatarInputRef.current && (avatarInputRef.current.value = '');
        else if (field === 'business_card_front') cardFrontInputRef.current && (cardFrontInputRef.current.value = '');
        else cardBackInputRef.current && (cardBackInputRef.current.value = '');
    };

    const handleFileSelect = (field: CropFieldType, file: File | null) => {
        if (!file || !file.type.startsWith('image/')) return;
        const overLimit = field === 'avatar'
            ? !isAvatarWithinLimit(file)
            : !isBusinessCardWithinLimit(file);
        if (overLimit) {
            setFileSizeErrors((prev) => ({ ...prev, [field]: t('file_too_large', 'supplier_portal') }));
            clearInput(field);
            return;
        }
        setFileSizeErrors((prev) => ({ ...prev, [field]: null }));
        const aspect = field === 'avatar' ? 1 : 1.6;
        setCropModal({ src: URL.createObjectURL(file), aspect, field });
    };

    const onCropComplete = (file: File) => {
        if (!cropModal) return;
        form.setData(cropModal.field, file);
        const setter = cropModal.field === 'avatar' ? setAvatarPreview : cropModal.field === 'business_card_front' ? setCardFrontPreview : setCardBackPreview;
        setter(URL.createObjectURL(file));
        setCropModal(null);
    };

    const avatarDisplayUrl = avatarPreview ?? contact.avatar_url;
    const cardFrontDisplayUrl = cardFrontPreview ?? contact.business_card_front_url;
    const cardBackDisplayUrl = cardBackPreview ?? contact.business_card_back_url;

    return (
        <SupplierPortalLayout>
            <Head title={t('title_edit_contact', 'supplier_portal')} />
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold tracking-tight">{t('title_edit_contact', 'supplier_portal')}</h1>
                <p className="text-muted-foreground">{t('edit_contact_subtitle', 'supplier_portal')}</p>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('contact_info', 'supplier_portal')}</CardTitle>
                        <CardDescription>{t('contact_info_desc_edit', 'supplier_portal')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                form.post(route('supplier.contacts.update', contact.id), {
                                    forceFormData: true,
                                    preserveScroll: true,
                                });
                            }}
                            className="space-y-4"
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('field_name', 'supplier_portal')} *</Label>
                                    <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                                    {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="job_title">{t('field_position', 'supplier_portal')}</Label>
                                    <Input id="job_title" value={form.data.job_title} onChange={(e) => form.setData('job_title', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="department">{t('field_department', 'supplier_portal')}</Label>
                                    <Input id="department" value={form.data.department} onChange={(e) => form.setData('department', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_type">{t('field_contact_type', 'supplier_portal')}</Label>
                                    <select id="contact_type" value={form.data.contact_type} onChange={(e) => form.setData('contact_type', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                                        {CONTACT_TYPES.map((opt) => <option key={opt.value} value={opt.value}>{t(opt.labelKey, 'supplier_portal')}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('field_email', 'supplier_portal')}</Label>
                                <Input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                                {form.errors.email && <p className="text-sm text-destructive">{form.errors.email}</p>}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t('field_phone', 'supplier_portal')}</Label>
                                    <Input id="phone" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mobile">{t('field_mobile', 'supplier_portal')}</Label>
                                    <Input id="mobile" value={form.data.mobile} onChange={(e) => form.setData('mobile', e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-4 border-t border-border pt-4">
                                <Label className="text-base font-medium">{t('avatar_business_cards_edit', 'supplier_portal')}</Label>
                                <p className="text-sm text-muted-foreground">{t('image_max_2mb_keep', 'supplier_portal')}</p>
                                <div className="flex flex-wrap gap-8">
                                    <SupplierImageUploadField
                                        id="edit-contact-avatar"
                                        label={t('avatar', 'supplier_portal')}
                                        helperText={t('upload_avatar_help', 'supplier_portal')}
                                        previewUrl={avatarDisplayUrl}
                                        error={fileSizeErrors.avatar ?? form.errors.avatar ?? null}
                                        uploadButtonLabel={t('upload_avatar', 'supplier_portal')}
                                        replaceButtonLabel={t('replace_avatar', 'supplier_portal')}
                                        inputRef={avatarInputRef}
                                        onFileSelect={(file) => handleFileSelect('avatar', file)}
                                        hasFile={!!form.data.avatar || !!contact.avatar_url}
                                        previewShape="circle"
                                        alt={t('avatar', 'supplier_portal')}
                                    />
                                    <SupplierImageUploadField
                                        id="edit-contact-card-front"
                                        label={t('card_front', 'supplier_portal')}
                                        helperText={t('upload_business_card_help', 'supplier_portal')}
                                        previewUrl={cardFrontDisplayUrl}
                                        error={fileSizeErrors.business_card_front ?? form.errors.business_card_front ?? null}
                                        uploadButtonLabel={t('upload_front', 'supplier_portal')}
                                        replaceButtonLabel={t('replace_front', 'supplier_portal')}
                                        inputRef={cardFrontInputRef}
                                        onFileSelect={(file) => handleFileSelect('business_card_front', file)}
                                        hasFile={!!form.data.business_card_front || !!contact.business_card_front_url}
                                        previewShape="rounded"
                                        alt={t('card_front', 'supplier_portal')}
                                    />
                                    <SupplierImageUploadField
                                        id="edit-contact-card-back"
                                        label={t('card_back', 'supplier_portal')}
                                        helperText={t('upload_business_card_help', 'supplier_portal')}
                                        previewUrl={cardBackDisplayUrl}
                                        error={fileSizeErrors.business_card_back ?? form.errors.business_card_back ?? null}
                                        uploadButtonLabel={t('upload_back', 'supplier_portal')}
                                        replaceButtonLabel={t('replace_back', 'supplier_portal')}
                                        inputRef={cardBackInputRef}
                                        onFileSelect={(file) => handleFileSelect('business_card_back', file)}
                                        hasFile={!!form.data.business_card_back || !!contact.business_card_back_url}
                                        previewShape="rounded"
                                        alt={t('card_back', 'supplier_portal')}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3 pt-2">
                                <Button type="submit" disabled={form.processing || Object.values(fileSizeErrors).some(Boolean)}>{form.processing ? t('saving', 'supplier_portal') : t('save_changes', 'supplier_portal')}</Button>
                                <Button variant="outline" asChild><Link href={route('supplier.profile')}>{t('back_to_profile', 'supplier_portal')}</Link></Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
            {cropModal && (
                <ImageCropModal imageSrc={cropModal.src} aspect={cropModal.aspect} fileName={`${cropModal.field}.jpg`} onComplete={onCropComplete} onCancel={() => { URL.revokeObjectURL(cropModal.src); setCropModal(null); }} />
            )}
        </SupplierPortalLayout>
    );
}
