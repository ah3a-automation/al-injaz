import type { ReactNode } from 'react';
import { Card, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Link, router } from '@inertiajs/react';
import { User, Pencil, Mail, Smartphone, Star, Loader2, Phone } from 'lucide-react';
import BusinessCardPreviewModal from './BusinessCardPreviewModal';
import { useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { displayLowercase, displayTitleCase } from '@/utils/textDisplay';
import { cn } from '@/lib/utils';

const CONTACT_TYPE_KEYS: Record<string, string> = {
    sales: 'contact_type_sales',
    technical: 'contact_type_technical',
    finance: 'contact_type_finance',
    contracts: 'contact_type_contracts',
    management: 'contact_type_management',
};

interface ContactCardProps {
    contact: {
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
    };
    onEditInline?: (contact: ContactCardProps['contact']) => void;
    editHref?: string;
    allowSetPrimary?: boolean;
    setPrimaryHref?: string;
    showEditAction?: boolean;
    renderActions?: (contact: ContactCardProps['contact']) => ReactNode;
}

export default function ContactCard({
    contact,
    onEditInline,
    editHref,
    allowSetPrimary = true,
    setPrimaryHref,
    showEditAction = true,
    renderActions,
}: ContactCardProps) {
    const { t } = useLocale();
    const [previewModal, setPreviewModal] = useState<'front' | 'back' | null>(null);
    const [setPrimaryLoading, setSetPrimaryLoading] = useState(false);
    const typeKey = CONTACT_TYPE_KEYS[contact.contact_type] ?? 'contact_type';
    const typeLabel = t(typeKey, 'supplier_portal');
    const callNumber = contact.mobile ?? contact.phone ?? null;

    return (
        <>
            <Card
                className={cn(
                    'rounded-xl border border-border/60 bg-card shadow-sm',
                    contact.is_primary
                        ? 'border-sky-200/80 bg-sky-50/20 shadow-[0_0_0_1px_rgba(14,165,233,0.08)] dark:border-sky-900/40 dark:bg-sky-950/10'
                        : null
                )}
            >
                <CardContent className="p-3">
                    <div className="flex gap-2.5">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                            {contact.avatar_url ? (
                                <img src={contact.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <User className="h-6 w-6 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-semibold text-foreground">
                                    {displayTitleCase(contact.name)}
                                </h4>
                                {contact.is_primary && (
                                    <Badge
                                        variant="outline"
                                        className="border-sky-200 bg-sky-50 text-xs font-semibold text-sky-700 shadow-none dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300"
                                    >
                                        <Star className="mr-1 h-3 w-3 fill-current" />
                                        {t('profile_primary', 'supplier_portal')}
                                    </Badge>
                                )}
                            </div>
                            {contact.job_title && (
                                <p className="text-xs text-muted-foreground">
                                    {displayTitleCase(contact.job_title)}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                                {contact.email && (
                                    <a
                                        href={`mailto:${contact.email}`}
                                        className="flex items-center gap-1 text-primary underline"
                                    >
                                        <Mail className="h-3.5 w-3.5 shrink-0" />
                                        {displayLowercase(contact.email)}
                                    </a>
                                )}
                                {(contact.mobile || contact.phone) && (
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <Smartphone className="h-3.5 w-3.5 shrink-0" />
                                        {contact.mobile ?? contact.phone}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">{typeLabel}</p>
                            <div className="flex flex-wrap items-center gap-1 pt-1.5">
                                {showEditAction &&
                                    (onEditInline ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            type="button"
                                            onClick={() => onEditInline(contact)}
                                        >
                                            <Pencil className="mr-1 h-3.5 w-3.5" />
                                            {t('profile_edit', 'supplier_portal')}
                                        </Button>
                                    ) : (
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                                            <Link href={editHref ?? route('supplier.contacts.edit', contact.id)}>
                                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                                {t('profile_edit', 'supplier_portal')}
                                            </Link>
                                        </Button>
                                    ))}
                                {callNumber && (
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                                        <a href={`tel:${callNumber}`}>
                                            <Phone className="mr-1 h-3.5 w-3.5" />
                                            {t('profile_call', 'supplier_portal')}
                                        </a>
                                    </Button>
                                )}
                                {allowSetPrimary && !contact.is_primary && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        disabled={setPrimaryLoading}
                                        onClick={() => {
                                            setSetPrimaryLoading(true);
                                            router.post(setPrimaryHref ?? route('supplier.contacts.set-primary', contact.id), {}, {
                                                preserveScroll: true,
                                                preserveState: true,
                                                onFinish: () => setSetPrimaryLoading(false),
                                            });
                                        }}
                                    >
                                        {setPrimaryLoading ? (
                                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Star className="mr-1 h-3.5 w-3.5" />
                                        )}
                                        {t('profile_set_primary', 'supplier_portal')}
                                    </Button>
                                )}
                                {renderActions?.(contact)}
                                <div className="ml-auto flex items-center gap-1">
                                    {contact.business_card_front_url && (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewModal('front')}
                                            className="rounded border border-border p-1 transition hover:opacity-80"
                                            aria-label={t('profile_business_card_front', 'supplier_portal')}
                                        >
                                            <img
                                                src={contact.business_card_front_url}
                                                alt=""
                                                className="h-9 w-auto rounded object-cover"
                                                loading="lazy"
                                            />
                                        </button>
                                    )}
                                    {contact.business_card_back_url && (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewModal('back')}
                                            className="rounded border border-border p-1 transition hover:opacity-80"
                                            aria-label={t('profile_business_card_back', 'supplier_portal')}
                                        >
                                            <img
                                                src={contact.business_card_back_url}
                                                alt=""
                                                className="h-9 w-auto rounded object-cover"
                                                loading="lazy"
                                            />
                                        </button>
                                    )}
                                    {!contact.business_card_front_url && !contact.business_card_back_url && (
                                        <div className="flex h-11 min-w-[84px] items-center justify-center rounded border border-dashed border-border/70 bg-muted/40 px-2 text-center text-[10px] font-medium text-muted-foreground">
                                            {t('profile_no_business_card', 'supplier_portal')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <BusinessCardPreviewModal
                open={previewModal === 'front'}
                onClose={() => setPreviewModal(null)}
                imageUrl={contact.business_card_front_url ?? null}
                title={t('profile_business_card_front', 'supplier_portal')}
                downloadFileName={`${contact.name}-card-front.jpg`}
            />
            <BusinessCardPreviewModal
                open={previewModal === 'back'}
                onClose={() => setPreviewModal(null)}
                imageUrl={contact.business_card_back_url ?? null}
                title={t('profile_business_card_back', 'supplier_portal')}
                downloadFileName={`${contact.name}-card-back.jpg`}
            />
        </>
    );
}
