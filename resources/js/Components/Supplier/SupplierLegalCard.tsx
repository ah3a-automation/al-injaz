import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Shield } from 'lucide-react';
import { CopyButton } from '@/Components/Supplier/CopyButton';

interface SupplierLegalCardProps {
    commercialRegistrationNo: string | null;
    vatNumber: string | null;
    crExpiryDate: string | null;
    certifications?: Array<{ id: number; name: string }>;
}

function Row({ label, value, copyable }: { label: string; value: string | null | undefined; copyable?: boolean }) {
    const v = value == null || value === '' ? '—' : value;
    return (
        <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="flex items-center gap-1">
                <span className="text-right">{v}</span>
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
    const crDateFormatted = crExpiryDate
        ? new Date(crExpiryDate).toLocaleDateString()
        : null;

    return (
        <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4" />
                    Legal & Compliance
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <Row label="Commercial Registration No." value={commercialRegistrationNo} copyable={!!commercialRegistrationNo} />
                <Row label="VAT Number" value={vatNumber} copyable={!!vatNumber} />
                <Row label="CR Expiry Date" value={crDateFormatted} />
                {certifications.length > 0 && (
                    <>
                        <div className="border-t pt-3">
                            <p className="mb-2 text-sm font-medium text-muted-foreground">Certifications</p>
                            <ul className="list-inside list-disc space-y-1 text-sm">
                                {certifications.map((c) => (
                                    <li key={c.id}>{c.name}</li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
