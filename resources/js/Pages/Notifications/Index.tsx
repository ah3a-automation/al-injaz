import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import { Head, router } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import type { AppNotification, PaginatedNotifications } from '@/types';

interface IndexProps {
    notifications: PaginatedNotifications;
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

export default function Index({ notifications, unreadCount }: IndexProps) {
    const { data, links, total, from, to } = notifications;

    function handleMarkAllRead() {
        router.post(route('notifications.read-all'));
    }

    function handleNotificationClick(n: AppNotification) {
        router.post(route('notifications.read', n.id));
        if (n.data?.link) {
            router.visit(n.data.link);
        }
    }

    return (
        <AppLayout>
            <Head title="Notifications" />
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
                        {unreadCount > 0 && (
                            <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm font-medium text-primary-foreground">
                                {unreadCount} unread
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                            Mark all as read
                        </Button>
                    )}
                </div>

                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
                        <Bell className="h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 font-medium">No notifications yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Notifications will appear here when there is activity in the system.
                        </p>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-2">
                            {data.map((n) => (
                                <li key={n.id}>
                                    <button
                                        type="button"
                                        className={`w-full rounded-lg border border-border border-l-4 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                                            n.read_at ? 'bg-background' : 'bg-blue-50/40 dark:bg-blue-950/20'
                                        } ${getBorderClass(n.data?.type ?? 'info')}`}
                                        onClick={() => handleNotificationClick(n)}
                                    >
                                        <p className="font-medium">{n.data?.title ?? ''}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {n.data?.body ?? ''}
                                        </p>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {formatTime(n.created_at)}
                                        </p>
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {links && links.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                                <span className="text-sm text-muted-foreground">
                                    Showing {from ?? 0}–{to ?? 0} of {total ?? 0}
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {links.map((link, i) => (
                                        <Button
                                            key={i}
                                            size="sm"
                                            variant={link.active ? 'default' : 'outline'}
                                            disabled={!link.url}
                                            onClick={() => link.url && router.visit(link.url, { preserveScroll: true })}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
