import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Switch } from '@/Components/ui/switch';
import { useLocale } from '@/hooks/useLocale';
import { useCallback, useMemo, useState } from 'react';
import { Bell, ChevronDown, ChevronRight, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModuleGroupKey = 'suppliers' | 'rfqs' | 'contracts' | 'tasks' | 'projects' | 'other';

const GROUP_ORDER: ModuleGroupKey[] = ['suppliers', 'rfqs', 'contracts', 'tasks', 'projects', 'other'];

type NotificationSettingRow = {
    id: string;
    event_key: string;
    name: string | null;
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

function moduleToGroupKey(module: string): ModuleGroupKey {
    const m = module.toLowerCase();
    if (m.includes('supplier')) {
        return 'suppliers';
    }
    if (m.includes('rfq')) {
        return 'rfqs';
    }
    if (m.includes('contract')) {
        return 'contracts';
    }
    if (m.includes('task')) {
        return 'tasks';
    }
    if (m.includes('project')) {
        return 'projects';
    }
    return 'other';
}

function humanizeEventKey(eventKey: string): string {
    return eventKey
        .split('.')
        .filter(Boolean)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '))
        .join(' · ');
}

function displayEventName(row: NotificationSettingRow): string {
    const n = row.name?.trim();
    if (n) {
        return n;
    }
    return humanizeEventKey(row.event_key);
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

    const [expandedGroups, setExpandedGroups] = useState<Record<ModuleGroupKey, boolean>>(() => ({
        suppliers: true,
        rfqs: false,
        contracts: false,
        tasks: false,
        projects: false,
        other: false,
    }));

    const [togglingKey, setTogglingKey] = useState<string | null>(null);

    const grouped = useMemo(() => {
        const m = new Map<ModuleGroupKey, NotificationSettingRow[]>();
        for (const row of settings.data) {
            const g = moduleToGroupKey(row.module);
            if (!m.has(g)) {
                m.set(g, []);
            }
            m.get(g)!.push(row);
        }
        return m;
    }, [settings.data]);

    const visibleGroups = useMemo(
        () => GROUP_ORDER.filter((g) => (grouped.get(g)?.length ?? 0) > 0),
        [grouped],
    );

    const toggleGroup = (g: ModuleGroupKey) => {
        setExpandedGroups((prev) => ({ ...prev, [g]: !prev[g] }));
    };

    const expandAll = () => {
        setExpandedGroups((prev) => {
            const next = { ...prev };
            for (const g of visibleGroups) {
                next[g] = true;
            }
            return next;
        });
    };

    const collapseAll = () => {
        setExpandedGroups((prev) => {
            const next = { ...prev };
            for (const g of visibleGroups) {
                next[g] = false;
            }
            return next;
        });
    };

    const groupTitle = (g: ModuleGroupKey): string =>
        t(`notification_configuration_module_group_${g}`, 'admin');

    const applyFilters = (next: Partial<Props['filters']>) => {
        router.get(
            route('settings.notification-configuration.index'),
            { ...filters, ...next, search },
            { preserveState: true, replace: true },
        );
    };

    const onToggleEnabled = useCallback(
        (row: NotificationSettingRow, next: boolean) => {
            setTogglingKey(row.event_key);
            router.patch(
                route('settings.notification-configuration.toggle-enabled', row.event_key),
                { is_enabled: next },
                {
                    preserveScroll: true,
                    onFinish: () => setTogglingKey(null),
                },
            );
        },
        [],
    );

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
                    <p className="mt-2 text-xs text-muted-foreground">
                        {t('notification_configuration_testing_tip', 'admin')}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('notification_configuration_settings', 'admin')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                            <div className="min-w-0 flex-1 space-y-2">
                                <label className="text-xs font-medium text-muted-foreground" htmlFor="nc-search">
                                    {t('search', 'admin')}
                                </label>
                                <Input
                                    id="nc-search"
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

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
                                        {t('notification_configuration_filter_status_label', 'admin')}
                                    </label>
                                    <select
                                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                        value={filters.enabled ?? ''}
                                        onChange={(e) => applyFilters({ enabled: e.target.value })}
                                    >
                                        <option value="">{t('notification_configuration_filter_status_all', 'admin')}</option>
                                        <option value="1">{t('notification_configuration_filter_status_enabled', 'admin')}</option>
                                        <option value="0">{t('notification_configuration_filter_status_disabled', 'admin')}</option>
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

                        {visibleGroups.length > 0 && (
                            <div className="flex flex-wrap gap-2 border-b pb-3">
                                <Button type="button" variant="outline" size="sm" onClick={expandAll}>
                                    {t('notification_configuration_expand_all', 'admin')}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={collapseAll}>
                                    {t('notification_configuration_collapse_all', 'admin')}
                                </Button>
                            </div>
                        )}

                        <div className="space-y-3">
                            {visibleGroups.map((g) => {
                                const rows = grouped.get(g) ?? [];
                                const open = expandedGroups[g] ?? false;
                                const count = rows.length;

                                return (
                                    <div
                                        key={g}
                                        className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(g)}
                                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-muted/40"
                                            aria-expanded={open}
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                {open ? (
                                                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                                ) : (
                                                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                                )}
                                                <span className="truncate font-semibold">{groupTitle(g)}</span>
                                                <Badge variant="secondary" className="shrink-0 text-xs">
                                                    {t('notification_configuration_group_count', 'admin', {
                                                        count: String(count),
                                                    })}
                                                </Badge>
                                            </span>
                                        </button>

                                        {open && (
                                            <div className="border-t px-3 py-3 sm:px-4">
                                                <ul className="space-y-2">
                                                    {rows.map((row) => {
                                                        const isSupplierHighlight =
                                                            g === 'suppliers' ||
                                                            row.event_key.toLowerCase().includes('supplier');
                                                        return (
                                                            <li key={row.id}>
                                                                <div
                                                                    className={cn(
                                                                        'space-y-2 rounded-md border p-3',
                                                                        isSupplierHighlight &&
                                                                            'border-primary/30 bg-primary/[0.04]',
                                                                        row.event_key === 'supplier.registered' &&
                                                                            'ring-1 ring-primary/40',
                                                                    )}
                                                                >
                                                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                                        <div className="min-w-0 flex-1 space-y-1">
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <span className="font-medium leading-snug">
                                                                                    {displayEventName(row)}
                                                                                </span>
                                                                                {pilotSet.has(row.event_key) && (
                                                                                    <Badge variant="outline" className="text-xs">
                                                                                        {t('notification_configuration_pilot_badge', 'admin')}
                                                                                    </Badge>
                                                                                )}
                                                                                <Badge
                                                                                    variant={row.is_enabled ? 'default' : 'secondary'}
                                                                                    className="text-xs"
                                                                                >
                                                                                    {row.is_enabled
                                                                                        ? t('notification_configuration_enabled', 'admin')
                                                                                        : t('notification_configuration_disabled', 'admin')}
                                                                                </Badge>
                                                                            </div>
                                                                            <code className="block truncate font-mono text-xs text-muted-foreground">
                                                                                {row.event_key}
                                                                            </code>
                                                                            {row.source_event_key && (
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    {t('notification_configuration_source', 'admin')}{' '}
                                                                                    <code className="rounded bg-muted px-1 py-0.5 font-mono">
                                                                                        {row.source_event_key}
                                                                                    </code>
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:shrink-0">
                                                                            <div
                                                                                className="flex items-center gap-2"
                                                                                role="group"
                                                                                aria-label={t(
                                                                                    'notification_configuration_channels_aria',
                                                                                    'admin',
                                                                                )}
                                                                            >
                                                                                <span
                                                                                    className={cn(
                                                                                        'inline-flex rounded-md p-1.5',
                                                                                        row.send_internal
                                                                                            ? 'bg-primary/10 text-primary'
                                                                                            : 'bg-muted text-muted-foreground',
                                                                                    )}
                                                                                    title={t(
                                                                                        'notification_configuration_channel_in_app',
                                                                                        'admin',
                                                                                    )}
                                                                                >
                                                                                    <Bell className="size-4" aria-hidden />
                                                                                </span>
                                                                                <span
                                                                                    className={cn(
                                                                                        'inline-flex rounded-md p-1.5',
                                                                                        row.send_email
                                                                                            ? 'bg-primary/10 text-primary'
                                                                                            : 'bg-muted text-muted-foreground',
                                                                                    )}
                                                                                    title={t(
                                                                                        'notification_configuration_channel_email',
                                                                                        'admin',
                                                                                    )}
                                                                                >
                                                                                    <Mail className="size-4" aria-hidden />
                                                                                </span>
                                                                                <span
                                                                                    className={cn(
                                                                                        'inline-flex rounded-md p-1.5',
                                                                                        row.send_whatsapp
                                                                                            ? 'bg-primary/10 text-primary'
                                                                                            : 'bg-muted text-muted-foreground',
                                                                                    )}
                                                                                    title={t(
                                                                                        'notification_configuration_channel_whatsapp',
                                                                                        'admin',
                                                                                    )}
                                                                                >
                                                                                    <MessageCircle className="size-4" aria-hidden />
                                                                                </span>
                                                                                <span
                                                                                    className={cn(
                                                                                        'inline-flex rounded-md p-1.5',
                                                                                        row.send_sms
                                                                                            ? 'bg-primary/10 text-primary'
                                                                                            : 'bg-muted text-muted-foreground',
                                                                                    )}
                                                                                    title={t(
                                                                                        'notification_configuration_channel_sms',
                                                                                        'admin',
                                                                                    )}
                                                                                >
                                                                                    <Smartphone className="size-4" aria-hidden />
                                                                                </span>
                                                                            </div>

                                                                            <div className="flex flex-wrap items-center gap-3">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                                                                                        {t('notification_configuration_quick_toggle', 'admin')}
                                                                                    </span>
                                                                                    <Switch
                                                                                        checked={row.is_enabled}
                                                                                        disabled={togglingKey === row.event_key}
                                                                                        onCheckedChange={(checked) =>
                                                                                            onToggleEnabled(row, checked)
                                                                                        }
                                                                                        aria-label={t(
                                                                                            'notification_configuration_quick_toggle_aria',
                                                                                            'admin',
                                                                                            { name: displayEventName(row) },
                                                                                        )}
                                                                                    />
                                                                                </div>
                                                                                <Button asChild variant="secondary" size="sm">
                                                                                    <Link
                                                                                        href={route(
                                                                                            'settings.notification-configuration.edit',
                                                                                            row.event_key,
                                                                                        )}
                                                                                    >
                                                                                        {t('action_edit', 'admin')}
                                                                                    </Link>
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-xs text-muted-foreground">
                                                                        {row.template_event_code ? (
                                                                            <>
                                                                                {t('notification_configuration_col_template', 'admin')}:{' '}
                                                                                <code className="rounded bg-muted px-1 font-mono">
                                                                                    {row.template_event_code}
                                                                                </code>
                                                                            </>
                                                                        ) : (
                                                                            <span>—</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {settings.data.length === 0 && (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    {t('no_results', 'admin')}
                                </p>
                            )}
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
