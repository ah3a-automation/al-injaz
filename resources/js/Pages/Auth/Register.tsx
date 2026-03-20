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
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler } from 'react';
import type { SharedPageProps } from '@/types';

export default function Register() {
    const { company } = usePage().props as SharedPageProps;
    const logoUrl = company?.logo_light ?? company?.logo_dark ?? null;
    const displayName = company?.display_name ?? '';

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            {(logoUrl || displayName) && (
                <div className="mx-auto mb-6 flex flex-col items-center gap-2">
                    {logoUrl && (
                        <img
                            src={logoUrl}
                            alt={displayName}
                            className="h-12 w-auto object-contain"
                        />
                    )}
                    {!logoUrl && displayName && (
                        <span className="text-lg font-semibold text-foreground">{displayName}</span>
                    )}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Register</CardTitle>
                    <CardDescription>
                        Create an account to get started.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                name="name"
                                value={data.name}
                                autoComplete="name"
                                autoFocus
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                required
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                                required
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                autoComplete="new-password"
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                required
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password_confirmation">
                                Confirm Password
                            </Label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                autoComplete="new-password"
                                onChange={(e) =>
                                    setData(
                                        'password_confirmation',
                                        e.target.value
                                    )
                                }
                                required
                            />
                            {errors.password_confirmation && (
                                <p className="text-sm text-destructive">
                                    {errors.password_confirmation}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <Link
                                href={route('login')}
                                className="text-sm text-muted-foreground underline hover:text-foreground"
                            >
                                Already registered?
                            </Link>
                            <Button type="submit" disabled={processing}>
                                Register
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
