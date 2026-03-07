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
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEventHandler } from 'react';

interface ChangePasswordForm {
    password: string;
    password_confirmation: string;
}

function validatePassword(password: string): string | null {
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter.';
    if (!/\d/.test(password)) return 'Password must contain at least one number.';
    return null;
}

export default function ChangePassword() {
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

    const form = useForm<ChangePasswordForm>({
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const pwError = validatePassword(form.data.password);
        if (pwError) {
            form.setError('password', pwError);
            return;
        }
        if (form.data.password !== form.data.password_confirmation) {
            form.setError('password_confirmation', 'Passwords do not match.');
            return;
        }
        form.post(route('password.update.forced'));
    };

    return (
        <GuestLayout>
            <Head title="Set New Password" />
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Set New Password</CardTitle>
                    <CardDescription>
                        You must set a new password before you can continue.
                    </CardDescription>
                    <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                        Your administrator has required you to change your password.
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password *</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    required
                                    autoFocus
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
                            {form.errors.password && (
                                <p className="text-sm text-destructive">{form.errors.password}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password_confirmation">Confirm Password *</Label>
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
                                    aria-label={showPasswordConfirmation ? 'Hide password' : 'Show password'}
                                >
                                    {showPasswordConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {form.errors.password_confirmation && (
                                <p className="text-sm text-destructive">{form.errors.password_confirmation}</p>
                            )}
                        </div>
                        <Button type="submit" className="w-full" disabled={form.processing}>
                            Set Password & Continue
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
