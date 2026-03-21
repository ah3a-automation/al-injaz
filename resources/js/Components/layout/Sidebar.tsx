import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Pin } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useSidebar } from './SidebarContext';
import { SidebarItem } from './SidebarItem';
import { Button } from '@/Components/ui/button';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';

/** Navigable menu item (default when type omitted for backward compatibility). */
export interface SidebarMenuItem {
    type?: 'item';
    label: string;
    labelKey?: string;
    icon: LucideIcon;
    href: string;
    visible?: boolean;
    routeName?: string;
    permission?: string;
}

/** Non-clickable section header. */
export interface SidebarMenuSection {
    type: 'section';
    label: string;
}

export type SidebarMenuEntry = SidebarMenuItem | SidebarMenuSection;

function isSection(entry: SidebarMenuEntry): entry is SidebarMenuSection {
    return entry.type === 'section';
}

type SidebarBrandMode = 'logo' | 'text' | 'logo_text';

interface SidebarProps {
    menu: SidebarMenuEntry[];
    brandHref?: string;
    brandLabel?: string;
    /** Expanded sidebar: logo (logo_dark preferred, then logo_light) */
    brandLogoExpanded?: string | null;
    /** Collapsed sidebar: icon only */
    brandSidebarIcon?: string | null;
    brandMode?: SidebarBrandMode;
}

export function Sidebar({
    menu,
    brandHref,
    brandLabel,
    brandLogoExpanded,
    brandSidebarIcon,
    brandMode = 'logo_text',
}: SidebarProps) {
    const { collapsed, width, pinned, setPinned } = useSidebar();
    const { url } = usePage();
    const { t } = useLocale();

    const visibleEntries = useMemo(
        () =>
            menu.filter(
                (entry) =>
                    isSection(entry) || (entry as SidebarMenuItem).visible !== false
            ),
        [menu]
    );

    const settingsChildrenOrder = [
        'settings.mail',
        'settings.whatsapp',
        'settings.notification-templates.index',
        'settings.company-branding',
        'settings.supplier-categories.index',
        'settings.ai-category-suggestions',
        'settings.supplier-capabilities.index',
        'settings.certifications.index',
        'settings.roles.index',
        'settings.roles.audit',
        'settings.notification-configuration.index',
        'settings.notifications.index',
        'settings.notifications.history',
        'settings.users.index',
    ];

    const settingsChildren = useMemo(
        () =>
            visibleEntries.filter(
                (e): e is SidebarMenuItem =>
                    !isSection(e) &&
                    typeof e.routeName === 'string' &&
                    e.routeName.startsWith('settings.') &&
                    e.labelKey !== 'settings'
            ) as SidebarMenuItem[],
        [visibleEntries]
    );

    const settingsParent = useMemo(
        () =>
            visibleEntries.find(
                (e): e is SidebarMenuItem =>
                    !isSection(e) && (e as SidebarMenuItem).labelKey === 'settings'
            ) as SidebarMenuItem | undefined,
        [visibleEntries]
    );

    const settingsChildActive = (url ?? '').startsWith('/settings');

    const [settingsOpenInternal, setSettingsOpenInternal] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        const stored = window.localStorage.getItem('sidebar_settings_open');
        if (stored === 'true') return true;
        return (url ?? '').startsWith('/settings');
    });

    const settingsOpen = settingsChildActive || settingsOpenInternal;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if ((url ?? '').startsWith('/settings')) {
            setSettingsOpenInternal(true);
        }
    }, [url]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('sidebar_settings_open', settingsOpenInternal ? 'true' : 'false');
    }, [settingsOpenInternal]);

    const orderedSettingsChildren = useMemo(() => {
        const byRouteName = new Map(
            settingsChildren.map((c) => [c.routeName ?? '', c])
        );
        const ordered: SidebarMenuItem[] = [];
        settingsChildrenOrder.forEach((name) => {
            const entry = byRouteName.get(name);
            if (entry) ordered.push(entry);
        });
        // Append any extras not in explicit order
        settingsChildren.forEach((child) => {
            if (!ordered.includes(child)) ordered.push(child);
        });
        return ordered;
    }, [settingsChildren, settingsChildrenOrder]);

    const showLogoExpanded = !collapsed && (brandMode === 'logo' || brandMode === 'logo_text') && brandLogoExpanded;
    const showTextExpanded = !collapsed && (brandMode === 'text' || brandMode === 'logo_text') && brandLabel;
    const collapsedIcon = brandSidebarIcon ?? null;
    const collapsedFallbackText = !collapsedIcon && brandLabel ? brandLabel.slice(0, 2) : '';

    return (
        <aside
            id="app-sidebar"
            className={cn(
                'fixed top-0 start-0 h-dvh shrink-0 theme-sidebar-bg transition-all duration-300 flex flex-col overscroll-none',
                collapsed ? 'w-14' : 'w-60'
            )}
            style={{ '--sidebar-width': `${width}px`, color: 'var(--color-sidebar-text)' } as React.CSSProperties}
            aria-label="Sidebar navigation"
        >
            <div className="flex h-16 shrink-0 items-center justify-between gap-1 border-b border-white/10 px-3">
                {brandHref && (showLogoExpanded || showTextExpanded || collapsedIcon || collapsedFallbackText) && (
                    <Link
                        href={brandHref}
                        className={`flex min-w-0 flex-1 items-center justify-center gap-2 font-semibold theme-sidebar-text ${collapsed ? 'overflow-hidden w-10' : ''}`}
                    >
                        {collapsed ? (
                            <>
                                {collapsedIcon ? (
                                    <img
                                        src={collapsedIcon}
                                        alt={brandLabel ?? ''}
                                        className="h-8 w-auto shrink-0 object-contain"
                                    />
                                ) : (
                                    <span className="truncate text-sm">
                                        {collapsedFallbackText}
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                {showLogoExpanded && (
                                    <img
                                        src={brandLogoExpanded}
                                        alt={brandLabel ?? ''}
                                        className="h-8 w-auto shrink-0 object-contain"
                                    />
                                )}
                                {showTextExpanded && (
                                    <span className="truncate">
                                        {brandLabel}
                                    </span>
                                )}
                            </>
                        )}
                    </Link>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 shrink-0 theme-sidebar-text opacity-80 hover:opacity-100 hover:bg-white/10 ${pinned ? 'brand-accent-text opacity-100' : ''}`}
                    onClick={() => setPinned(!pinned)}
                    aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                    title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                >
                    <Pin className={`h-4 w-4 ${pinned ? 'fill-current' : ''}`} />
                </Button>
            </div>
            <nav className="min-h-0 flex-1 flex flex-col gap-0.5 p-2 overflow-y-auto overscroll-none scrollbar-hidden">
                {visibleEntries.map((entry, index) => {
                    if (isSection(entry)) {
                        if (collapsed) return null;
                        return (
                            <div
                                key={`section-${entry.label}-${index}`}
                                className="px-3 pt-4 pb-1 text-xs uppercase tracking-wider theme-sidebar-text opacity-70"
                            >
                                {entry.label}
                            </div>
                        );
                    }

                    const item = entry as SidebarMenuItem;

                    // Render Settings as collapsible group
                    if (settingsParent && item === settingsParent) {
                        const ParentIcon = settingsParent.icon;
                        const parentActive = settingsChildActive;

                        return (
                            <div key={settingsParent.href + (settingsParent.labelKey ?? settingsParent.label)}>
                                <button
                                    type="button"
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded px-3 py-2 text-start transition-colors border-s-2 theme-sidebar-text',
                                        parentActive
                                            ? 'brand-accent-text brand-accent-border bg-white/10 font-medium'
                                            : 'border-transparent opacity-85 hover:bg-white/10'
                                    )}
                                    onClick={() => setSettingsOpenInternal((prev) => !prev)}
                                    aria-expanded={settingsOpen}
                                >
                                    <ParentIcon className="h-5 w-5 shrink-0" aria-hidden />
                                    {!collapsed && (
                                        <>
                                            <span className="truncate">
                                                {t('nav_settings', 'nav')}
                                            </span>
                                            <ChevronDown
                                                className={cn(
                                                    'ms-auto h-4 w-4 shrink-0 transition-transform',
                                                    settingsOpen ? '' : '-rotate-90'
                                                )}
                                                aria-hidden
                                            />
                                        </>
                                    )}
                                </button>
                                {settingsOpen && !collapsed && (
                                    <div className="mt-0.5 space-y-0.5">
                                        {orderedSettingsChildren.map((child) => {
                                            const childHref = child.href;
                                            const currentPath = (url ?? '').split('?')[0].replace(/\/+$/, '') || '/';
                                            const hrefPath = childHref
                                                .replace(/^https?:\/\/[^/]+/, '')
                                                .split('?')[0]
                                                .replace(/\/+$/, '') || '/';
                                            const childActive =
                                                currentPath === hrefPath ||
                                                (hrefPath !== '/' && currentPath.startsWith(hrefPath + '/'));
                                            const ChildIcon = child.icon;

                                            const labelKey = child.routeName === 'settings.mail'
                                                ? 'nav_mail_configuration'
                                                : child.routeName === 'settings.whatsapp'
                                                    ? 'nav_whatsapp_configuration'
                                                    : child.routeName === 'settings.notification-templates.index'
                                                        ? 'nav_notification_templates'
                                                        : child.routeName === 'settings.company-branding'
                                                    ? 'nav_company_branding'
                                                    : child.routeName === 'settings.supplier-categories.index'
                                                        ? 'nav_supplier_categories'
                                                        : child.routeName === 'settings.supplier-capabilities.index'
                                                            ? 'nav_capabilities'
                                                            : child.routeName === 'settings.certifications.index'
                                                                ? 'nav_certifications'
                                                                : child.routeName === 'settings.roles.index'
                                                                    ? 'nav_user_roles'
                                                                    : child.routeName === 'settings.users.index'
                                                                        ? 'nav_users'
                                                                        : child.labelKey;

                                            return (
                                                <Link
                                                    key={child.href + (labelKey ?? child.label)}
                                                    href={child.href}
                                                    className={cn(
                                                        'ms-4 flex items-center gap-3 rounded ps-4 py-2 text-sm transition-colors border-s-2 theme-sidebar-text',
                                                        childActive
                                                            ? 'brand-accent-text brand-accent-border bg-white/10 font-medium'
                                                            : 'border-transparent opacity-80 hover:bg-white/10'
                                                    )}
                                                    aria-current={childActive ? 'page' : undefined}
                                                >
                                                    <ChildIcon className="h-4 w-4 shrink-0 me-1.5" aria-hidden />
                                                    <span className="truncate">
                                                        {labelKey ? t(labelKey, 'nav') : child.label}
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // Skip settings children here; they are rendered under the group
                    if (
                        settingsChildren.some(
                            (c) => c.routeName === item.routeName && c.href === item.href
                        )
                    ) {
                        return null;
                    }

                    return (
                        <SidebarItem
                            key={item.href + (item.labelKey ?? item.label)}
                            label={item.label}
                            labelKey={item.labelKey}
                            icon={item.icon}
                            href={item.href}
                            routeName={item.routeName}
                        />
                    );
                })}
            </nav>
        </aside>
    );
}
