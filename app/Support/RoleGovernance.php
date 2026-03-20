<?php

declare(strict_types=1);

namespace App\Support;

final class RoleGovernance
{
    /** Roles that cannot be deleted or renamed */
    public const PROTECTED_ROLES = ['super_admin', 'admin'];

    /** Roles considered high-privilege (show warning badge but allow editing) */
    public const HIGH_PRIVILEGE_ROLES = ['super_admin', 'admin', 'manager'];

    public static function isProtected(string $roleName): bool
    {
        return in_array($roleName, self::PROTECTED_ROLES, true);
    }

    public static function isHighPrivilege(string $roleName): bool
    {
        return in_array($roleName, self::HIGH_PRIVILEGE_ROLES, true);
    }
}
