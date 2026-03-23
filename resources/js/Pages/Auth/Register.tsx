import { Head, router } from '@inertiajs/react';
import { useEffect } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { useLocale } from '@/hooks/useLocale';

/**
 * Legacy Breeze register route is disabled; public sign-up is supplier-only.
 * Redirects to the supplier registration wizard (avoids Ziggy `route('register')` on submit).
 */
export default function Register() {
    const { t } = useLocale();

    useEffect(() => {
        router.visit(route('supplier.register.form'), { replace: true });
    }, []);

    return (
        <GuestLayout>
            <Head title={t('public_register_title', 'supplier_portal')} />
            <p className="text-center text-sm text-muted-foreground">{t('redirecting', 'supplier_portal')}</p>
        </GuestLayout>
    );
}
