import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { cn } from '@/lib/utils';
import { useLocale } from '@/hooks/useLocale';

/** Normalize URL to path without query or trailing slash for comparison. */
function normalizePath(url: string): string {
    return (url ?? '').split('?')[0].replace(/\/+$/, '') || '/';
}

/**
 * Safe active-route detection. Uses Ziggy when available, else pathname comparison.
 * Never throws; returns false if Ziggy is missing or href/pageUrl are invalid.
 */
function isActiveRoute(
    routeName: string | undefined,
    href: string | undefined,
    pageUrl: string
): boolean {
    const currentPath = normalizePath(pageUrl);
    const hrefPath =
        typeof href === 'string'
            ? href.replace(/^https?:\/\/[^/]+/, '').split('?')[0].replace(/\/+$/, '') || '/'
            : '';

    if (typeof routeName === 'string' && routeName.length > 0) {
        try {
            const routeFn = (globalThis as unknown as { route?: () => { current?: (n: string) => boolean } })
                .route;
            if (typeof routeFn !== 'function') return pathnameMatch(currentPath, hrefPath);
            const r = routeFn();
            if (!r || typeof r.current !== 'function') return pathnameMatch(currentPath, hrefPath);
            const wildcard = `${routeName}*`;
            if (r.current(wildcard) || r.current(routeName)) return true;
        } catch {
            // fallback to pathname
        }
    }

    return pathnameMatch(currentPath, hrefPath);
}

function pathnameMatch(currentPath: string, hrefPath: string): boolean {
    return currentPath === hrefPath || (hrefPath !== '/' && currentPath.startsWith(hrefPath + '/'));
}

interface SidebarItemProps {
    label: string;
    labelKey?: string;
    icon: LucideIcon;
    href: string;
    routeName?: string;
}

export function SidebarItem({ label, labelKey, icon: Icon, href, routeName }: SidebarItemProps) {
    const { collapsed } = useSidebar();
    const pageUrl = usePage().url ?? '';
    const active = isActiveRoute(routeName, href, pageUrl);
    const { t } = useLocale();

    const displayLabel = label;

    return (
        <Link
            href={href}
            className={cn(
                'flex items-center gap-3 rounded px-3 py-2 transition-colors border-s-2 theme-sidebar-text',
                active
                    ? 'brand-accent-text brand-accent-border bg-white/10 font-medium'
                    : 'border-transparent opacity-85 hover:bg-white/10'
            )}
            title={collapsed ? displayLabel : undefined}
            aria-current={active ? 'page' : undefined}
        >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {!collapsed && <span className="truncate text-start">{displayLabel}</span>}
        </Link>
    );
}
