import { Card, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Building2, Pencil, UserPlus, Upload } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface SupplierHeaderCardProps {
    companyLogoUrl: string | null;
    legalNameEn: string;
    legalNameAr: string | null;
    supplierCode: string;
    status: string;
    supplierType: string;
    categories: Array<{ id: number; name: string; name_ar?: string | null }>;
    onEditProfile?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
    approved: 'Approved',
    pending_registration: 'Pending Registration',
    pending_review: 'Pending Review',
    under_review: 'Under Review',
    more_info_requested: 'More Info Requested',
    rejected: 'Rejected',
    suspended: 'Suspended',
    blacklisted: 'Blacklisted',
};

const TYPE_LABELS: Record<string, string> = {
    supplier: 'Supplier',
    subcontractor: 'Subcontractor',
    service_provider: 'Service Provider',
    consultant: 'Consultant',
};

export default function SupplierHeaderCard({
    companyLogoUrl,
    legalNameEn,
    legalNameAr,
    supplierCode,
    status,
    supplierType,
    categories,
    onEditProfile,
}: SupplierHeaderCardProps) {
    const statusLabel = STATUS_LABELS[status] ?? status;
    const typeLabel = TYPE_LABELS[supplierType] ?? supplierType;

    return (
        <Card className="overflow-hidden rounded-xl border shadow-sm">
            <CardContent className="p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                            {companyLogoUrl ? (
                                <img
                                    src={companyLogoUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <Building2 className="h-10 w-10 text-muted-foreground" />
                            )}
                        </div>
                        <div className="min-w-0 space-y-1">
                            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                                {legalNameEn}
                            </h1>
                            {legalNameAr && (
                                <p className="text-muted-foreground" dir="rtl">
                                    {legalNameAr}
                                </p>
                            )}
                            <p className="font-mono text-sm text-muted-foreground">
                                {supplierCode}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Badge variant="secondary">{statusLabel}</Badge>
                                <Badge variant="outline">{typeLabel}</Badge>
                            </div>
                            {categories && categories.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-2">
                                    {categories.map((cat) => (
                                        <Badge key={cat.id} variant="outline" className="font-normal">
                                            {cat.name}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {onEditProfile && (
                            <Button variant="default" size="sm" onClick={onEditProfile} type="button">
                                <Pencil className="me-2 h-4 w-4" />
                                Edit Profile
                            </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('supplier.contact.profile')}>
                                <UserPlus className="me-2 h-4 w-4" />
                                Contact Profile
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" disabled title="Upload document (coming soon)">
                            <Upload className="me-2 h-4 w-4" />
                            Upload Document
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
