import type { UserRecord } from '@/types';

export function getRoleColor(role: string): string {
    const map: Record<string, string> = {
        super_admin: 'bg-red-100 text-red-700',
        admin: 'bg-purple-100 text-purple-700',
        procurement_manager: 'bg-blue-100 text-blue-700',
        procurement_officer: 'bg-cyan-100 text-cyan-700',
        technical_manager: 'bg-orange-100 text-orange-700',
        project_manager: 'bg-indigo-100 text-indigo-700',
        member: 'bg-gray-100 text-gray-700',
        viewer: 'bg-gray-100 text-gray-500',
    };
    return map[role] ?? 'bg-gray-100 text-gray-700';
}

export function getRoleLabel(role: string): string {
    const map: Record<string, string> = {
        super_admin: 'Super Admin',
        admin: 'Admin',
        procurement_manager: 'Procurement Manager',
        procurement_officer: 'Procurement Officer',
        technical_manager: 'Technical Manager',
        project_manager: 'Project Manager',
        member: 'Member',
        viewer: 'Viewer',
    };
    return map[role] ?? role;
}

export function getStatusColor(status: UserRecord['status']): string {
    const map: Record<UserRecord['status'], string> = {
        active: 'bg-green-100 text-green-700',
        inactive: 'bg-gray-100 text-gray-700',
        suspended: 'bg-red-100 text-red-700',
    };
    return map[status];
}

export function getStatusLabel(status: UserRecord['status']): string {
    const map: Record<UserRecord['status'], string> = {
        active: 'Active',
        inactive: 'Inactive',
        suspended: 'Suspended',
    };
    return map[status];
}
