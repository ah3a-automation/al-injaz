import SupplierPortalLayout from '@/Layouts/SupplierPortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Head, Link, usePage } from '@inertiajs/react';
import { Bell, ClipboardList, FileCheck, FileText, Gauge, Trophy, UserCheck, Inbox } from 'lucide-react';
import type { SharedPageProps } from '@/types';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';
import { getLocalizedSupplierName } from '@/utils/supplierDisplay';

interface DashboardProps {
    supplier:
        | {
              id: string;
              supplier_code: string;
              legal_name_en: string | null;
              legal_name_ar?: string | null;
              status: string;
          }
        | null;
    metrics?: {
        pending_submission: number;
        open_rfqs: number;
        submitted_quotes: number;
        under_evaluation: number;
        awarded_rfqs: number;
    };
}

const defaultMetrics = {
    pending_submission: 0,
    open_rfqs: 0,
    submitted_quotes: 0,
    under_evaluation: 0,
    awarded_rfqs: 0,
};

export default function SupplierPortalDashboard({ supplier, metrics: rawMetrics }: DashboardProps) {
    const { t, locale } = useLocale();
    const { auth } = usePage().props as SharedPageProps;
    const userName = auth?.user?.name ?? '';
    const metrics = rawMetrics ?? defaultMetrics;

    if (!supplier) {
        return (
            <SupplierPortalLayout>
                <Head title={t('title_dashboard', 'supplier_portal')} />
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                    <p className="text-base font-semibold">{t('pending_heading', 'supplier_portal')}</p>
                    <p className="mt-1 text-sm opacity-90">{t('pending_message', 'supplier_portal')}</p>
                </div>
            </SupplierPortalLayout>
        );
    }

    const supplierDisplayName = getLocalizedSupplierName(supplier, locale);

    const dashboardDisplayName = supplierDisplayName || userName || '';

    const metricCards = [
        {
            labelKey: 'stat_pending_submission' as const,
            value: metrics.pending_submission,
            icon: ClipboardList,
            href: route('supplier.rfqs.index'),
            accent: 'text-amber-600',
            tone: 'bg-amber-50 dark:bg-amber-950/30',
        },
        {
            labelKey: 'stat_open_rfqs' as const,
            value: metrics.open_rfqs,
            icon: ClipboardList,
            href: route('supplier.rfqs.index'),
            accent: 'text-blue-600',
            tone: 'bg-blue-50 dark:bg-blue-950/30',
        },
        {
            labelKey: 'stat_quotes_submitted' as const,
            value: metrics.submitted_quotes,
            icon: FileText,
            href: route('supplier.quotations.index'),
            accent: 'text-slate-600',
            tone: 'bg-slate-50 dark:bg-slate-900/40',
        },
        {
            labelKey: 'stat_under_evaluation' as const,
            value: metrics.under_evaluation,
            icon: FileCheck,
            href: route('supplier.rfqs.index'),
            accent: 'text-violet-600',
            tone: 'bg-violet-50 dark:bg-violet-950/30',
        },
        {
            labelKey: 'stat_awarded_rfqs' as const,
            value: metrics.awarded_rfqs,
            icon: Trophy,
            href: route('supplier.quotations.index'),
            accent: 'text-emerald-600',
            tone: 'bg-emerald-50 dark:bg-emerald-950/30',
        },
    ];

    const approvalStatusKey =
        supplier.status === 'approved'
            ? 'approval_status_approved'
            : supplier.status === 'pending_review' || supplier.status === 'pending_registration'
              ? 'approval_status_pending'
              : 'approval_status_other';

    return (
        <SupplierPortalLayout>
            <Head title={t('title_dashboard', 'supplier_portal')} />
            <div className="space-y-6">
                {/* Top welcome / status section */}
                <Card className="rounded-2xl border border-border/60 bg-card shadow-sm">
                    <CardContent className="px-5 py-4 sm:p-6">
                        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] md:items-start">
                            <div className="space-y-2 text-start">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {t('dashboard_title', 'supplier_portal')}
                                </p>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    {t('dashboard_welcome', 'supplier_portal', { name: dashboardDisplayName })}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('dashboard_intro', 'supplier_portal')}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium">
                                        <UserCheck className="h-3.5 w-3.5" />
                                        <span className="font-medium text-foreground">
                                            {t('supplier_company_name', 'supplier_portal')}
                                        </span>
                                        <span className="truncate" dir="auto">
                                            {supplierDisplayName}
                                        </span>
                                    </span>
                                    {supplier.supplier_code && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium">
                                            <span className="text-muted-foreground">
                                                {t('supplier_code_label', 'supplier_portal')}
                                            </span>
                                            <span className="font-mono tabular-nums" dir="ltr">
                                                {supplier.supplier_code}
                                            </span>
                                        </span>
                                    )}
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
                                            supplier.status === 'approved'
                                                ? 'border-emerald-600/60 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                                                : 'border-amber-600/60 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
                                        )}
                                    >
                                        <Gauge className="h-3.5 w-3.5" />
                                        {t('approval_status_label', 'supplier_portal')}:{' '}
                                        <span className="font-semibold">
                                            {t(approvalStatusKey, 'supplier_portal')}
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-stretch gap-2 text-start sm:flex-row sm:items-center sm:justify-end">
                                <Button asChild size="sm" className="w-full sm:w-auto">
                                    <Link href={route('supplier.rfqs.index')}>
                                        <ClipboardList className="me-2 h-4 w-4" />
                                        {t('view_open_rfqs', 'supplier_portal')}
                                    </Link>
                                </Button>
                                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                                    <Link href={route('supplier.notifications.index')}>
                                        <Bell className="me-2 h-4 w-4" />
                                        {t('view_notifications', 'supplier_portal')}
                                    </Link>
                                </Button>
                                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                                    <Link href={route('supplier.profile.edit')}>
                                        <UserCheck className="me-2 h-4 w-4" />
                                        {t('complete_profile', 'supplier_portal')}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Priority action / metric cards */}
                <section aria-labelledby="supplier-metrics-heading">
                    <div className="mb-2 flex items-center justify-between text-start">
                        <h2
                            id="supplier-metrics-heading"
                            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                            {t('priority_actions', 'supplier_portal')}
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        {metricCards.map((m) => {
                            const Icon = m.icon;
                            return (
                                <Link key={m.labelKey} href={m.href}>
                                    <Card className="group h-full rounded-2xl border border-border/60 bg-card shadow-sm transition-colors hover:bg-muted/50">
                                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                                            <CardTitle className="text-xs font-medium text-muted-foreground text-start">
                                                {t(m.labelKey, 'supplier_portal')}
                                            </CardTitle>
                                            <div
                                                className={cn(
                                                    'flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-background/60',
                                                    m.tone
                                                )}
                                            >
                                                <Icon className={cn('h-4 w-4', m.accent)} />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="text-start">
                                            <p className="text-3xl font-bold leading-tight text-foreground">
                                                <span
                                                    dir="ltr"
                                                    className="font-mono tabular-nums"
                                                >
                                                    {m.value}
                                                </span>
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t(`${m.labelKey}_helper`, 'supplier_portal')}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {/* Recent activity & quick links */}
                <section className="grid gap-4 lg:grid-cols-3">
                    {/* Recent RFQs */}
                    <Card className="rounded-2xl border border-border/60 bg-card shadow-sm lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-start">
                                {t('recent_rfqs', 'supplier_portal')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-start">
                            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                                <ClipboardList className="h-6 w-6 text-muted-foreground/70" />
                                <p className="text-center">{t('no_recent_rfqs', 'supplier_portal')}</p>
                                <Button asChild size="sm" variant="outline" className="mt-1">
                                    <Link href={route('supplier.rfqs.index')}>
                                        {t('view_open_rfqs', 'supplier_portal')}
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent notifications */}
                    <Card className="rounded-2xl border border-border/60 bg-card shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-start">
                                {t('recent_notifications', 'supplier_portal')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-start">
                            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                                <Inbox className="h-6 w-6 text-muted-foreground/70" />
                                <p className="text-center">{t('no_recent_notifications', 'supplier_portal')}</p>
                                <Button asChild size="sm" variant="outline" className="mt-1">
                                    <Link href={route('supplier.notifications.index')}>
                                        {t('view_notifications', 'supplier_portal')}
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Quick links & performance summary */}
                <section className="grid gap-4 lg:grid-cols-3">
                    {/* Quick links */}
                    <Card className="rounded-2xl border border-border/60 bg-card shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-start">
                                {t('quick_links', 'supplier_portal')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-start text-sm">
                            <Link
                                href={route('supplier.rfqs.index')}
                                className="flex items-center justify-between rounded-lg px-3 py-2 text-primary hover:bg-muted/60"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-primary">
                                        <ClipboardList className="h-4 w-4" />
                                    </span>
                                    <span>{t('open_rfqs_link', 'supplier_portal')}</span>
                                </div>
                            </Link>
                            <Link
                                href={route('supplier.quotations.index')}
                                className="flex items-center justify-between rounded-lg px-3 py-2 text-primary hover:bg-muted/60"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-primary">
                                        <FileText className="h-4 w-4" />
                                    </span>
                                    <span>{t('submitted_quotations_link', 'supplier_portal')}</span>
                                </div>
                            </Link>
                            <Link
                                href={route('supplier.notifications.index')}
                                className="flex items-center justify-between rounded-lg px-3 py-2 text-primary hover:bg-muted/60"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-primary">
                                        <Bell className="h-4 w-4" />
                                    </span>
                                    <span>{t('notifications_link', 'supplier_portal')}</span>
                                </div>
                            </Link>
                            <Link
                                href={route('supplier.profile')}
                                className="flex items-center justify-between rounded-lg px-3 py-2 text-primary hover:bg-muted/60"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-primary">
                                        <UserCheck className="h-4 w-4" />
                                    </span>
                                    <span>{t('company_profile_link', 'supplier_portal')}</span>
                                </div>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Performance summary */}
                    <Card className="rounded-2xl border border-border/60 bg-card shadow-sm lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-start">
                                {t('performance_summary', 'supplier_portal')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid gap-4 text-sm text-start sm:grid-cols-2 md:grid-cols-3">
                                <div className="space-y-1 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                                    <dt className="text-muted-foreground">
                                        {t('open_rfqs', 'supplier_portal')}
                                    </dt>
                                    <dd className="text-lg font-semibold">
                                        <span className="font-mono tabular-nums" dir="ltr">
                                            {metrics.open_rfqs}
                                        </span>
                                    </dd>
                                </div>
                                <div className="space-y-1 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                                    <dt className="text-muted-foreground">
                                        {t('pending_submission', 'supplier_portal')}
                                    </dt>
                                    <dd className="text-lg font-semibold">
                                        <span className="font-mono tabular-nums" dir="ltr">
                                            {metrics.pending_submission}
                                        </span>
                                    </dd>
                                </div>
                                <div className="space-y-1 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                                    <dt className="text-muted-foreground">
                                        {t('submitted_quotations', 'supplier_portal')}
                                    </dt>
                                    <dd className="text-lg font-semibold">
                                        <span className="font-mono tabular-nums" dir="ltr">
                                            {metrics.submitted_quotes}
                                        </span>
                                    </dd>
                                </div>
                                <div className="space-y-1 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                                    <dt className="text-muted-foreground">
                                        {t('pending_evaluation', 'supplier_portal')}
                                    </dt>
                                    <dd className="text-lg font-semibold">
                                        <span className="font-mono tabular-nums" dir="ltr">
                                            {metrics.under_evaluation}
                                        </span>
                                    </dd>
                                </div>
                                <div className="space-y-1 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                                    <dt className="text-muted-foreground">
                                        {t('awarded_contracts', 'supplier_portal')}
                                    </dt>
                                    <dd className="text-lg font-semibold">
                                        <span className="font-mono tabular-nums" dir="ltr">
                                            {metrics.awarded_rfqs}
                                        </span>
                                    </dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </SupplierPortalLayout>
    );
}
