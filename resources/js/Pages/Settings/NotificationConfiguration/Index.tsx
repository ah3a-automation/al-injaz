import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { useLocale } from '@/hooks/useLocale';
import { useMemo, useState } from 'react';

type NotificationSettingRow = {
    id: string;
    event_key: string;
    source_event_key: string | null;
    template_event_code: string | null;
    module: string;
    is_enabled: boolean;
    send_internal: boolean;
    send_email: boolean;
    send_sms: boolean;
    send_whatsapp: boolean;
};

type Pagination<T> = {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
};

interface Props {
    settings: Pagination<NotificationSettingRow>;
    filters: {
        search: string;
        module: string;
        enabled: string;
        channel: string;
        pilot: string;
    };
    modules: string[];
    pilot_event_keys: string[];

    tables_missing?: boolean;
    setup_message?: string;
    migration_hint?: string;
}

function boolBadge(v: boolean, label: string) {
    return (
        <Badge variant={v ? 'default' : 'secondary'} className="text-xs">
            {label}
        </Badge>
    );
}

export default function Index({
    settings,
    filters,
    modules,
    pilot_event_keys,
    tables_missing,
    setup_message,
    migration_hint,
}: Props) {
    const { t } = useLocale();
    const [search, setSearch] = useState(filters.search ?? '');
    const pilotSet = useMemo(() => new Set(pilot_event_keys ?? []), [pilot_event_keys]);
    const tablesMissing = !!tables_missing;

    if (tablesMissing) {
        return (
            <AppLayout>
                <Head title={t('notification_configuration_title', 'admin')} />
                <div className="mx-auto max-w-6xl space-y-6">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {t('notification_configuration_title', 'admin')}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('notification_configuration_desc', 'admin')}
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('notification_configuration_setup_needed', 'admin')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                {setup_message ?? 'Notification Configuration tables are not migrated yet.'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {migration_hint ?? 'Run: php artisan migrate'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    const applyFilters = (next: Partial<Props['filters']>) => {
        router.get(
            route('settings.notification-configuration.index'),
            { ...filters, ...next, search },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AppLayout>
            <Head title={t('notification_configuration_title', 'admin')} />
            <div className="mx-auto max-w-6xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('notification_configuration_title', 'admin')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('notification_configuration_desc', 'admin')}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('notification_configuration_settings', 'admin')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    {t('search', 'admin')}
                                </label>
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            applyFilters({ search });
                                        }
                                    }}
                                    placeholder={t('notification_configuration_search_placeholder', 'admin')}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        {t('notification_configuration_filter_module', 'admin')}
                                    </label>
                                    <select
                                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                        value={filters.module ?? ''}
                                        onChange={(e) => applyFilters({ module: e.target.value })}
                                    >
                                        <option value="">{t('notification_configuration_filter_all', 'admin')}</option>
                                        {modules.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        {t('notification_configuration_filter_enabled', 'admin')}
                                    </label>
                                    <select
                                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                        value={filters.enabled ?? ''}
                                        onChange={(e) => applyFilters({ enabled: e.target.value })}
                                    >
                                        <option value="">{t('notification_configuration_filter_all', 'admin')}</option>
                                        <option value="1">{t('notification_configuration_enabled', 'admin')}</option>
                                        <option value="0">{t('notification_configuration_disabled', 'admin')}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        {t('notification_configuration_filter_channel', 'admin')}
                                    </label>
                                    <select
                                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                        value={filters.channel ?? ''}
                                        onChange={(e) => applyFilters({ channel: e.target.value })}
                                    >
                                        <option value="">{t('notification_configuration_filter_all', 'admin')}</option>
                                        <option value="internal">{t('notification_configuration_channel_internal', 'admin')}</option>
                                        <option value="email">{t('notification_configuration_channel_email', 'admin')}</option>
                                        <option value="sms">{t('notification_configuration_channel_sms', 'admin')}</option>
                                        <option value="whatsapp">{t('notification_configuration_channel_whatsapp', 'admin')}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        {t('notification_configuration_filter_pilot', 'admin')}
                                    </label>
                                    <select
                                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                        value={filters.pilot ?? ''}
                                        onChange={(e) => applyFilters({ pilot: e.target.value })}
                                    >
                                        <option value="">{t('notification_configuration_filter_all', 'admin')}</option>
                                        <option value="1">{t('notification_configuration_pilot_only', 'admin')}</option>
                                        <option value="0">{t('notification_configuration_non_pilot', 'admin')}</option>
                                    </select>
                                </div>
                            </div>

                            <Button type="button" variant="secondary" onClick={() => applyFilters({ search })}>
                                {t('apply_filters', 'admin')}
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b text-xs text-muted-foreground">
                                        <th className="py-2 text-left font-medium">{t('event_type', 'admin')}</th>
                                        <th className="py-2 text-left font-medium">{t('notification_configuration_col_module', 'admin')}</th>
                                        <th className="py-2 text-left font-medium">{t('notification_configuration_col_enabled', 'admin')}</th>
                                        <th className="py-2 text-left font-medium">{t('notification_configuration_col_channels', 'admin')}</th>
                                        <th className="py-2 text-left font-medium">{t('notification_configuration_col_template', 'admin')}</th>
                                        <th className="py-2 text-left font-medium">{t('notification_configuration_col_actions', 'admin')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {settings.data.map((row) => (
                                        <tr key={row.id} className="border-b">
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <code className="rounded bg-muted px-2 py-0.5 text-xs">
                                                        {row.event_key}
                                                    </code>
                                                    {pilotSet.has(row.event_key) && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {t('notification_configuration_pilot_badge', 'admin')}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {row.source_event_key && (
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {t('notification_configuration_source', 'admin')}{' '}
                                                        <code className="rounded bg-muted px-2 py-0.5 text-xs">
                                                            {row.source_event_key}
                                                        </code>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3">{row.module}</td>
                                            <td className="py-3">
                                                {row.is_enabled ? (
                                                    <Badge>{t('notification_configuration_enabled', 'admin')}</Badge>
                                                ) : (
                                                    <Badge variant="secondary">
                                                        {t('notification_configuration_disabled', 'admin')}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {boolBadge(row.send_internal, t('notification_configuration_channel_internal', 'admin'))}
                                                    {boolBadge(row.send_email, t('notification_configuration_channel_email', 'admin'))}
                                                    {boolBadge(row.send_sms, t('notification_configuration_channel_sms', 'admin'))}
                                                    {boolBadge(row.send_whatsapp, t('notification_configuration_channel_whatsapp', 'admin'))}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                {row.template_event_code ? (
                                                    <code className="rounded bg-muted px-2 py-0.5 text-xs">
                                                        {row.template_event_code}
                                                    </code>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                <Link
                                                    href={route('settings.notification-configuration.edit', row.event_key)}
                                                    className="text-sm font-medium text-primary hover:underline"
                                                >
                                                    {t('action_edit', 'admin')}
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {settings.data.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                                                {t('no_results', 'admin')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                                {settings.links.map((l, idx) => (
                                    <Button
                                        key={idx}
                                        type="button"
                                        variant={l.active ? 'default' : 'secondary'}
                                        disabled={!l.url}
                                        onClick={() => {
                                            if (l.url) router.visit(l.url, { preserveState: true });
                                        }}
                                    >
                                        <span dangerouslySetInnerHTML={{ __html: l.label }} />
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

