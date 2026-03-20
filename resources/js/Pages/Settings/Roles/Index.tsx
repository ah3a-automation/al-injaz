import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Checkbox } from '@/Components/ui/checkbox';
import { Label } from '@/Components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Shield, ShieldAlert, Trash2 } from 'lucide-react';
import { useConfirm } from '@/hooks';

interface PermissionGroupDto {
    key: string;
    label: string;
    permissions: Array<{ id: number; name: string }>;
}

interface RoleDto {
    id: number;
    name: string;
    guard_name: string;
    permissions: string[];
    permissions_count: number;
    isProtected: boolean;
    isHighPrivilege: boolean;
}

interface PermissionDto {
    id: number;
    name: string;
    guard_name: string;
}

interface RolesPageProps {
    roles: RoleDto[];
    permissions: PermissionDto[];
    permissionGroups: PermissionGroupDto[];
}

interface RoleFormData {
    id?: number | null;
    name: string;
    permissions: string[];
}

export default function RolesIndex({ roles, permissions, permissionGroups }: RolesPageProps) {
    const { t } = useLocale();
    const { confirmDelete } = useConfirm();
    const [editingRole, setEditingRole] = useState<RoleDto | null>(null);

    const form = useForm<RoleFormData>({
        id: null,
        name: '',
        permissions: [],
    });

    const startCreate = () => {
        setEditingRole(null);
        form.reset();
        form.setData({
            id: null,
            name: '',
            permissions: [],
        });
    };

    const startEdit = (role: RoleDto) => {
        setEditingRole(role);
        form.setData({
            id: role.id,
            name: role.name,
            permissions: role.permissions,
        });
    };

    const togglePermission = (permName: string) => {
        const current = form.data.permissions;
        if (current.includes(permName)) {
            form.setData('permissions', current.filter((p) => p !== permName));
        } else {
            form.setData('permissions', [...current, permName]);
        }
    };

    const toggleGroup = (groupKey: string, select: boolean) => {
        const group = permissionGroups.find((g) => g.key === groupKey);
        if (!group) return;
        const names = group.permissions.map((p) => p.name);
        if (select) {
            form.setData('permissions', [...new Set([...form.data.permissions, ...names])]);
        } else {
            form.setData('permissions', form.data.permissions.filter((n) => !names.includes(n)));
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (form.data.id) {
            form.put(route('settings.roles.update', form.data.id));
        } else {
            form.post(route('settings.roles.store'));
        }
    };

    const handleDelete = (role: RoleDto) => {
        confirmDelete(
            t('roles_confirm_delete', 'admin', { name: role.name })
        ).then((confirmed) => {
            if (!confirmed) return;
            form.delete(route('settings.roles.destroy', role.id));
        });
    };

    return (
        <AppLayout>
            <Head title={t('roles_title', 'admin')} />
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {t('roles_title', 'admin')}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('roles_description', 'admin')}
                        </p>
                    </div>
                    <Button onClick={startCreate}>
                        {t('roles_add', 'admin')}
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('roles_list_title', 'admin')}</CardTitle>
                            <CardDescription>
                                {t('roles_list_description', 'admin')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {roles.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {t('roles_empty', 'admin')}
                                </p>
                            )}
                            {roles.map((role) => (
                                <div
                                    key={role.id}
                                    className="flex items-center justify-between rounded-md border px-3 py-2"
                                >
                                    <button
                                        type="button"
                                        onClick={() => startEdit(role)}
                                        className="flex-1 text-start"
                                    >
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="font-medium">{role.name}</span>
                                            {role.isProtected && (
                                                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                                    <Shield className="me-1 h-3 w-3" />
                                                    {t('protected_role', 'admin')}
                                                </span>
                                            )}
                                            {role.isHighPrivilege && !role.isProtected && (
                                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                                    <ShieldAlert className="me-1 h-3 w-3" />
                                                    {t('high_privilege', 'admin')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {role.permissions_count > 0
                                                ? t('permissions_count', 'admin', {
                                                      count: role.permissions_count,
                                                  })
                                                : t('roles_permissions_none', 'admin')}
                                        </div>
                                    </button>
                                    {!role.isProtected && (
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDelete(role)}
                                            aria-label={t('action_delete', 'admin')}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {editingRole
                                    ? t('roles_edit', 'admin', { name: editingRole.name })
                                    : t('roles_add', 'admin')}
                            </CardTitle>
                            <CardDescription>
                                {t('roles_form_description', 'admin')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="role_name">
                                        {t('roles_name', 'admin')} *
                                    </Label>
                                    <Input
                                        id="role_name"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        required
                                        disabled={editingRole?.isProtected ?? false}
                                    />
                                    {editingRole?.isProtected && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t('role_cannot_be_renamed', 'admin')}
                                        </p>
                                    )}
                                    {form.errors.name && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.name}
                                        </p>
                                    )}
                                    {(form.errors as Record<string, string>).role && (
                                        <p className="text-sm text-destructive">
                                            {(form.errors as Record<string, string>).role}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <Label>{t('roles_permissions', 'admin')}</Label>
                                    <div className="max-h-80 space-y-4 overflow-auto rounded-md border p-3">
                                        {permissionGroups.length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                {t('roles_permissions_empty', 'admin')}
                                            </p>
                                        )}
                                        {permissionGroups.map((group) => (
                                            <div key={group.key} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                        {group.label}
                                                    </h4>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            className="text-xs text-primary hover:underline"
                                                            onClick={() => toggleGroup(group.key, true)}
                                                        >
                                                            {t('select_all', 'admin')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="text-xs text-muted-foreground hover:underline"
                                                            onClick={() => toggleGroup(group.key, false)}
                                                        >
                                                            {t('deselect_all', 'admin')}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                    {group.permissions.map((perm) => (
                                                        <label
                                                            key={perm.id}
                                                            className="flex cursor-pointer items-center gap-2 text-sm"
                                                        >
                                                            <Checkbox
                                                                checked={form.data.permissions.includes(perm.name)}
                                                                onCheckedChange={() => togglePermission(perm.name)}
                                                            />
                                                            <span
                                                                className="truncate"
                                                                title={perm.name}
                                                            >
                                                                {perm.name.includes('.')
                                                                    ? perm.name.split('.').slice(1).join('.')
                                                                    : perm.name}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button type="submit" disabled={form.processing}>
                                        {editingRole
                                            ? t('roles_save', 'admin')
                                            : t('roles_create', 'admin')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={startCreate}
                                    >
                                        {t('action_cancel', 'admin')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

