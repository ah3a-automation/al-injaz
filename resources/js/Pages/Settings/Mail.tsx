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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Head, useForm } from '@inertiajs/react';
import { CheckCircle, Eye, EyeOff, Loader2, XCircle } from 'lucide-react';
import { useState, type FormEventHandler } from 'react';
import type { MailSettings } from '@/types';

interface MailSettingsProps {
    settings: MailSettings;
    hasPassword: boolean;
}

interface MailSettingsForm {
    mail_host: string;
    mail_port: string;
    mail_username: string;
    mail_password: string;
    mail_encryption: string;
    mail_from_name: string;
    mail_from_email: string;
}

function validateForm(data: MailSettingsForm): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!data.mail_host?.trim()) errors.mail_host = 'SMTP host is required.';
    if (!data.mail_port?.trim()) errors.mail_port = 'Port is required.';
    const port = parseInt(data.mail_port, 10);
    if (data.mail_port && (Number.isNaN(port) || port < 1 || port > 65535)) {
        errors.mail_port = 'Port must be between 1 and 65535.';
    }
    if (!data.mail_from_name?.trim()) errors.mail_from_name = 'From name is required.';
    if (!data.mail_from_email?.trim()) errors.mail_from_email = 'From email is required.';
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.mail_from_email && !emailRe.test(data.mail_from_email)) {
        errors.mail_from_email = 'Please enter a valid email address.';
    }
    return errors;
}

export default function Mail({ settings, hasPassword }: MailSettingsProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [testEmail, setTestEmail] = useState<string>('');
    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const [testLoading, setTestLoading] = useState<boolean>(false);

    const form = useForm<MailSettingsForm>({
        mail_host: settings.mail_host ?? '',
        mail_port: settings.mail_port ?? '587',
        mail_username: settings.mail_username ?? '',
        mail_password: '',
        mail_encryption: settings.mail_encryption ?? 'tls',
        mail_from_name: settings.mail_from_name ?? 'Al Injaz',
        mail_from_email: settings.mail_from_email ?? '',
    });

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        const errors = validateForm(form.data);
        const hasErrors = Object.keys(errors).length > 0;
        if (hasErrors) {
            Object.entries(errors).forEach(([key, value]) => {
                form.setError(key as keyof MailSettingsForm, value);
            });
            return;
        }
        form.post(route('settings.mail.update'));
    };

    const handleTestEmail = async () => {
        if (!testEmail.trim() || testLoading) return;
        setTestLoading(true);
        setTestResult(null);
        try {
            const csrfToken = (
                document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null
            )?.content ?? '';
            const res = await fetch(route('settings.mail.test'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: JSON.stringify({ test_email: testEmail.trim() }),
            });
            const contentType = res.headers.get('content-type') ?? '';
            if (contentType.includes('application/json')) {
                const data = (await res.json()) as { success: boolean; message: string };
                setTestResult(data);
            } else {
                setTestResult({
                    success: false,
                    message: 'Unexpected server response. Check logs.',
                });
            }
        } catch {
            setTestResult({
                success: false,
                message: 'Network error. Could not reach server.',
            });
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Mail Settings" />
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Mail Settings</h1>
                    <p className="text-muted-foreground mt-1">
                        Configure SMTP email delivery for the system
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>SMTP Configuration</CardTitle>
                            <CardDescription>Server and connection settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="mail_host">SMTP Host</Label>
                                <Input
                                    id="mail_host"
                                    value={form.data.mail_host}
                                    onChange={(e) => form.setData('mail_host', e.target.value)}
                                    placeholder="smtp.gmail.com"
                                    aria-invalid={!!form.errors.mail_host}
                                />
                                {form.errors.mail_host && (
                                    <p className="text-sm text-destructive">{form.errors.mail_host}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mail_port">Port</Label>
                                <Input
                                    id="mail_port"
                                    type="number"
                                    min={1}
                                    max={65535}
                                    value={form.data.mail_port}
                                    onChange={(e) => form.setData('mail_port', e.target.value)}
                                    placeholder="587"
                                    aria-invalid={!!form.errors.mail_port}
                                />
                                {form.errors.mail_port && (
                                    <p className="text-sm text-destructive">{form.errors.mail_port}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mail_encryption">Encryption</Label>
                                <Select
                                    value={form.data.mail_encryption}
                                    onValueChange={(v) => form.setData('mail_encryption', v)}
                                >
                                    <SelectTrigger id="mail_encryption">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tls">TLS (Recommended)</SelectItem>
                                        <SelectItem value="ssl">SSL</SelectItem>
                                        <SelectItem value="none">None</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Authentication</CardTitle>
                            <CardDescription>SMTP credentials</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="mail_username">Username / Email</Label>
                                <Input
                                    id="mail_username"
                                    type="text"
                                    value={form.data.mail_username}
                                    onChange={(e) => form.setData('mail_username', e.target.value)}
                                    aria-invalid={!!form.errors.mail_username}
                                />
                                {form.errors.mail_username && (
                                    <p className="text-sm text-destructive">
                                        {form.errors.mail_username}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mail_password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="mail_password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.data.mail_password}
                                        onChange={(e) => form.setData('mail_password', e.target.value)}
                                        placeholder={
                                            hasPassword
                                                ? 'Leave blank to keep current password'
                                                : 'Enter password'
                                        }
                                        aria-invalid={!!form.errors.mail_password}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((s) => !s)}
                                        className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Leave blank to keep the existing password
                                </p>
                                {form.errors.mail_password && (
                                    <p className="text-sm text-destructive">
                                        {form.errors.mail_password}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>From Address</CardTitle>
                            <CardDescription>Default sender for outgoing emails</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="mail_from_name">From Name</Label>
                                <Input
                                    id="mail_from_name"
                                    value={form.data.mail_from_name}
                                    onChange={(e) => form.setData('mail_from_name', e.target.value)}
                                    placeholder="Al Injaz"
                                    aria-invalid={!!form.errors.mail_from_name}
                                />
                                {form.errors.mail_from_name && (
                                    <p className="text-sm text-destructive">
                                        {form.errors.mail_from_name}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mail_from_email">From Email Address</Label>
                                <Input
                                    id="mail_from_email"
                                    type="email"
                                    value={form.data.mail_from_email}
                                    onChange={(e) => form.setData('mail_from_email', e.target.value)}
                                    aria-invalid={!!form.errors.mail_from_email}
                                />
                                {form.errors.mail_from_email && (
                                    <p className="text-sm text-destructive">
                                        {form.errors.mail_from_email}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Send Test Email</CardTitle>
                            <CardDescription>
                                Verify configuration by sending a test email
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-end gap-2">
                                <div className="min-w-[200px] flex-1 space-y-2">
                                    <Label htmlFor="test_email" className="sr-only">
                                        Test email address
                                    </Label>
                                    <Input
                                        id="test_email"
                                        type="email"
                                        placeholder="recipient@example.com"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                        disabled={testLoading}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleTestEmail}
                                    disabled={!testEmail.trim() || testLoading}
                                >
                                    {testLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending…
                                        </>
                                    ) : (
                                        'Send Test Email'
                                    )}
                                </Button>
                            </div>
                            {testResult && (
                                <div
                                    className={
                                        testResult.success
                                            ? 'rounded-md border border-green-200 bg-green-50 p-3'
                                            : 'rounded-md border border-red-200 bg-red-50 p-3'
                                    }
                                >
                                    {testResult.success ? (
                                        <div className="flex items-center gap-2 text-green-800">
                                            <CheckCircle className="h-4 w-4 shrink-0" />
                                            <span>{testResult.message}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-2 text-red-800">
                                            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span>{testResult.message}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Save Settings
                                </>
                            ) : (
                                'Save Settings'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
