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
import { Checkbox } from '@/Components/ui/checkbox';
import { getRoleLabel } from '@/utils/users';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useState, type FormEventHandler } from 'react';
import { useLocale } from '@/hooks/useLocale';

interface RoleOption {
    id: number;
    name: string;
    isProtected?: boolean;
    isHighPrivilege?: boolean;
}

interface CreateProps {
    roles: RoleOption[];
}

interface UserCreateForm {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
    department: string;
    phone: string;
    status: string;
    must_change_password: boolean;
}

function validatePassword(password: string): string | null {
    if (password.length < 8) return 'users_password_min'; // resolved via translations
    if (!/[a-zA-Z]/.test(password)) return 'users_password_letter';
    if (!/\d/.test(password)) return 'users_password_number';
    return null;
}

export default function Create({ roles }: CreateProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const { t } = useLocale();

    const form = useForm<UserCreateForm>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: roles[0]?.name ?? '',
        department: '',
        phone: '',
        status: 'active',
        must_change_password: true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const pwErrorKey = validatePassword(form.data.password);
        if (pwErrorKey) {
            form.setError('password', t(pwErrorKey, 'admin'));
            return;
        }
        if (form.data.password !== form.data.password_confirmation) {
            form.setError(
                'password_confirmation',
                t('users_password_mismatch', 'admin')
            );
            return;
        }
        form.post(route('settings.users.store'));
    };

    return (
        <AppLayout>
            <Head title={t('users_add', 'admin')} />
            <div className="mx-auto max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('users_add', 'admin')}
                    </h1>
                    <Button variant="outline" asChild>
                        <Link href={route('settings.users.index')}>
                            {t('action_cancel', 'admin')}
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('users_title', 'admin')}</CardTitle>
                        <CardDescription>
                            {t('users_add', 'admin')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        {t('users_field_name', 'admin')} *
                                    </Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        required
                                        aria-invalid={!!form.errors.name}
                                    />
                                    {form.errors.name && (
                                        <p className="text-sm text-destructive">{form.errors.name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">
                                        {t('users_field_email', 'admin')} *
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                        required
                                        aria-invalid={!!form.errors.email}
                                    />
                                    {form.errors.email && (
                                        <p className="text-sm text-destructive">{form.errors.email}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="password">
                                        {t('users_field_password', 'admin')} *
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={form.data.password}
                                            onChange={(e) => form.setData('password', e.target.value)}
                                            required
                                            aria-invalid={!!form.errors.password}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((s) => !s)}
                                            className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            aria-label={
                                                showPassword
                                                    ? t('hide_password', 'admin')
                                                    : t('show_password', 'admin')
                                            }
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {form.errors.password && (
                                        <p className="text-sm text-destructive">{form.errors.password}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation">
                                        {t('users_field_password_confirm', 'admin')} *
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password_confirmation"
                                            type={showPasswordConfirmation ? 'text' : 'password'}
                                            value={form.data.password_confirmation}
                                            onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                            required
                                            aria-invalid={!!form.errors.password_confirmation}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswordConfirmation((s) => !s)}
                                            className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            aria-label={
                                                showPasswordConfirmation
                                                    ? t('hide_password', 'admin')
                                                    : t('show_password', 'admin')
                                            }
                                        >
                                            {showPasswordConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {form.errors.password_confirmation && (
                                        <p className="text-sm text-destructive">{form.errors.password_confirmation}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="role">
                                        {t('users_field_role', 'admin')} *
                                    </Label>
                                    <select
                                        id="role"
                                        value={form.data.role}
                                        onChange={(e) => form.setData('role', e.target.value)}
                                        required
                                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.name}>
                                                {getRoleLabel(r.name)}
                                            </option>
                                        ))}
                                    </select>
                                    {roles.some((r) => r.name === form.data.role && r.isHighPrivilege) && (
                                        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                            <ShieldAlert className="h-4 w-4 shrink-0" />
                                            {t('high_privilege_assignment_warning', 'admin')}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="department">
                                        {t('department', 'admin')}
                                    </Label>
                                    <Input
                                        id="department"
                                        value={form.data.department}
                                        onChange={(e) => form.setData('department', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">
                                    {t('phone', 'admin')}
                                </Label>
                                <Input
                                    id="phone"
                                    value={form.data.phone}
                                    onChange={(e) => form.setData('phone', e.target.value)}
                                    placeholder="+966XXXXXXXXX"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="status">
                                        {t('users_col_status', 'admin')}
                                    </Label>
                                    <select
                                        id="status"
                                        value={form.data.status}
                                        onChange={(e) => form.setData('status', e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="active">
                                            {t('users_status_active', 'admin')}
                                        </option>
                                        <option value="inactive">
                                            {t('users_status_inactive', 'admin')}
                                        </option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 pt-8">
                                    <Checkbox
                                        id="must_change_password"
                                        checked={form.data.must_change_password}
                                        onCheckedChange={(checked) =>
                                            form.setData('must_change_password', checked === true)
                                        }
                                    />
                                    <Label htmlFor="must_change_password" className="cursor-pointer text-sm font-normal">
                                        {t('users_require_change_on_first', 'admin')}
                                    </Label>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="submit" disabled={form.processing}>
                                    {t('users_add', 'admin')}
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={route('settings.users.index')}>
                                        {t('action_cancel', 'admin')}
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
