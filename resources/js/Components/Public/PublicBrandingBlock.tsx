import { usePage } from '@inertiajs/react';
import type { SharedPageProps } from '@/types';

export interface PublicBrandingBlockProps {
    /** Override logo URL (default: company.logo_light ?? company.logo_dark) */
    logoUrl?: string | null;
    /** Override display name (default: company.display_name) */
    displayName?: string;
    /** Size: 'sm' | 'default' */
    size?: 'sm' | 'default';
    className?: string;
}

/**
 * Shared branding block for public/supplier-facing pages.
 * Uses logo_light first, fallback logo_dark, fallback display_name as text.
 */
export function PublicBrandingBlock({
    logoUrl: logoUrlProp,
    displayName: displayNameProp,
    size = 'default',
    className = '',
}: PublicBrandingBlockProps) {
    const { company } = usePage().props as SharedPageProps;
    const logoUrl = logoUrlProp ?? company?.logo_light ?? company?.logo_dark ?? null;
    const displayName = displayNameProp ?? company?.display_name ?? '';

    if (!logoUrl && !displayName) return null;

    const logoHeight = size === 'sm' ? 'h-10' : 'h-12';
    const textSize = size === 'sm' ? 'text-base' : 'text-lg';

    return (
        <div
            className={`flex flex-col items-center justify-center gap-2 text-center ${className}`}
            aria-hidden
        >
            {logoUrl && (
                <img
                    src={logoUrl}
                    alt={displayName}
                    className={`${logoHeight} w-auto object-contain`}
                />
            )}
            {!logoUrl && displayName && (
                <span className={`font-semibold text-foreground ${textSize}`}>
                    {displayName}
                </span>
            )}
        </div>
    );
}
