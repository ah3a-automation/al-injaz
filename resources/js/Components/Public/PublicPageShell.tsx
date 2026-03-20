import { type PropsWithChildren } from 'react';
import { usePage } from '@inertiajs/react';
import { PublicBrandingBlock } from '@/Components/Public/PublicBrandingBlock';
import type { SharedPageProps } from '@/types';
import { cn } from '@/lib/utils';

export interface PublicPageShellProps {
    /** Optional title below branding */
    title?: string;
    /** Optional subtitle/instruction */
    subtitle?: string;
    /** Branding size */
    brandingSize?: 'sm' | 'default';
    className?: string;
}

/**
 * Centered public page shell: branding block, optional title/subtitle, then children.
 * Use for logout, simple success, etc. when a full layout is not used.
 * Sets dir and lang from shared props for RTL/LTR.
 */
export function PublicPageShell({
    title,
    subtitle,
    brandingSize = 'default',
    className = '',
    children,
}: PropsWithChildren<PublicPageShellProps>) {
    const { dir, locale } = usePage().props as SharedPageProps;
    const fontClass = dir === 'rtl' ? 'font-ar' : 'font-en';

    return (
        <div
            className={cn('flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4', fontClass, className)}
            dir={dir}
            lang={locale}
        >
            <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
                <PublicBrandingBlock size={brandingSize} className="mb-2" />
                {title && (
                    <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground">
                        {title}
                    </h1>
                )}
                {subtitle && (
                    <p className="text-center text-muted-foreground">{subtitle}</p>
                )}
                {children}
            </div>
        </div>
    );
}
