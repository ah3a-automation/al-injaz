import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import { Globe, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Checkbox } from '@/Components/ui/checkbox';
import { useLocale } from '@/hooks/useLocale';

type CompanyBranding = {
    logo_light?: string | null;
    logo_dark?: string | null;
    display_name?: string | null;
};

export default function SupplierLogin() {
    const { locale, company } = usePage().props as { locale: string; company?: CompanyBranding };
    const { t } = useLocale();
    const isRtl = locale === 'ar';

    const form = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('login'));
    };

    return (
        <>
            <Head title={t('login_title', 'supplier_portal')} />

            {/* Language switcher — fixed top-right */}
            <div className="fixed top-4 end-4 z-50">
                <button
                    type="button"
                    aria-label="Switch language"
                    onClick={() =>
                        router.post(route('locale.switch'), {
                            locale: locale === 'ar' ? 'en' : 'ar',
                        })
                    }
                    className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-muted transition-colors"
                >
                    <Globe className="h-3.5 w-3.5" />
                    {locale === 'ar' ? 'English' : 'العربية'}
                </button>
            </div>

            {/* Page wrapper — no dir override, relies on html dir from app.blade.php */}
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo + Portal name */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary mb-4 overflow-hidden">
                            {company?.logo_light || company?.logo_dark ? (
                                <img
                                    src={company.logo_light ?? company.logo_dark ?? ''}
                                    alt={company.display_name ?? t('supplier_portal_name', 'supplier_portal')}
                                    className="h-full w-full object-contain bg-card"
                                />
                            ) : (
                                <Building2 className="h-7 w-7 text-primary-foreground" />
                            )}
                        </div>
                        <p className="text-lg font-bold text-foreground" dir="auto">
                            {t('supplier_portal_name', 'supplier_portal')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5" dir="auto">
                            {t('supplier_registration', 'supplier_portal')}
                        </p>
                    </div>

                    {/* Login card */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-md">
                        {/* Card header */}
                        <div className="mb-6 text-center">
                            <h1 className="text-xl font-bold text-foreground" dir="auto">
                                {t('login_title', 'supplier_portal')}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground" dir="auto">
                                {t('login_subtitle', 'supplier_portal')}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="email"
                                    className={isRtl ? 'block w-full text-end' : 'block w-full text-start'}
                                >
                                    {t('email', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    dir="ltr"
                                    className="text-start"
                                    autoComplete="username"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    placeholder="example@company.com"
                                />
                                {form.errors.email && (
                                    <p className="text-sm text-destructive">{form.errors.email}</p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="password"
                                    className={isRtl ? 'block w-full text-end' : 'block w-full text-start'}
                                >
                                    {t('password', 'supplier_portal')}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    dir="ltr"
                                    className="text-start"
                                    autoComplete="current-password"
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                />
                                {form.errors.password && (
                                    <p className="text-sm text-destructive">{form.errors.password}</p>
                                )}
                            </div>

                            {/* Remember me + Forgot password */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                        checked={form.data.remember}
                                        onCheckedChange={(v) => form.setData('remember', Boolean(v))}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {t('remember_me', 'supplier_portal')}
                                    </span>
                                </label>
                                <Link
                                    href={route('password.request')}
                                    className="text-sm text-primary hover:underline"
                                    dir="auto"
                                >
                                    {t('forgot_password', 'supplier_portal')}
                                </Link>
                            </div>

                            {/* Submit */}
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={form.processing}
                            >
                                {form.processing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                                        {t('logging_in', 'supplier_portal')}
                                    </>
                                ) : (
                                    t('login', 'supplier_portal')
                                )}
                            </Button>
                        </form>

                        {/* Register link */}
                        <div className="mt-6 border-t border-border pt-4 text-center">
                            <p className="text-sm text-muted-foreground">
                                {t('no_account_prompt', 'supplier_portal')}{' '}
                                <Link
                                    href={route('supplier.register.form')}
                                    className="font-medium text-primary hover:underline"
                                >
                                    {t('register_as_supplier', 'supplier_portal')}
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
