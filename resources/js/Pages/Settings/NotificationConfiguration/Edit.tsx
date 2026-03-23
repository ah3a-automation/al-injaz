import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import { Switch } from '@/Components/ui/switch';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Label } from '@/Components/ui/label';
import { CopyButton } from '@/Components/Supplier/CopyButton';
import { confirmDelete } from '@/Services/confirm';
import { ArrowLeft, Bell, ChevronDown, Mail, MessageCircle, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';

type NotificationRecipient = {
    id: string;
    recipient_type: string;
    role_name: string | null;
    user_id: number | null;
    recipient_value: string | null;
    resolver_config_json: unknown[] | Record<string, unknown> | null;
    channel_override: string | null;
    is_enabled: boolean;
    sort_order: number;
};

type NotificationSetting = {
    id: string;
    event_key: string;
    name: string | null;
    description: string | null;
    source_event_key: string | null;
    template_event_code: string | null;
    module: string;
    is_enabled: boolean;
    send_internal: boolean;
    send_email: boolean;
    send_sms: boolean;
    send_whatsapp: boolean;
    conditions_json: unknown[] | Record<string, unknown> | null;
    notes: string | null;
    recipients: NotificationRecipient[];
};

interface Props {
    setting: NotificationSetting | null;
    is_pilot_event: boolean;
    roles: string[];

    tables_missing?: boolean;
    setup_message?: string;
    migration_hint?: string;
}

const recipientTypes = [
    { value: 'user', labelKey: 'notification_configuration_recipient_user' },
    { value: 'creator', labelKey: 'notification_configuration_recipient_creator' },
    { value: 'role', labelKey: 'notification_configuration_recipient_role' },
    // Note: `approver` is intentionally not exposed in v1 admin editing UI.
    // It is supported by the resolver for seeded internal events, but kept read-only here.
    { value: 'supplier_user', labelKey: 'notification_configuration_recipient_supplier_user' },
    { value: 'actor', labelKey: 'notification_configuration_recipient_actor' },
    { value: 'record_creator', labelKey: 'notification_configuration_recipient_record_creator' },
    { value: 'explicit_email', labelKey: 'notification_configuration_recipient_explicit_email' },
] as const;

const SUPPORTED_CONDITION_OPERATORS = [
    'equals',
    'not_equals',
    'in',
    'not_in',
    'boolean',
    'less_than',
    'less_than_or_equal',
    'greater_than',
    'greater_than_or_equal',
] as const;

type RecipientFormData = {
    recipient_type: string;
    recipient_value: string;
    role_name: string;
    user_id: string;
    resolver_config_json: string;
    channel_override: string;
    is_enabled: boolean;
    sort_order: number;
};

function toJsonString(v: unknown): string {
    if (v === null || v === undefined) return '';
    try {
        return JSON.stringify(v, null, 2);
    } catch {
        return '';
    }
}

function humanizeEventKey(eventKey: string): string {
    return eventKey
        .split('.')
        .filter(Boolean)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '))
        .join(' · ');
}

type TestChannelResult = {
    channel: string;
    success: boolean;
    error?: string;
};

type TestNotificationApiResponse = {
    success: boolean;
    channels_attempted?: string[];
    channel_results?: TestChannelResult[];
    message?: string;
    notification_id?: string | null;
};

function testChannelLabel(channel: string, t: (k: string, ns: 'admin') => string): string {
    if (channel === 'internal') {
        return t('test_notification_channel_internal', 'admin');
    }
    if (channel === 'email') {
        return t('test_notification_channel_email', 'admin');
    }
    return channel;
}

export default function Edit({
    setting,
    is_pilot_event,
    roles,
    tables_missing,
    setup_message,
    migration_hint,
}: Props) {
    const { t } = useLocale();
    const tablesMissing = !!tables_missing;

    const safeSetting: NotificationSetting = setting ?? {
        id: '',
        event_key: '',
        name: null,
        description: null,
        source_event_key: null,
        template_event_code: null,
        module: '',
        is_enabled: false,
        send_internal: false,
        send_email: false,
        send_sms: false,
        send_whatsapp: false,
        conditions_json: [],
        notes: null,
        recipients: [],
    };

    const displayTitle =
        safeSetting.name?.trim() || humanizeEventKey(safeSetting.event_key || '');

    const [advancedOpen, setAdvancedOpen] = useState(false);

    const [testLoading, setTestLoading] = useState(false);
    const [testBanner, setTestBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [testResult, setTestResult] = useState<{
        channels_attempted: string[];
        channel_results: TestChannelResult[];
        notification_id: string | null;
    } | null>(null);
    const testBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [editingRecipientId, setEditingRecipientId] = useState<string | null>(null);
    const [conditionsClientError, setConditionsClientError] = useState<string | null>(null);

    type UserSearchResult = {
        id: number;
        label: string;
        email: string;
    };

    const [userPickerInput, setUserPickerInput] = useState<string>('');
    const [userPickerResults, setUserPickerResults] = useState<UserSearchResult[]>([]);
    const [userPickerLoading, setUserPickerLoading] = useState<boolean>(false);

    const policyForm = useForm({
        is_enabled: safeSetting.is_enabled,
        send_internal: safeSetting.send_internal,
        send_email: safeSetting.send_email,
        send_sms: safeSetting.send_sms,
        send_whatsapp: safeSetting.send_whatsapp,
        conditions_json: toJsonString(safeSetting.conditions_json),
        notes: safeSetting.notes ?? '',
    });

    const baseRecipientForm: RecipientFormData = useMemo(
        () => ({
            recipient_type: 'supplier_user',
            recipient_value: '',
            role_name: '',
            user_id: '',
            resolver_config_json: '',
            channel_override: '',
            is_enabled: true,
            sort_order: 0,
        }),
        [],
    );

    const recipientForm = useForm<RecipientFormData>(baseRecipientForm);

    const startEditRecipient = (r: NotificationRecipient) => {
        setEditingRecipientId(r.id);
        recipientForm.setData({
            recipient_type: r.recipient_type,
            recipient_value: r.recipient_value ?? '',
            role_name: r.role_name ?? '',
            user_id: r.user_id ? String(r.user_id) : '',
            resolver_config_json: toJsonString(r.resolver_config_json),
            channel_override: r.channel_override ?? '',
            is_enabled: !!r.is_enabled,
            sort_order: r.sort_order ?? 0,
        });
        setUserPickerInput(r.recipient_type === 'user' && r.user_id ? String(r.user_id) : '');
        setUserPickerResults([]);
        setUserPickerLoading(false);
        recipientForm.clearErrors();
    };

    const cancelEditRecipient = () => {
        setEditingRecipientId(null);
        recipientForm.setData(baseRecipientForm);
        setUserPickerInput('');
        setUserPickerResults([]);
        setUserPickerLoading(false);
        recipientForm.clearErrors();
    };

    const userSearchEndpoint = route('settings.notification-configuration.user-search');
    const supportedEditableRecipientTypes = useMemo<Set<string>>(
        () => new Set(recipientTypes.map((rt) => rt.value)),
        []
    );

    useEffect(() => {
        if (!testBanner) {
            return;
        }
        if (testBannerTimerRef.current) {
            clearTimeout(testBannerTimerRef.current);
        }
        testBannerTimerRef.current = setTimeout(() => {
            setTestBanner(null);
            testBannerTimerRef.current = null;
        }, 8000);
        return () => {
            if (testBannerTimerRef.current) {
                clearTimeout(testBannerTimerRef.current);
                testBannerTimerRef.current = null;
            }
        };
    }, [testBanner]);

    const sendTestNotification = async () => {
        if (!safeSetting.event_key) {
            return;
        }
        setTestLoading(true);
        setTestBanner(null);
        try {
            const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '';
            const res = await fetch(route('settings.notification-configuration.test', safeSetting.event_key), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({}),
            });
            const data = (await res.json()) as TestNotificationApiResponse;
            setTestResult({
                channels_attempted: data.channels_attempted ?? [],
                channel_results: data.channel_results ?? [],
                notification_id: data.notification_id ?? null,
            });
            if (data.success) {
                setTestBanner({ type: 'success', text: t('test_notification_success', 'admin') });
            } else {
                setTestBanner({
                    type: 'error',
                    text: data.message?.trim() ? data.message : t('test_notification_error', 'admin'),
                });
            }
        } catch {
            setTestResult(null);
            setTestBanner({ type: 'error', text: t('test_notification_error', 'admin') });
        } finally {
            setTestLoading(false);
        }
    };

    useEffect(() => {
        if (recipientForm.data.recipient_type !== 'user') {
            setUserPickerResults([]);
            setUserPickerLoading(false);
            return;
        }

        // Once a user is selected, keep the picker stable (no further remote searches).
        if (recipientForm.data.user_id) {
            setUserPickerResults([]);
            setUserPickerLoading(false);
            return;
        }

        const q = userPickerInput.trim();
        if (q.length < 2) {
            setUserPickerResults([]);
            setUserPickerLoading(false);
            return;
        }

        setUserPickerLoading(true);

        const controller = new AbortController();
        const timeout = window.setTimeout(async () => {
            try {
                const res = await fetch(`${userSearchEndpoint}?q=${encodeURIComponent(q)}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                    },
                    signal: controller.signal,
                });

                if (!res.ok) {
                    setUserPickerResults([]);
                    return;
                }

                const data = (await res.json()) as { results?: UserSearchResult[] };
                setUserPickerResults(data.results ?? []);
            } catch {
                // Ignore aborts/temporary network errors.
                setUserPickerResults([]);
            } finally {
                setUserPickerLoading(false);
            }
        }, 300);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [recipientForm.data.recipient_type, recipientForm.data.user_id, userPickerInput, userSearchEndpoint]);

    const submitRecipient = () => {
        const url = editingRecipientId
            ? route('settings.notification-configuration.recipients.update', [
                  safeSetting.event_key,
                  editingRecipientId,
              ])
            : route('settings.notification-configuration.recipients.store', safeSetting.event_key);

        const method = editingRecipientId ? recipientForm.put : recipientForm.post;
        method(url, {
            preserveScroll: true,
            onSuccess: () => cancelEditRecipient(),
        });
    };

    const validateConditionsJsonClient = (raw: string): string | null => {
        const trimmed = raw.trim();
        if (trimmed === '' || trimmed === '[]' || trimmed === 'null') {
            return null;
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(trimmed);
        } catch {
            return t('notification_configuration_conditions_client_error_invalid_json', 'admin');
        }

        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return t('notification_configuration_conditions_client_error_expected_object', 'admin');
        }

        const obj = parsed as Record<string, unknown>;

        const op = obj['op'];
        const hasShorthand =
            (typeof (obj['field'] ?? obj['path']) === 'string') && typeof op === 'string' && 'value' in obj;

        if (hasShorthand) {
            if (!SUPPORTED_CONDITION_OPERATORS.includes(op as (typeof SUPPORTED_CONDITION_OPERATORS)[number])) {
                return t('notification_configuration_conditions_client_error_unsupported_operator', 'admin');
            }
            return null;
        }

        const rules = obj['rules'];
        if (!Array.isArray(rules)) {
            return t('notification_configuration_conditions_client_error_expected_rules', 'admin');
        }

        const mode = obj['mode'];
        if (typeof mode === 'string' && !['all', 'any'].includes(mode)) {
            return t('notification_configuration_conditions_client_error_expected_mode', 'admin');
        }

        for (const rule of rules) {
            if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
                return t('notification_configuration_conditions_client_error_invalid_rule', 'admin');
            }

            const r = rule as Record<string, unknown>;
            const ruleField = r['field'] ?? r['path'];
            const ruleOp = r['op'];

            const hasValue = 'value' in r;
            if (typeof ruleField !== 'string' || typeof ruleOp !== 'string' || !hasValue) {
                return t('notification_configuration_conditions_client_error_invalid_rule', 'admin');
            }

            if (!SUPPORTED_CONDITION_OPERATORS.includes(ruleOp as (typeof SUPPORTED_CONDITION_OPERATORS)[number])) {
                return t('notification_configuration_conditions_client_error_unsupported_operator', 'admin');
            }
        }

        return null;
    };

    if (tablesMissing) {
        return (
            <AppLayout>
                <Head title={t('notification_configuration_title', 'admin')} />
                <div className="mx-auto max-w-6xl space-y-6">
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
                            <Button asChild variant="secondary">
                                <Link href={route('settings.notification-configuration.index')}>
                                    {t('action_back', 'admin')}
                                </Link>
                            </Button>
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
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                        <Button asChild variant="ghost" size="sm" className="mb-1 h-auto px-0 text-muted-foreground">
                            <Link
                                href={route('settings.notification-configuration.index')}
                                className="inline-flex items-center gap-1.5"
                            >
                                <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
                                {t('action_back', 'admin')}
                            </Link>
                        </Button>
                        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{displayTitle}</h1>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                                {safeSetting.module || '—'}
                            </Badge>
                            {is_pilot_event && (
                                <Badge variant="outline" className="text-xs">
                                    {t('notification_configuration_pilot_badge', 'admin')}
                                </Badge>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm">{safeSetting.event_key}</code>
                            <CopyButton text={safeSetting.event_key} variant="outline" size="sm" />
                        </div>
                        <p className="max-w-3xl text-sm text-muted-foreground">
                            {safeSetting.description?.trim()
                                ? safeSetting.description
                                : t('notification_configuration_description_fallback', 'admin')}
                        </p>
                        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                            <p className="text-sm font-medium text-destructive">
                                {t('notification_configuration_edit_warning', 'admin')}
                            </p>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('notification_configuration_summary_readonly', 'admin')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                    {t('notification_configuration_source_event_key', 'admin')}
                                </p>
                                {safeSetting.source_event_key ? (
                                    <code className="inline-block rounded bg-muted px-2 py-0.5 text-xs">
                                        {safeSetting.source_event_key}
                                    </code>
                                ) : (
                                    <p className="text-sm text-muted-foreground">—</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                    {t('notification_configuration_template_event_code', 'admin')}
                                </p>
                                {safeSetting.template_event_code ? (
                                    <code className="inline-block rounded bg-muted px-2 py-0.5 text-xs">
                                        {safeSetting.template_event_code}
                                    </code>
                                ) : (
                                    <p className="text-sm text-muted-foreground">—</p>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('notification_configuration_rollout_context_note', 'admin')}
                        </p>
                    </CardContent>
                </Card>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setConditionsClientError(null);

                        const clientError = validateConditionsJsonClient(policyForm.data.conditions_json);
                        if (clientError) {
                            setConditionsClientError(clientError);
                            return;
                        }

                        policyForm.put(route('settings.notification-configuration.update', safeSetting.event_key), {
                            preserveScroll: true,
                        });
                    }}
                    className="space-y-4"
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('notification_configuration_policy', 'admin')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-medium">{t('notification_configuration_master_enable', 'admin')}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('notification_configuration_master_enable_help', 'admin')}
                                    </p>
                                </div>
                                <Switch
                                    checked={policyForm.data.is_enabled}
                                    onCheckedChange={(checked: boolean) => policyForm.setData('is_enabled', !!checked)}
                                    aria-label={t('notification_configuration_master_enable', 'admin')}
                                />
                            </div>

                            <div>
                                <p className="mb-3 text-sm font-medium">
                                    {t('notification_configuration_channel_cards_title', 'admin')}
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {(
                                        [
                                            {
                                                key: 'send_internal' as const,
                                                labelKey: 'notification_configuration_channel_in_app',
                                                icon: Bell,
                                            },
                                            {
                                                key: 'send_email' as const,
                                                labelKey: 'notification_configuration_channel_email',
                                                icon: Mail,
                                            },
                                            {
                                                key: 'send_whatsapp' as const,
                                                labelKey: 'notification_configuration_channel_whatsapp',
                                                icon: MessageCircle,
                                            },
                                            {
                                                key: 'send_sms' as const,
                                                labelKey: 'notification_configuration_channel_sms',
                                                icon: Smartphone,
                                            },
                                        ] as const
                                    ).map(({ key, labelKey, icon: Icon }) => {
                                        const on = policyForm.data[key];
                                        return (
                                            <div
                                                key={key}
                                                className={cn(
                                                    'flex items-center justify-between gap-3 rounded-lg border p-4 transition-opacity',
                                                    !on && 'opacity-60',
                                                )}
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span
                                                        className={cn(
                                                            'inline-flex rounded-md p-2',
                                                            on ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                                                        )}
                                                    >
                                                        <Icon className="size-5 shrink-0" aria-hidden />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium">{t(labelKey, 'admin')}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {on
                                                                ? t('notification_configuration_channel_on', 'admin')
                                                                : t('notification_configuration_channel_off', 'admin')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={policyForm.data[key]}
                                                    onCheckedChange={(checked: boolean) =>
                                                        policyForm.setData(key, !!checked)
                                                    }
                                                    aria-label={t(labelKey, 'admin')}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rounded-lg border">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-muted/40"
                                    onClick={() => setAdvancedOpen((v) => !v)}
                                    aria-expanded={advancedOpen}
                                >
                                    <span className="font-medium">{t('notification_configuration_advanced_section', 'admin')}</span>
                                    <ChevronDown
                                        className={cn(
                                            'size-4 shrink-0 transition-transform',
                                            advancedOpen && 'rotate-180',
                                        )}
                                        aria-hidden
                                    />
                                </button>
                                {advancedOpen && (
                                    <div className="space-y-4 border-t px-4 py-4">
                                        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                                            <p className="font-medium text-foreground">
                                                {t('notification_configuration_advanced_intro', 'admin')}
                                            </p>
                                            <ul className="mt-2 list-inside list-disc space-y-1">
                                                <li>{t('notification_configuration_advanced_bullet_conditions', 'admin')}</li>
                                                <li>{t('notification_configuration_advanced_bullet_notes', 'admin')}</li>
                                                <li>{t('notification_configuration_advanced_bullet_pilot', 'admin')}</li>
                                            </ul>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {t('notification_configuration_pilot_status_label', 'admin')}
                                            </span>
                                            <Badge variant={is_pilot_event ? 'default' : 'secondary'} className="text-xs">
                                                {is_pilot_event
                                                    ? t('notification_configuration_pilot_badge', 'admin')
                                                    : t('notification_configuration_non_pilot', 'admin')}
                                            </Badge>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="conditions-json">{t('notification_configuration_conditions_json', 'admin')}</Label>
                                            <textarea
                                                id="conditions-json"
                                                className="min-h-[140px] w-full rounded-md border bg-background p-3 text-sm"
                                                value={policyForm.data.conditions_json}
                                                onChange={(e) => {
                                                    setConditionsClientError(null);
                                                    policyForm.setData('conditions_json', e.target.value);
                                                }}
                                            />
                                            {conditionsClientError && (
                                                <p className="text-sm text-destructive">{conditionsClientError}</p>
                                            )}
                                            {policyForm.errors.conditions_json && (
                                                <p className="text-sm text-destructive">
                                                    {policyForm.errors.conditions_json}
                                                </p>
                                            )}

                                            <div className="rounded-md border bg-muted/30 p-3">
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    {t('notification_configuration_conditions_example_title', 'admin')}
                                                </p>
                                                <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-background p-2 text-xs text-muted-foreground">
{`{
  "mode": "all",
  "rules": [
    { "field": "supplier.status", "op": "in", "value": ["approved", "pending"] },
    { "field": "days_to_expiry", "op": "less_than_or_equal", "value": 30 }
  ]
}`}
                                                </pre>

                                                <div className="mt-3">
                                                    <p className="text-xs font-medium text-muted-foreground">
                                                        {t('notification_configuration_conditions_supported_operators_title', 'admin')}
                                                    </p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {SUPPORTED_CONDITION_OPERATORS.join(', ')}
                                                    </p>
                                                </div>
                                            </div>

                                            <p className="text-xs text-muted-foreground">
                                                {t('notification_configuration_conditions_help', 'admin')}
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="policy-notes">{t('notification_configuration_notes', 'admin')}</Label>
                                            <Input
                                                id="policy-notes"
                                                value={policyForm.data.notes}
                                                onChange={(e) => policyForm.setData('notes', e.target.value)}
                                            />
                                            {policyForm.errors.notes && (
                                                <p className="text-sm text-destructive">{policyForm.errors.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        {testBanner && (
                            <div
                                role="alert"
                                className={cn(
                                    'relative rounded-lg border px-4 py-3 pe-10 text-sm',
                                    testBanner.type === 'success'
                                        ? 'border-green-200 bg-green-50 text-green-950 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-100'
                                        : 'border-destructive/30 bg-destructive/10 text-destructive',
                                )}
                            >
                                <button
                                    type="button"
                                    className="absolute end-2 top-2 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10"
                                    onClick={() => setTestBanner(null)}
                                    aria-label={t('test_notification_dismiss', 'admin')}
                                >
                                    <X className="size-4" aria-hidden />
                                </button>
                                <p className="whitespace-pre-line">{testBanner.text}</p>
                            </div>
                        )}

                        {testResult && (
                            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                                <p className="font-medium">{t('test_notification_channels', 'admin')}</p>
                                <ul className="mt-2 space-y-2">
                                    {testResult.channel_results.map((row, idx) => (
                                        <li
                                            key={`${row.channel}-${idx}`}
                                            className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                                        >
                                            <span>{testChannelLabel(row.channel, t)}</span>
                                            <span className="flex flex-col items-end gap-0.5 text-start sm:items-end">
                                                <Badge variant={row.success ? 'default' : 'destructive'} className="text-xs">
                                                    {row.success
                                                        ? t('test_notification_result_ok', 'admin')
                                                        : t('test_notification_result_failed', 'admin')}
                                                </Badge>
                                                {!row.success && row.error ? (
                                                    <span className="max-w-full text-xs text-muted-foreground">{row.error}</span>
                                                ) : null}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {testResult.notification_id ? (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        ID: <code className="rounded bg-muted px-1 font-mono">{testResult.notification_id}</code>
                                    </p>
                                ) : null}
                                <div className="mt-3">
                                    <Button asChild variant="link" className="h-auto px-0 text-primary">
                                        <Link href={route('notifications.index')}>
                                            {t('test_notification_view_bell', 'admin')} →
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={testLoading || policyForm.processing}
                                onClick={() => void sendTestNotification()}
                            >
                                {testLoading ? t('notification_configuration_test_sending', 'admin') : t('test_notification_button', 'admin')}
                            </Button>
                            <Button type="submit" disabled={policyForm.processing || testLoading}>
                                {t('action_save', 'admin')}
                            </Button>
                        </div>
                    </div>
                </form>

                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle>{t('notification_configuration_recipients', 'admin')}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {t('notification_configuration_recipients_section_blurb', 'admin')}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="rounded-md border bg-muted/20 p-4 text-sm">
                            <p className="font-medium">
                                {t('notification_configuration_recipients_help_title', 'admin')}
                            </p>
                            <p className="mt-2 leading-relaxed text-muted-foreground">
                                {t('notification_configuration_recipients_help', 'admin')}
                            </p>
                        </div>

                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full min-w-[900px] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b text-xs text-muted-foreground">
                                        <th className="py-2 text-left font-medium">{t('notification_configuration_col_type', 'admin')}</th>
                                        <th className="py-2 text-left font-medium">{t('notification_configuration_col_value', 'admin')}</th>
                                        <th className="py-2 text-left font-medium">{t('notification_configuration_col_override', 'admin')}</th>
                                        <th className="py-2 text-left font-medium">{t('notification_configuration_col_enabled', 'admin')}</th>
                                        <th className="py-2 text-left font-medium">{t('sort_order', 'admin')}</th>
                                        <th className="py-2 text-left font-medium">{t('notification_configuration_col_actions', 'admin')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {safeSetting.recipients.map((r) => (
                                        <tr key={r.id} className="border-b">
                                            <td className="py-3">
                                                <code className="rounded bg-muted px-2 py-0.5 text-xs">
                                                    {r.recipient_type}
                                                </code>
                                            </td>
                                            <td className="py-3">
                                                <div className="space-y-1">
                                                    {r.user_id ? (
                                                        <div>
                                                            <span className="text-xs text-muted-foreground">user_id</span>{' '}
                                                            <code className="rounded bg-muted px-2 py-0.5 text-xs">
                                                                {r.user_id}
                                                            </code>
                                                        </div>
                                                    ) : null}
                                                    {r.role_name ? (
                                                        <div>
                                                            <span className="text-xs text-muted-foreground">role</span>{' '}
                                                            <code className="rounded bg-muted px-2 py-0.5 text-xs">
                                                                {r.role_name}
                                                            </code>
                                                        </div>
                                                    ) : null}
                                                    {r.recipient_value ? (
                                                        <div>
                                                            <span className="text-xs text-muted-foreground">value</span>{' '}
                                                            <code className="rounded bg-muted px-2 py-0.5 text-xs">
                                                                {r.recipient_value}
                                                            </code>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                {r.channel_override ? (
                                                    <Badge variant="outline" className="text-xs">
                                                        {r.channel_override}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                {r.is_enabled ? (
                                                    <Badge>{t('notification_configuration_enabled', 'admin')}</Badge>
                                                ) : (
                                                    <Badge variant="secondary">
                                                        {t('notification_configuration_disabled', 'admin')}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-3">{r.sort_order}</td>
                                            <td className="py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        disabled={!supportedEditableRecipientTypes.has(r.recipient_type)}
                                                        onClick={() => startEditRecipient(r)}
                                                    >
                                                        {t('action_edit', 'admin')}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={!supportedEditableRecipientTypes.has(r.recipient_type)}
                                                        onClick={async () => {
                                                            const ok = await confirmDelete(t('confirm_delete', 'admin'));
                                                            if (!ok) return;
                                                            recipientForm.delete(
                                                                route(
                                                                    'settings.notification-configuration.recipients.destroy',
                                                                    [safeSetting.event_key, r.id],
                                                                ),
                                                                { preserveScroll: true },
                                                            );
                                                        }}
                                                    >
                                                        {t('action_delete', 'admin')}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {safeSetting.recipients.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                                                {t('no_results', 'admin')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {editingRecipientId
                                        ? t('notification_configuration_recipient_edit', 'admin')
                                        : t('notification_configuration_recipient_add', 'admin')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            {t('notification_configuration_recipient_type', 'admin')}
                                        </label>
                                        <select
                                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                            value={recipientForm.data.recipient_type}
                                            onChange={(e) => {
                                                const next = e.target.value;
                                                recipientForm.setData('recipient_type', next);
                                                // user_id is required for recipient_type=user, but we always force re-selection
                                                // to avoid accidental numeric entry.
                                                recipientForm.setData('user_id', '');
                                                setUserPickerInput('');
                                                setUserPickerResults([]);
                                            }}
                                        >
                                            {recipientTypes.map((rt) => (
                                                <option key={rt.value} value={rt.value}>
                                                    {t(rt.labelKey, 'admin')}
                                                </option>
                                            ))}
                                        </select>
                                        {recipientForm.errors.recipient_type && (
                                            <p className="text-sm text-destructive">
                                                {recipientForm.errors.recipient_type}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            {t('notification_configuration_recipient_channel_override', 'admin')}
                                        </label>
                                        <select
                                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                            value={recipientForm.data.channel_override}
                                            onChange={(e) =>
                                                recipientForm.setData('channel_override', e.target.value)
                                            }
                                        >
                                            <option value="">{t('notification_configuration_filter_all', 'admin')}</option>
                                            <option value="internal">
                                                {t('notification_configuration_channel_internal', 'admin')}
                                            </option>
                                            <option value="email">
                                                {t('notification_configuration_channel_email', 'admin')}
                                            </option>
                                        </select>
                                        {recipientForm.errors.channel_override && (
                                            <p className="text-sm text-destructive">
                                                {recipientForm.errors.channel_override}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {recipientForm.data.recipient_type === 'role' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            {t('notification_configuration_role_name', 'admin')}
                                        </label>
                                        <select
                                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                            value={recipientForm.data.role_name}
                                            onChange={(e) => recipientForm.setData('role_name', e.target.value)}
                                        >
                                            <option value="">{t('notification_configuration_select_role', 'admin')}</option>
                                            {roles.map((r) => (
                                                <option key={r} value={r}>
                                                    {r}
                                                </option>
                                            ))}
                                        </select>
                                        {recipientForm.errors.role_name && (
                                            <p className="text-sm text-destructive">{recipientForm.errors.role_name}</p>
                                        )}
                                    </div>
                                )}

                                {recipientForm.data.recipient_type === 'user' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            {t('notification_configuration_user_id', 'admin')}
                                        </label>

                                        <div className="space-y-2">
                                            <Input
                                                value={userPickerInput}
                                                onChange={(e) => {
                                                    // Enforce "search + pick" (no manual numeric entry).
                                                    setUserPickerInput(e.target.value);
                                                    recipientForm.setData('user_id', '');
                                                    setUserPickerResults([]);
                                                }}
                                                placeholder={t(
                                                    'notification_configuration_user_search_placeholder',
                                                    'admin',
                                                )}
                                            />

                                            {userPickerLoading && (
                                                <p className="text-xs text-muted-foreground">
                                                    {t('notification_configuration_user_search_loading', 'admin')}
                                                </p>
                                            )}

                                            {!userPickerLoading &&
                                                userPickerInput.trim().length >= 2 &&
                                                userPickerResults.length === 0 && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {t(
                                                            'notification_configuration_user_search_no_results',
                                                            'admin',
                                                        )}
                                                    </p>
                                                )}

                                            {userPickerResults.length > 0 && (
                                                <div
                                                    role="listbox"
                                                    aria-label={t(
                                                        'notification_configuration_user_search_results',
                                                        'admin',
                                                    )}
                                                    className="max-h-56 overflow-auto rounded-md border bg-background shadow-sm"
                                                >
                                                    {userPickerResults.map((u) => (
                                                        <button
                                                            key={u.id}
                                                            type="button"
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                                            onClick={() => {
                                                                recipientForm.setData('user_id', String(u.id));
                                                                setUserPickerInput(u.label);
                                                                setUserPickerResults([]);
                                                            }}
                                                        >
                                                            <div className="font-medium">{u.label}</div>
                                                            <div className="text-xs text-muted-foreground">{u.email}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {recipientForm.errors.user_id && (
                                            <p className="text-sm text-destructive">{recipientForm.errors.user_id}</p>
                                        )}
                                    </div>
                                )}

                                {recipientForm.data.recipient_type === 'explicit_email' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            {t('notification_configuration_email', 'admin')}
                                        </label>
                                        <Input
                                            value={recipientForm.data.recipient_value}
                                            onChange={(e) =>
                                                recipientForm.setData('recipient_value', e.target.value)
                                            }
                                            placeholder="recipient@example.com"
                                        />
                                        {recipientForm.errors.recipient_value && (
                                            <p className="text-sm text-destructive">
                                                {recipientForm.errors.recipient_value}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            {t('sort_order', 'admin')}
                                        </label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={1000}
                                            value={recipientForm.data.sort_order}
                                            onChange={(e) =>
                                                recipientForm.setData('sort_order', Number(e.target.value) || 0)
                                            }
                                        />
                                        {recipientForm.errors.sort_order && (
                                            <p className="text-sm text-destructive">
                                                {recipientForm.errors.sort_order}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                                        <div>
                                            <p className="text-sm font-medium">
                                                {t('notification_configuration_enabled', 'admin')}
                                            </p>
                                        </div>
                                        <Checkbox
                                            checked={recipientForm.data.is_enabled}
                                            onCheckedChange={(checked: boolean) =>
                                                recipientForm.setData('is_enabled', !!checked)
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        {t('notification_configuration_resolver_config_json', 'admin')}
                                    </label>
                                    <textarea
                                        className="min-h-[120px] w-full rounded-md border bg-background p-3 text-sm"
                                        value={recipientForm.data.resolver_config_json}
                                        onChange={(e) =>
                                            recipientForm.setData('resolver_config_json', e.target.value)
                                        }
                                    />
                                    {recipientForm.errors.resolver_config_json && (
                                        <p className="text-sm text-destructive">
                                            {recipientForm.errors.resolver_config_json}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap justify-end gap-2">
                                    {editingRecipientId && (
                                        <Button type="button" variant="secondary" onClick={cancelEditRecipient}>
                                            {t('action_cancel', 'admin')}
                                        </Button>
                                    )}
                                    <Button type="button" onClick={submitRecipient} disabled={recipientForm.processing}>
                                        {editingRecipientId
                                            ? t('notification_configuration_recipient_update', 'admin')
                                            : t('notification_configuration_recipient_create', 'admin')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

