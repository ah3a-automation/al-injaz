import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { useFilters } from '@/hooks';
import { useLocale } from '@/hooks/useLocale';
import type { SharedPageProps } from '@/types';
import { getStatusColor } from '@/utils/suppliers';
import { Head, Link, usePage } from '@inertiajs/react';
import { CheckCircle2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QueueRow {
    id: string;
    supplier_code: string;
    legal_name_en: string;
    legal_name_ar: string | null;
    trade_name: string | null;
    supplier_type: string;
    country: string;
    city: string;
    status: string;
    created_at: string | null;
    submitted_at: string | null;
    days_waiting: number;
}

interface PaginatedQueue {
    data: QueueRow[];
    total: number;
    current_page: number;
    per_page: number;
    last_page: number;
}

interface Stats {
    total_pending: number;
    avg_days_waiting: number | null;
    oldest_days_waiting: number | null;
}

interface ApprovalQueueProps {
    suppliers: PaginatedQueue;
    stats: Stats;
    filters: {
        q?: string;
        status?: string;
        supplier_type?: string;
        waiting_bucket?: string;
        page?: number;
        per_page?: number;
    };
}

export default function ApprovalQueue({ suppliers, stats, filters }: ApprovalQueueProps) {
    const { flash, locale: pageLocale } = usePage().props as SharedPageProps & { locale?: string };
    const locale = pageLocale ?? 'en';
    const { t } = useLocale('suppliers');

    const { filters: localFilters, setFilter, applyFilters } = useFilters(
        'suppliers.approval-queue',
        {
            q: filters.q ?? '',
            status: filters.status ?? '',
            supplier_type: filters.supplier_type ?? '',
            waiting_bucket: filters.waiting_bucket ?? '',
            per_page: filters.per_page ?? 25,
            page: filters.page ?? 1,
        },
        { debounceMs: 300 }
    );

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const companyName = (row: QueueRow): string => {
        if (locale === 'ar') {
            return (row.legal_name_ar ?? row.legal_name_en).trim() || '—';
        }
        return (row.legal_name_en ?? row.legal_name_ar ?? '').trim() || '—';
    };

    const locationLine = (row: QueueRow): string =>
        [row.city, row.country].filter(Boolean).join(', ') || '—';

    const formatDt = (iso: string | null): string => {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
        } catch {
            return '—';
        }
    };

    const paginationFrom =
        suppliers.total === 0 ? 0 : (suppliers.current_page - 1) * suppliers.per_page + 1;
    const paginationTo = Math.min(suppliers.current_page * suppliers.per_page, suppliers.total);

    const handleStatusChange = (value: string) => {
        setFilter('status', value === 'all' ? '' : value);
        applyFilters({ status: value === 'all' ? undefined : value, page: 1 } as never);
    };

    const handleTypeChange = (value: string) => {
        setFilter('supplier_type', value === 'all' ? '' : value);
        applyFilters({ supplier_type: value === 'all' ? undefined : value, page: 1 } as never);
    };

    const handleWaitingBucketChange = (value: string) => {
        setFilter('waiting_bucket', value === 'all' ? '' : value);
        applyFilters({ waiting_bucket: value === 'all' ? undefined : value, page: 1 } as never);
    };

    return (
        <AppLayout>
            <Head title={t('approval_queue_title')} />
            <div className="space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-start">
                        {t('approval_queue_title')}
                    </h1>
                    <p className="text-muted-foreground text-start text-sm">
                        {t('approval_queue_subtitle', 'suppliers', { count: stats.total_pending })}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>{t('approval_queue_stat_total')}</CardDescription>
                            <CardTitle className="text-3xl tabular-nums">
                                {stats.total_pending.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB')}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>{t('approval_queue_stat_avg_days')}</CardDescription>
                            <CardTitle className="text-3xl tabular-nums">
                                {stats.avg_days_waiting != null
                                    ? stats.avg_days_waiting.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
                                          maximumFractionDigits: 1,
                                      })
                                    : '—'}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>{t('approval_queue_stat_oldest_days')}</CardDescription>
                            <CardTitle className="text-3xl tabular-nums text-amber-700 dark:text-amber-400">
                                {stats.oldest_days_waiting != null
                                    ? stats.oldest_days_waiting.toLocaleString(
                                          locale === 'ar' ? 'ar-SA' : 'en-GB'
                                      )
                                    : '—'}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-start text-lg">{t('approval_queue_filters')}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[12rem] flex-1 space-y-1">
                            <label className="text-xs font-medium text-muted-foreground" htmlFor="aq-search">
                                {t('search_placeholder')}
                            </label>
                            <Input
                                id="aq-search"
                                value={(localFilters.q as string) ?? ''}
                                onChange={(e) => setFilter('q', e.target.value)}
                                placeholder={t('approval_queue_search_placeholder')}
                                className="w-full"
                                autoComplete="off"
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground block">
                                {t('filter_status')}
                            </span>
                            <select
                                value={(localFilters.status as string) || 'all'}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className="flex h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                aria-label={t('filter_status')}
                            >
                                <option value="all">{t('all_statuses')}</option>
                                <option value="pending_registration">
                                    {t('status_pending_registration')}
                                </option>
                                <option value="pending_review">{t('status_pending_review')}</option>
                                <option value="under_review">{t('status_under_review')}</option>
                                <option value="more_info_requested">
                                    {t('status_more_info_requested')}
                                </option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground block">
                                {t('filter_type')}
                            </span>
                            <select
                                value={(localFilters.supplier_type as string) || 'all'}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                className="flex h-9 w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                aria-label={t('filter_type')}
                            >
                                <option value="all">{t('all_types')}</option>
                                <option value="supplier">{t('type_supplier')}</option>
                                <option value="subcontractor">{t('type_subcontractor')}</option>
                                <option value="service_provider">{t('type_service_provider')}</option>
                                <option value="consultant">{t('type_consultant')}</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground block">
                                {t('approval_queue_filter_waiting')}
                            </span>
                            <select
                                value={(localFilters.waiting_bucket as string) || 'all'}
                                onChange={(e) => handleWaitingBucketChange(e.target.value)}
                                className="flex h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                aria-label={t('approval_queue_filter_waiting')}
                            >
                                <option value="all">{t('approval_queue_waiting_any')}</option>
                                <option value="gt3">{t('approval_queue_waiting_gt3')}</option>
                                <option value="gt7">{t('approval_queue_waiting_gt7')}</option>
                                <option value="gt14">{t('approval_queue_waiting_gt14')}</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        {suppliers.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                                <div className="rounded-full bg-emerald-500/10 p-4">
                                    <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" aria-hidden />
                                </div>
                                <p className="text-lg font-medium text-foreground">{t('approval_queue_empty_title')}</p>
                                <p className="max-w-md text-sm text-muted-foreground">
                                    {t('approval_queue_empty_description')}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[56rem] border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50 text-start">
                                            <th className="px-4 py-3 font-medium">{t('col_supplier_code')}</th>
                                            <th className="px-4 py-3 font-medium">{t('col_company_name')}</th>
                                            <th className="px-4 py-3 font-medium">{t('filter_type')}</th>
                                            <th className="px-4 py-3 font-medium">{t('col_location')}</th>
                                            <th className="px-4 py-3 font-medium">{t('col_status')}</th>
                                            <th className="px-4 py-3 font-medium">{t('approval_queue_col_days_waiting')}</th>
                                            <th className="px-4 py-3 font-medium">{t('approval_queue_col_registered_at')}</th>
                                            <th className="px-4 py-3 font-medium text-end">{t('col_actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {suppliers.data.map((row) => (
                                            <tr
                                                key={row.id}
                                                className="border-b border-border/80 transition-colors hover:bg-muted/40"
                                            >
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={route('suppliers.show', row.id)}
                                                        className="font-mono text-start text-xs tabular-nums text-primary underline-offset-4 hover:underline"
                                                        dir="ltr"
                                                    >
                                                        {row.supplier_code}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={route('suppliers.show', row.id)}
                                                        className="font-medium text-start hover:underline"
                                                    >
                                                        {companyName(row)}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={cn(
                                                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                                            'bg-muted text-foreground'
                                                        )}
                                                    >
                                                        {t(`type_${row.supplier_type}` as 'type_supplier')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{locationLine(row)}</td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={cn(
                                                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                                            getStatusColor(row.status)
                                                        )}
                                                    >
                                                        {t(`status_${row.status.replace(/-/g, '_')}` as 'status_approved')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={cn(
                                                            'tabular-nums',
                                                            row.days_waiting > 7
                                                                ? 'font-semibold text-amber-700 dark:text-amber-400'
                                                                : 'text-foreground'
                                                        )}
                                                    >
                                                        {row.days_waiting.toLocaleString(
                                                            locale === 'ar' ? 'ar-SA' : 'en-GB'
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                                                    {formatDt(row.created_at)}
                                                </td>
                                                <td className="px-4 py-3 text-end">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('suppliers.show', row.id)}>
                                                            <Eye className="me-1 h-4 w-4" aria-hidden />
                                                            {t('action_review')}
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {suppliers.data.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                        <p className="text-sm text-muted-foreground">
                            {t('approval_queue_showing', 'suppliers', {
                                from: paginationFrom,
                                to: paginationTo,
                                total: suppliers.total,
                            })}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={suppliers.current_page <= 1}
                                onClick={() =>
                                    applyFilters({ page: suppliers.current_page - 1 } as never)
                                }
                            >
                                <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                                {t('pagination_previous')}
                            </Button>
                            <span className="text-sm tabular-nums text-muted-foreground">
                                {suppliers.current_page} / {suppliers.last_page}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={suppliers.current_page >= suppliers.last_page}
                                onClick={() =>
                                    applyFilters({ page: suppliers.current_page + 1 } as never)
                                }
                            >
                                {t('pagination_next')}
                                <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
