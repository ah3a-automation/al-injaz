import { useEffect } from 'react'
import { toast } from 'sonner'
import CommandPalette from '@/Components/System/CommandPalette';
import AppToaster from '@/Components/System/AppToaster';
import { Link, usePage } from '@inertiajs/react';
import { Building2, CheckSquare, ClipboardList, Download, FileSpreadsheet, FolderKanban, LayoutDashboard, LogOut, Settings, Shield, ShoppingCart, User, Users } from 'lucide-react';
import NotificationBell from '@/Components/NotificationBell';
import { type PropsWithChildren } from 'react';
import { Button, buttonVariants } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import type { SharedPageProps } from '@/types';

export default function AppLayout({ children }: PropsWithChildren) {
    const { auth, can, userCan, dir, locale, flash, notifications } = usePage().props as SharedPageProps;
    const user = auth.user;

    const fontClass = dir === 'rtl' ? 'font-ar' : 'font-en';

    useEffect(() => {
        if (flash?.success) toast.success(flash.success)
        if (flash?.error) toast.error(flash.error)
    }, [flash?.success, flash?.error])

    return (
        <div
            className={cn('min-h-screen bg-muted/40', fontClass)}
            dir={dir}
            lang={locale}
        >
            <CommandPalette />
            <AppToaster />

            <aside className="fixed inset-y-0 start-0 z-40 w-64 border-e border-border bg-card">
                <div className="flex h-16 items-center gap-2 border-b border-border px-4">
                    <Link
                        href={route('dashboard')}
                        className="font-semibold text-foreground"
                    >
                        Al Injaz
                    </Link>
                </div>
                <nav className="flex flex-col gap-1 p-2">
                    <Link href={route('dashboard')}>
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                        </Button>
                    </Link>
                    <Link href={route('projects.index')}>
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                        >
                            <FolderKanban className="h-4 w-4" />
                            Projects
                        </Button>
                    </Link>
                    <Link href={route('boq-import.index')}>
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            BOQ Import
                        </Button>
                    </Link>
                    <Link href={route('tasks.index')}>
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                        >
                            <CheckSquare className="h-4 w-4" />
                            Tasks
                        </Button>
                    </Link>
                    <Link href={route('suppliers.index')}>
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                        >
                            <Building2 className="h-4 w-4" />
                            Suppliers
                        </Button>
                    </Link>
                    <Link href={route('purchase-requests.index')}>
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            Purchase Requests
                        </Button>
                    </Link>
                    <Link href={route('rfqs.index')}>
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                        >
                            <ClipboardList className="h-4 w-4" />
                            RFQs
                        </Button>
                    </Link>
                    {userCan?.['users.view'] && (
                        <Link href={route('users.index')}>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2"
                            >
                                <Users className="h-4 w-4" />
                                Users
                            </Button>
                        </Link>
                    )}
                    <Link href="/exports">
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Exports
                        </Button>
                    </Link>
                    {userCan?.['settings.manage'] && (
                        <Link href={route('settings.mail')}>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2"
                            >
                                <Settings className="h-4 w-4" />
                                Settings
                            </Button>
                        </Link>
                    )}
                    {userCan?.['suppliers.create'] && (
                        <>
                            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                Admin
                            </div>
                            <Link href={route('admin.supplier-categories.index')}>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-2"
                                >
                                    <Shield className="h-4 w-4" />
                                    Categories
                                </Button>
                            </Link>
                            <Link href={route('admin.supplier-capabilities.index')}>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-2"
                                >
                                    <Shield className="h-4 w-4" />
                                    Capabilities
                                </Button>
                            </Link>
                            <Link href={route('admin.certifications.index')}>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-2"
                                >
                                    <Shield className="h-4 w-4" />
                                    Certifications
                                </Button>
                            </Link>
                        </>
                    )}
                </nav>
            </aside>

            <div className="ms-64 flex min-h-screen flex-col">
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
                    <div />
                    <div className="flex items-center gap-2">
                        <NotificationBell unreadCount={notifications?.unread_count ?? 0} />
                        {user && (
                            <>
                                <span className="text-sm text-muted-foreground">
                                    {user.name}
                                </span>
                                <Link href={route('profile.edit')}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Profile"
                                    >
                                        <User className="h-4 w-4" />
                                    </Button>
                                </Link>
                                <Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                    className={cn(
                                        buttonVariants({
                                            variant: 'ghost',
                                            size: 'icon',
                                        })
                                    )}
                                    aria-label="Log out"
                                >
                                    <LogOut className="h-4 w-4" />
                                </Link>
                            </>
                        )}
                    </div>
                </header>

                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}