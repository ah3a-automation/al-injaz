import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import GuestSupplierLayout from '@/Layouts/GuestSupplierLayout';
import {
    Clock,
    AlertCircle,
    Check,
    AlertTriangle,
    XCircle,
    CheckCircle,
} from 'lucide-react';

interface SupplierStatusData {
    id: string;
    supplier_code: string;
    legal_name_en: string;
    status: string;
    compliance_status: string;
    created_at: string;
    commercial_registration_no: string | null;
    vat_number: string | null;
    unified_number: string | null;
    registration_token: string | null;
    registration_token_expires_at: string | null;
    contacts?: Array<{ id: string; is_primary: boolean }>;
}

interface SupplierStatusProps {
    supplier: SupplierStatusData | null;
}

const statusConfig: Record<
    string,
    { icon: typeof Clock; label: string; className: string; description: string }
> = {
    pending_registration: {
        icon: Clock,
        label: 'Pending Registration',
        className: 'text-gray-600',
        description: 'Your registration has been received and is being processed.',
    },
    under_review: {
        icon: AlertCircle,
        label: 'Under Review',
        className: 'text-amber-600',
        description: 'Your profile is under review. We will notify you once the review is complete.',
    },
    approved: {
        icon: Check,
        label: 'Approved',
        className: 'text-green-600',
        description: 'Your supplier profile has been approved. You can now participate in procurement opportunities.',
    },
    suspended: {
        icon: AlertTriangle,
        label: 'Suspended',
        className: 'text-orange-600',
        description: 'Your supplier account is currently suspended. Please contact us for more information.',
    },
    blacklisted: {
        icon: XCircle,
        label: 'Restricted',
        className: 'text-red-600',
        description: 'This supplier account is restricted.',
    },
};

export default function SupplierStatus({ supplier }: SupplierStatusProps) {
    const [code, setCode] = useState('');
    const [email, setEmail] = useState('');

    function handleCheckStatus() {
        router.get('/supplier/status', { code, email }, { preserveState: true });
    }

    function handleSearchAgain() {
        setCode('');
        setEmail('');
        router.get('/supplier/status');
    }

    const canCompleteProfile =
        supplier &&
        supplier.registration_token != null &&
        supplier.registration_token_expires_at != null &&
        new Date(supplier.registration_token_expires_at) > new Date();

    return (
        <GuestSupplierLayout title="Check Status">
            <Head title="Check Registration Status" />

            {supplier == null ? (
                <Card className="mx-auto max-w-md">
                    <CardHeader>
                        <CardTitle>Check Registration Status</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Enter your supplier code and registered email to check your status.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Supplier Code</Label>
                            <Input
                                id="code"
                                placeholder="SUP-2026-00001"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleCheckStatus} className="w-full">
                            Check Status
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="mx-auto max-w-2xl space-y-6">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="font-mono text-2xl font-bold tracking-wider text-muted-foreground">
                                {supplier.supplier_code}
                            </p>
                            <h2 className="mt-2 text-xl font-semibold">{supplier.legal_name_en}</h2>
                            {(() => {
                                const config = statusConfig[supplier.status] ?? statusConfig.pending_registration;
                                const Icon = config.icon;
                                return (
                                    <div className={`mt-4 flex items-center gap-3 ${config.className}`}>
                                        <Icon className="h-10 w-10 shrink-0" />
                                        <div>
                                            <p className="text-lg font-medium">{config.label}</p>
                                            <p className="text-sm opacity-90">{config.description}</p>
                                        </div>
                                    </div>
                                );
                            })()}
                            {(supplier.status === 'pending_registration' ||
                                supplier.status === 'under_review') && (
                                <div className="mt-6 space-y-2 border-t border-border pt-4">
                                    <p className="text-sm font-medium">Compliance checklist</p>
                                    <ul className="space-y-1 text-sm">
                                        <li className="flex items-center gap-2">
                                            {supplier.commercial_registration_no ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            )}
                                            CR Number
                                        </li>
                                        <li className="flex items-center gap-2">
                                            {supplier.vat_number ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            )}
                                            VAT Certificate
                                        </li>
                                        <li className="flex items-center gap-2">
                                            {supplier.unified_number ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            )}
                                            Unified Number
                                        </li>
                                        <li className="flex items-center gap-2">
                                            {supplier.contacts && supplier.contacts.length > 0 ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            )}
                                            Primary Contact
                                        </li>
                                    </ul>
                                    {canCompleteProfile && (
                                        <Button asChild className="mt-4">
                                            <a href={`/supplier/complete/${supplier.registration_token}`}>
                                                Complete Your Profile
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            )}
                            <p className="mt-4 text-sm text-muted-foreground">
                                Registered on {new Date(supplier.created_at).toLocaleDateString()}
                            </p>
                            <Button variant="outline" className="mt-4" onClick={handleSearchAgain}>
                                Search Again
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </GuestSupplierLayout>
    );
}
