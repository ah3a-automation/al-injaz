import { Bell, ExternalLink } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import type { AppNotification } from '@/types';

interface NotificationBellProps {
    unreadCount: number;
}

function getBorderClass(type: string): string {
    switch (type) {
        case 'info':
            return 'border-l-blue-500';
        case 'success':
            return 'border-l-green-500';
        case 'warning':
            return 'border-l-amber-500';
        case 'danger':
            return 'border-l-red-500';
        default:
            return 'border-l-gray-500';
    }
}

function formatTime(createdAt: string): string {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export default function NotificationBell({ unreadCount }: NotificationBellProps) {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const [unread, setUnread] = useState(unreadCount);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { notifications: shared } = usePage().props as { notifications?: { unread_count?: number } };

    const fetchRecent = useCallback(() => {
        setLoading(true);
        fetch('/notifications/recent', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data: { notifications?: AppNotification[]; unread_count?: number }) => {
                setNotifications(data.notifications ?? []);
                if (typeof data.unread_count === 'number') setUnread(data.unread_count);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (typeof shared?.unread_count === 'number') {
            setUnread(shared.unread_count);
        }
    }, [shared?.unread_count]);

    useEffect(() => {
        if (!open) return;
        fetchRecent();
    }, [open, fetchRecent]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleMarkAllRead() {
        const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        fetch('/notifications/read-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf,
                Accept: 'application/json',
            },
            credentials: 'same-origin',
        }).then(() => {
            setUnread(0);
            router.reload({ only: ['notifications'] });
        });
    }

    function handleNotificationClick(n: AppNotification) {
        const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        fetch(`/notifications/${n.id}/read`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf,
                Accept: 'application/json',
            },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data: { unread_count?: number }) => {
                if (typeof data.unread_count === 'number') setUnread(data.unread_count);
            });
        if (n.data?.link) {
            router.visit(n.data.link);
        }
        setOpen(false);
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen((o) => !o)}
                aria-label="Notifications"
                className="relative"
            >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </Button>
            {open && (
                <div className="absolute end-0 top-full z-50 mt-2 w-80 rounded-md border border-border bg-background shadow-lg">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <span className="font-semibold">Notifications</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-primary"
                            onClick={handleMarkAllRead}
                        >
                            Mark all read
                        </Button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No notifications yet.
                            </div>
                        ) : (
                            <ul className="divide-y divide-border">
                                {notifications.map((n) => (
                                    <li key={n.id}>
                                        <button
                                            type="button"
                                            className={`w-full border-l-4 px-4 py-3 text-start transition-colors hover:bg-muted/50 ${
                                                n.read_at ? 'bg-background' : 'bg-blue-50/40 dark:bg-blue-950/20'
                                            } ${getBorderClass(n.data?.type ?? 'info')}`}
                                            onClick={() => handleNotificationClick(n)}
                                        >
                                            <p className="truncate text-sm font-medium">{n.data?.title ?? ''}</p>
                                            <p className="line-clamp-2 text-xs text-muted-foreground">
                                                {n.data?.body ?? ''}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {formatTime(n.created_at)}
                                            </p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="border-t border-border px-4 py-2">
                        <Link
                            href={route('notifications.index')}
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                            onClick={() => setOpen(false)}
                        >
                            View all notifications
                            <ExternalLink className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
