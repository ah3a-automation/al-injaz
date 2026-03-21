import { Card, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Building2, Pencil, UserPlus, Upload } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { displayTitleCase } from '@/utils/textDisplay';

interface SupplierHeaderCardProps {
    companyLogoUrl: string | null;
    legalNameEn: string;
    legalNameAr: string | null;
    supplierCode: string;
    status: string;
    supplierType: string;
    categories: Array<{ id: number; name: string; name_ar?: string | null }>;
    supplierScore?: number | null;
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
    supplierScore,
    onEditProfile,
}: SupplierHeaderCardProps) {
    const statusLabel = STATUS_LABELS[status] ?? status;
    const typeLabel = TYPE_LABELS[supplierType] ?? supplierType;

    return (
        <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            <CardContent className="p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-2">
                            {companyLogoUrl ? (
                                <img
                                    src={companyLogoUrl}
                                    alt=""
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <Building2 className="h-8 w-8 text-muted-foreground" />
                            )}
                        </div>
                        <div className="min-w-0 space-y-1.5">
                            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                                {displayTitleCase(legalNameEn)}
                            </h2>
                            {legalNameAr && (
                                <p className="text-muted-foreground text-sm" dir="rtl">
                                    {legalNameAr}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                                <span className="font-mono text-[11px] uppercase tracking-wide">
                                    {supplierCode}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-border" />
                                <span>{typeLabel}</span>
                                {categories && categories.length > 0 && (
                                    <>
                                        <span className="h-1 w-1 rounded-full bg-border" />
                                        <span className="truncate">
                                            {categories.length}{' '}
                                            {categories.length === 1 ? 'category' : 'categories'}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Badge variant="secondary">{statusLabel}</Badge>
                                {supplierScore != null && (
                                    <Badge variant="outline" className="font-mono">
                                        Score {supplierScore} / 100
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="default" size="sm" asChild>
                            <Link href={route('supplier.profile.edit')}>
                                <Pencil className="me-2 h-4 w-4" />
                                Edit Profile
                            </Link>
                        </Button>
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
