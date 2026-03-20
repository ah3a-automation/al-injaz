import AppLayout from '@/Layouts/AppLayout';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Head } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import type { ChangeEvent } from 'react';
import { Fragment, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface Role {
    id: number;
    name: string;
}

interface PermissionRow {
    id: number;
    name: string;
    assignedRoleIds: number[];
}

interface PermissionGroup {
    key: string;
    label: string;
    permissions: PermissionRow[];
}

interface Props {
    roles: Role[];
    permissionGroups: PermissionGroup[];
}

export default function RolesAudit({ roles, permissionGroups }: Props) {
    const { t } = useLocale();
    const [search, setSearch] = useState('');
    const [focusRoleId, setFocusRoleId] = useState<string>('all');

    const normalizedSearch = search.trim().toLowerCase();

    const filteredGroups = useMemo(() => {
        if (!normalizedSearch) return permissionGroups;
        return permissionGroups
            .map((group) => {
                const filteredPerms = group.permissions.filter((perm) =>
                    perm.name.toLowerCase().includes(normalizedSearch)
                );
                return { ...group, permissions: filteredPerms };
            })
            .filter((group) => group.permissions.length > 0);
    }, [permissionGroups, normalizedSearch]);

    const focusRoleNumericId = focusRoleId === 'all' ? null : Number(focusRoleId);

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };

    return (
        <AppLayout>
            <Head title={t('roles_permissions_audit_title', 'admin')} />
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {t('roles_permissions_audit_title', 'admin')}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('roles_permissions_audit_description', 'admin')}
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader className="gap-4 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>{t('permissions_matrix', 'admin')}</CardTitle>
                            <CardDescription>
                                {t('roles_permissions_audit_description', 'admin')}
                            </CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                                value={search}
                                onChange={handleSearchChange}
                                placeholder={t('search_permissions', 'admin')}
                                className="w-full sm:w-64"
                            />
                            <Select
                                value={focusRoleId}
                                onValueChange={(value) => setFocusRoleId(value)}
                            >
                                <SelectTrigger className="w-full sm:w-56">
                                    <SelectValue placeholder={t('focus_role', 'admin')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t('all_roles', 'admin')}
                                    </SelectItem>
                                    {roles.map((role) => (
                                        <SelectItem key={role.id} value={String(role.id)}>
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {roles.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                {t('no_roles_found', 'admin')}
                            </p>
                        )}
                        {roles.length > 0 && filteredGroups.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                {t('no_permissions_found', 'admin')}
                            </p>
                        )}
                        {roles.length > 0 && filteredGroups.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full border-collapse text-sm">
                                    <thead>
                                        <tr>
                                            <th className="sticky start-0 bg-background px-3 py-2 text-start font-medium">
                                                {t('permissions', 'admin')}
                                            </th>
                                            {roles.map((role) => {
                                                const isFocused =
                                                    focusRoleNumericId !== null &&
                                                    focusRoleNumericId === role.id;
                                                return (
                                                    <th
                                                        key={role.id}
                                                        className={cn(
                                                            'px-3 py-2 text-center font-medium',
                                                            isFocused ? 'bg-primary/5' : ''
                                                        )}
                                                    >
                                                        {role.name}
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredGroups.map((group) => (
                                            <Fragment key={group.key}>
                                                <tr>
                                                    <td
                                                        className="sticky start-0 bg-muted px-3 py-2 text-xs font-semibold uppercase text-muted-foreground"
                                                        colSpan={1 + roles.length}
                                                    >
                                                        {group.label}
                                                    </td>
                                                </tr>
                                                {group.permissions.map((perm) => {
                                                    const unassigned =
                                                        perm.assignedRoleIds.length === 0;
                                                    return (
                                                        <tr key={perm.id} className="border-b border-border/40">
                                                            <td className="sticky start-0 bg-background px-3 py-2 text-start align-middle">
                                                                <span className="font-mono text-xs sm:text-sm">
                                                                    {perm.name}
                                                                </span>
                                                                {unassigned && (
                                                                    <span className="ms-2 text-xs font-medium text-amber-600">
                                                                        {t('unassigned_permission', 'admin')}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            {roles.map((role) => {
                                                                const isAssigned = perm.assignedRoleIds.includes(
                                                                    role.id
                                                                );
                                                                const isFocused =
                                                                    focusRoleNumericId !== null &&
                                                                    focusRoleNumericId === role.id;
                                                                return (
                                                                    <td
                                                                        key={role.id}
                                                                        className={cn(
                                                                            'px-3 py-2 text-center align-middle',
                                                                            isFocused ? 'bg-primary/5' : ''
                                                                        )}
                                                                    >
                                                                        {isAssigned ? (
                                                                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                                                                ✓
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-muted-foreground">
                                                                                —
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

