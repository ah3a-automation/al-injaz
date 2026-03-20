import { displayLowercase, displayTitleCase, displayUppercase } from '@/utils/textDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Building2, Pencil } from 'lucide-react';
import { CopyButton } from '../CopyButton';
import { useLocale } from '@/hooks/useLocale';

interface SupplierCompanyInfoCardProps {
    supplier: {
        legal_name_en: string;
        legal_name_ar: string | null;
        trade_name: string | null;
        email: string | null;
        phone: string | null;
        website: string | null;
        supplier_type: string;
    };
    onEditClick?: () => void;
}

const TYPE_KEYS: Record<string, string> = {
    supplier: 'profile_type_supplier',
    subcontractor: 'profile_type_subcontractor',
    service_provider: 'profile_type_service',
    consultant: 'profile_type_consultant',
};

function Row({
    label,
    value,
    link,
    dir,
    copyable,
}: {
    label: string;
    value: string | null | undefined;
    link?: string | null;
    dir?: 'rtl';
    copyable?: boolean;
}) {
    if (value == null || value === '')
        return (
            <div className="flex items-center justify-between gap-3 py-1 text-start">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
                <span className="text-sm">—</span>
            </div>
        );
    return (
        <div className="flex items-center justify-between gap-3 py-1 text-start">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="flex min-w-0 items-center justify-end gap-1">
                {link ? (
                    <a
                        href={link.startsWith('http') ? link : `https://${link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium text-primary underline"
                        dir={dir}
                    >
                        {value}
                    </a>
                ) : (
                    <span className="truncate text-sm font-medium text-foreground" dir={dir}>
                        {value}
                    </span>
                )}
                {copyable && <CopyButton text={value} className="shrink-0" />}
            </span>
        </div>
    );
}

export default function SupplierCompanyInfoCard({ supplier, onEditClick }: SupplierCompanyInfoCardProps) {
    const { t } = useLocale();
    const typeKey = TYPE_KEYS[supplier.supplier_type] ?? 'profile_type';

    return (
        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/40 px-4 py-2.5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {t('profile_company_information', 'supplier_portal')}
                </CardTitle>
                {onEditClick && (
                    <Button variant="ghost" size="sm" onClick={onEditClick} type="button" className="h-8 w-8 shrink-0 p-0">
                        <Pencil className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="px-4 py-3">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-0">
                        <Row
                            label={t('profile_legal_name_en', 'supplier_portal')}
                            value={displayTitleCase(supplier.legal_name_en)}
                        />
                        {supplier.legal_name_ar && (
                            <Row
                                label={t('profile_legal_name_ar', 'supplier_portal')}
                                value={supplier.legal_name_ar}
                                dir="rtl"
                            />
                        )}
                        <Row
                            label={t('profile_trade_name', 'supplier_portal')}
                            value={displayUppercase(supplier.trade_name ?? '')}
                        />
                        <Row
                            label={t('profile_type', 'supplier_portal')}
                            value={t(typeKey, 'supplier_portal')}
                        />
                    </div>
                    <div className="space-y-0 border-t border-border/40 pt-3 sm:border-t-0 sm:border-s sm:border-border/40 sm:ps-4 sm:pt-0">
                        <Row
                            label={t('field_email', 'supplier_portal')}
                            value={displayLowercase(supplier.email ?? '')}
                            link={supplier.email}
                            copyable={!!supplier.email}
                        />
                        <Row
                            label={t('field_phone', 'supplier_portal')}
                            value={supplier.phone}
                            copyable={!!supplier.phone}
                        />
                        <Row
                            label={t('field_website', 'supplier_portal')}
                            value={displayLowercase(supplier.website ?? '')}
                            link={supplier.website}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
