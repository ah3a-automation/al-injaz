import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { CreditCard } from 'lucide-react';
import { CopyButton } from '@/Components/Supplier/CopyButton';

interface SupplierBankCardProps {
    bankName: string | null;
    bankAccountName: string | null;
    iban: string | null;
    swiftCode: string | null;
}

function Row({ label, value, copyable }: { label: string; value: string | null | undefined; copyable?: boolean }) {
    const v = value == null || value === '' ? '—' : value;
    return (
        <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="flex items-center gap-1">
                <span className="text-end font-mono text-xs">{v}</span>
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
    return (
        <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4" />
                    Bank Accounts
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <Row label="Bank Name" value={bankName} />
                <Row label="Account Holder" value={bankAccountName} />
                <Row label="IBAN" value={iban} copyable={!!iban} />
                <Row label="SWIFT" value={swiftCode} />
            </CardContent>
        </Card>
    );
}
