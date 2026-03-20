import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Checkbox } from '@/Components/ui/checkbox';
import { Button } from '@/Components/ui/button';

interface NotificationSettingsProps {
    supplier_doc_expiry_warning_days: number;
    supplier_doc_expiry_notify_inapp: boolean;
    supplier_doc_expiry_notify_email: boolean;
    task_due_soon_warning_days: number;
    task_overdue_reminders_enabled: boolean;

    // Operational context (read-only)
    task_due_soon_effective_warning_days: number;
    task_overdue_effective_reminders_enabled: boolean;
    notification_engine_enabled: boolean;
    notification_engine_pilot_enabled: boolean;
    task_due_soon_in_pilot_keys: boolean;
    task_overdue_in_pilot_keys: boolean;
    task_due_soon_policy_configured: boolean;
    task_due_soon_policy_enabled: boolean | null;
    task_overdue_policy_configured: boolean;
    task_overdue_policy_enabled: boolean | null;

    tables_missing?: boolean;
    setup_message?: string;
    migration_hint?: string;
}

export default function NotificationSettings(props: NotificationSettingsProps) {
    const { t } = useLocale();
    const form = useForm<{
        supplier_document_expiry_warning_days: number;
        supplier_document_expiry_notify_inapp: boolean;
        supplier_document_expiry_notify_email: boolean;
        task_due_soon_warning_days: number;
        task_overdue_reminders_enabled: boolean;
    }>({
        supplier_document_expiry_warning_days: props.supplier_doc_expiry_warning_days,
        supplier_document_expiry_notify_inapp: props.supplier_doc_expiry_notify_inapp,
        supplier_document_expiry_notify_email: props.supplier_doc_expiry_notify_email,
        task_due_soon_warning_days: props.task_due_soon_warning_days,
        task_overdue_reminders_enabled: props.task_overdue_reminders_enabled,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('settings.notifications.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout>
            <Head title={t('document_expiry_notifications', 'admin')} />
            <div className="mx-auto max-w-4xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('document_expiry_notifications', 'admin')}
                    </h1>
                </div>

                {props.tables_missing && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('notification_configuration_setup_needed', 'admin')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                {props.setup_message ?? 'Notification Configuration tables are not migrated yet.'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {props.migration_hint ?? 'Run: php artisan migrate'}
                            </p>
                        </CardContent>
                    </Card>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('task_reminders_operational_context', 'admin')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                    {t('task_due_soon_effective_days', 'admin')}
                                </span>
                                <span className="font-medium">
                                    {props.task_due_soon_effective_warning_days}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                    {t('task_overdue_reminders_effective', 'admin')}
                                </span>
                                <span className="font-medium">
                                    {props.task_overdue_effective_reminders_enabled
                                        ? t('notification_configuration_enabled', 'admin')
                                        : t('notification_configuration_disabled', 'admin')}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                    {t('notification_engine_enabled', 'admin')}
                                </span>
                                <span className="font-medium">
                                    {props.notification_engine_enabled
                                        ? t('notification_configuration_enabled', 'admin')
                                        : t('notification_configuration_disabled', 'admin')}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                    {t('notification_engine_pilot_enabled', 'admin')}
                                </span>
                                <span className="font-medium">
                                    {props.notification_engine_pilot_enabled
                                        ? t('notification_configuration_enabled', 'admin')
                                        : t('notification_configuration_disabled', 'admin')}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                    {t('task_due_soon_in_pilot_keys_label', 'admin')}
                                </span>
                                <span className="font-medium">
                                    {props.task_due_soon_in_pilot_keys
                                        ? t('notification_configuration_enabled', 'admin')
                                        : t('notification_configuration_disabled', 'admin')}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                    {t('task_overdue_in_pilot_keys_label', 'admin')}
                                </span>
                                <span className="font-medium">
                                    {props.task_overdue_in_pilot_keys
                                        ? t('notification_configuration_enabled', 'admin')
                                        : t('notification_configuration_disabled', 'admin')}
                                </span>
                            </div>

                            <div className="pt-2">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">
                                        {t('task_due_soon_policy_status', 'admin')}
                                    </span>
                                    <span className="font-medium">
                                        {!props.task_due_soon_policy_configured
                                            ? t('task_policy_not_configured', 'admin')
                                            : (props.task_due_soon_policy_enabled
                                                ? t('notification_configuration_enabled', 'admin')
                                                : t('notification_configuration_disabled', 'admin'))}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">
                                        {t('task_overdue_policy_status', 'admin')}
                                    </span>
                                    <span className="font-medium">
                                        {!props.task_overdue_policy_configured
                                            ? t('task_policy_not_configured', 'admin')
                                            : (props.task_overdue_policy_enabled
                                                ? t('notification_configuration_enabled', 'admin')
                                                : t('notification_configuration_disabled', 'admin'))}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('document_expiry_notifications', 'admin')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground" htmlFor="warning_days">
                                    {t('notify_before_expiry_days', 'admin')}
                                </label>
                                <Input
                                    id="warning_days"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={form.data.supplier_document_expiry_warning_days}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        form.setData(
                                            'supplier_document_expiry_warning_days',
                                            Number.isNaN(v) ? 0 : v,
                                        );
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('notify_before_expiry_days_hint', 'admin')}
                                </p>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium">
                                        {t('notify_inapp', 'admin')}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={form.data.supplier_document_expiry_notify_inapp}
                                    onCheckedChange={(checked: boolean) =>
                                        form.setData('supplier_document_expiry_notify_inapp', !!checked)
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium">
                                        {t('notify_email', 'admin')}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={form.data.supplier_document_expiry_notify_email}
                                    onCheckedChange={(checked: boolean) =>
                                        form.setData('supplier_document_expiry_notify_email', !!checked)
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium">
                                            {t('notify_task_overdue_reminders_enabled', 'admin')}
                                        </p>
                                    </div>
                                    <Checkbox
                                        checked={form.data.task_overdue_reminders_enabled}
                                        onCheckedChange={(checked: boolean) =>
                                            form.setData(
                                                'task_overdue_reminders_enabled',
                                                !!checked,
                                            )
                                        }
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {t('notify_task_overdue_reminders_enabled_hint', 'admin')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('task_due_soon_notifications', 'admin')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <label
                                    className="text-xs font-medium text-muted-foreground"
                                    htmlFor="task_due_soon_warning_days"
                                >
                                    {t('notify_task_due_soon_warning_days', 'admin')}
                                </label>
                                <Input
                                    id="task_due_soon_warning_days"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={form.data.task_due_soon_warning_days}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        form.setData(
                                            'task_due_soon_warning_days',
                                            Number.isNaN(v) ? 0 : v,
                                        );
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('notify_task_due_soon_warning_days_hint', 'admin')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={form.processing}>
                            {t('settings_save', 'admin')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

