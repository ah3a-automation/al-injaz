import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
import { Textarea } from '@/Components/ui/Textarea';
import type { PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import { Loader2, RefreshCw, Send } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

type TemplateForm = {
    id: number;
    event_code: string;
    name: string;
    subject: string;
    body_text: string;
    body_html: string | null;
    email_enabled: boolean;
    inapp_enabled: boolean;
    whatsapp_enabled: boolean;
    whatsapp_body: string | null;
};

interface EditPageProps extends Record<string, unknown> {
    template: TemplateForm;
    evolution_configured: boolean;
}

const PLACEHOLDER_HINTS: Record<string, string> = {
    'supplier.registered': '{{supplier_name}}, {{supplier_code}}',
    'supplier.approved': '{{supplier_name}}, {{set_password_url}}',
    'supplier.rejected': '{{supplier_name}}, {{rejection_reason}}',
    'supplier.more_info_requested': '{{supplier_name}}, {{more_info_notes}}, {{complete_profile_url}}',
    'task.assigned': '{{task_title}}, {{project_name}}, {{assigned_by}}',
    'project.created': '{{project_name}}, {{created_by}}',
    'user.created': '{{user_name}}, {{set_password_url}}',
};

export default function Edit({ template, evolution_configured, flash }: PageProps<EditPageProps>) {
    const { t } = useLocale();
    const flashSuccess = flash.success;
    const [previewKey, setPreviewKey] = useState(0);
    const [testLoading, setTestLoading] = useState(false);
    const [testMessage, setTestMessage] = useState<string | null>(null);

    const form = useForm({
        subject: template.subject ?? '',
        body_text: template.body_text ?? '',
        body_html: template.body_html ?? '',
        email_enabled: template.email_enabled,
        inapp_enabled: template.inapp_enabled,
        whatsapp_enabled: template.whatsapp_enabled,
        whatsapp_body: template.whatsapp_body ?? '',
    });

    const placeholderHint = useMemo(
        () => PLACEHOLDER_HINTS[template.event_code] ?? '{{variable_name}}',
        [template.event_code]
    );

    const previewUrl = useMemo(
        () => `${route('settings.notification-templates.preview', template.id)}?k=${previewKey}`,
        [template.id, previewKey]
    );

    const refreshPreview = useCallback(() => {
        setPreviewKey((k) => k + 1);
    }, []);

    const sendTest = async () => {
        setTestLoading(true);
        setTestMessage(null);
        try {
            const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '';
            const res = await fetch(route('settings.notification-templates.test', template.id), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            const data = (await res.json()) as { message?: string };
            if (!res.ok) {
                setTestMessage(data.message ?? t('notification_template_test_failed', 'admin'));
            } else {
                setTestMessage(data.message ?? t('notification_template_test_sent', 'admin'));
            }
        } catch {
            setTestMessage(t('notification_template_test_failed', 'admin'));
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title={`${template.name} — ${t('notification_templates_title', 'admin')}`} />
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6" dir="auto">
                <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
                    <ol className="flex flex-wrap items-center gap-2">
                        <li>
                            <Link href={route('settings.mail')} className="hover:text-foreground">
                                {t('settings_title', 'admin')}
                            </Link>
                        </li>
                        <li aria-hidden>/</li>
                        <li>
                            <Link href={route('settings.notification-templates.index')} className="hover:text-foreground">
                                {t('notification_templates_title', 'admin')}
                            </Link>
                        </li>
                        <li aria-hidden>/</li>
                        <li className="text-foreground font-medium">{template.name}</li>
                    </ol>
                </nav>

                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-start">{template.name}</h1>
                    <p className="mt-1 text-muted-foreground text-start">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{template.event_code}</code>
                    </p>
                </div>

                {flashSuccess && (
                    <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm" role="status">
                        {flashSuccess}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('notification_template_editor_title', 'admin')}</CardTitle>
                                <CardDescription>{t('notification_template_editor_help', 'admin')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        form.put(route('settings.notification-templates.update', template.id));
                                    }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="subject">{t('notification_template_subject', 'admin')}</Label>
                                        <Input
                                            id="subject"
                                            value={form.data.subject}
                                            onChange={(e) => form.setData('subject', e.target.value)}
                                            className="text-start"
                                            dir="auto"
                                            required
                                        />
                                        {form.errors.subject && (
                                            <p className="text-sm text-destructive">{form.errors.subject}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="body_html">{t('notification_template_body_html', 'admin')}</Label>
                                        <Textarea
                                            id="body_html"
                                            value={form.data.body_html}
                                            onChange={(e) => form.setData('body_html', e.target.value)}
                                            rows={10}
                                            className="font-mono text-sm text-start"
                                            dir="ltr"
                                            placeholder="<p>...</p>"
                                        />
                                        <p className="text-xs text-muted-foreground text-start">
                                            {t('notification_template_placeholders', 'admin')}: {placeholderHint}
                                        </p>
                                        {form.errors.body_html && (
                                            <p className="text-sm text-destructive">{form.errors.body_html}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="body_text">{t('notification_template_body_text', 'admin')}</Label>
                                        <Textarea
                                            id="body_text"
                                            value={form.data.body_text}
                                            onChange={(e) => form.setData('body_text', e.target.value)}
                                            rows={5}
                                            className="text-sm text-start"
                                            dir="auto"
                                            required
                                        />
                                        {form.errors.body_text && (
                                            <p className="text-sm text-destructive">{form.errors.body_text}</p>
                                        )}
                                    </div>

                                    <div className="space-y-4 rounded-lg border border-border p-4">
                                        <p className="text-sm font-medium">{t('notification_template_channels', 'admin')}</p>
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    id="email_enabled"
                                                    checked={form.data.email_enabled}
                                                    onCheckedChange={(c) => form.setData('email_enabled', Boolean(c))}
                                                />
                                                <Label htmlFor="email_enabled" className="font-normal cursor-pointer">
                                                    {t('notification_template_email', 'admin')}
                                                </Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    id="inapp_enabled"
                                                    checked={form.data.inapp_enabled}
                                                    onCheckedChange={(c) => form.setData('inapp_enabled', Boolean(c))}
                                                />
                                                <Label htmlFor="inapp_enabled" className="font-normal cursor-pointer">
                                                    {t('notification_template_inapp', 'admin')}
                                                </Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    id="whatsapp_enabled"
                                                    checked={form.data.whatsapp_enabled}
                                                    onCheckedChange={(c) => form.setData('whatsapp_enabled', Boolean(c))}
                                                    disabled={!evolution_configured}
                                                />
                                                <Label htmlFor="whatsapp_enabled" className="font-normal cursor-pointer">
                                                    {t('notification_templates_whatsapp', 'admin')}
                                                </Label>
                                            </div>
                                        </div>
                                    </div>

                                    {form.data.whatsapp_enabled && evolution_configured && (
                                        <div className="space-y-2">
                                            <Label htmlFor="whatsapp_body">{t('notification_templates_col_body', 'admin')}</Label>
                                            <Textarea
                                                id="whatsapp_body"
                                                value={form.data.whatsapp_body}
                                                onChange={(e) => form.setData('whatsapp_body', e.target.value)}
                                                rows={4}
                                                className="text-sm text-start"
                                                dir="auto"
                                            />
                                        </div>
                                    )}

                                    {form.errors.whatsapp_enabled && (
                                        <p className="text-sm text-destructive">{form.errors.whatsapp_enabled}</p>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        <Button type="submit" disabled={form.processing}>
                                            {form.processing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                            {t('save', 'admin')}
                                        </Button>
                                        <Button type="button" variant="outline" asChild>
                                            <Link href={route('settings.notification-templates.index')}>
                                                {t('action_back', 'admin')}
                                            </Link>
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Card className="flex h-full min-h-[480px] flex-col">
                            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                                <div>
                                    <CardTitle>{t('notification_template_preview_title', 'admin')}</CardTitle>
                                    <CardDescription>{t('notification_template_preview_help', 'admin')}</CardDescription>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={refreshPreview}>
                                        <RefreshCw className="me-2 h-4 w-4" aria-hidden />
                                        {t('notification_template_preview_refresh', 'admin')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={sendTest}
                                        disabled={testLoading}
                                    >
                                        {testLoading ? (
                                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="me-2 h-4 w-4" aria-hidden />
                                        )}
                                        {t('notification_template_send_test', 'admin')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-0">
                                {testMessage && (
                                    <p className="mb-3 text-sm text-muted-foreground" role="status">
                                        {testMessage}
                                    </p>
                                )}
                                <iframe
                                    key={previewKey}
                                    title={t('notification_template_preview_title', 'admin')}
                                    src={previewUrl}
                                    className="h-[min(70vh,640px)] w-full rounded-md border border-border bg-white"
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
