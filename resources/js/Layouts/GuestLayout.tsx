import { usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';
import type { SharedPageProps } from '@/types';

export default function GuestLayout({ children }: PropsWithChildren) {
    const { dir, locale } = usePage().props as SharedPageProps;
    const fontClass = dir === 'rtl' ? 'font-ar' : 'font-en';

    return (
        <div
            className={cn(
                'flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4',
                fontClass
            )}
            dir={dir}
            lang={locale}
        >
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
                {children}
            </div>
        </div>
    );
}
