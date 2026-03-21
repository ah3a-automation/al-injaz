import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/Textarea';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import { AlertTriangle } from 'lucide-react';

type TemplateRow = {
    id: number;
    event_code: string;
    name: string;
    body_text: string;
    whatsapp_body: string | null;
    whatsapp_enabled: boolean;
    email_enabled: boolean;
    inapp_enabled: boolean;
};

interface Props {
    templates: TemplateRow[];
    evolution_configured: boolean;
}

function RowEditor({ row, evolutionConfigured }: { row: TemplateRow; evolutionConfigured: boolean }) {
    const { t } = useLocale();
    const form = useForm({
        whatsapp_enabled: row.whatsapp_enabled,
        whatsapp_body: row.whatsapp_body ?? '',
    });

    const save = () => {
        form.put(route('settings.notification-templates.whatsapp-update', { event_code: row.event_code }), {
            preserveScroll: true,
        });
    };

    return (
        <tr className="border-b align-top">
            <td className="py-3 pe-4">
                <code className="rounded bg-muted px-2 py-0.5 text-xs">{row.event_code}</code>
                <p className="mt-1 font-medium text-sm">{row.name}</p>
            </td>
            <td className="py-3 pe-4">
                {evolutionConfigured ? (
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={`wa-${row.id}`}
                            checked={form.data.whatsapp_enabled}
                            onCheckedChange={(checked: boolean) => {
                                form.setData('whatsapp_enabled', checked);
                            }}
                            aria-label={t('notification_templates_whatsapp', 'admin')}
                        />
                        <Label htmlFor={`wa-${row.id}`} className="text-sm font-normal cursor-pointer">
                            {t('notification_templates_whatsapp', 'admin')}
                        </Label>
                    </div>
                ) : (
                    <Badge variant={form.data.whatsapp_enabled ? 'default' : 'secondary'}>
                        {form.data.whatsapp_enabled
                            ? t('notification_templates_whatsapp_on', 'admin')
                            : t('notification_templates_whatsapp_off', 'admin')}
                    </Badge>
                )}
            </td>
            <td className="py-3 pe-4 min-w-[240px]">
                <Textarea
                    value={form.data.whatsapp_body}
                    onChange={(e) => form.setData('whatsapp_body', e.target.value)}
                    disabled={!evolutionConfigured}
                    rows={4}
                    className="text-sm font-mono"
                    placeholder={row.body_text}
                />
                <p className="mt-1 text-xs text-muted-foreground">{t('notification_templates_whatsapp_hint', 'admin')}</p>
            </td>
            <td className="py-3 pe-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('settings.notification-templates.edit', row.id)}>{t('users_edit', 'admin')}</Link>
                </Button>
            </td>
            <td className="py-3">
                <Button
                    type="button"
                    size="sm"
                    disabled={form.processing || !evolutionConfigured}
                    onClick={() => save()}
                >
                    {t('save', 'admin')}
                </Button>
            </td>
        </tr>
    );
}

export default function Index({ templates, evolution_configured }: Props) {
    const { t } = useLocale();

    return (
        <AppLayout>
            <Head title={t('notification_templates_title', 'admin')} />
            <div className="mx-auto max-w-6xl space-y-6" dir="auto">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-start">
                        {t('notification_templates_title', 'admin')}
                    </h1>
                    <p className="mt-1 text-muted-foreground text-start">{t('notification_templates_desc', 'admin')}</p>
                </div>

                {!evolution_configured && (
                    <div
                        className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                        role="alert"
                    >
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
                        <div>
                            <p className="font-medium">{t('notification_templates_whatsapp_banner_title', 'admin')}</p>
                            <p className="mt-1 text-muted-foreground dark:text-amber-200/90">
                                {t('notification_templates_whatsapp_banner_body', 'admin')}
                            </p>
                            <Button
                                type="button"
                                variant="link"
                                className="mt-2 h-auto p-0 text-primary"
                                onClick={() => router.visit(route('settings.whatsapp'))}
                            >
                                {t('notification_templates_go_whatsapp_settings', 'admin')}
                            </Button>
                        </div>
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>{t('notification_templates_table', 'admin')}</CardTitle>
                        <CardDescription>{t('notification_templates_table_help', 'admin')}</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full min-w-[880px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b text-start text-xs text-muted-foreground">
                                    <th className="py-2 pe-4 font-medium">{t('notification_templates_col_event', 'admin')}</th>
                                    <th className="py-2 pe-4 font-medium">{t('notification_templates_col_whatsapp', 'admin')}</th>
                                    <th className="py-2 pe-4 font-medium">{t('notification_templates_col_body', 'admin')}</th>
                                    <th className="py-2 font-medium">{t('notification_configuration_col_actions', 'admin')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map((row) => (
                                    <RowEditor key={row.id} row={row} evolutionConfigured={evolution_configured} />
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
