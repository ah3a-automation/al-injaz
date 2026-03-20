import { Card, CardContent } from '@/Components/ui/card';
import { Building2 } from 'lucide-react';
import {
    getComplianceColor,
    getStatusColor,
    getStatusLabel,
    getTypeColor,
    getTypeLabel,
} from '@/utils/suppliers';
import {
    displayLowercase,
    displayTitleCase,
    displayUppercase,
} from '@/utils/textDisplay';

interface SupplierIdentityCardProps {
    companyLogoUrl: string | null;
    legalNameEn: string;
    legalNameAr: string | null;
    tradeName?: string | null;
    supplierCode: string;
    status: string;
    supplierType: string;
    city?: string | null;
    country?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    complianceStatus?: string | null;
    isVerified?: boolean | null;
}

export default function SupplierIdentityCard({
    companyLogoUrl,
    legalNameEn,
    legalNameAr,
    tradeName,
    supplierCode,
    status,
    supplierType,
    city,
    country,
    email,
    phone,
    website,
    complianceStatus,
    isVerified,
}: SupplierIdentityCardProps) {
    const complianceLabel = complianceStatus?.trim() || (isVerified ? 'verified' : null);
    const location = [city, country].filter(Boolean).join(', ');

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4">
                <div className="mb-4 flex flex-col items-center text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                        {companyLogoUrl ? (
                            <img
                                src={companyLogoUrl}
                                alt={`${displayTitleCase(legalNameEn)} logo`}
                                className="h-full w-full rounded-lg object-contain"
                                loading="lazy"
                            />
                        ) : (
                            <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden />
                        )}
                    </div>
                    <h2 className="text-sm font-semibold leading-tight text-foreground" dir="auto">
                        {displayTitleCase(legalNameEn)}
                    </h2>
                    {legalNameAr && (
                        <p className="mt-0.5 text-xs text-muted-foreground" dir="rtl">
                            {legalNameAr}
                        </p>
                    )}
                    {tradeName && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {displayUppercase(tradeName)}
                        </p>
                    )}
                    <p className="mt-1 text-xs font-mono text-muted-foreground" dir="ltr">
                        {supplierCode}
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-1.5">
                    <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getTypeColor(supplierType)}`}
                    >
                        {getTypeLabel(supplierType)}
                    </span>
                    <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(status)}`}
                    >
                        {getStatusLabel(status)}
                    </span>
                    {complianceLabel && (
                        <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getComplianceColor(complianceLabel)}`}
                        >
                            {complianceLabel}
                        </span>
                    )}
                </div>

                <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                    {location && <p className="text-muted-foreground">{location}</p>}
                    {email && (
                        <p>
                            <a
                                href={`mailto:${email}`}
                                className="block truncate text-primary hover:underline"
                            >
                                {displayLowercase(email)}
                            </a>
                        </p>
                    )}
                    {phone && (
                        <p dir="ltr" className="text-xs font-mono text-muted-foreground">
                            {phone}
                        </p>
                    )}
                    {website && (
                        <p>
                            <a
                                href={website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block truncate text-xs text-primary hover:underline"
                            >
                                {displayLowercase(website)}
                            </a>
                        </p>
                    )}
                </dl>
            </CardContent>
        </Card>
    );
}
