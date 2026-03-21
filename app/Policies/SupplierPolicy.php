<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Supplier;
use App\Models\User;

/**
 * Standalone policy (does not extend {@see BasePolicy}) so method parameters can be typed as {@see Supplier}
 * without violating PHP's Liskov compatibility rules against {@see BasePolicy}'s abstract {@see \Illuminate\Database\Eloquent\Model} parameters.
 */
final class SupplierPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('suppliers.view');
    }

    public function view(User $user, Supplier $supplier): bool
    {
        return $user->can('suppliers.view');
    }

    public function create(User $user): bool
    {
        return $user->can('suppliers.create');
    }

    public function update(User $user, Supplier $supplier): bool
    {
        return $user->can('suppliers.edit');
    }

    public function delete(User $user, Supplier $supplier): bool
    {
        return $user->can('suppliers.delete');
    }

    public function approve(User $user, Supplier $supplier): bool
    {
        return $user->can('suppliers.approve');
    }
}
