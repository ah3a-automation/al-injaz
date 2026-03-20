import { Link, router, usePage } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import type { SharedPageProps } from '@/types';
import { cn } from '@/lib/utils';
import { Building2, Globe, Search } from 'lucide-react';

interface GuestSupplierLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export default function GuestSupplierLayout({ children, title }: GuestSupplierLayoutProps) {
    const { t } = useLocale();
    const pageProps = usePage().props as SharedPageProps & { layoutMaxWidth?: string };
    const { company, dir, locale } = pageProps;
    const currentLocale = (locale ?? 'en') as string;
    const year = new Date().getFullYear();
    const logoUrl = company?.logo_light ?? company?.logo_dark ?? null;
    const displayName = company?.display_name ?? '';
    const shortName = company?.display_short_name ?? displayName;
    const fontClass = dir === 'rtl' ? 'font-ar' : 'font-en';
    const companyLogoUrl = logoUrl;

    return (
        <div
            className={cn('min-h-screen bg-muted/40', fontClass)}
            dir={dir}
            lang={locale}
        >
            <header className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                    {/* LEFT — Brand */}
                    <div className="flex items-center gap-3">
                        {companyLogoUrl ? (
                            <img
                                src={companyLogoUrl}
                                alt={displayName || t('supplier_portal_name', 'supplier_portal')}
                                className="h-9 w-auto object-contain"
                            />
                        ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
                                <Building2 className="h-5 w-5 text-primary-foreground" />
                            </div>
                        )}
                        <div className="hidden sm:block min-w-0">
                            <p className="text-sm font-bold text-foreground leading-tight">
                                {t('supplier_portal_name', 'supplier_portal')}
                            </p>
                            <p className="text-xs text-muted-foreground leading-tight">
                                {t('supplier_registration', 'supplier_portal')}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT — Actions */}
                    <div className="flex items-center gap-2">
                        {/* Check Registration Status — only show if route exists */}
                        {(() => {
                            try {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                                const href = route('supplier.registration.status');
                                return (
                                    <Link
                                        href={href}
                                        className="hidden sm:flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    >
                                        <Search className="h-3.5 w-3.5" />
                                        {t('check_registration_status', 'supplier_portal')}
                                    </Link>
                                );
                            } catch {
                                return null;
                            }
                        })()}

                        <div className="hidden sm:block h-4 w-px bg-border" />

                        {/* Language switcher */}
                        <button
                            type="button"
                            aria-label="Switch language"
                            onClick={() =>
                                router.post(route('locale.switch'), {
                                    locale: currentLocale === 'ar' ? 'en' : 'ar',
                                })
                            }
                            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                        >
                            <Globe className="h-3.5 w-3.5" />
                            {currentLocale === 'ar' ? 'English' : 'العربية'}
                        </button>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-8">
                {children}
            </main>
            <footer className="border-t border-border mt-12 py-6">
                <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>© {year} {t('supplier_portal_name', 'supplier_portal')}</span>
                    <div className="flex items-center gap-4">
                        <Link href={route('privacy-policy')} className="hover:text-foreground transition-colors">
                            {t('privacy_policy', 'supplier_portal')}
                        </Link>
                        <Link href={route('terms-and-conditions')} className="hover:text-foreground transition-colors">
                            {t('terms_conditions', 'supplier_portal')}
                        </Link>
                        <Link href={route('terms-of-use')} className="hover:text-foreground transition-colors">
                            {t('terms_of_use', 'supplier_portal')}
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
