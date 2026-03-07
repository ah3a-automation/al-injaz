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
import type { UserRecord } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEventHandler } from 'react';

interface EditProps {
    user: UserRecord;
    roles: Array<{ id: number; name: string }>;
}

interface UserEditForm {
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

export default function Edit({ user, roles }: EditProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

    const form = useForm<UserEditForm>({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        role: user.roles[0]?.name ?? '',
        department: user.department ?? '',
        phone: user.phone ?? '',
        status: user.status,
        must_change_password: user.must_change_password,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (form.data.password) {
            if (form.data.password.length < 8) {
                form.setError('password', 'Password must be at least 8 characters.');
                return;
            }
            if (!/[a-zA-Z]/.test(form.data.password)) {
                form.setError('password', 'Password must contain at least one letter.');
                return;
            }
            if (!/\d/.test(form.data.password)) {
                form.setError('password', 'Password must contain at least one number.');
                return;
            }
            if (form.data.password !== form.data.password_confirmation) {
                form.setError('password_confirmation', 'Passwords do not match.');
                return;
            }
        }
        form.patch(route('users.update', user.id));
    };

    return (
        <AppLayout>
            <Head title={`Edit ${user.name}`} />
            <div className="mx-auto max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Edit User</h1>
                    <Button variant="outline" asChild>
                        <Link href={route('users.show', user.id)}>Cancel</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>User details</CardTitle>
                        <CardDescription>Update user information.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
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
                                    <Label htmlFor="email">Email *</Label>
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
                                    <Label htmlFor="password">New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={form.data.password}
                                            onChange={(e) => form.setData('password', e.target.value)}
                                            aria-invalid={!!form.errors.password}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((s) => !s)}
                                            className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Leave blank to keep current password.</p>
                                    {form.errors.password && (
                                        <p className="text-sm text-destructive">{form.errors.password}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation">Confirm New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password_confirmation"
                                            type={showPasswordConfirmation ? 'text' : 'password'}
                                            value={form.data.password_confirmation}
                                            onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                            aria-invalid={!!form.errors.password_confirmation}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswordConfirmation((s) => !s)}
                                            className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            aria-label={showPasswordConfirmation ? 'Hide password' : 'Show password'}
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
                                    <Label htmlFor="role">Role *</Label>
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
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Input
                                        id="department"
                                        value={form.data.department}
                                        onChange={(e) => form.setData('department', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={form.data.phone}
                                    onChange={(e) => form.setData('phone', e.target.value)}
                                    placeholder="+966XXXXXXXXX"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status *</Label>
                                    <select
                                        id="status"
                                        value={form.data.status}
                                        onChange={(e) => form.setData('status', e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="suspended">Suspended</option>
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
                                        Require password change on next login
                                    </Label>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="submit" disabled={form.processing}>
                                    Update User
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={route('users.show', user.id)}>Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
