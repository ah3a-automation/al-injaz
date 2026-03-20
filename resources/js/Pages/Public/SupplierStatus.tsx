import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import GuestSupplierLayout from '@/Layouts/GuestSupplierLayout';
import { useLocale } from '@/hooks/useLocale';
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

const STATUS_KEYS: Record<string, { icon: typeof Clock; labelKey: string; descKey: string; themeClass: string }> = {
    pending_registration: {
        icon: Clock,
        labelKey: 'status_pending_registration',
        descKey: 'status_desc_pending',
        themeClass: 'theme-info-bg',
    },
    under_review: {
        icon: AlertCircle,
        labelKey: 'status_under_review',
        descKey: 'status_desc_under_review',
        themeClass: 'theme-warning-bg',
    },
    approved: {
        icon: Check,
        labelKey: 'status_approved',
        descKey: 'status_desc_approved',
        themeClass: 'theme-success-bg',
    },
    suspended: {
        icon: AlertTriangle,
        labelKey: 'status_suspended',
        descKey: 'status_desc_suspended',
        themeClass: 'theme-warning-bg',
    },
    blacklisted: {
        icon: XCircle,
        labelKey: 'status_restricted',
        descKey: 'status_desc_restricted',
        themeClass: 'theme-danger-bg',
    },
};

export default function SupplierStatus({ supplier }: SupplierStatusProps) {
    const { t } = useLocale();
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
        <GuestSupplierLayout title={t('status_page_title', 'supplier_portal')}>
            <Head title={t('status_page_title', 'supplier_portal')} />

            {supplier == null ? (
                <Card className="mx-auto max-w-md">
                    <CardHeader>
                        <CardTitle className="text-foreground">{t('status_page_title', 'supplier_portal')}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('status_instruction', 'supplier_portal')}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">{t('status_supplier_code', 'supplier_portal')}</Label>
                            <Input
                                id="code"
                                placeholder="SUP-2026-00001"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('status_email', 'supplier_portal')}</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleCheckStatus} className="w-full">
                            {t('status_check_btn', 'supplier_portal')}
                        </Button>
                        <div className="border-t border-border pt-4">
                            <Button variant="outline" asChild className="w-full">
                                <Link href={route('login')}>{t('status_login', 'supplier_portal')}</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="mx-auto max-w-2xl space-y-6">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="font-mono text-2xl font-bold tracking-wider text-muted-foreground" dir="ltr">
                                {supplier.supplier_code}
                            </p>
                            <h2 className="mt-2 text-xl font-semibold text-foreground">{supplier.legal_name_en}</h2>
                            {(() => {
                                const config = STATUS_KEYS[supplier.status] ?? STATUS_KEYS.pending_registration;
                                const Icon = config.icon;
                                return (
                                    <div className={`mt-4 flex items-center gap-3 rounded-lg p-3 ${config.themeClass}`}>
                                        <Icon className="h-10 w-10 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-medium">{t(config.labelKey, 'supplier_portal')}</p>
                                            <p className="text-sm opacity-90">{t(config.descKey, 'supplier_portal')}</p>
                                        </div>
                                    </div>
                                );
                            })()}
                            {(supplier.status === 'pending_registration' ||
                                supplier.status === 'under_review') && (
                                <div className="mt-6 space-y-2 border-t border-border pt-4">
                                    <p className="text-sm font-medium text-foreground">{t('status_compliance_checklist', 'supplier_portal')}</p>
                                    <ul className="space-y-1 text-sm">
                                        <li className="flex items-center gap-2">
                                            {supplier.commercial_registration_no ? (
                                                <CheckCircle className="h-4 w-4 theme-success-text" />
                                            ) : (
                                                <XCircle className="h-4 w-4 theme-danger-text" />
                                            )}
                                            {t('status_cr_number', 'supplier_portal')}
                                        </li>
                                        <li className="flex items-center gap-2">
                                            {supplier.vat_number ? (
                                                <CheckCircle className="h-4 w-4 theme-success-text" />
                                            ) : (
                                                <XCircle className="h-4 w-4 theme-danger-text" />
                                            )}
                                            {t('status_vat_certificate', 'supplier_portal')}
                                        </li>
                                        <li className="flex items-center gap-2">
                                            {supplier.unified_number ? (
                                                <CheckCircle className="h-4 w-4 theme-success-text" />
                                            ) : (
                                                <XCircle className="h-4 w-4 theme-danger-text" />
                                            )}
                                            {t('status_unified_number', 'supplier_portal')}
                                        </li>
                                        <li className="flex items-center gap-2">
                                            {supplier.contacts && supplier.contacts.length > 0 ? (
                                                <CheckCircle className="h-4 w-4 theme-success-text" />
                                            ) : (
                                                <XCircle className="h-4 w-4 theme-danger-text" />
                                            )}
                                            {t('status_primary_contact', 'supplier_portal')}
                                        </li>
                                    </ul>
                                    {canCompleteProfile && (
                                        <Button asChild className="mt-4">
                                            <a href={`/supplier/complete/${supplier.registration_token}`}>
                                                {t('status_complete_profile', 'supplier_portal')}
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            )}
                            <p className="mt-4 text-sm text-muted-foreground">
                                {t('status_registered_on', 'supplier_portal', {
                                    date: new Date(supplier.created_at).toLocaleDateString(),
                                })}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <Button variant="outline" onClick={handleSearchAgain}>
                                    {t('status_search_again', 'supplier_portal')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={route('login')}>{t('status_login', 'supplier_portal')}</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </GuestSupplierLayout>
    );
}
