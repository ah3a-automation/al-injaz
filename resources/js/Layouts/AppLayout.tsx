import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import CommandPalette from '@/Components/System/CommandPalette';
import AppToaster from '@/Components/System/AppToaster';
import { Link, usePage } from '@inertiajs/react';
import { LogOut, Search, User } from 'lucide-react';
import NotificationBell from '@/Components/NotificationBell';
import { type PropsWithChildren } from 'react';
import { Button, buttonVariants } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import type { SharedPageProps } from '@/types';
import { SidebarProvider, useSidebar } from '@/Components/layout/SidebarContext';
import { Sidebar, type SidebarMenuEntry, type SidebarMenuItem } from '@/Components/layout/Sidebar';
import { SidebarToggle } from '@/Components/layout/SidebarToggle';
import { adminMenu } from '@/config/adminMenu';
import UserMenu from '@/Components/ui/UserMenu';
import LanguageSwitcher from '@/Components/ui/LanguageSwitcher';
import { useLocale } from '@/hooks/useLocale';

interface AppLayoutContentProps extends PropsWithChildren {
    onOpenSearch: () => void;
}

function AppLayoutContent({ children, onOpenSearch }: AppLayoutContentProps) {
    const { auth, userCan, dir, locale, notifications, company } = usePage().props as SharedPageProps;
    const user = auth.user;

    const menu = useMemo((): SidebarMenuEntry[] => {
        const items: SidebarMenuItem[] = adminMenu
            .filter((item) => !item.permission || userCan?.[item.permission])
            .map(({ routeName, routeParams, permission: _p, ...rest }) => ({
                label: rest.label ?? rest.labelKey,
                labelKey: rest.labelKey,
                icon: rest.icon,
                href: route(routeName, routeParams ?? {}),
                routeName,
                visible: true,
            }));

        const byLabelKey = new Map(items.map((i) => [i.labelKey ?? i.label, i]));

        const group = (label: string, keys: string[]): SidebarMenuEntry[] => {
            const picked = keys.map((k) => byLabelKey.get(k)).filter((v): v is SidebarMenuItem => !!v);
            return picked.length > 0 ? [{ type: 'section', label }, ...picked] : [];
        };

        const main = group('Main', ['dashboard', 'projects', 'boq_import', 'tasks']);
        const procurement = group('Procurement', [
            'suppliers',
            'coverage_map',
            'supplier_intelligence',
            'purchase_requests',
            'rfqs',
            'evaluations',
        ]);
        const contracts = group('Contracts', ['contracts', 'contract_articles', 'contract_templates', 'exports']);
        const system = group('System', [
            'settings',
            'nav_mail_configuration',
            'company_branding_title',
            'categories',
            'ai_category_suggestions',
            'capabilities',
            'certifications',
            'user_roles',
            'permissions_matrix',
            'nav_notification_configuration',
            'nav_notification_settings',
            'nav_notification_history',
            'users',
        ]);

        // Append any remaining visible items not explicitly grouped (safety net).
        const used = new Set(
            [...main, ...procurement, ...contracts, ...system]
                .filter((e): e is SidebarMenuItem => (e as SidebarMenuItem).href !== undefined && (e as any).type !== 'section')
                .map((e) => (e as SidebarMenuItem).href)
        );
        const extras: SidebarMenuItem[] = items.filter((i) => !used.has(i.href));

        return [...main, ...procurement, ...contracts, ...system, ...extras];
    }, [userCan]);

    const fontClass = dir === 'rtl' ? 'font-ar' : 'font-en';
    const { width } = useSidebar();
    const { t, isRTL } = useLocale();

    const contentOffsetStyle = isRTL
        ? { marginRight: width }
        : { marginLeft: width };

    const brandLogoExpanded = company?.logo_dark ?? company?.logo_light ?? null;
    const hasTheme = company?.brand_primary_color ?? company?.brand_secondary_color ?? company?.color_success ?? company?.color_sidebar_bg;
    const brandStyle = hasTheme
        ? {
            '--brand-primary': company?.brand_primary_color ?? '#373d42',
            '--brand-secondary': company?.brand_secondary_color ?? '#bfa849',
            '--color-success': company?.color_success ?? '#16a34a',
            '--color-warning': company?.color_warning ?? '#d97706',
            '--color-danger': company?.color_danger ?? '#dc2626',
            '--color-info': company?.color_info ?? '#2563eb',
            '--color-sidebar-bg': company?.color_sidebar_bg ?? '#373d42',
            '--color-sidebar-text': company?.color_sidebar_text ?? '#ffffff',
          } as React.CSSProperties
        : undefined;

    return (
        <div
            className={cn('h-dvh bg-surface overflow-hidden', fontClass)}
            dir={dir}
            lang={locale}
            style={brandStyle}
        >
            <Sidebar
                menu={menu}
                brandHref={route('dashboard')}
                brandLabel={company?.display_short_name ?? 'Al Injaz'}
                brandLogoExpanded={brandLogoExpanded}
                brandSidebarIcon={company?.sidebar_icon ?? null}
                brandMode={company?.sidebar_brand_mode ?? 'logo_text'}
            />
            <div className="flex h-full min-w-0 overflow-hidden">
                <div
                    className="flex h-full min-w-0 flex-1 flex-col overflow-hidden"
                    style={contentOffsetStyle}
                >
                    <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-border-soft bg-card px-6">
                        <div className="flex items-center gap-2">
                            <SidebarToggle />
                            <button
                                type="button"
                                onClick={onOpenSearch}
                                className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                                aria-label="Open search (Ctrl+Alt+K or Cmd+K)"
                            >
                                <Search className="h-4 w-4" />
                                <span className="hidden w-40 text-start sm:inline">
                                    {t('search')}
                                </span>
                                <kbd className="pointer-events-none hidden h-5 select-none items-center rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground md:inline">
                                    Ctrl+Alt+K / Cmd+K
                                </kbd>
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <LanguageSwitcher />
                            <NotificationBell
                                unreadCount={notifications?.unread_count ?? 0}
                            />
                            {user && (
                                <UserMenu
                                    user={{
                                        name: user.name,
                                        email: user.email,
                                        profile_photo_url: user.avatar_url ?? null,
                                    }}
                                />
                            )}
                        </div>
                    </header>

                    <main
                        id="app-main-scroll"
                        className="min-w-0 flex-1 overflow-y-auto overscroll-contain p-6"
                    >
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function AppLayout({ children }: PropsWithChildren) {
    const { flash } = usePage().props as SharedPageProps;
    const [searchOpen, setSearchOpen] = useState(false);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        if (flash?.warning) toast.warning(flash.warning);
    }, [flash?.success, flash?.error, flash?.warning]);

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
        };
    }, []);

    return (
        <SidebarProvider>
            <div className="h-dvh overflow-hidden">
                <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
                <AppToaster />
                <AppLayoutContent onOpenSearch={() => setSearchOpen(true)}>
                    {children}
                </AppLayoutContent>
            </div>
        </SidebarProvider>
    );
}
