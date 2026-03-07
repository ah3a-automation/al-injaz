import AppLayout from '@/Layouts/AppLayout';
import { Head, usePage } from '@inertiajs/react';
import type { SharedPageProps } from '@/types';

export default function Dashboard() {
    const { auth } = usePage().props as SharedPageProps;
    const userName = auth.user?.name ?? 'User';

    return (
        <AppLayout>
            <Head title="Dashboard" />

            <div className="space-y-6">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Welcome, {userName}. This is a placeholder — no business
                    data yet.
                </p>
            </div>
        </AppLayout>
    );
}
