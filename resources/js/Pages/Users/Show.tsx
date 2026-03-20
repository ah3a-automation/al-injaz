import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { getRoleColor, getRoleLabel, getStatusColor, getStatusLabel } from '@/utils/users';
import type { UserRecord } from '@/types';
import { useConfirm } from '@/hooks';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, Mail, Pencil, Trash2 } from 'lucide-react';
import type { SharedPageProps } from '@/types';
import { useLocale } from '@/hooks/useLocale';

interface ShowProps {
    user: UserRecord;
    rolePermissions: string[];
    can: { update: boolean; delete: boolean };
}

const MODULE_LABELS: Record<string, string> = {
    projects: 'admin_module_projects',
    tasks: 'admin_module_tasks',
    suppliers: 'admin_module_suppliers',
    users: 'admin_module_users',
    finance: 'admin_module_finance',
    comments: 'admin_module_comments',
    notifications: 'admin_module_notifications',
    members: 'admin_module_members',
    audit: 'admin_module_audit',
};

function groupPermissionsByModule(permissions: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    for (const name of permissions) {
        const prefix = name.split('.')[0] ?? 'other';
        const label = MODULE_LABELS[prefix] ?? prefix;
        if (!groups[label]) groups[label] = [];
        const action = name.includes('.') ? name.split('.').slice(1).join('.') : name;
        groups[label].push(action);
    }
    return groups;
}

export default function Show({ user, rolePermissions, can }: ShowProps) {
    const { confirmDelete } = useConfirm();
    const { auth } = usePage().props as SharedPageProps;
    const { t } = useLocale();
    const currentUserId = auth?.user?.id;
    const roleName = user.roles[0]?.name;
    const canDelete = can.delete && currentUserId != null && user.id !== currentUserId && roleName !== 'super_admin';

    const handleDelete = () => {
        confirmDelete(
            t('users_confirm_delete', 'admin', { name: user.name })
        ).then((confirmed) => {
            if (confirmed) {
                router.delete(route('settings.users.destroy', user.id));
            }
        });
    };

    const updateStatus = (status: 'active' | 'inactive' | 'suspended') => {
        router.post(route('settings.users.status', user.id), { status });
    };

    const grouped = groupPermissionsByModule(rolePermissions);

    return (
        <AppLayout>
            <Head title={t('users_title', 'admin')} />
            <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                                            {user.name.length >= 2
                                                ? user.name.slice(0, 2).toUpperCase()
                                                : user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-semibold tracking-tight">
                                                {user.name}
                                            </h1>
                                            <a
                                                href={`mailto:${user.email}`}
                                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                                            >
                                                <Mail className="h-4 w-4" />
                                                {user.email}
                                            </a>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getRoleColor(roleName ?? '')}`}
                                                >
                                                    {roleName
                                                        ? getRoleLabel(roleName)
                                                        : t('no_role', 'admin')}
                                                </span>
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(user.status)}`}
                                                >
                                                    {getStatusLabel(user.status)}
                                                </span>
                                            </div>
                                            {user.must_change_password && (
                                                <p className="mt-2 text-sm font-medium text-amber-600">
                                                    {t(
                                                        'users_require_change_on_next',
                                                        'admin'
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {can.update && (
                                            <Button asChild>
                                                <Link href={route('settings.users.edit', user.id)}>
                                                    <Pencil className="h-4 w-4" />
                                                    {t('action_edit', 'admin')}
                                                </Link>
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button variant="destructive" onClick={handleDelete}>
                                                <Trash2 className="h-4 w-4" />
                                                {t('action_delete', 'admin')}
                                            </Button>
                                        )}
                                        {can.update && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline">
                                                        {t('users_col_status', 'admin')}
                                                        <ChevronDown className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {user.status === 'active' && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    updateStatus('suspended')
                                                                }
                                                            >
                                                                {t('status_suspended', 'suppliers')}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    updateStatus('inactive')
                                                                }
                                                            >
                                                                {t(
                                                                    'users_status_inactive',
                                                                    'admin'
                                                                )}
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {(user.status === 'suspended' || user.status === 'inactive') && (
                                                        <DropdownMenuItem
                                                            onClick={() => updateStatus('active')}
                                                        >
                                                            {t('activate_user', 'admin')}
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('details', 'admin')}</CardTitle>
                                <CardDescription>
                                    {t('user_information', 'admin')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {user.department && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {t('department', 'admin')}
                                        </p>
                                        <p className="mt-1">{user.department}</p>
                                    </div>
                                )}
                                {user.phone && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {t('phone', 'admin')}
                                        </p>
                                        <p className="mt-1">
                                            <span
                                                dir="ltr"
                                                className="font-mono tabular-nums"
                                            >
                                                {user.phone}
                                            </span>
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {t('last_login', 'admin')}
                                    </p>
                                    <p className="mt-1">
                                        {user.last_login_at
                                            ? new Date(user.last_login_at).toLocaleString()
                                            : t('never_logged_in', 'admin')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {t('created_by', 'suppliers')}
                                    </p>
                                    <p className="mt-1">
                                        {user.creator?.name ?? t('system_user', 'admin')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {t('created_at', 'suppliers')}
                                    </p>
                                    <p className="mt-1">{new Date(user.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {t('updated_at', 'suppliers')}
                                    </p>
                                    <p className="mt-1">{new Date(user.updated_at).toLocaleString()}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {user.createdUsers && user.createdUsers.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        {t('users_created_by', 'admin', { name: user.name })}
                                        <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                                            {user.createdUsers.length}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {user.createdUsers.map((u) => (
                                            <li key={u.id} className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{u.name}</span>
                                                <span className="text-muted-foreground">
                                                    {u.email}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('permissions', 'admin')}</CardTitle>
                                <CardDescription>
                                    {roleName
                                        ? t('permissions_via_role', 'admin', {
                                              role: getRoleLabel(roleName),
                                          })
                                        : t('no_permissions', 'admin')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {Object.keys(grouped).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {t('no_permissions', 'admin')}
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {Object.entries(grouped).map(([moduleLabel, perms]) => (
                                            <div key={moduleLabel}>
                                                <p className="mb-2 text-sm font-medium text-muted-foreground">
                                                    {t(moduleLabel, 'admin')}
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {perms.map((p) => (
                                                        <span
                                                            key={p}
                                                            className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs"
                                                        >
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
