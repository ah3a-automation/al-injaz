import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { CreditCard } from 'lucide-react';
import { CopyButton } from '@/Components/Supplier/CopyButton';
import { useLocale } from '@/hooks/useLocale';

interface SupplierBankCardProps {
    bankName: string | null;
    bankAccountName: string | null;
    iban: string | null;
    swiftCode: string | null;
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
                <span className="font-mono text-xs font-medium text-foreground">{v}</span>
                {copyable && v !== '—' && <CopyButton text={v} className="shrink-0" />}
            </span>
        </div>
    );
}

export default function SupplierBankCard({
    bankName,
    bankAccountName,
    iban,
    swiftCode,
}: SupplierBankCardProps) {
    const { t } = useLocale();

    return (
        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="border-b border-border/40 px-4 py-2.5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    {t('profile_bank_accounts', 'supplier_portal')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 p-4">
                <Row label={t('profile_bank_name', 'supplier_portal')} value={bankName} />
                <Row label={t('profile_account_holder', 'supplier_portal')} value={bankAccountName} />
                <Row label={t('profile_iban', 'supplier_portal')} value={iban} copyable={!!iban} />
                <Row label={t('profile_swift', 'supplier_portal')} value={swiftCode} />
            </CardContent>
        </Card>
    );
}
