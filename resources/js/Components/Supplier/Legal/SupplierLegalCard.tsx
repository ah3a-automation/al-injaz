import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Shield } from 'lucide-react';
import { CopyButton } from '@/Components/Supplier/CopyButton';
import { useLocale } from '@/hooks/useLocale';

interface SupplierLegalCardProps {
    commercialRegistrationNo: string | null;
    vatNumber: string | null;
    crExpiryDate: string | null;
    certifications?: Array<{ id: number; name: string }>;
}

function Row({
    label,
    value,
    copyable,
}: {
    label: string;
    value: string | null | undefined;
    copyable?: boolean;
}) {
    const v = value == null || value === '' ? '—' : value;
    return (
        <div className="flex items-center justify-between gap-3 py-1 text-start text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="flex items-center gap-1">
                <span className="font-medium text-foreground">{v}</span>
                {copyable && v !== '—' && <CopyButton text={v} className="shrink-0" />}
            </span>
        </div>
    );
}

export default function SupplierLegalCard({
    commercialRegistrationNo,
    vatNumber,
    crExpiryDate,
    certifications = [],
}: SupplierLegalCardProps) {
    const { t } = useLocale();
    const crDateFormatted = crExpiryDate
        ? new Date(crExpiryDate).toLocaleDateString()
        : null;

    return (
        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="border-b border-border/40 px-4 py-2.5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    {t('profile_legal_compliance', 'supplier_portal')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 p-4">
                <Row
                    label={t('profile_cr_no', 'supplier_portal')}
                    value={commercialRegistrationNo}
                    copyable={!!commercialRegistrationNo}
                />
                <Row
                    label={t('profile_vat_number', 'supplier_portal')}
                    value={vatNumber}
                    copyable={!!vatNumber}
                />
                <Row label={t('profile_cr_expiry', 'supplier_portal')} value={crDateFormatted} />
                {certifications.length > 0 && (
                    <div className="border-t border-border/40 pt-2">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t('profile_certifications', 'supplier_portal')}
                        </p>
                        <ul className="list-inside list-disc space-y-0.5 text-sm font-medium text-foreground">
                            {certifications.map((c) => (
                                <li key={c.id}>{c.name}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
