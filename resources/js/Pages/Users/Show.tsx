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

interface ShowProps {
    user: UserRecord;
    rolePermissions: string[];
    can: { update: boolean; delete: boolean };
}

const MODULE_LABELS: Record<string, string> = {
    projects: 'Projects',
    tasks: 'Tasks',
    suppliers: 'Suppliers',
    users: 'Users',
    finance: 'Finance',
    comments: 'Comments',
    notifications: 'Notifications',
    members: 'Members',
    audit: 'Audit',
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
    const currentUserId = auth?.user?.id;
    const roleName = user.roles[0]?.name;
    const canDelete = can.delete && currentUserId != null && user.id !== currentUserId && roleName !== 'super_admin';

    const handleDelete = () => {
        confirmDelete(`Delete user "${user.name}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('users.destroy', user.id));
            }
        });
    };

    const updateStatus = (status: 'active' | 'inactive' | 'suspended') => {
        router.post(route('users.status', user.id), { status });
    };

    const grouped = groupPermissionsByModule(rolePermissions);

    return (
        <AppLayout>
            <Head title={user.name} />
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
                                            <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
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
                                                    {roleName ? getRoleLabel(roleName) : 'No Role'}
                                                </span>
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(user.status)}`}
                                                >
                                                    {getStatusLabel(user.status)}
                                                </span>
                                            </div>
                                            {user.must_change_password && (
                                                <p className="mt-2 text-sm font-medium text-amber-600">
                                                    Password change required on next login
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {can.update && (
                                            <Button asChild>
                                                <Link href={route('users.edit', user.id)}>
                                                    <Pencil className="h-4 w-4" />
                                                    Edit
                                                </Link>
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button variant="destructive" onClick={handleDelete}>
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </Button>
                                        )}
                                        {can.update && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline">
                                                        Status
                                                        <ChevronDown className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {user.status === 'active' && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => updateStatus('suspended')}>
                                                                Suspend
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => updateStatus('inactive')}>
                                                                Deactivate
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {(user.status === 'suspended' || user.status === 'inactive') && (
                                                        <DropdownMenuItem onClick={() => updateStatus('active')}>
                                                            Activate
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
                                <CardTitle>Details</CardTitle>
                                <CardDescription>User information</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {user.department && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Department</p>
                                        <p className="mt-1">{user.department}</p>
                                    </div>
                                )}
                                {user.phone && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                        <p className="mt-1">{user.phone}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Last Login</p>
                                    <p className="mt-1">
                                        {user.last_login_at
                                            ? new Date(user.last_login_at).toLocaleString()
                                            : 'Never logged in'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Created by</p>
                                    <p className="mt-1">{user.creator?.name ?? 'System'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Created at</p>
                                    <p className="mt-1">{new Date(user.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Updated at</p>
                                    <p className="mt-1">{new Date(user.updated_at).toLocaleString()}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {user.createdUsers && user.createdUsers.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Users Created by {user.name}
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
                                                <span className="text-muted-foreground">{u.email}</span>
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
                                <CardTitle>Permissions</CardTitle>
                                <CardDescription>
                                    {roleName
                                        ? `Permissions granted via role: ${getRoleLabel(roleName)}`
                                        : 'No permissions assigned'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {Object.keys(grouped).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No permissions assigned</p>
                                ) : (
                                    <div className="space-y-4">
                                        {Object.entries(grouped).map(([moduleLabel, perms]) => (
                                            <div key={moduleLabel}>
                                                <p className="mb-2 text-sm font-medium text-muted-foreground">
                                                    {moduleLabel}
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
