import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import GuestSupplierLayout from '@/Layouts/GuestSupplierLayout';
import { CheckCircle } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface SupplierSuccessProps {
    supplier_code: string;
    email: string | null;
    message: string;
}

export default function SupplierSuccess({ supplier_code, email, message }: SupplierSuccessProps) {
    const { t } = useLocale();
    const [copied, setCopied] = useState(false);

    function copyCode() {
        if (!supplier_code) return;
        navigator.clipboard.writeText(supplier_code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const statusUrl = `/supplier/status?code=${encodeURIComponent(supplier_code)}&email=${encodeURIComponent(email ?? '')}`;

    return (
        <GuestSupplierLayout title={t('success_title', 'supplier_portal')}>
            <Head title={t('success_title', 'supplier_portal')} />
            <div className="mx-auto flex max-w-lg flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full theme-success-bg">
                    <CheckCircle className="h-10 w-10 theme-success-text" aria-hidden />
                </div>
                <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
                    {t('success_title', 'supplier_portal')}
                </h1>
                <p className="mt-2 text-muted-foreground">{message}</p>
                {supplier_code && (
                    <div className="mt-6 w-full rounded-lg border border-border bg-muted/50 p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                            {t('success_supplier_code_label', 'supplier_portal')}
                        </p>
                        <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-foreground" dir="ltr">
                            {supplier_code}
                        </p>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="mt-3"
                            onClick={copyCode}
                        >
                            {copied ? t('success_copied', 'supplier_portal') : t('success_copy', 'supplier_portal')}
                        </Button>
                    </div>
                )}
                <p className="mt-6 text-sm text-muted-foreground">
                    {t('success_under_review', 'supplier_portal')}
                </p>
                {email && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('success_confirmation_sent', 'supplier_portal', { email })}
                    </p>
                )}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                    <Button asChild>
                        <Link href={route('login')}>{t('success_login_to_portal', 'supplier_portal')}</Link>
                    </Button>
                    <Button variant="secondary" asChild>
                        <Link href={statusUrl}>{t('success_check_status', 'supplier_portal')}</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/">{t('success_back_home', 'supplier_portal')}</Link>
                    </Button>
                </div>
            </div>
        </GuestSupplierLayout>
    );
}
