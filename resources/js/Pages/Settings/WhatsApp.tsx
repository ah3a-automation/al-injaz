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
import { Label } from '@/Components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { CheckCircle, Eye, EyeOff, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState, type FormEventHandler } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';

interface WhatsAppSettingsProps {
    settings: {
        evolution_api_url: string;
        evolution_api_instance: string;
        evolution_api_key: string;
    };
    hasApiKey: boolean;
    connection_ok: boolean;
    evolution_configured: boolean;
}

export default function WhatsApp({
    settings,
    hasApiKey,
    connection_ok: initialConnectionOk,
    evolution_configured: initialConfigured,
}: WhatsAppSettingsProps) {
    const { t } = useLocale();
    const [showKey, setShowKey] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [testLoading, setTestLoading] = useState(false);
    const [connectionOk, setConnectionOk] = useState(initialConnectionOk);
    const [configured, setConfigured] = useState(initialConfigured);

    const form = useForm({
        evolution_api_url: settings.evolution_api_url ?? '',
        evolution_api_instance: settings.evolution_api_instance ?? '',
        evolution_api_key: '',
    });

    useEffect(() => {
        setConnectionOk(initialConnectionOk);
        setConfigured(initialConfigured);
    }, [initialConnectionOk, initialConfigured]);

    const refreshStatus = async () => {
        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '';
            const res = await fetch(route('settings.whatsapp.status'), {
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken },
            });
            if (res.ok) {
                const data = (await res.json()) as { connected: boolean; configured: boolean };
                setConnectionOk(data.connected);
                setConfigured(data.configured);
            }
        } catch {
            /* ignore */
        }
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('settings.whatsapp.update'), { preserveScroll: true });
    };

    const handleTest = async () => {
        if (!testPhone.trim() || testLoading) return;
        setTestLoading(true);
        setTestResult(null);
        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '';
            const res = await fetch(route('settings.whatsapp.test'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: JSON.stringify({ test_phone: testPhone.trim() }),
            });
            const data = (await res.json()) as { success: boolean; message: string };
            setTestResult(data);
            if (data.success) {
                void refreshStatus();
            }
        } catch {
            setTestResult({ success: false, message: t('whatsapp_test_network_error', 'admin') });
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title={t('settings_section_whatsapp', 'admin')} />
            <div className="mx-auto max-w-2xl space-y-6" dir="auto">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-start">
                        {t('settings_section_whatsapp', 'admin')}
                    </h1>
                    <p className="mt-1 text-muted-foreground text-start">{t('settings_whatsapp_help', 'admin')}</p>
                </div>

                <div
                    className={cn(
                        'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm',
                        configured && connectionOk
                            ? 'border-green-200 bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-100'
                            : 'border-border bg-muted/40 text-muted-foreground'
                    )}
                    role="status"
                >
                    {configured && connectionOk ? (
                        <CheckCircle className="h-5 w-5 shrink-0 text-green-600" aria-hidden />
                    ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <span>
                        {configured && connectionOk
                            ? t('whatsapp_connection_ok', 'admin')
                            : configured
                              ? t('whatsapp_connection_unreachable', 'admin')
                              : t('whatsapp_connection_not_configured', 'admin')}
                    </span>
                    <Button type="button" variant="outline" size="sm" className="ms-auto" onClick={() => void refreshStatus()}>
                        {t('whatsapp_refresh_status', 'admin')}
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('settings_whatsapp_evolution', 'admin')}</CardTitle>
                            <CardDescription>{t('settings_whatsapp_evolution_help', 'admin')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="evolution_api_url">{t('settings_whatsapp_url', 'admin')}</Label>
                                <Input
                                    id="evolution_api_url"
                                    value={form.data.evolution_api_url}
                                    onChange={(e) => form.setData('evolution_api_url', e.target.value)}
                                    placeholder="https://evolution.example.com"
                                    autoComplete="url"
                                    className="text-start"
                                />
                                {form.errors.evolution_api_url && (
                                    <p className="text-sm text-destructive">{form.errors.evolution_api_url}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="evolution_api_instance">{t('settings_whatsapp_instance', 'admin')}</Label>
                                <Input
                                    id="evolution_api_instance"
                                    value={form.data.evolution_api_instance}
                                    onChange={(e) => form.setData('evolution_api_instance', e.target.value)}
                                    placeholder="default"
                                    className="text-start"
                                />
                                {form.errors.evolution_api_instance && (
                                    <p className="text-sm text-destructive">{form.errors.evolution_api_instance}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="evolution_api_key">{t('settings_whatsapp_api_key', 'admin')}</Label>
                                <div className="relative">
                                    <Input
                                        id="evolution_api_key"
                                        type={showKey ? 'text' : 'password'}
                                        value={form.data.evolution_api_key}
                                        onChange={(e) => form.setData('evolution_api_key', e.target.value)}
                                        placeholder={hasApiKey ? t('settings_password_keep', 'admin') : ''}
                                        className="text-start"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey((s) => !s)}
                                        className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label={showKey ? t('hide_password', 'admin') : t('show_password', 'admin')}
                                    >
                                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground text-start">{t('settings_whatsapp_key_hint', 'admin')}</p>
                            </div>
                            <Button type="submit" disabled={form.processing}>
                                {t('save', 'admin')}
                            </Button>
                        </CardContent>
                    </Card>
                </form>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('whatsapp_test_section', 'admin')}</CardTitle>
                        <CardDescription>{t('whatsapp_test_help', 'admin')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="test_phone">{t('whatsapp_test_phone', 'admin')}</Label>
                            <Input
                                id="test_phone"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                placeholder="+9665xxxxxxxx"
                                className="text-start"
                                inputMode="tel"
                            />
                        </div>
                        <Button type="button" variant="secondary" disabled={testLoading} onClick={() => void handleTest()}>
                            {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {t('whatsapp_send_test', 'admin')}
                        </Button>
                        {testResult && (
                            <p
                                className={cn(
                                    'text-sm',
                                    testResult.success ? 'text-green-700 dark:text-green-400' : 'text-destructive'
                                )}
                            >
                                {testResult.message}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
