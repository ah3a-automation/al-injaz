import { FormEvent, useMemo, useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import SupplierPortalLayout from '@/Layouts/SupplierPortalLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Switch } from '@/Components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip';
import { useLocale } from '@/hooks/useLocale';
import type { NotificationPreferenceRow, PageProps } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface NotificationPreferencesPageProps extends PageProps {
    preferences: NotificationPreferenceRow[];
    isSupplierPortal: boolean;
}

function buildPayload(items: NotificationPreferenceRow[]): Array<{
    event_key: string;
    channel: 'inapp' | 'email' | 'whatsapp';
    is_enabled: boolean;
}> {
    const out: Array<{
        event_key: string;
        channel: 'inapp' | 'email' | 'whatsapp';
        is_enabled: boolean;
    }> = [];
    for (const p of items) {
        for (const k of ['inapp', 'email', 'whatsapp'] as const) {
            const c = p.channels[k];
            if (c?.admin_allows) {
                out.push({ event_key: p.event_key, channel: k, is_enabled: c.enabled });
            }
        }
    }
    return out;
}

function NotificationPreferencesContent({
    preferences: initialPrefs,
    isSupplierPortal,
}: NotificationPreferencesPageProps) {
    const { t } = useLocale('ui');
    const { dir } = usePage().props as PageProps;
    const [items, setItems] = useState<NotificationPreferenceRow[]>(initialPrefs);

    const form = useForm({
        preferences: buildPayload(initialPrefs),
    });

    const handleToggle = (eventKey: string, channelKey: 'inapp' | 'email' | 'whatsapp') => {
        setItems((prev) =>
            prev.map((row) => {
                if (row.event_key !== eventKey) {
                    return row;
                }
                const ch = row.channels[channelKey];
                if (!ch?.admin_allows) {
                    return row;
                }
                return {
                    ...row,
                    channels: {
                        ...row.channels,
                        [channelKey]: { ...ch, enabled: !ch.enabled },
                    },
                };
            })
        );
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.transform(() => ({
            preferences: buildPayload(items),
        }));
        form.post(route('notification-preferences.batch'), { preserveScroll: true });
    };

    const columnKeys = useMemo(() => {
        const has = { inapp: false, email: false, whatsapp: false };
        for (const p of items) {
            if (p.channels.inapp?.admin_allows) {
                has.inapp = true;
            }
            if (p.channels.email?.admin_allows) {
                has.email = true;
            }
            if (p.channels.whatsapp?.admin_allows) {
                has.whatsapp = true;
            }
        }
        return (['inapp', 'email', 'whatsapp'] as const).filter((k) => has[k]);
    }, [items]);

    return (
        <TooltipProvider delayDuration={200}>
            <Head title={t('notification_preferences_title')} />

            <div className="mx-auto max-w-5xl space-y-6">
                {Object.keys(form.errors ?? {}).length > 0 && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                        <ul className="list-inside list-disc space-y-1">
                            {Object.entries(form.errors ?? {}).map(([key, msg]) => (
                                <li key={key}>
                                    {key}: {msg}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('notification_preferences_title')}</CardTitle>
                            <CardDescription>{t('notification_preferences_subtitle')}</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table
                                className="w-full min-w-[640px] border-collapse text-sm"
                                dir={dir}
                            >
                                <thead>
                                    <tr className="border-b border-border text-start">
                                        <th className="pb-3 pe-4 font-medium text-foreground">
                                            {t('notification_preferences_event')}
                                        </th>
                                        {columnKeys.includes('inapp') && (
                                            <th className="pb-3 px-2 text-center font-medium text-foreground">
                                                {t('notification_preferences_inapp')}
                                            </th>
                                        )}
                                        {columnKeys.includes('email') && (
                                            <th className="pb-3 px-2 text-center font-medium text-foreground">
                                                {t('notification_preferences_email')}
                                            </th>
                                        )}
                                        {columnKeys.includes('whatsapp') && (
                                            <th className="pb-3 ps-2 text-center font-medium text-foreground">
                                                {t('notification_preferences_whatsapp')}
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((row) => (
                                        <tr
                                            key={row.event_key}
                                            className="border-b border-border/60 last:border-0"
                                        >
                                            <td className="py-3 pe-4 align-middle font-medium text-foreground">
                                                {row.event_name}
                                            </td>
                                            {columnKeys.includes('inapp') && (
                                                <td className="px-2 py-3 text-center align-middle">
                                                    {renderChannelCell(
                                                        row,
                                                        'inapp',
                                                        handleToggle,
                                                        t('notification_preferences_admin_disabled')
                                                    )}
                                                </td>
                                            )}
                                            {columnKeys.includes('email') && (
                                                <td className="px-2 py-3 text-center align-middle">
                                                    {renderChannelCell(
                                                        row,
                                                        'email',
                                                        handleToggle,
                                                        t('notification_preferences_admin_disabled')
                                                    )}
                                                </td>
                                            )}
                                            {columnKeys.includes('whatsapp') && (
                                                <td className="px-2 py-3 text-center align-middle">
                                                    {renderChannelCell(
                                                        row,
                                                        'whatsapp',
                                                        handleToggle,
                                                        t('notification_preferences_admin_disabled')
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {items.length === 0 && (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    {t('notification_preferences_empty')}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button type="submit" disabled={form.processing || items.length === 0}>
                            {form.processing ? (
                                <>
                                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                    {t('notification_preferences_saving')}
                                </>
                            ) : (
                                t('notification_preferences_save')
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </TooltipProvider>
    );
}

function renderChannelCell(
    row: NotificationPreferenceRow,
    channelKey: 'inapp' | 'email' | 'whatsapp',
    onToggle: (eventKey: string, ch: 'inapp' | 'email' | 'whatsapp') => void,
    adminDisabledLabel: string
) {
    const ch = row.channels[channelKey];
    if (!ch) {
        return <span className="text-muted-foreground">—</span>;
    }

    if (!ch.admin_allows) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex cursor-not-allowed justify-center opacity-40">
                        <Switch checked={false} disabled className="pointer-events-none" aria-label={adminDisabledLabel} />
                    </span>
                </TooltipTrigger>
                <TooltipContent>{adminDisabledLabel}</TooltipContent>
            </Tooltip>
        );
    }

    return (
        <div className="flex justify-center">
            <Switch
                checked={ch.enabled}
                onCheckedChange={() => onToggle(row.event_key, channelKey)}
                aria-label={`${row.event_name} ${channelKey}`}
                className={cn(!ch.enabled && 'opacity-80')}
            />
        </div>
    );
}

export default function NotificationPreferencesIndex(props: NotificationPreferencesPageProps) {
    const { isSupplierPortal } = props;
    if (isSupplierPortal) {
        return (
            <SupplierPortalLayout>
                <NotificationPreferencesContent {...props} />
            </SupplierPortalLayout>
        );
    }
    return (
        <AppLayout>
            <NotificationPreferencesContent {...props} />
        </AppLayout>
    );
}
