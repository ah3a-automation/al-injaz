<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\SupplierCategory;
use App\Models\User;

final class SupplierCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('categories.manage');
    }

    public function view(User $user, SupplierCategory $supplierCategory): bool
    {
        return $user->can('categories.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('categories.manage');
    }

    public function update(User $user, SupplierCategory $supplierCategory): bool
    {
        return $user->can('categories.manage');
    }

    public function delete(User $user, SupplierCategory $supplierCategory): bool
    {
        return $user->can('categories.manage');
    }
}
