import { Button } from '@/Components/ui/button';
import { Head, Link, usePage } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { PublicPageShell } from '@/Components/Public/PublicPageShell';
import type { SharedPageProps } from '@/types';

const REDIRECT_SECONDS = 3;

export default function LoggedOut() {
    const { t } = useLocale();
    const { company } = usePage().props as SharedPageProps;
    const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
    const displayName = company?.display_name ?? 'Al-Injaz Procurement System';

    useEffect(() => {
        const id = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    clearInterval(id);
                    window.location.href = route('login');
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <>
            <Head title={t('logged_out_title', 'ui')} />
            <PublicPageShell brandingSize="sm">
                <div className="flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full theme-success-bg">
                        <CheckCircle2 className="h-8 w-8 theme-success-text" aria-hidden />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-foreground">
                        {t('logged_out_title', 'ui')}
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                        {t('logged_out_message', 'ui')}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                        {t('logged_out_thank_you', 'ui', { name: displayName })}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground" role="status">
                        {t('logged_out_redirect', 'ui', { seconds: secondsLeft })}
                    </p>
                    <Button asChild className="mt-6">
                        <Link href={route('login')}>{t('login_again', 'ui')}</Link>
                    </Button>
                </div>
            </PublicPageShell>
        </>
    );
}
