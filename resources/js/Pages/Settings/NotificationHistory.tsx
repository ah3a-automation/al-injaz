import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Head, Link, router } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

interface NotificationUser {
    id: number;
    name: string;
    email: string;
}

interface NotificationRecord {
    id: number;
    event_key: string;
    title: string;
    message?: string;
    link?: string | null;
    status: string;
    created_at: string;
    user?: NotificationUser | null;
    notifiable_type?: string | null;
    notifiable_id?: string | null;
}

interface PaginatorMeta {
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    from: number | null;
    to: number | null;
    total: number;
}

interface NotificationHistoryProps {
    notifications: {
        data: NotificationRecord[];
    } & PaginatorMeta;
    eventTypes: string[];
    filters: {
        search?: string;
        type?: string;
        date_from?: string;
        date_to?: string;
    };
}

const EVENT_LABELS: Record<string, string> = {
    'rfq.issued': 'RFQ Issued',
    'rfq.awarded': 'RFQ Awarded',
    'clarification.added': 'Clarification Added',
    'clarification.shared': 'Clarification Shared',
    'clarification.made_public': 'Clarification Shared with all suppliers',
    'supplier.registered': 'Supplier Registered',
    'supplier.approved': 'Supplier Approved',
    'supplier.rejected': 'Supplier Rejected',
    'task.assigned': 'Task Assigned',
    'project.created': 'Project Created',
};

export default function NotificationHistory({
    notifications,
    eventTypes,
    filters,
}: NotificationHistoryProps) {
    const { t } = useLocale();
    const [localFilters, setLocalFilters] = useState({
        search: filters.search ?? '',
        type: filters.type && filters.type !== 'all' ? filters.type : 'all',
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
    });

    const handleFilterSubmit = (e: FormEvent) => {
        e.preventDefault();
        const params = {
            search: localFilters.search || undefined,
            type: localFilters.type === 'all' ? undefined : localFilters.type || undefined,
            date_from: localFilters.date_from || undefined,
            date_to: localFilters.date_to || undefined,
        };
        router.get(route('settings.notifications.history'), params, {
            preserveState: true,
            replace: true,
        });
    };

    const handleClear = () => {
        setLocalFilters({
            search: '',
            type: 'all',
            date_from: '',
            date_to: '',
        });
        router.get(
            route('settings.notifications.history'),
            {},
            {
                preserveState: false,
                replace: true,
            },
        );
    };

    const rows = useMemo(() => notifications.data, [notifications.data]);

    return (
        <AppLayout>
            <Head title={t('notification_history_title', 'admin')} />
            <div className="mx-auto max-w-6xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('notification_history_title', 'admin')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('notification_history_description', 'admin')}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('notification_history_title', 'admin')}</CardTitle>
                        <CardDescription>
                            {t('notification_history_description', 'admin')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form
                            onSubmit={handleFilterSubmit}
                            className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
                        >
                            <div className="flex flex-1 flex-col gap-3 md:flex-row">
                                <div className="flex-1 space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground" htmlFor="notifications_search">
                                        {t('search_notifications', 'admin')}
                                    </label>
                                    <Input
                                        id="notifications_search"
                                        value={localFilters.search}
                                        onChange={(e) =>
                                            setLocalFilters((prev) => ({
                                                ...prev,
                                                search: e.target.value,
                                            }))
                                        }
                                        placeholder={t('search_notifications', 'admin')}
                                    />
                                </div>
                                <div className="w-full space-y-1 md:w-52">
                                    <label className="text-xs font-medium text-muted-foreground" htmlFor="notifications_type">
                                        {t('filter_by_event', 'admin')}
                                    </label>
                                    <Select
                                        value={localFilters.type || 'all'}
                                        onValueChange={(value) =>
                                            setLocalFilters((prev) => ({
                                                ...prev,
                                                type: value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger id="notifications_type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                {t('all_events', 'admin')}
                                            </SelectItem>
                                            {eventTypes
                                                .filter((type) => type !== '' && type != null)
                                                .map((type) => (
                                                    <SelectItem key={type} value={type}>
                                                        {EVENT_LABELS[type] ?? type}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-full space-y-1 md:w-40">
                                    <label className="text-xs font-medium text-muted-foreground" htmlFor="notifications_date_from">
                                        {t('date_from', 'admin')}
                                    </label>
                                    <Input
                                        id="notifications_date_from"
                                        type="date"
                                        value={localFilters.date_from}
                                        onChange={(e) =>
                                            setLocalFilters((prev) => ({
                                                ...prev,
                                                date_from: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="w-full space-y-1 md:w-40">
                                    <label className="text-xs font-medium text-muted-foreground" htmlFor="notifications_date_to">
                                        {t('date_to', 'admin')}
                                    </label>
                                    <Input
                                        id="notifications_date_to"
                                        type="date"
                                        value={localFilters.date_to}
                                        onChange={(e) =>
                                            setLocalFilters((prev) => ({
                                                ...prev,
                                                date_to: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 md:ms-4">
                                <Button type="submit" className="px-4">
                                    {t('apply_filters', 'admin')}
                                </Button>
                                <Button type="button" variant="outline" onClick={handleClear}>
                                    {t('clear_filters', 'admin')}
                                </Button>
                            </div>
                        </form>

                        <div className="overflow-x-auto rounded-md border">
                            <table className="min-w-full text-sm">
                                <thead className="bg-muted/60">
                                    <tr>
                                        <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">
                                            {t('event_type', 'admin')}
                                        </th>
                                        <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">
                                            {t('notification_table_title', 'admin')}
                                        </th>
                                        <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">
                                            {t('recipient', 'admin')}
                                        </th>
                                        <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">
                                            {t('related_to', 'admin')}
                                        </th>
                                        <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">
                                            {t('notification_channel', 'admin')}
                                        </th>
                                        <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">
                                            {t('notification_table_created', 'admin')}
                                        </th>
                                        <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">
                                            {t('notification_table_status', 'admin')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-3 py-6 text-center text-sm text-muted-foreground"
                                            >
                                                {t('no_notifications_found', 'admin')}
                                            </td>
                                        </tr>
                                    )}
                                    {rows.map((notification) => {
                                        const label = EVENT_LABELS[notification.event_key] ?? notification.event_key;
                                        const created = new Date(notification.created_at);
                                        const related =
                                            notification.notifiable_type && notification.notifiable_id
                                                ? `${notification.notifiable_type} #${notification.notifiable_id}`
                                                : '—';
                                        const channel = 'system';
                                        return (
                                            <tr key={notification.id} className="border-t">
                                                <td className="px-3 py-2 align-top">
                                                    <div className="text-sm font-medium">{label}</div>
                                                    {label !== notification.event_key && (
                                                        <div className="mt-0.5 text-xs text-muted-foreground">
                                                            {notification.event_key}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    <div className="text-sm font-medium">
                                                        {notification.title}
                                                    </div>
                                                    {notification.message && (
                                                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                                            {notification.message}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    {notification.user ? (
                                                        <div className="text-sm">
                                                            <div className="font-medium">
                                                                {notification.user.name}
                                                            </div>
                                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                                {notification.user.email}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 align-top text-sm">
                                                    {related}
                                                </td>
                                                <td className="px-3 py-2 align-top text-sm">
                                                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                        {channel}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 align-top text-sm">
                                                    {Number.isNaN(created.getTime())
                                                        ? '—'
                                                        : created.toLocaleString()}
                                                </td>
                                                <td className="px-3 py-2 align-top text-sm">
                                                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                        {notification.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div>
                                {notifications.from !== null && notifications.to !== null ? (
                                    <span>
                                        {t('showing', 'admin', {
                                            from: notifications.from,
                                            to: notifications.to,
                                            total: notifications.total,
                                        })}
                                    </span>
                                ) : (
                                    <span>{t('no_results', 'admin')}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {notifications.prev_page_url && (
                                    <Link
                                        href={notifications.prev_page_url}
                                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                                        preserveScroll
                                    >
                                        {t('previous', 'admin')}
                                    </Link>
                                )}
                                <span>
                                    {t('page_of', 'admin', {
                                        page: notifications.current_page,
                                        total: notifications.last_page,
                                    })}
                                </span>
                                {notifications.next_page_url && (
                                    <Link
                                        href={notifications.next_page_url}
                                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                                        preserveScroll
                                    >
                                        {t('next', 'admin')}
                                    </Link>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

