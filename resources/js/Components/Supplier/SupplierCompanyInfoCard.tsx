import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Building2, Pencil } from 'lucide-react';
import { displayLowercase, displayTitleCase, displayUppercase } from '@/utils/textDisplay';

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

const TYPE_LABELS: Record<string, string> = {
    supplier: 'Supplier',
    subcontractor: 'Subcontractor',
    service_provider: 'Service Provider',
    consultant: 'Consultant',
};

export default function SupplierCompanyInfoCard({
    supplier,
    onEditClick,
}: SupplierCompanyInfoCardProps) {
    const typeLabel = TYPE_LABELS[supplier.supplier_type] ?? supplier.supplier_type;

    return (
        <>
            <Card className="rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4" />
                        Company Information
                    </CardTitle>
                    {onEditClick && (
                        <Button variant="ghost" size="sm" onClick={onEditClick} type="button">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <Row label="Legal name (EN)" value={displayTitleCase(supplier.legal_name_en)} />
                    {supplier.legal_name_ar && <Row label="Legal name (AR)" value={supplier.legal_name_ar} dir="rtl" />}
                    <Row label="Trade name" value={displayUppercase(supplier.trade_name)} />
                    <Row label="Type" value={typeLabel} />
                    <Row label="Email" value={displayLowercase(supplier.email)} />
                    <Row label="Phone" value={supplier.phone} />
                    <Row label="Website" value={displayLowercase(supplier.website)} link={supplier.website} />
                </CardContent>
            </Card>
        </>
    );
}

function Row({
    label,
    value,
    link,
    dir,
}: {
    label: string;
    value: string | null | undefined;
    link?: string | null;
    dir?: 'rtl';
}) {
    if (value == null || value === '') return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span>—</span></div>;
    return (
        <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            {link ? (
                <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="truncate text-primary underline" dir={dir}>{value}</a>
            ) : (
                <span className="truncate text-end" dir={dir}>{value}</span>
            )}
        </div>
    );
}
