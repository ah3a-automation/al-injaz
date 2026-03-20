import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { PublicPageShell } from '@/Components/Public/PublicPageShell';
import { Button } from '@/Components/ui/button';
import { CheckCircle } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function LogoutSuccess() {
    const { t } = useLocale();

    useEffect(() => {
        const timer = setTimeout(() => {
            window.location.href = route('login');
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <Head title={t('logout_title', 'ui')} />

            {/* fallback redirect if JavaScript disabled */}
            <noscript>
                <meta httpEquiv="refresh" content="3;url=/login" />
            </noscript>

            <PublicPageShell brandingSize="sm">
                <div className="flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full theme-success-bg">
                        <CheckCircle className="h-8 w-8 theme-success-text" aria-hidden />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-foreground">
                        {t('logout_title', 'ui')}
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                        {t('logout_message', 'ui')}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground" role="status">
                        {t('logout_redirect', 'ui')}
                    </p>
                    <Button asChild className="mt-6">
                        <Link href={route('login')}>{t('logout_login_button', 'ui')}</Link>
                    </Button>
                </div>
            </PublicPageShell>
        </>
    );
}
