import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AppToaster from '@/Components/System/AppToaster';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell, ChevronRight, LogOut } from 'lucide-react';
import { type PropsWithChildren } from 'react';
import { buttonVariants } from '@/Components/ui/button';
import { cn, getInitials } from '@/lib/utils';
import type { SharedPageProps } from '@/types';
import { SidebarProvider, useSidebar } from '@/Components/layout/SidebarContext';
import { Sidebar } from '@/Components/layout/Sidebar';
import { SidebarToggle } from '@/Components/layout/SidebarToggle';
import { supplierMenu } from '@/config/supplierMenu';
import LanguageSwitcher from '@/Components/ui/LanguageSwitcher';
import { useLocale } from '@/hooks/useLocale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

const EVENT_TITLE_MAP: Record<string, { en: string; ar: string }> = {
    'clarification.added.supplier':     { en: 'New Clarification',             ar: 'استيضاح جديد' },
    'clarification.answered':           { en: 'Clarification Answered',        ar: 'تم الرد على الاستيضاح' },
    'clarification.made_public':        { en: 'Shared with All Suppliers',     ar: 'تمت المشاركة مع جميع الموردين' },
    'rfq.issued.supplier':              { en: 'RFQ Invitation',                ar: 'دعوة لطلب عرض سعر' },
    'rfq.clarification_public':         { en: 'Public Clarification',          ar: 'استيضاح عام' },
    'quote.submitted':                  { en: 'Quote Submitted',               ar: 'تم إرسال العرض' },
    'rfq.awarded':                      { en: 'RFQ Awarded',                   ar: 'تمت الترسية' },
    'supplier.document_expired':        { en: 'Document Expired',              ar: 'وثيقة منتهية الصلاحية' },
    'supplier.document_expiring_soon':  { en: 'Document Expiring Soon',        ar: 'وثيقة تنتهي قريباً' },
};

const getNotificationTitle = (
    eventKey: string | undefined,
    fallbackTitle: string,
    locale: string
): string => {
    const key = eventKey?.toLowerCase() ?? '';
    const entry = EVENT_TITLE_MAP[key];
    if (!entry) return fallbackTitle;
    return locale === 'ar' ? entry.ar : entry.en;
};

const EVENT_MESSAGE_MAP: Record<string, { en: string; ar: string }> = {
    'clarification.answered': {
        en: 'A clarification has been answered.',
        ar: 'تمت الإجابة على أحد الاستيضاحات.',
    },
    'clarification.added.supplier': {
        en: 'A new clarification has been added.',
        ar: 'تمت إضافة استيضاح جديد.',
    },
    'clarification.made_public': {
        en: 'A clarification has been shared with all suppliers.',
        ar: 'تمت مشاركة استيضاح مع جميع الموردين.',
    },
    'rfq.issued.supplier': {
        en: 'You have been invited to an RFQ.',
        ar: 'تمت دعوتك إلى طلب عرض سعر.',
    },
    'rfq.clarification_public': {
        en: 'A public clarification was published.',
        ar: 'تم نشر استيضاح عام.',
    },
    'quote.submitted': {
        en: 'Your quotation was submitted successfully.',
        ar: 'تم إرسال عرض السعر بنجاح.',
    },
    'rfq.awarded': {
        en: 'This RFQ has been awarded.',
        ar: 'تمت ترسية طلب عرض السعر.',
    },
    'supplier.document_expired': {
        en: 'One of your supplier documents has expired.',
        ar: 'إحدى وثائق المورد منتهية الصلاحية.',
    },
    'supplier.document_expiring_soon': {
        en: 'One of your supplier documents will expire soon.',
        ar: 'إحدى وثائق المورد ستنتهي قريباً.',
    },
};

const getNotificationMessage = (
    eventKey: string | undefined,
    fallbackMessage: string | undefined,
    locale: string
): string => {
    const key = eventKey?.toLowerCase() ?? '';
    const entry = EVENT_MESSAGE_MAP[key];
    if (entry) return locale === 'ar' ? entry.ar : entry.en;
    return fallbackMessage ?? '';
};

// Shape of a notification item as shared by HandleInertiaRequests
interface RecentNotification {
    id: string;
    event_key: string;
    title: string;
    message: string;
    link: string | null;
    isUnread: boolean;
    timeAgo: string;
}

// Shape of the live WebSocket payload from SystemNotificationCreated
interface LiveNotificationPayload {
    notification?: {
        id: string;
        event_key: string;
        title: string;
        message: string;
        link: string | null;
        created_at: string;
        is_unread: boolean;
    };
    unread_count?: number;
}

function SupplierPortalLayoutContent({ children }: PropsWithChildren) {
    const { auth, dir, locale, flash, company, unreadNotificationsCount: initialUnread, recentNotifications: initialRecent } = usePage()
        .props as SharedPageProps;
    const user = auth?.user;
    const fontClass = dir === 'rtl' ? 'font-ar' : 'font-en';

    const { t, isRTL } = useLocale();

    // Local state so we can update live without a page reload
    const [unreadCount, setUnreadCount] = useState<number>(initialUnread ?? 0);
    const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>(
        Array.isArray(initialRecent) ? (initialRecent as RecentNotification[]) : []
    );

    // Keep in sync if Inertia navigates to a new page and re-shares props
    useEffect(() => {
        setUnreadCount(initialUnread ?? 0);
    }, [initialUnread]);

    useEffect(() => {
        setRecentNotifications(Array.isArray(initialRecent) ? (initialRecent as RecentNotification[]) : []);
    }, [initialRecent]);

    // ── Echo / Reverb live subscription ──────────────────────────────────────
    useEffect(() => {
        const userId = user?.id;
        if (!userId) return;

        const channelName = `users.${userId}.notifications`;
        let cancelled = false;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;

        const trySubscribe = () => {
            if (cancelled) return;

            if (!window.Echo) {
                retryTimer = setTimeout(trySubscribe, 200);
                return;
            }

            const channel = window.Echo.private(channelName);

            channel.listen('.system-notification.created', (payload: LiveNotificationPayload) => {
                const item = payload.notification;
                if (!item) return;

                // Prepend new notification to the dropdown list (keep max 5)
                const mapped: RecentNotification = {
                    id: item.id,
                    event_key: item.event_key,
                    title: item.title,
                    message: item.message,
                    link: item.link,
                    isUnread: item.is_unread,
                    timeAgo: 'Just now',
                };

                setRecentNotifications((prev) => {
                    const withoutDuplicate = prev.filter((n) => n.id !== mapped.id);
                    return [mapped, ...withoutDuplicate].slice(0, 5);
                });

                if (typeof payload.unread_count === 'number') {
                    setUnreadCount(payload.unread_count);
                } else if (item.is_unread) {
                    setUnreadCount((prev) => prev + 1);
                }
            });
        };

        trySubscribe();

        return () => {
            cancelled = true;
            if (retryTimer) clearTimeout(retryTimer);
            window.Echo?.leave(channelName);
        };
    }, [user?.id]);
    // ─────────────────────────────────────────────────────────────────────────

    const menu = useMemo(
        () =>
            supplierMenu.map((item) => ({
                label: t(item.labelKey, 'supplier_portal') || item.labelKey,
                labelKey: item.labelKey,
                icon: item.icon,
                href: route(item.routeName),
                routeName: item.routeName,
            })),
        [locale]
    );

    const { width } = useSidebar();

    const contentOffsetStyle = isRTL
        ? { marginRight: width }
        : { marginLeft: width };

    const hasTheme = company?.brand_primary_color ?? company?.color_sidebar_bg;
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

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    return (
        <div
            className={cn('min-h-screen h-screen bg-surface overflow-hidden', fontClass)}
            dir={dir}
            lang={locale}
            style={brandStyle}
        >
            <AppToaster />
                <Sidebar
                    menu={menu}
                    brandHref={route('supplier.dashboard')}
                    brandLabel={company?.display_short_name ?? 'Supplier Portal'}
                    brandLogoExpanded={company?.logo_dark ?? company?.logo_light ?? null}
                    brandSidebarIcon={company?.sidebar_icon ?? null}
                    brandMode={company?.sidebar_brand_mode ?? 'logo_text'}
                />
            <div className="flex h-full">
                <div
                    className="flex h-full flex-1 flex-col"
                    style={contentOffsetStyle}
                >
                    <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-border-soft bg-card px-6">
                        <div className="flex items-center gap-2">
                            <SidebarToggle />
                        </div>
                        <div className="flex items-center gap-3">
                            <LanguageSwitcher />
                            {user && (
                                <>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                aria-label={t('notifications', 'supplier_portal')}
                                            >
                                                <Bell className="h-5 w-5" />
                                                {unreadCount > 0 && (
                                                    <span className="absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                                        {unreadCount > 99 ? '99+' : unreadCount}
                                                    </span>
                                                )}
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
                                            <div
                                                dir={isRTL ? 'rtl' : 'ltr'}
                                                className="flex items-center justify-between px-3 py-2 border-b border-border"
                                            >
                                                <span className="text-sm font-semibold text-foreground text-start">
                                                    {t('notifications', 'supplier_portal')}
                                                </span>
                                                {unreadCount > 0 && (
                                                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                                                        {locale === 'ar'
                                                            ? `${t('unread', 'supplier_portal')} ${unreadCount}`
                                                            : `${unreadCount} ${t('unread', 'supplier_portal')}`}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="max-h-80 overflow-y-auto divide-y divide-border">
                                                {recentNotifications.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                                        <Bell className="mb-2 h-6 w-6 text-muted-foreground/40" />
                                                        <p className="text-xs text-muted-foreground">
                                                            {t('no_notifications', 'supplier_portal')}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    recentNotifications.map((notification) => (
                                                        <DropdownMenuItem key={notification.id} asChild>
                                                            <button
                                                                type="button"
                                                                className={cn(
                                                                    'flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-start text-sm transition-colors',
                                                                    'hover:bg-muted/50 focus:bg-muted/50',
                                                                    'text-foreground',
                                                                    notification.isUnread ? 'bg-primary/5' : ''
                                                                )}
                                                                onClick={() => {
                                                                    if (notification.isUnread) {
                                                                        router.patch(
                                                                            route('supplier.notifications.read', {
                                                                                notification: notification.id,
                                                                            }),
                                                                            {},
                                                                            { preserveScroll: true }
                                                                        );
                                                                    }
                                                                    const href = notification.link ?? route('supplier.notifications.index');
                                                                    if (href.startsWith('http') || href.startsWith('//')) {
                                                                        window.location.href = href;
                                                                    } else {
                                                                        router.visit(href);
                                                                    }
                                                                }}
                                                            >
                                                                <div className="flex w-full items-start gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
                                                                    {notification.isUnread ? (
                                                                        <span
                                                                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                                                                            aria-hidden
                                                                        />
                                                                    ) : (
                                                                        <span
                                                                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                                                                            aria-hidden
                                                                        />
                                                                    )}
                                                                    <div className="min-w-0 flex-1 text-start">
                                                                        <p
                                                                            className="truncate text-sm font-semibold leading-tight text-foreground"
                                                                            dir="auto"
                                                                        >
                                                                            {getNotificationTitle(
                                                                                notification.event_key,
                                                                                notification.title,
                                                                                locale
                                                                            )}
                                                                        </p>
                                                                        {getNotificationMessage(
                                                                            notification.event_key,
                                                                            notification.message,
                                                                            locale
                                                                        ) && (
                                                                            <p
                                                                                className="mt-0.5 line-clamp-1 text-xs text-muted-foreground text-start"
                                                                                dir="auto"
                                                                            >
                                                                                {getNotificationMessage(
                                                                                    notification.event_key,
                                                                                    notification.message,
                                                                                    locale
                                                                                )}
                                                                            </p>
                                                                        )}
                                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                                            {notification.timeAgo}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        </DropdownMenuItem>
                                                    ))
                                                )}
                                            </div>
                                            <div className="border-t border-border p-2">
                                                <Link
                                                    href={route('supplier.notifications.index')}
                                                    className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/90"
                                                >
                                                    <ChevronRight className="h-3 w-3 order-2 rtl:order-1 rtl:rotate-180" />
                                                    <span className="order-1 rtl:order-2">
                                                        {t('view_all_notifications', 'supplier_portal')}
                                                    </span>
                                                </Link>
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Link
                                        href={route('supplier.contact.profile')}
                                        aria-label="Contact profile"
                                    >
                                        {user.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={user.name}
                                                className="h-9 w-9 rounded-full border border-border object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-text-main">
                                                {getInitials(user.name)}
                                            </span>
                                        )}
                                    </Link>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className={cn(
                                            buttonVariants({ variant: 'ghost', size: 'icon' })
                                        )}
                                        aria-label={t('logout')}
                                    >
                                        <LogOut className="h-4 w-4 rtl:scale-x-[-1]" />
                                    </Link>
                                </>
                            )}
                        </div>
                    </header>
                    <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-6">{children}</main>
                </div>
            </div>
        </div>
    );
}

export default function SupplierPortalLayout({ children }: PropsWithChildren) {
    return (
        <SidebarProvider>
            <SupplierPortalLayoutContent>{children}</SupplierPortalLayoutContent>
        </SidebarProvider>
    );
}
