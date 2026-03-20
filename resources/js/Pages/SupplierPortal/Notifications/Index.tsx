import SupplierPortalLayout from '@/Layouts/SupplierPortalLayout';
import { Button } from '@/Components/ui/button';
import { Head, router } from '@inertiajs/react';
import { Bell, ChevronRight } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

const EVENT_LABELS: Record<string, { en: string; ar: string }> = {
    'clarification.added.supplier':     { en: 'New Clarification',             ar: 'استيضاح جديد' },
    'clarification.answered':           { en: 'Clarification Answered',        ar: 'تم الرد على الاستيضاح' },
    'clarification.made_public':        { en: 'Shared with All Suppliers',     ar: 'تمت المشاركة مع جميع الموردين' },
    'rfq.issued.supplier':              { en: 'RFQ Invitation',                ar: 'دعوة لطلب عرض سعر' },
    'rfq.clarification_public':         { en: 'Public Clarification',          ar: 'استيضاح عام' },
    'quote.submitted':                  { en: 'Quote Submitted',               ar: 'تم تقديم العرض' },
    'rfq.awarded':                      { en: 'RFQ Awarded',                   ar: 'تمت الترسية' },
    'supplier.document_expired':        { en: 'Document Expired',              ar: 'وثيقة منتهية الصلاحية' },
    'supplier.document_expiring_soon':  { en: 'Document Expiring Soon',        ar: 'وثيقة تنتهي قريباً' },
};

const EVENT_TITLE_MAP: Record<string, { en: string; ar: string }> = EVENT_LABELS;

const getEventLabel = (eventKey: string, locale: string): string => {
    const key = eventKey?.toLowerCase() ?? '';
    const entry = EVENT_LABELS[key];
    if (entry) {
        return locale === 'ar' ? entry.ar : entry.en;
    }
    return (
        eventKey
            ?.replace(/_/g, ' ')
            ?.replace(/\./g, ' › ')
            ?.replace(/\b\w/g, (c) => c.toUpperCase()) ?? ''
    );
};

const getNotificationTitle = (eventKey: string | undefined, fallbackTitle: string, locale: string): string => {
    const key = eventKey?.toLowerCase() ?? '';
    const entry = EVENT_TITLE_MAP[key];
    if (!entry) {
        return fallbackTitle;
    }
    return locale === 'ar' ? entry.ar : entry.en;
};

const formatRelativeTime = (createdAt: string, locale: string): string => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (locale === 'ar') {
        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        return `منذ ${diffDays} يوم`;
    }

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

interface NotificationItem {
    id: number;
    event_key: string;
    title: string;
    message: string;
    link: string | null;
    status: string;
    created_at: string;
}

interface PaginatedNotifications {
    data: NotificationItem[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
}

interface IndexProps {
    notifications: PaginatedNotifications;
    unreadCount: number;
}

export default function SupplierPortalNotificationsIndex({
    notifications,
    unreadCount,
}: IndexProps) {
    const { t, locale } = useLocale();
    const { data, links, from, to, total } = notifications;

    function handleMarkAllRead() {
        router.post(route('supplier.notifications.read-all'));
    }

    function handleNotificationClick(notification: NotificationItem) {
        const isUnread = notification.status !== 'read';
        if (isUnread) {
            router.patch(route('supplier.notifications.read', { notification: notification.id }), {}, { preserveScroll: true });
        }
        if (notification.link) {
            if (notification.link.startsWith('http') || notification.link.startsWith('//')) {
                window.location.href = notification.link;
            } else {
                router.visit(notification.link);
            }
        }
    }

    return (
        <SupplierPortalLayout>
            <Head title={t('notifications', 'supplier_portal')} />
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-foreground">
                            {t('notifications', 'supplier_portal')}
                        </h1>
                        {unreadCount > 0 && (
                            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                                {unreadCount} {t('unread', 'supplier_portal')}
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                            {t('mark_all_read', 'supplier_portal')}
                        </Button>
                    )}
                </div>

                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Bell className="mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">
                            {t('no_notifications', 'supplier_portal')}
                        </p>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-2">
                            {data.map((notification) => {
                                const isUnread = notification.status !== 'read';
                                return (
                                    <li key={notification.id}>
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            className={`rounded-lg border transition-colors cursor-pointer ${
                                                isUnread
                                                    ? 'border-primary/20 bg-primary/5'
                                                    : 'border-border bg-card'
                                            }`}
                                            onClick={() => handleNotificationClick(notification)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleNotificationClick(notification);
                                                }
                                            }}
                                            aria-label={notification.title}
                                        >
                                            <div className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                                        {isUnread && (
                                                            <span
                                                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                                                                aria-hidden
                                                            />
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <span className="text-xs font-medium text-muted-foreground" dir="auto">
                                                                {getEventLabel(notification.event_key, locale)}
                                                            </span>
                                                            <p
                                                                className={`mt-0.5 text-sm text-start ${
                                                                    isUnread ? 'font-semibold' : 'font-medium'
                                                                }`}
                                                                dir="auto"
                                                            >
                                                                {getNotificationTitle(notification.event_key, notification.title, locale)}
                                                            </p>
                                                            {notification.message && (
                                                                <p
                                                                    className="mt-1 text-sm text-muted-foreground"
                                                                    dir="auto"
                                                                >
                                                                    {notification.message}
                                                                </p>
                                                            )}
                                                            {notification.link && (
                                                                <span className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                                                    {t('view_details', 'supplier_portal')}
                                                                    <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                                                        {formatRelativeTime(notification.created_at, locale)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        {links && links.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                                <span className="text-sm text-muted-foreground">
                                    {t('showing', 'supplier_portal', {
                                        from: from ?? 0,
                                        to: to ?? 0,
                                        total: total ?? 0,
                                    })}
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {links.map((link, i) => (
                                        <Button
                                            key={i}
                                            size="sm"
                                            variant={link.active ? 'default' : 'outline'}
                                            disabled={!link.url}
                                            onClick={() =>
                                                link.url && router.visit(link.url, { preserveScroll: true })
                                            }
                                        >
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </SupplierPortalLayout>
    );
}
